// ═══════════════════════════════════════════════════════════════════════
//  BAZINO THEME STORE (SERVER) — «ذخیره‌ساز قالب‌ها روی سرور»
// ═══════════════════════════════════════════════════════════════════════
//  قالب‌هایی که از پنل ادمین با فرمت ZIP نصب می‌شوند، در پوشه اختصاصی
//  خودشان روی سرور ذخیره می‌شوند:
//
//    themes/<theme-id>/
//    ├── theme.json        ← متادیتا
//    ├── theme.css         ← استایل کامل قالب (مسیرهای assets بازنویسی می‌شوند)
//    └── assets/           ← فایل‌های مورد نیاز قالب (تصویر/ویدئو/فونت/...)
//
//  • حذف قالب از پنل ادمین = حذف کامل همین پوشه
//  • فایل‌های assets از همین پوشه سرو می‌شوند:
//      /api/themes/<id>/theme.css
//      /api/themes/<id>/assets/<file>
//  • مسیرهای نسبی داخل CSS (مثل url('assets/banner.jpg')) هنگام سرو،
//    به آدرس واقعی فایل قالب تبدیل می‌شوند.
// ═══════════════════════════════════════════════════════════════════════
import path from "path";
import fs from "fs";
import {
  parseThemeZip,
  buildThemeZip,
  rewriteCssAssetUrls,
  sanitizeThemeId,
  isZipParseError,
  type ParsedZipTheme
} from "../src/themes/themeZipCore";
import { optimizeThemeImages, optimizeUploadedTheme, type ThemePerformanceReport } from "./themePerformance";

/** پوشه ریشه قالب‌های نصب‌شده روی سرور */
export const THEMES_DIR = path.join(process.cwd(), "themes");

/** مسیر پوشه یک قالب — با اعتبارسنجی امنیتی (جلوگیری از path traversal) */
export function getThemeDir(id: string): string {
  const safe = sanitizeThemeId(id);
  if (!/^[a-z0-9][a-z0-9-_]*$/.test(safe)) {
    throw new Error(`Invalid theme id: ${id}`);
  }
  const dir = path.join(THEMES_DIR, safe);
  if (!dir.startsWith(THEMES_DIR + path.sep)) {
    throw new Error(`Unsafe theme path: ${id}`);
  }
  return dir;
}

/** اطمینان از وجود پوشه ریشه */
export function ensureThemesDir(): void {
  fs.mkdirSync(THEMES_DIR, { recursive: true });
}

/* ═══════════════════════════════════════════════════════════════
 *  لیست قالب‌های نصب‌شده (اسکن پوشه themes)
 * ═══════════════════════════════════════════════════════════════ */
export interface InstalledThemeInfo {
  id: string;
  name: string;
  version?: string;
  description?: string;
  colors?: { primary: string; bg: string; card: string };
  hasAssets: boolean;
  assetFiles: string[];
  cssUrl: string;
  installedAt: number;
}

export function listInstalledThemes(): InstalledThemeInfo[] {
  ensureThemesDir();
  const items = fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const themes: InstalledThemeInfo[] = [];
  for (const item of items) {
    const dir = path.join(THEMES_DIR, item.name);
    const cssPath = path.join(dir, "theme.css");
    const jsonPath = path.join(dir, "theme.json");
    if (!fs.existsSync(cssPath)) continue;

    let meta: any = {};
    try {
      meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (e) { /* theme.json optional */ }

    const assetsDir = path.join(dir, "assets");
    let assetFiles: string[] = [];
    if (fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory()) {
      assetFiles = listFilesRecursive(assetsDir).map(f => f.split(path.sep).join("/"));
    }

    themes.push({
      id: item.name,
      name: (meta.name as string) || item.name,
      version: meta.version as string | undefined,
      description: meta.description as string | undefined,
      colors: meta.colors as any,
      hasAssets: assetFiles.length > 0,
      assetFiles,
      cssUrl: `/api/themes/${encodeURIComponent(item.name)}/theme.css`,
      installedAt: fs.statSync(cssPath).mtimeMs,
    });
  }
  return themes;
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(path.relative(dir, full));
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════
 *  نصب قالب از ZIP — استخراج به پوشه اختصاصی قالب
 * ═══════════════════════════════════════════════════════════════ */
export async function installThemeZip(buffer: Uint8Array, fallbackName?: string): Promise<{ theme: InstalledThemeInfo; parsed: ParsedZipTheme; performance: ThemePerformanceReport } | { error: string; performance?: ThemePerformanceReport }> {
  const parsed = parseThemeZip(buffer, fallbackName);
  if (isZipParseError(parsed)) return { error: parsed.error };

  // This gate runs before any file is written. It safely applies deterministic fixes
  // (SVG/font policy/Google Fonts) and rejects only package-size violations.
  const staticPerformanceResult = optimizeUploadedTheme(parsed);
  const performanceResult = await optimizeThemeImages(staticPerformanceResult);
  if (!performanceResult.canInstall) {
    const blockers = performanceResult.report.findings
      .filter(finding => finding.severity === "error")
      .map(finding => finding.message)
      .join(" ");
    return { error: blockers || "قالب معیارهای عملکرد را پاس نکرد", performance: performanceResult.report };
  }
  const optimized = performanceResult.theme;

  const id = sanitizeThemeId(optimized.meta.id || "");
  const dir = getThemeDir(id);
  ensureThemesDir();

  // اگر قالب قبلاً نصب شده → خطا (برای نصب مجدد ابتدا حذف شود)
  if (fs.existsSync(dir)) {
    return { error: `قالبی با شناسه «${id}» قبلاً نصب شده است`, performance: performanceResult.report };
  }

  fs.mkdirSync(dir, { recursive: true });

  // theme.json (متادیتای نرمال‌شده)
  const meta = {
    name: optimized.meta.name || id,
    id,
    version: optimized.meta.version || "1.0.0",
    description: optimized.meta.description || "",
    colors: optimized.meta.colors || undefined,
  };
  fs.writeFileSync(path.join(dir, "theme.json"), JSON.stringify(meta, null, 2), "utf8");

  // theme.css
  fs.writeFileSync(path.join(dir, "theme.css"), optimized.css, "utf8");

  // theme.js (کامپوننت صفحه اصلی قالب — اجباری؛ parseThemeZip بدون آن خطا می‌دهد)
  fs.writeFileSync(path.join(dir, "theme.js"), optimized.componentJs, "utf8");

  // assets/
  const assetNames = Object.keys(optimized.assets);
  if (assetNames.length > 0) {
    const assetsDir = path.join(dir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    for (const rel of assetNames) {
      // محافظت مضاعف از path traversal در نام فایل‌های asset
      const safeRel = rel.split("/").map(part => part.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
      if (safeRel.includes("..")) continue;
      const dest = path.join(assetsDir, ...safeRel.split("/"));
      if (!dest.startsWith(assetsDir + path.sep)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, optimized.assets[rel]);
    }
  }

  const theme = listInstalledThemes().find(t => t.id === id)!;
  return { theme, parsed: optimized, performance: performanceResult.report };
}

/* ═══════════════════════════════════════════════════════════════
 *  حذف قالب (پوشه کامل قالب حذف می‌شود)
 * ═══════════════════════════════════════════════════════════════ */
export function deleteTheme(id: string): boolean {
  const dir = getThemeDir(id);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

/* ═══════════════════════════════════════════════════════════════
 *  خواندن CSS قالب با بازنویسی مسیرهای assets
 * ═══════════════════════════════════════════════════════════════ */
export function readThemeCss(id: string): { css: string; contentType: string } | null {
  const dir = getThemeDir(id);
  const cssPath = path.join(dir, "theme.css");
  if (!fs.existsSync(cssPath)) return null;
  const raw = fs.readFileSync(cssPath, "utf8");
  // url('assets/...') ← /api/themes/<id>/assets/...
  const base = `/api/themes/${encodeURIComponent(id)}`;
  return { css: rewriteCssAssetUrls(raw, base), contentType: "text/css; charset=utf-8" };
}

/* ═══════════════════════════════════════════════════════════════
 *  سرو فایل‌های assets قالب (فقط داخل پوشه assets)
 * ═══════════════════════════════════════════════════════════════ */
export function getThemeAsset(id: string, relPath: string): { data: Buffer; ext: string } | null {
  const dir = getThemeDir(id);
  const assetsDir = path.join(dir, "assets");
  if (!fs.existsSync(assetsDir)) return null;

  const safeRel = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (safeRel.includes("..") || safeRel.startsWith("/")) return null;

  const dest = path.join(assetsDir, ...safeRel.split("/"));
  if (!dest.startsWith(assetsDir + path.sep)) return null;
  if (!fs.existsSync(dest) || !fs.statSync(dest).isFile()) return null;

  const ext = path.extname(dest).toLowerCase().replace(".", "");
  return { data: fs.readFileSync(dest), ext };
}

/* ═══════════════════════════════════════════════════════════════
 *  سرو کامپوننت قالب (theme.js) — فقط اگر در پوشه قالب وجود داشته باشد
 *  (اختیاری؛ برای قالب‌های دارای کامپوننت صفحه اصلی اختصاصی)
 * ═══════════════════════════════════════════════════════════════ */
export function getThemeComponentJs(id: string): { data: Buffer } | null {
  const dir = getThemeDir(id);
  const jsPath = path.join(dir, "theme.js");
  if (!fs.existsSync(jsPath) || !fs.statSync(jsPath).isFile()) return null;
  return { data: fs.readFileSync(jsPath) };
}

/* ═══════════════════════════════════════════════════════════════
 *  خروجی ZIP از قالب نصب‌شده (شامل assets)
 * ═══════════════════════════════════════════════════════════════ */
export function exportThemeZip(id: string): Uint8Array | null {
  const dir = getThemeDir(id);
  const cssPath = path.join(dir, "theme.css");
  if (!fs.existsSync(cssPath)) return null;

  let meta: any = {};
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, "theme.json"), "utf8"));
  } catch (e) { /* ignore */ }

  const css = fs.readFileSync(cssPath, "utf8");

  const assetsDir = path.join(dir, "assets");
  const assets: Record<string, Uint8Array> = {};
  if (fs.existsSync(assetsDir)) {
    for (const rel of listFilesRecursive(assetsDir)) {
      const dest = path.join(assetsDir, rel);
      assets[rel.split(path.sep).join("/")] = fs.readFileSync(dest);
    }
  }

  // theme.js هم باید در خروجی باشد (اجباری) — از پوشه قالب خوانده می‌شود
  const jsPath = path.join(dir, "theme.js");
  let componentJs = "// theme.js missing\n";
  if (fs.existsSync(jsPath)) {
    componentJs = fs.readFileSync(jsPath, "utf8");
  }
  return buildThemeZip(css, meta, assets, componentJs);
}
