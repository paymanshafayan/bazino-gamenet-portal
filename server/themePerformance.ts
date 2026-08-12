import { strFromU8, strToU8 } from 'fflate';
import type { ParsedZipTheme } from '../src/themes/themeZipCore';

/**
 * Static performance gate for uploaded theme packages. Theme JavaScript is intentionally
 * never executed during upload: a package is untrusted, and static analysis is sufficient
 * to catch the most common payload/font/third-party regressions safely.
 */
export type ThemePerformanceSeverity = 'error' | 'warning' | 'fixed';

export interface ThemePerformanceFinding {
  id: string;
  severity: ThemePerformanceSeverity;
  message: string;
  detail?: string;
}

export interface ThemePerformanceReport {
  findings: ThemePerformanceFinding[];
  originalAssetBytes: number;
  optimizedAssetBytes: number;
  savedAssetBytes: number;
  externalOrigins: string[];
}

export interface ThemePerformanceResult {
  theme: ParsedZipTheme;
  report: ThemePerformanceReport;
  canInstall: boolean;
}

const MAX_SINGLE_ASSET_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 8 * 1024 * 1024;
const LARGE_IMAGE_BYTES = 250 * 1024;
const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i;
const TEXT_EXTENSION = /\.(svg|css|js|json|txt)$/i;
const GOOGLE_FONT_IMPORT = /@import\s+(?:url\()?\s*['"]?https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^;'"\s)]*[^;]*;?/gi;
const GOOGLE_FONT_FACE = /@font-face\s*\{[^}]*https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^}]*\}/gi;
const URL_PATTERN = /https?:\/\/[^'"\s)]+/gi;

function bytes(total: number): string {
  return `${Math.round(total / 1024)}KB`;
}

function minifySvg(source: string): string {
  // Safe, syntax-preserving reductions only; do not rewrite paths/attributes.
  return source
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function uniqueExternalOrigins(...sources: string[]): string[] {
  const origins = new Set<string>();
  for (const source of sources) {
    for (const value of source.match(URL_PATTERN) ?? []) {
      try {
        origins.add(new URL(value).origin);
      } catch {
        // Invalid URLs are handled by the browser/theme parser; they are not origins.
      }
    }
  }
  return [...origins].sort();
}

/**
 * Applies only deterministic, non-visual fixes. Expensive image transcoding needs an image
 * processor and is therefore reported rather than pretending a byte reduction occurred.
 */
export function optimizeUploadedTheme(theme: ParsedZipTheme): ThemePerformanceResult {
  const findings: ThemePerformanceFinding[] = [];
  const originalAssetBytes = Object.values(theme.assets).reduce((sum, data) => sum + data.byteLength, 0);
  const assets: Record<string, Uint8Array> = {};

  for (const [name, data] of Object.entries(theme.assets)) {
    if (data.byteLength > MAX_SINGLE_ASSET_BYTES) {
      findings.push({
        id: 'asset-too-large',
        severity: 'error',
        message: `فایل «${name}» از سقف مجاز ${bytes(MAX_SINGLE_ASSET_BYTES)} بزرگ‌تر است.`,
        detail: `اندازه فعلی: ${bytes(data.byteLength)}`,
      });
    }

    if (IMAGE_EXTENSION.test(name) && data.byteLength > LARGE_IMAGE_BYTES) {
      findings.push({
        id: 'large-image',
        severity: 'warning',
        message: `تصویر «${name}» برای قالب وب بزرگ است.`,
        detail: `${bytes(data.byteLength)}؛ آن را به WebP/AVIF و اندازه نمایشی واقعی تبدیل کنید.`,
      });
    }

    if (/\.svg$/i.test(name)) {
      try {
        const before = data.byteLength;
        const compact = strToU8(minifySvg(strFromU8(data)));
        assets[name] = compact;
        if (compact.byteLength < before) {
          findings.push({
            id: 'svg-minified',
            severity: 'fixed',
            message: `فضای خالی و commentهای SVG «${name}» حذف شد.`,
            detail: `${bytes(before - compact.byteLength)} صرفه‌جویی`,
          });
        }
        continue;
      } catch {
        // Preserve malformed/non-UTF8 SVG bytes; parsing it here must never break upload.
      }
    }
    assets[name] = data;
  }

  if (originalAssetBytes > MAX_TOTAL_ASSET_BYTES) {
    findings.push({
      id: 'theme-payload-too-large',
      severity: 'error',
      message: `مجموع assetهای قالب از سقف ${bytes(MAX_TOTAL_ASSET_BYTES)} بیشتر است.`,
      detail: `اندازه فعلی: ${bytes(originalAssetBytes)}`,
    });
  }

  let css = theme.css;
  const googleImports = css.match(GOOGLE_FONT_IMPORT)?.length ?? 0;
  const googleFaces = css.match(GOOGLE_FONT_FACE)?.length ?? 0;
  if (googleImports || googleFaces) {
    css = css.replace(GOOGLE_FONT_IMPORT, '').replace(GOOGLE_FONT_FACE, '');
    findings.push({
      id: 'google-font-removed',
      severity: 'fixed',
      message: 'فونت خارجی Google از CSS قالب حذف شد تا درخواست third-party، زنجیره بحرانی و CLS ایجاد نکند.',
      detail: `${googleImports} import و ${googleFaces} font-face حذف شد.`,
    });
  }

  // Local uploaded fonts are allowed, but they must not block first paint or cause a late
  // layout swap. This only touches @font-face blocks that have no explicit policy.
  let localFontFaces = 0;
  css = css.replace(/@font-face\s*\{[^}]*\}/gi, (block) => {
    if (/font-display\s*:/i.test(block)) return block;
    localFontFaces += 1;
    return block.replace(/\}\s*$/, ' font-display: optional; }');
  });
  if (localFontFaces) {
    findings.push({
      id: 'font-display-added',
      severity: 'fixed',
      message: 'برای فونت‌های محلی قالب font-display: optional اضافه شد.',
      detail: `${localFontFaces} font-face اصلاح شد.`,
    });
  }

  const externalOrigins = uniqueExternalOrigins(css, theme.componentJs);
  const nonGoogleOrigins = externalOrigins.filter(origin =>
    !origin.includes('fonts.googleapis.com') && !origin.includes('fonts.gstatic.com')
  );
  if (nonGoogleOrigins.length) {
    findings.push({
      id: 'third-party-origin',
      severity: 'warning',
      message: 'قالب به originهای third-party وابسته است؛ در صورت امکان asset را همراه ZIP آپلود کنید.',
      detail: nonGoogleOrigins.join(', '),
    });
  }

  const intervalCount = (theme.componentJs.match(/\bsetInterval\s*\(/g) ?? []).length;
  if (intervalCount) {
    findings.push({
      id: 'recurring-javascript',
      severity: 'warning',
      message: 'theme.js دارای setInterval است؛ کارهای تکراری باید با visibility/viewport کنترل شوند.',
      detail: `${intervalCount} interval پیدا شد.`,
    });
  }

  const optimizedAssetBytes = Object.values(assets).reduce((sum, data) => sum + data.byteLength, 0);
  return {
    theme: { ...theme, css, assets },
    report: {
      findings,
      originalAssetBytes,
      optimizedAssetBytes,
      savedAssetBytes: originalAssetBytes - optimizedAssetBytes,
      externalOrigins,
    },
    canInstall: !findings.some(finding => finding.severity === 'error'),
  };
}
