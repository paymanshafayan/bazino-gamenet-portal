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
import { parse as acornParse } from "acorn";
import { dataPath } from "./paths";

/** پوشه ریشه قالب‌های نصب‌شده روی سرور */
export const THEMES_DIR = dataPath("themes");

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

/** پاک‌سازی پوشه‌های موقت باقی‌مانده از نصب‌های ناتمام (کرش وسط نصب) */
export function cleanupStaleThemeDirs(): void {
  try {
    for (const d of fs.readdirSync(THEMES_DIR, { withFileTypes: true })) {
      // پوشه‌های نقطه‌دار موقت (‌.id.installing / .id.old) پاک می‌شوند؛
      // .staging مال themeInstallJobs است — بازیابی/پاک‌سازی آن‌جا انجام
      // می‌شود (recoverThemeInstallJobs بعد از همین تابع در boot صدا زده می‌شود).
      if (d.isDirectory() && d.name.startsWith(".") && d.name !== ".staging") fs.rmSync(path.join(THEMES_DIR, d.name), { recursive: true, force: true });
    }
  } catch { /* پوشه هنوز ساخته نشده */ }
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
  /** آیا theme.js دارد (بخش‌های اختصاصی) یا CSS-only است */
  hasComponentJs: boolean;
  /** بخش‌هایی که theme.js ثبت می‌کند (از theme.json.regions یا تحلیل استاتیک theme.js) */
  regions: string[];
  /** رشته‌های چندزبانه‌ی قالب */
  strings?: Record<string, Record<string, string>>;
  /** توکن‌های طراحی */
  tokens?: Record<string, string>;
  author?: string;
  /** چینش: classic (پیش‌فرض) یا hub (کروم و صفحات hub.*) */
  layout?: "classic" | "hub";
}

/** بخش‌های شناخته‌شده‌ی سایت (باید با src/themeSdk/sdk.ts THEME_REGIONS یکی باشد) */
export const KNOWN_REGIONS = [
  "home", "header", "hero", "home.genres", "home.lounges", "home.results",
  "home.tournaments", "home.pricing", "home.staff", "home.location", "footer", "mobileNav",
  "hub.home", "hub.games", "hub.events", "hub.weekly", "hub.special", "hub.season",
  "hub.brackets", "hub.register", "hub.shop", "hub.food", "hub.club", "hub.blog",
  "hub.chat", "hub.contact", "hub.rules", "hub.privacy",
];

/** استخراج نام بخش‌هایی که theme.js با registerComponent('<name>') ثبت می‌کند */
export function detectRegisteredRegions(componentJs: string): string[] {
  const out = new Set<string>();
  const re = /\.registerComponent\s*\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(componentJs || ""))) out.add(m[1]);
  return Array.from(out);
}

export function listInstalledThemes(): InstalledThemeInfo[] {
  ensureThemesDir();
  const items = fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("."))
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

    const jsPath = path.join(dir, "theme.js");
    const hasComponentJs = fs.existsSync(jsPath) && fs.statSync(jsPath).size > 0;
    let regions: string[] = Array.isArray(meta.regions) ? meta.regions.filter((r: unknown) => typeof r === "string") : [];
    if (hasComponentJs && regions.length === 0) {
      try { regions = detectRegisteredRegions(fs.readFileSync(jsPath, "utf8")); } catch { /* ignore */ }
    }

    themes.push({
      id: item.name,
      name: (meta.name as string) || item.name,
      version: meta.version as string | undefined,
      description: meta.description as string | undefined,
      author: typeof meta.author === "string" ? meta.author : undefined,
      colors: meta.colors as any,
      hasAssets: assetFiles.length > 0,
      assetFiles,
      cssUrl: `/api/themes/${encodeURIComponent(item.name)}/theme.css`,
      installedAt: Math.max(fs.statSync(cssPath).mtimeMs, fs.existsSync(jsonPath) ? fs.statSync(jsonPath).mtimeMs : 0),
      hasComponentJs,
      regions,
      strings: meta.strings && typeof meta.strings === "object" ? meta.strings : undefined,
      tokens: meta.tokens && typeof meta.tokens === "object" ? meta.tokens : undefined,
      layout: meta.layout === "hub" || meta.layout === "classic" ? meta.layout : undefined,
    });
  }
  return themes;
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // مسیر نسبی از «ریشهٔ» assets حفظ می‌شود. باگ قبلی: path.relative نسبت به
      // زیرپوشه گرفته می‌شد → نام زیرپوشه‌ها گم می‌شد → assetFiles ناقص و
      // exportThemeZip برای قالب‌های دارای asset تو در تو با ENOENT می‌بست.
      for (const sub of listFilesRecursive(path.join(dir, entry.name))) out.push(entry.name + "/" + sub);
    } else {
      out.push(entry.name);
    }
  }
  return out;
}
export { listFilesRecursive };

/* ═══════════════════════════════════════════════════════════════
 *  نصب قالب از ZIP — استخراج به پوشه اختصاصی قالب
 * ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
 *  اعتبارسنجی theme.js — تحلیل AST (acorn) به‌جای رجکس
 *
 *  چرا (۲۰۲۶-۰۹-۱۲، قالب bazino-arena3d): بن رجکسی هوک‌های React، الگوی
 *  کاملاً سالمِ «کامپوننت React واقعی که فقط به‌صورت element برگردانده
 *  می‌شود» را هم می‌گرفت:
 *      function Home(p){ var r = R.useRef(null); R.useEffect(…); … }
 *      S.registerComponent('home', { render: (p) => h(Home, p) })
 *  SDK این خروجی را با React.isValidElement می‌پذیرد و Home را به‌عنوان
 *  کامپوننت mount می‌کند — hookها داخلش قانونی‌اند. رجکس قبلی R.useRef(
 *  را می‌دید و کل قالب را رد می‌کرد.
 *
 *  قاعدهٔ جدید: فراخوانی hook فقط وقتی مجاز است که داخل تابعی باشد که
 *  «به‌عنوان کامپوننت» ارجاع شده (h(Home,…) / createElement(Home,…) —
 *  ارجاع، نه فراخوانی). hook مستقیم در بدنهٔ render (حادثهٔ ۲۰۲۶-۰۹-۱۱
 *  قالب «Bazino 3D Dimension»: render(p){ useState(…) }) همچنان رد می‌شود.
 * ═══════════════════════════════════════════════════════════════════ */
const REACT_HOOK_NAMES = new Set([
  "useState", "useEffect", "useRef", "useMemo", "useCallback",
  "useReducer", "useContext", "useLayoutEffect",
]);

/** walker عمومی روی ESTree — همهٔ نودها/بچه‌ها را با پشتهٔ توابع در برگیرنده می‌پیماید */
function walkAst(
  node: any,
  visit: (node: any, fnStack: any[]) => void,
  fnStack: any[] = []
): void {
  if (!node || typeof node !== "object") return;
  visit(node, fnStack);
  const nextStack = node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression"
    ? [...fnStack, node]
    : fnStack;
  for (const key of Object.keys(node)) {
    if (key === "start" || key === "end" || key === "loc" || key === "range" || key === "sourceFile") continue;
    const value = (node as any)[key];
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child.type === "string") walkAst(child, visit, nextStack);
    } else if (value && typeof value === "object" && typeof value.type === "string") {
      walkAst(value, visit, nextStack);
    }
  }
}

/** نام یک function node (declaration id، یا متغیری که expression به آن نسبت داده شده) */
function functionOwnerName(fn: any): string | null {
  if (fn?.id?.name) return fn.id.name;
  // arrow/function expression داخل VariableDeclarator: var Home = function(…){…} / (p)=>…
  if (fn?.__varName) return fn.__varName;
  return null;
}

export function validateThemeComponentJs(componentJs: string): string | null {
  // theme.js اختیاری است — قالب CSS-only معتبر است
  if (!componentJs || !componentJs.trim()) return null;

  // ۱) syntax (هم parse واقعی با acorn، هم برای پیام خطای دقیق‌تر از new Function)
  let ast: any;
  try {
    ast = acornParse(componentJs, { ecmaVersion: "latest" });
  } catch (e: any) {
    return `theme.js خطای syntax دارد: ${e?.message || String(e)}`;
  }

  // ۲) برچسب‌گذاری توابع بی‌نامِ نسبت‌یافته به متغیر (var Home = (p)=>…) تا صاحب hook معلوم شود
  walkAst(ast, (node) => {
    if (node.type === "VariableDeclarator" && node.init && typeof node.init.type === "string"
      && /Function/.test(node.init.type) && node.id?.type === "Identifier") {
      (node.init as any).__varName = node.id.name;
    }
  });

  // ۳) شناسه‌هایی که به‌عنوان «کامپوننت» ارجاع شده‌اند: h(Home,…) / createElement(Home,…) / React.createElement(Home,…)
  const componentRefs = new Set<string>();
  walkAst(ast, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee;
    const isCreateCall =
      (callee?.type === "Identifier" && (callee.name === "h" || callee.name === "createElement"))
      || (callee?.type === "MemberExpression"
        && callee.object?.type === "Identifier" && /^R$|React|Preact|preactH$/i.test(callee.object.name)
        && callee.property?.name === "createElement");
    if (!isCreateCall) return;
    const first = node.arguments?.[0];
    if (first?.type === "Identifier") componentRefs.add(first.name);
  });

  // ۴) همهٔ فراخوانی hookها باید داخل یک تابعِ «کامپوننت-رفرنس‌شده» باشند
  //    (hookها هم به‌صورت bare مثل useState(…) و هم namespace مثل R.useState(…) / React.useEffect(…))
  let hookViolation: string | null = null;
  walkAst(ast, (node, fnStack) => {
    if (hookViolation) return;
    if (node.type !== "CallExpression") return;
    const callee = node.callee;
    let hookName: string | null = null;
    if (callee?.type === "Identifier" && REACT_HOOK_NAMES.has(callee.name)) {
      hookName = callee.name;
    } else if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier"
      && REACT_HOOK_NAMES.has(callee.property.name)) {
      hookName = callee.property.name;
    }
    if (!hookName) return;
    const owner = fnStack[fnStack.length - 1] || null;
    const ownerName = owner ? functionOwnerName(owner) : null;
    if (ownerName && componentRefs.has(ownerName)) return; // کامپوننت واقعی — مجاز
    hookViolation = `هوک ${hookName} فقط داخل کامپوننت React در theme.js مجاز است` +
      (ownerName ? ` — تابع «${ownerName}» به‌عنوان کامپوننت به SDK داده نمی‌شود` : " — فراخوانی مستقیم در بدنهٔ render اجرا نمی‌شود") +
      "؛ الگوی مجاز: function Comp(p){…} و سپس render:(p)=>h(Comp,p)";
  });
  if (hookViolation) return hookViolation;

  if (!/BazinoThemeSDK/.test(componentJs)) {
    return "theme.js باید بخش‌های قالب را با window.BazinoThemeSDK.registerComponent('<region>', ...) ثبت کند";
  }
  const regions = detectRegisteredRegions(componentJs);
  if (regions.length === 0) {
    return "theme.js هیچ بخشی (region) ثبت نمی‌کند — حداقل یکی از: " + KNOWN_REGIONS.join(", ");
  }
  const unknown = regions.filter(r => !KNOWN_REGIONS.includes(r));
  if (unknown.length) {
    return `theme.js بخش‌های ناشناخته ثبت می‌کند: ${unknown.join(", ")} — بخش‌های مجاز: ${KNOWN_REGIONS.join(", ")}`;
  }
  return null;
}

export interface InstallOptions {
  /** نصب روی شناسه‌ی موجود = جایگزینی اتمیک نسخه‌ی قبلی */
  replace?: boolean;
  /** پیشرفت استخراج/نوشتن فایل‌ها — برای job پس‌زمینه‌ای (پاسخ 202) */
  onProgress?: (p: { filesDone: number; filesTotal: number }) => void;
  /** لحظهٔ شروع swap اتمیک/ثبت نهایی — فاز installing در وضعیت job */
  onInstalling?: () => void;
}
export type InstallResult =
  | { theme: InstalledThemeInfo; parsed: ParsedZipTheme; performance: ThemePerformanceReport; replaced: boolean }
  | { error: string; code?: "THEME_EXISTS" | "INVALID"; performance?: ThemePerformanceReport };

export async function installThemeZip(buffer: Uint8Array, fallbackName?: string, options: InstallOptions = {}): Promise<InstallResult> {
  const parsed = parseThemeZip(buffer, fallbackName);
  if (isZipParseError(parsed)) return { error: parsed.error };

  const componentError = validateThemeComponentJs(parsed.componentJs);
  if (componentError) return { error: componentError };

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
  const optimizedComponentError = validateThemeComponentJs(optimized.componentJs);
  if (optimizedComponentError) return { error: optimizedComponentError, performance: performanceResult.report };

  const id = sanitizeThemeId(optimized.meta.id || "");
  const finalDir = getThemeDir(id);
  ensureThemesDir();

  const alreadyInstalled = fs.existsSync(finalDir);
  if (alreadyInstalled && !options.replace) {
    return { error: `قالبی با شناسه «${id}» قبلاً نصب شده است`, code: "THEME_EXISTS", performance: performanceResult.report };
  }

  // نوشتن در پوشه‌ی موقت کنار مقصد، سپس جابه‌جایی اتمیک. اگر وسط نوشتن خطا بخورد،
  // نسخه‌ی قبلی دست‌نخورده می‌ماند و هیچ‌وقت یک قالب نیمه‌نوشته سرو نمی‌شود.
  const dir = path.join(THEMES_DIR, `.${id}.installing-${process.pid}-${Date.now()}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  // theme.json (متادیتای نرمال‌شده)
  const meta = {
    name: optimized.meta.name || id,
    id,
    version: optimized.meta.version || "1.0.0",
    description: optimized.meta.description || "",
    author: typeof optimized.meta.author === "string" ? optimized.meta.author : undefined,
    colors: optimized.meta.colors || undefined,
    tokens: optimized.meta.tokens || undefined,
    strings: optimized.meta.strings || undefined,
    regions: detectRegisteredRegions(optimized.componentJs),
    sdkVersion: 2,
    layout: optimized.meta.layout === "hub" || optimized.meta.layout === "classic" ? optimized.meta.layout : undefined,
  };
  fs.writeFileSync(path.join(dir, "theme.json"), JSON.stringify(meta, null, 2), "utf8");

  // theme.css
  fs.writeFileSync(path.join(dir, "theme.css"), optimized.css, "utf8");

  // theme.js (اختیاری — بخش‌های اختصاصی قالب)
  if (optimized.componentJs && optimized.componentJs.trim()) {
    fs.writeFileSync(path.join(dir, "theme.js"), optimized.componentJs, "utf8");
  }

  // assets/ — نوشتن موازی با هم‌زمانیِ محدود + پیش‌ساخت یکتای پوشه‌ها
  // (پرامت §3: بدون Promise.all بی‌سقف، mkdir یک‌بار برای هر پوشه، progress برای job 202).
  const assetNames = Object.keys(optimized.assets);
  if (assetNames.length > 0) {
    const assetsDir = path.join(dir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    // پوشه‌های یکتا یک‌بار ساخته می‌شوند (برای قالب ۴۰۵-فایلی این یعنی
    // صدها mkdir تکراری کمتر روی volume شبکه‌ای)
    const uniqueDirs = new Set<string>();
    for (const rel of assetNames) {
      const safeRel = rel.split("/").map(part => part.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
      if (safeRel.includes("..")) continue;
      const dest = path.join(assetsDir, ...safeRel.split("/"));
      if (!dest.startsWith(assetsDir + path.sep)) continue;
      const parent = path.dirname(dest);
      if (parent !== assetsDir) uniqueDirs.add(parent);
    }
    for (const d of uniqueDirs) fs.mkdirSync(d, { recursive: true });

    let filesDone = 0;
    const reportProgress = () => options.onProgress?.({ filesDone, filesTotal: assetNames.length });
    reportProgress();
    const ASSET_WRITE_CONCURRENCY = 8;
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const i = nextIndex++;
        if (i >= assetNames.length) return;
        const rel = assetNames[i];
        // محافظت مضاعف از path traversal در نام فایل‌های asset
        const safeRel = rel.split("/").map(part => part.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
        if (safeRel.includes("..")) continue;
        const dest = path.join(assetsDir, ...safeRel.split("/"));
        if (!dest.startsWith(assetsDir + path.sep)) continue;
        await fs.promises.writeFile(dest, optimized.assets[rel]);
        filesDone += 1;
        reportProgress();
      }
    };
    await Promise.all(Array.from({ length: Math.min(ASSET_WRITE_CONCURRENCY, Math.max(1, assetNames.length)) }, worker));
  } else {
    options.onProgress?.({ filesDone: 0, filesTotal: 0 });
  }

  // جابه‌جایی اتمیک: نسخه‌ی قبلی → .old ، موقت → مقصد ، سپس حذف .old
  options.onInstalling?.();
  const backup = path.join(THEMES_DIR, `.${id}.old-${Date.now()}`);
  try {
    if (alreadyInstalled) fs.renameSync(finalDir, backup);
    fs.renameSync(dir, finalDir);
  } catch (e) {
    // برگرداندن نسخه‌ی قبلی در صورت شکست
    if (alreadyInstalled && fs.existsSync(backup) && !fs.existsSync(finalDir)) fs.renameSync(backup, finalDir);
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  fs.rmSync(backup, { recursive: true, force: true });

  const theme = listInstalledThemes().find(t => t.id === id)!;
  return { theme, parsed: optimized, performance: performanceResult.report, replaced: alreadyInstalled };
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

  // theme.js (اختیاری) — اگر باشد در خروجی هم می‌آید
  const jsPath = path.join(dir, "theme.js");
  let componentJs = "";
  if (fs.existsSync(jsPath)) {
    componentJs = fs.readFileSync(jsPath, "utf8");
  }
  return buildThemeZip(css, meta, assets, componentJs);
}
