// Loads a `.env` file at the project root into process.env, if one exists (safe no-op
// otherwise — e.g. under a managed hosting platform, where GEMINI_API_KEY/APP_URL
// are injected directly into the environment and no .env file is present). `dotenv`
// was already an installed dependency but was never actually imported anywhere.
import "dotenv/config";
import express from "express";
import compression from "compression";
import { formidable } from "formidable";
import path from "path";
import fs from "fs";
import { createHash, randomUUID, randomBytes } from "crypto";
import { createServer as createViteServer } from "vite";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  initializeActiveProvider,
  getActiveDataProvider,
  setActiveDataProvider,
  SqliteStore,
  SqlServerStore,
  MongoStore,
  logDbQuery,
  dbQueryLogs
} from "./server/dataProviders";
import {
  SAMPLE_SYSTEMS,
  SAMPLE_CAFE_ITEMS,
  SAMPLE_ACCESSORIES,
  SAMPLE_TOURNAMENTS,
  SAMPLE_ARTICLES,
  SAMPLE_SLIDERS,
  SAMPLE_COUPONS,
  SAMPLE_TRANSACTIONS,
  SAMPLE_CHAT_ROOMS,
  SAMPLE_RESERVATION_LOGS,
  SAMPLE_SETTINGS,
  SAMPLE_COUNTS
} from "./server/sampleData";
import {
  listInstalledThemes,
  installThemeZip,
  deleteTheme,
  readThemeCss,
  getThemeAsset,
  getThemeComponentJs,
  exportThemeZip
} from "./server/themeStore";
import { GoogleGenAI, Type } from "@google/genai";
import jwt from "jsonwebtoken";

/* ═══════════════════════════════════════════════════════════════════
   DATA SOURCE MODE — «منبع داده سایت و اپلیکیشن»
   ═══════════════════════════════════════════════════════════════════
   • sample   (پیش‌فرض) → تمام لیست‌ها از داده‌های نمونه (server/sampleData.ts)
     خوانده می‌شوند؛ سایت و اپلیکیشن موبایل بدون نیاز به دیتابیس پر کار می‌کنند.
   • database            → لیست‌ها از دیتابیس خوانده می‌شوند؛ اگر جدولی خالی
     باشد، به‌صورت خودکار از داده‌های نمونه پر می‌شود (سایت هیچ‌وقت خالی نیست).

   تنظیم در پنل مدیریت ← سفارشی‌سازی کلوپ ← «منبع داده» (کلید: data_source)
   ═══════════════════════════════════════════════════════════════════ */
const DATA_SOURCE_SETTING = "data_source";
const MOBILE_APP_STORE_LINKS_SETTING = "mobile_app_store_links";
const MOBILE_APP_APK_META_SETTING = "mobile_app_apk_meta";
const JARVIS_AI_PROVIDERS_SETTING = "jarvis_ai_providers";
const SYNC_API_KEY_SETTING = "gamenet_sync_api_key";
const MOBILE_APP_APK_FILE_NAME = "bazino-app.apk";

/** کلیدهای حساسِ جدول تنظیمات که هرگز نباید از مسیر عمومی /api/settings بیرون بروند. */
const SECRET_SETTING_KEYS = new Set<string>([
  JARVIS_AI_PROVIDERS_SETTING,
  SYNC_API_KEY_SETTING,
]);
export type DataSourceMode = "sample" | "database";

export async function getDataSourceMode(): Promise<DataSourceMode> {
  try {
    const v = await getActiveDataProvider().getSetting(DATA_SOURCE_SETTING);
    return v === "database" ? "database" : "sample";
  } catch (e) {
    return "sample";
  }
}

export async function setDataSourceMode(mode: DataSourceMode): Promise<void> {
  await getActiveDataProvider().setSetting(DATA_SOURCE_SETTING, mode);
}

/** لیست نهایی یک بخش: در حالت sample → داده نمونه؛ در حالت database →
 *  داده دیتابیس، و اگر جدول خالی بود → داده نمونه (فال‌بک خودکار).
 *
 *  ⚠️ فقط برای داده‌ی **کاتالوگ** (سیستم‌ها، منوی کافه، محصولات، تورنمنت‌ها،
 *  مقالات، اسلایدرها، اتاق‌های چت). برای داده‌ی تراکنشی از
 *  resolveTransactionalList() استفاده کنید. */
export async function resolveSampleList<T>(dbRows: T[], sampleRows: T[]): Promise<T[]> {
  const mode = await getDataSourceMode();
  if (mode === "sample") return sampleRows;
  return dbRows.length > 0 ? dbRows : sampleRows;
}

/** لیست نهایی داده‌ی **تراکنشی** (رزروها، تراکنش‌های امتیاز، کوپن‌ها).
 *
 *  فرق اساسی‌اش با resolveSampleList این است که دیتابیس همیشه منبع حقیقت است:
 *  اگر حتی یک رکورد واقعی وجود داشته باشد، همان برگردانده می‌شود. داده‌ی نمونه
 *  فقط وقتی نمایش داده می‌شود که هنوز هیچ رکورد واقعی ساخته نشده باشد، تا
 *  صفحه‌ی یک نصب تازه خالی به‌نظر نرسد.
 *
 *  چرا لازم شد: resolveSampleList در حالت sample (که پیش‌فرض است) همیشه داده‌ی
 *  نمونه را برمی‌گرداند. نتیجه این بود که مشتری رزرو می‌کرد، رزروش واقعاً در
 *  reservation_logs ثبت می‌شد، ولی در «رزروهای فعال شما» سه رزرو نمونه‌ی متعلق
 *  به کس دیگری می‌دید و رزرو خودش را هرگز پیدا نمی‌کرد. */
export async function resolveTransactionalList<T>(dbRows: T[], sampleRows: T[]): Promise<T[]> {
  if (dbRows.length > 0) return dbRows;
  return (await getDataSourceMode()) === "sample" ? sampleRows : [];
}

/** لیست کاتالوگی که کاربر می‌تواند رویش محتوا بسازد (مقالات با نظرات، تورنمنت‌ها
 *  با تیم‌ها): ردیف‌های دیتابیس روی هم‌شناسه‌ی خودشان در داده‌ی نمونه می‌نشینند و
 *  بقیه‌ی ردیف‌های نمونه سر جایشان می‌مانند.
 *
 *  چرا لازم شد: وقتی کاربر روی یک مقاله‌ی نمونه نظر می‌گذارد، ensurePersisted آن
 *  مقاله را در دیتابیس materialize می‌کند. با resolveSampleList، در حالت sample
 *  همچنان کل لیست نمونه برگردانده می‌شد، پس نظر ثبت‌شده هرگز دیده نمی‌شد؛ و با
 *  resolveTransactionalList فقط همان یک مقاله می‌ماند و بقیه ناپدید می‌شدند. */
export async function resolveMergedList<T extends Record<string, any>>(
  dbRows: T[],
  sampleRows: T[],
  key: string = "id"
): Promise<T[]> {
  if ((await getDataSourceMode()) !== "sample") {
    return dbRows.length > 0 ? dbRows : sampleRows;
  }
  const byKey = new Map(dbRows.map((r) => [r[key], r]));
  const merged = sampleRows.map((r) => byKey.get(r[key]) ?? r);
  const sampleKeys = new Set(sampleRows.map((r) => r[key]));
  for (const r of dbRows) if (!sampleKeys.has(r[key])) merged.push(r);
  return merged;
}

/** پیدا کردن یک رکورد با کلید: در حالت sample → داده نمونه؛ در حالت database →
 *  دیتابیس، و اگر پیدا نشد → داده نمونه (تا جریان رزرو/سفارش/ثبت‌نام در
 *  حالت sample هم کار کند). keyField مشخص می‌کند با کدام فیلد جستجو شود
 *  (پیش‌فرض 'id' — برای کد تخفیف 'code'). */
export async function resolveSampleById<T extends Record<string, any>>(
  fetchDb: () => Promise<T | undefined>,
  sampleRows: T[],
  key: string,
  keyField: string = "id"
): Promise<T | undefined> {
  const mode = await getDataSourceMode();
  if (mode === "sample") {
    return sampleRows.find(x => x[keyField] === key) ?? (await fetchDb());
  }
  const dbRow = await fetchDb();
  return dbRow ?? sampleRows.find(x => x[keyField] === key);
}

/**
 * BACKWARD-COMPAT IMAGE REPAIR — «یک بار برای همیشه»
 *
 * نسخه‌های قدیمی، کاتالوگ را با لینک تصویر راه‌دور (unsplash) یا جایگذار
 * عمومیِ مشترک (مثل `/images/home/cafe-320.webp` برای همه‌ی آیتم‌های کافه)
 * seed می‌کردند. اپ موبایل `mobileImageUrl` را ترجیح می‌دهد، پس آن ردیف‌ها
 * برای همیشه تصویر قدیمی نشان می‌دهند — حتی بعد از پاکسازی CDN، چون خودِ
 * پیلود API قدیمی است.
 *
 * در هر بوت، فقط وقتی منبع داده «database» است: ردیف‌هایی که id آن‌ها با
 * داده‌ی نمونه یکی است و لینک ذخیره‌شده‌شان «قدیمی/خراب» به نظر می‌رسد
 * (لینک unsplash، یکی از جایگذارهای مشترک، یا مسیر محلی که فایلش روی دیسک
 * نیست) به مسیر WebP فعلیِ sampleData بازنویسی می‌شوند. به ردیف‌های
 * ساخته‌شده توسط ادمین یا لینک‌های دست‌نظافت‌دستی هرگز دست نمی‌زند و
 * کاملاً idempotent است.
 *
 * جدا از این، در هر دو حالت، مقدار mobileImageUrlهایی که به
 * /images/mobile/generated/* اشاره می‌کنند اما فایل‌شان دیگر روی دیسک نیست
 * null می‌شود (مثلاً بعد از ری‌استارت روی هاست با دیسک موقتی) تا کلاینت
 * به‌جای تصویر شکسته به imageUrl اصلی برگردد.
 */
async function repairLegacyCatalogImages(): Promise<void> {
  try {
    const store = getActiveDataProvider();
    const serveSampleMode = (await getDataSourceMode()) !== "database";

    const LEGACY_HINTS = [
      "unsplash.com", // لینک‌های راه‌دور نسخه‌های قدیمی
      "/images/home/cafe-320.webp", // جایگذار عمومیِ مشترک آیتم‌های کافه
      "/images/home/gear-shop-320.webp", // جایگذار عمومیِ مشترک فروشگاه
      "/images/home/sports-console-320.webp", // جایگذار عمومیِ مشترک کنسول/دسته
    ];
    const staticRoots = [path.join(process.cwd(), "dist"), path.join(process.cwd(), "public")];
    const isLegacyUrl = (url: string | undefined, field: "imageUrl" | "mobileImageUrl"): boolean => {
      if (!url) return false;
      if (LEGACY_HINTS.some((h) => url.includes(h))) return true;
      // مهاجرت پوشه‌ی موبایل: نسخه‌ی موبایلِ آیتم‌های داخلی باید از پوشه‌ی بهینه‌ی
      // /images/mobile بیاید (تصاویر عمودیِ اسلایدر و بازفشرده‌شده‌ی آیتم‌ها).
      // پس هر مقدار کهنه‌ی /images/home برای این فیلد مهاجرت‌داده می‌شود.
      // (imageUrlِ وب عمداً همان /images/home می‌ماند و build-in نیست.)
      if (field === "mobileImageUrl" && url.startsWith("/images/home/")) return true;
      // مسیر محلی که فایلش دیگر روی دیسک نیست = لینک خراب/قدیمی.
      // کوئریِ احتمالیِ «?v=» (اگر نسخه‌ی مهرخورده ناخواسته ذخیره شده باشد) پیش از
      // چکِ وجود فایل برداشته می‌شود تا به‌اشتباه «خراب» تلقی نشود.
      const bare = url.split("?")[0];
      if (bare.startsWith("/")) return !staticRoots.some((root) => fs.existsSync(path.join(root, bare)));
      return false;
    };

    type ImageBearingRow = { id: string; imageUrl?: string; mobileImageUrl?: string };
    const repair = async <T extends ImageBearingRow>(
      rows: T[],
      samples: T[],
      update: (id: string, fields: Partial<T>) => Promise<void>
    ): Promise<number> => {
      let n = 0;
      for (const s of samples) {
        const row = rows.find((r) => r.id === s.id);
        if (!row) continue;
        const patch: Partial<T> = {};
        if (s.imageUrl && isLegacyUrl(row.imageUrl, "imageUrl")) (patch as Record<string, string>).imageUrl = s.imageUrl;
        if (s.mobileImageUrl && isLegacyUrl(row.mobileImageUrl, "mobileImageUrl")) (patch as Record<string, string>).mobileImageUrl = s.mobileImageUrl;
        if (Object.keys(patch).length) {
          await update(row.id, patch);
          n++;
        }
      }
      return n;
    };

    // بازنویسی ردیف‌های قدیمی نسبت به داده‌ی نمونه فقط وقتی معنا دارد که
    // منبع داده «database» است؛ در حالت sample هرگز اجرا نمی‌شود تا رفتار
    // قبلی دقیقاً حفظ شود.
    if (!serveSampleMode) {
      const repaired =
        (await repair(await store.listCafeItems(), SAMPLE_CAFE_ITEMS, (id, f) => store.updateCafeItem(id, f))) +
        (await repair(await store.listAccessories(), SAMPLE_ACCESSORIES, (id, f) => store.updateAccessory(id, f))) +
        (await repair(await store.listSliders(), SAMPLE_SLIDERS, (id, f) => store.updateSlider(id, f)));
      if (repaired > 0) {
        console.log(`[Image Repair] ${repaired} legacy catalog image URL(s) updated to current local WebP paths.`);
      }
    }

    // فایل‌های تولیدشده‌ی runtime در public/images/mobile/generated روی هاست‌های
    // با دیسک موقتی (مثل Railway بدون volume) بعد از هر بازنشانی پاک می‌شوند در
    // حالی‌که DB به‌شان اشاره می‌کند؛ در آن حالت مقدار را null می‌کنیم تا اپ به
    // جای نمایش تصویر شکسته، به imageUrl اصلیِ ردیف برگردد.
    // این پاک‌سازی به حالت منبع داده بستگی ندارد (همیشه با دیسک و DB کار می‌کند،
    // نه با داده‌ی نمونه) و هرگز به ردیف‌های سروشده از نمونه دست نمی‌زند.
    const cleanDanglingGenerated = async <T extends ImageBearingRow>(
      rows: T[],
      update: (id: string, fields: Partial<T>) => Promise<void>
    ): Promise<number> => {
      let n = 0;
      for (const row of rows) {
        const url = typeof row.mobileImageUrl === "string" ? row.mobileImageUrl.split("?")[0] : "";
        if (!url.startsWith("/images/mobile/generated/")) continue;
        if (staticRoots.some((root) => fs.existsSync(path.join(root, url)))) continue;
        await update(row.id, { mobileImageUrl: null } as unknown as Partial<T>);
        n++;
      }
      return n;
    };
    const cleaned =
      (await cleanDanglingGenerated(await store.listCafeItems(), (id, f) => store.updateCafeItem(id, f))) +
      (await cleanDanglingGenerated(await store.listAccessories(), (id, f) => store.updateAccessory(id, f))) +
      (await cleanDanglingGenerated(await store.listSliders(), (id, f) => store.updateSlider(id, f)));
    if (cleaned > 0) {
      console.log(`[Image Repair] ${cleaned} dangling generated mobile image reference(s) cleared (file missing on disk).`);
    }
  } catch (e) {
    // این بهینه‌سازی هرگز نباید بوت سرور را متوقف کند
    console.error("[Image Repair] skipped due to error:", e);
  }
}

/**
 * Makes a sample row writable.
 *
 * resolveSampleById() happily hands back a SAMPLE row that exists only in
 * memory. Any follow-up `UPDATE ... WHERE id = ?` then matches zero rows and the
 * change is silently lost while the endpoint still answers `success: true`
 * (e.g. posting a comment on a sample article, or registering a team for a
 * sample tournament).
 *
 * This inserts the sample row into the database first — but only when it isn't
 * there yet — so the subsequent UPDATE has something to write to. Returns true
 * when the row is now persisted.
 */
export async function ensurePersisted<T extends Record<string, any>>(
  fetchDb: () => Promise<T | undefined>,
  create: (row: T) => Promise<void>,
  row: T | undefined
): Promise<boolean> {
  if (!row) return false;
  const existing = await fetchDb();
  if (existing) return true;
  try {
    await create(row);
    return true;
  } catch (err) {
    console.error("[ensurePersisted] Could not materialise sample row:", err);
    return false;
  }
}

// ==== مهر نسخه‌ی دارایی روی تصاویر public (رفع گزارش Lighthouse: «A long cache
// lifetime / efficient cache policy») ====
// فایل‌های /images/* در public/ قرار دارند و برخلاف باندل‌های Vite هش محتوایی نمی‌گیرند،
// برای همین قبلاً فقط ۷ روز کش می‌شدند. راه‌حلِ امنِ کش طولانی: به هر URL «?v=<نسخه>»
// می‌چسبانیم و نسخه را با هر دپلویِ محتوامتفاوت عوض می‌کنیم؛ آنگاه می‌توان به این
// URLها کشِ immutable یک‌ساله داد و کاربر بعد از هر دپلو دقیقاً فایل جدید را می‌گیرد —
// بدون بازگشتِ مشکل دیدن تصویر قدیمی. در حالت توسعه نسخه خالی می‌ماند و URLها
// دست‌نخورده‌اند (رفتار قبلی).
let ASSET_VERSION = "";

function stampImageAssetUrl(url: string): string {
  if (!ASSET_VERSION || !url.startsWith("/images/")) return url;
  // اگر URL از قبل مهرِ «?v=» داشته باشد (مثلاً نسخه‌ی کهنه‌ای که ناخواسته در
  // دیتابیس ذخیره شده)، مهر را با نسخه‌ی جاری بازنویسی می‌کنیم تا همیشه با
  // کش immutable یک‌ساله سرو شود.
  const q = url.indexOf("?");
  const bare = q === -1 ? url : url.slice(0, q);
  const rest = q === -1 ? "" : url.slice(q + 1);
  const params = rest ? rest.split("&").filter((p) => p && !p.startsWith("v=")) : [];
  params.push(`v=${encodeURIComponent(ASSET_VERSION)}`);
  return `${bare}?${params.join("&")}`;
}

// پاسخ‌های JSON را بدون تغییر ساختاری پیمایش می‌کند (رشته/آرایه/آبجکت ساده تا عمق ۸)
// و به رشته‌های «/images/…» مهر نسخه می‌زند. آبجکت‌های غیرساده (Buffer، Date، …) دست‌نخورده می‌مانند.
function stampImageAssetUrls(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return stampImageAssetUrl(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => stampImageAssetUrls(item, depth + 1));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = stampImageAssetUrls(entry, depth + 1);
  }
  return out;
}

// ==== ساخت خودکار نسخه‌ی موبایل از تصویر اصلی (پنل مدیریت) ====
// وقتی ادمین تصویری ثبت می‌کند و «ساخت خودکار» فعال است، با sharp از روی تصویر
// اصلی یک واریانت سبک با ابعاد متناسبِ اپ می‌سازیم و در public/images/mobile/generated
// ذخیره می‌کنیم. نام فایل = هشِ محتوای منبع + نوع کاربرد؛ یعنی:
//   الف) درخواست تکراری همان فایل را بازاستفاده می‌کند،
//   ب) هر تغییر محتوا نامِ جدید می‌سازد، پس کش immutable بدون نیاز به مهر «?v=» امن است.
// شکست در تولید هرگز ثبت آیتم را نمی‌شکند: با undefined برمی‌گردیم و اپ به
// imageUrl اصلی برمی‌گردد (رفتار قبلی).
const MOBILE_IMAGE_PRESETS = {
  item: { width: 400, height: 400, quality: 78 },    // کارت آیتم کافه/فروشگاه — مربع
  slide: { width: 640, height: 854, quality: 80 },   // اسلایدر اپ — عمودی ۳:۴ (کادر Expanded/تمام‌قد)
  article: { width: 640, height: 360, quality: 80 }, // کارت مقاله — ۱۶:۹
} as const;
type MobileImageKind = keyof typeof MOBILE_IMAGE_PRESETS;

const generatedMobileDir = () => path.join(process.env.BAZINO_STATIC_ROOT || process.cwd(), "public", "images", "mobile", "generated");

async function generateMobileImageVariant(imageUrl: string | undefined, kind: MobileImageKind): Promise<string | undefined> {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) return undefined;
  const preset = MOBILE_IMAGE_PRESETS[kind];
  try {
    const bareUrl = imageUrl.trim().split("?")[0];
    let srcBuffer: Buffer | null = null;
    if (bareUrl.startsWith("/")) {
      // منبع لوکال: اول public (منبعِ بیلد)، بعد dist (خروجی production)
      const staticRoot = process.env.BAZINO_STATIC_ROOT || process.cwd();
      for (const root of [path.join(staticRoot, "public"), path.join(staticRoot, "dist")]) {
        try { srcBuffer = await fs.promises.readFile(path.join(root, bareUrl)); break; } catch { /* ریشه‌ی بعدی */ }
      }
    } else if (/^https:\/\/images\.unsplash\.com\//.test(bareUrl)) {
      // دانلود منبع خارجی فقط به Unsplash (هاستِ توصیه‌شده در فرم‌های ادمین) محدود شده
      // تا سطح SSRF کوچک بماند؛ سقف ۸ مگابایت و تایم‌اوت ۶ ثانیه.
      const resp = await fetch(bareUrl, { signal: AbortSignal.timeout(6000) });
      if (resp.ok) {
        const len = Number(resp.headers.get("content-length") || 0);
        if (len <= 8 * 1024 * 1024) {
          srcBuffer = Buffer.from(await resp.arrayBuffer());
          if (srcBuffer.length > 8 * 1024 * 1024) srcBuffer = null;
        }
      }
    }
    if (!srcBuffer) {
      // بدون این لاگ، مسیر رایج «نام فایل اشتباه/فایل ناموجود یا لینک غیرمجاز»
      // کاملاً بی‌صداز هم بود undefined برمی‌گردد و دیباگِ ادمین غیرممکن می‌شود.
      console.warn(
        `[Mobile Image] auto-generation skipped: source unreadable or not allowed (url=${imageUrl}, kind=${kind}). ` +
        `Local files must exist under public/ or dist/; remote sources are limited to https://images.unsplash.com/* (8MB max).`
      );
      return undefined;
    }
    const hash = createHash("sha256").update(srcBuffer).update(String(kind)).digest("hex").slice(0, 10);
    const outName = `gen-${kind}-${hash}.webp`;
    const outDir = generatedMobileDir();
    const outPath = path.join(outDir, outName);
    if (!fs.existsSync(outPath)) {
      // import تنبل: اگر sharp روی محیطی نصب/قابل‌استفاده نبود، فقط تولید نسخه رد می‌شود نه بوت سرور
      const sharp = (await import("sharp")).default;
      await fs.promises.mkdir(outDir, { recursive: true });
      await sharp(srcBuffer)
        .rotate()
        .resize(preset.width, preset.height, { fit: "cover", position: "attention" })
        .webp({ quality: preset.quality, effort: 5 })
        .toFile(outPath);
    }
    return `/images/mobile/generated/${outName}`;
  } catch (err) {
    console.error("[Mobile Image] auto-generation failed:", err);
    return undefined;
  }
}

// اولویت: مقدار دستیِ ادمین → ساخت خودکار → undefined (اپ خودش به imageUrl برمی‌گردد)
async function resolveAdminMobileImageUrl(
  manualValue: unknown,
  autoGenerate: unknown,
  imageUrl: string | undefined,
  kind: MobileImageKind
): Promise<string | undefined> {
  const manual = typeof manualValue === "string" && manualValue.trim() ? manualValue.trim() : undefined;
  if (manual) return manual;
  if (autoGenerate === false) return undefined;
  return generateMobileImageVariant(imageUrl, kind);
}

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === "production" ? (Number(process.env.PORT) || 3000) : 3000;

  app.use(compression());

  // مهر نسخه‌ی دارایی روی URLهای تصاویر در پاسخ‌های API — تا اپ موبایل و کلاینت وب
  // همان URL نسخه‌دار را دریافت کنند و بتوانند با کش immutable یک‌ساله سرو شوند.
  // مقدار ASSET_VERSION هنگام درخواست خوانده می‌شود و در production قبل از listen
  // محاسبه شده است؛ در dev خالی است و این میدل‌ویر عملاً بی‌اثر است.
  app.use((_req, res, next) => {
    const sendJson = res.json.bind(res);
    res.json = ((body: unknown) => sendJson(stampImageAssetUrls(body))) as typeof res.json;
    next();
  });

  // Cloudflare Web Analytics injects beacon.min.js at the edge when enabled. Its CDN TTL
  // is controlled by Cloudflare (not this origin), so an origin cache header cannot make
  // that 24-hour asset cache longer. Keep third-party scripts out of production pages;
  // this prevents the injected beacon from being fetched at all while retaining the
  // explicitly deferred Google Font stylesheet and external images/embeds used by themes.
  if (process.env.NODE_ENV === "production") {
    app.use((_req, res, next) => {
      res.setHeader("Content-Security-Policy", [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https: ws: wss:",
        "frame-src 'self' https:"
      ].join("; "));
      next();
    });
  }

  // Create HTTP server from express app
  const server = http.createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Handle manual upgrade for /api/chat/ws to avoid conflicts with Vite's HMR WebSocket
  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? request.url.split("?")[0] : "";
    if (pathname === "/api/chat/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // Handle real-time WebSocket communication
  wss.on("connection", (socket) => {
    socket.on("message", async (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.event === "message") {
          const { room, username, message: text } = payload.data;
          const newMsg = {
            id: "msg-" + Math.random().toString(36).substring(2, 9),
            room,
            username,
            message: text,
            timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
          };

          await getActiveDataProvider().addChatMessage(newMsg);

          // Broadcast to all connected clients
          const broadcastPayload = JSON.stringify({ event: "message", data: newMsg });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastPayload);
            }
          });
        }
      } catch (err) {
        console.error("[WebSocket Server Error]:", err);
      }
    });
  });

  // Parse ordinary JSON requests globally. Upload routes must keep the incoming stream
  // untouched so formidable/raw parsers can consume it directly.
  const jsonParser = express.json({ limit: "260mb" });
  app.use((req, res, next) => {
    if (
      req.path === "/api/admin/mobile-app/upload-apk" ||
      req.path === "/api/admin/mobile-app/upload-apk/chunk" ||
      req.path === "/api/admin/themes/install"
    ) return next();
    return jsonParser(req, res, next);
  });

  // body-parser errors otherwise fall through Express' default HTML error page, which
  // hides the useful status/body from API clients. Always return a small JSON diagnostic.
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isBodyParserError = Boolean(
      error && (
        error.type === "entity.too.large" ||
        error.type === "entity.parse.failed" ||
        error.type === "request.aborted" ||
        error.status === 400 ||
        error.status === 413
      )
    );
    if (!isBodyParserError) return next(error);

    const status = error.type === "entity.too.large" || error.status === 413 ? 413 : 400;
    if (req.path.includes("upload-apk")) {
      console.error("[APK Upload] Request body parser rejected the upload", {
        path: req.path,
        status,
        type: error.type,
        message: error.message,
        contentLength: req.headers["content-length"] || "unknown",
      });
    }
    return res.status(status).json({
      error: status === 413 ? "Request body is too large" : "Request body could not be parsed",
      code: error.type || "BODY_PARSE_ERROR",
      status,
      details: error.message || String(error),
    });
  });

  // CORS: needed for the Management App desktop build, which runs its OWN local server +
  // database and calls this server's /api/sync/* endpoints from a different origin over
  // the internet. Wildcard is safe here specifically because auth on every route in this
  // file is bearer-token based (JWT for the site, API-key for /api/sync/*) — never cookies
  // — so there's no session/credential to leak cross-origin. Native apps (Flutter) and the
  // co-located web app (same-origin) are unaffected either way.
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // =========================================================================
  // REAL PER-USER AUTHENTICATION (JWT)
  // Every login/register issues a real, independent token for that specific
  // user. Each request is authenticated from its own Authorization header —
  // NOT from a single shared "active user" setting. This is what makes it
  // safe for many different real people (web visitors + mobile app users) to
  // be logged in as themselves, at the same time, without seeing each
  // other's data.
  //
  // A request with no (or an invalid) token is simply anonymous: it is served
  // as "Guest" and sees no personal data at all. There is no server-wide
  // "current user" concept anywhere in this codebase.
  // =========================================================================
  const JWT_SECRET = process.env.JWT_SECRET || (() => {
    // در production یک راز پیش‌فرضِ عمومی یعنی هر کسی می‌تواند توکن ادمین جعل کند.
    // یک هشدار در لاگ کافی نیست — لاگ دیده نمی‌شود و سایت ناامن بالا می‌ماند.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[Security] JWT_SECRET is not set. Refusing to start in production: without a real secret " +
        "anyone can forge an admin token. Set JWT_SECRET to a long random value and restart."
      );
      process.exit(1);
    }
    console.warn(
      "[Security] JWT_SECRET is not set in the environment. Using an INSECURE development-only fallback secret. " +
      "Set a real, random JWT_SECRET before deploying to production, or every token can be forged."
    );
    return "bazino-dev-insecure-secret-change-me";
  })();
  const JWT_EXPIRES_IN = "30d";

  function signAuthToken(username: string): string {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Reads and verifies the Authorization header (if present) and attaches the
  // real authenticated username to the request. Never hard-fails the request
  // on a missing/invalid token — routes decide for themselves whether a
  // logged-in user is required (this keeps guest browsing working).
  app.use((req, _res, next) => {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(header.slice(7), JWT_SECRET) as { username: string };
        (req as any).authUsername = decoded.username;
      } catch {
        // Expired/invalid token — treat the request as unauthenticated rather than rejecting it outright
      }
    }
    next();
  });

  // =========================================================================
  // DATABASE ENGINE BOOTSTRAP
  // Connects to whichever provider was chosen at install time (SQLite/SQL
  // Server/MongoDB) and verifies/creates its schema. Sample data is NEVER
  // auto-loaded here — it is only ever loaded through the install wizard's
  // "installSampleData" toggle, or later via the admin panel's reset button.
  // =========================================================================
  await initializeActiveProvider();
  const bootStore = getActiveDataProvider();

  // ردیف‌های قدیمی کاتالوگ (لینک unsplash یا جایگذار عمومی cafe-320) را در
  // حالت database به تصاویر محلی فعلی برمی‌گرداند؛ در حالت sample بی‌اثر است.
  // همچنین رفرنس‌های mobileImageUrl که به فایل پاکشده در images/mobile/generated
  // اشاره می‌کنند (دیسک موقتیِ هاست) را در هر دو حالت null می‌کند.
  await repairLegacyCatalogImages();

  // One-time cleanup for installs created before identity moved fully into the
  // JWT: the old shared "activeUsername" setting made anonymous visitors look
  // like whoever logged in last. Nothing reads it any more, so blank it out so
  // a future reader can't mistake it for live state.
  try {
    const stale = await bootStore.getSetting("activeUsername");
    if (stale) {
      await bootStore.setSetting("activeUsername", "");
      console.log(`[${bootStore.name}] Cleared the obsolete shared "activeUsername" setting (identity now comes from the JWT only).`);
    }
  } catch { /* non-fatal */ }

  // مهاجرت یک‌باره (تصمیم کاربر، گزینه‌ی «ب»): کدهای LOYAL-… که پیش از افزودن ستون
  // ownerUsername ساخته شده‌اند مالک ندارند. اگر عمومی بمانند، هر کسی می‌تواند کدی را که
  // مشتری دیگری با امتیازش خریده خرج کند؛ پس غیرفعال می‌شوند.
  try {
    const disabled = await bootStore.deactivateLegacyOwnerlessLoyaltyCoupons();
    if (disabled > 0) {
      console.log(`[${bootStore.name}] Deactivated ${disabled} legacy ownerless LOYAL-* coupon(s); they predate per-user coupon ownership.`);
    }
  } catch (err) {
    console.warn(`[${bootStore.name}] Could not deactivate legacy loyalty coupons:`, err);
  }

  // Safety net only: if for some reason no admin account exists at all
  // (e.g. local dev before /install was ever completed), create a minimal
  // fallback admin so the app doesn't hard-crash. This never seeds samples.
  try {
    const userCount = await bootStore.countUsers();
    if (userCount === 0) {
      console.log(`[${bootStore.name}] No users found. Creating a minimal fallback admin (no sample data will be loaded automatically).`);
      await bootStore.seedMinimal({
        username: "admin",
        password: "admin",
        email: "admin@gamenet.com",
        phone: "09123456780"
      });
    }
  } catch (err) {
    console.error(`[${bootStore.name}] Error checking/seeding minimal admin account:`, err);
  }

  // Resolves the REAL current user for this specific request — and ONLY from the
  // signed JWT on that request.
  //
  // This used to fall back to a shared, server-wide "activeUsername" setting when
  // no token was sent, as a compatibility shim for an older single-user version of
  // the website. That shim leaked private data: because /api/auth/register and
  // /api/auth/login overwrote the setting, an *anonymous* visitor calling
  // GET /api/user received the full profile — including e-mail and phone number —
  // of whoever logged in last, and the UI rendered them as that person. On a fresh
  // install the setting is seeded to "admin", so every visitor saw the admin banner.
  //
  // No token now means Guest, full stop. Clients authenticate with a Bearer token
  // (the website attaches one automatically via src/services/authToken.ts).
  async function getCurrentUser(req?: express.Request) {
    const store = getActiveDataProvider();
    const tokenUsername = (req && (req as any).authUsername) || "Guest";

    if (tokenUsername === "Guest") {
      return { username: "Guest", email: "", phone: "", loyaltyPoints: 0, role: "gamer" };
    }

    const row = await store.getUserByUsername(tokenUsername);
    if (row) {
      return {
        username: row.username,
        email: row.email,
        phone: row.phone || "",
        loyaltyPoints: row.loyaltyPoints,
        role: row.role || "gamer"
      };
    }

    return { username: "Guest", email: "", phone: "", loyaltyPoints: 0, role: "gamer" };
  }

  /** آیا این نام کاربری نقش admin دارد؟ نقش هر بار از دیتابیس خوانده می‌شود، نه از توکن،
   *  تا سلب دسترسی ادمین فوری اثر کند. */
  async function isAdminUsername(username?: string): Promise<boolean> {
    if (!username) return false;
    const row = await getActiveDataProvider().getUserByUsername(username);
    return (row?.role || "gamer") === "admin";
  }

  // Requires a REAL authenticated user (a valid token). Used by routes where
  // acting as "Guest" would make no sense (e.g. checking "my" reservation).
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!(req as any).authUsername) {
      return res.status(401).json({ error: "برای این عملیات باید وارد حساب کاربری خود شوید." });
    }
    next();
  }

  // Requires a REAL authenticated user whose role is "admin".
  //
  // Privileged routes demand a real, signed JWT (req.authUsername) and re-check
  // the role against the database on every request, so revoking a user's admin
  // role takes effect immediately instead of living on inside an old token.
  async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const username = (req as any).authUsername;
      if (!username) {
        return res.status(401).json({ error: "برای دسترسی به این بخش باید با حساب مدیر وارد شوید." });
      }
      const row = await getActiveDataProvider().getUserByUsername(username);
      if (!row || (row.role || "gamer") !== "admin") {
        return res.status(403).json({ error: "این عملیات فقط برای مدیر سیستم مجاز است." });
      }
      next();
    } catch (err) {
      console.error("[Admin Auth] Error verifying admin privileges:", err);
      res.status(500).json({ error: "Failed to verify admin privileges" });
    }
  }

  // Single choke point: every current AND future /api/admin/* route is gated here,
  // so a new admin endpoint can't accidentally ship unprotected.
  app.use("/api/admin", requireAdmin);

  // =========================================================================
  // API ROUTE CONTROLLERS
  // =========================================================================

  // Authentication Endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, phone } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: "لطفاً تمامی فیلدهای ضروری را پر کنید." });
      }

      const store = getActiveDataProvider();
      const exists = await store.getUserByUsername(username);
      if (exists) {
        return res.status(400).json({ error: "این نام کاربری قبلاً توسط گیمر دیگری ثبت شده است." });
      }

      // createUser hashes the password internally (bcrypt) before storing it
      await store.createUser({ username, password, email, phone: phone || "" });
      // NOTE: deliberately does NOT write a server-wide "activeUsername" setting.
      // Identity lives in the JWT returned below — see getCurrentUser().

      const newUser = {
        username,
        email,
        phone: phone || "",
        loyaltyPoints: 100,
        role: "gamer"
      };

      // Welcome transaction
      const newTx = {
        id: "wel-" + Math.random().toString(36).substring(2, 9),
        points: 100,
        description: "هدیه خوش‌آمدگویی عضویت طلایی بازینو",
        type: "Bonus",
        date: "امروز",
        username,
      };
      await store.addTransaction(newTx);

      // Real, independent token for this specific user (mobile app / any future client)
      const token = signAuthToken(username);
      res.json({ success: true, user: newUser, token });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "لطفاً نام کاربری و کلمه عبور را وارد کنید." });
      }

      const store = getActiveDataProvider();
      // verifyLogin compares the given password against the stored bcrypt hash
      const found = await store.verifyLogin(username, password);
      if (!found) {
        return res.status(400).json({ error: "نام کاربری یا کلمه عبور اشتباه است." });
      }

      // NOTE: deliberately does NOT write a server-wide "activeUsername" setting.
      // Identity lives in the JWT returned below — see getCurrentUser().

      const user = {
        username: found.username,
        email: found.email,
        phone: found.phone || "",
        loyaltyPoints: found.loyaltyPoints,
        role: found.role || "gamer"
      };

      // Real, independent token for this specific user (mobile app / any future client)
      const token = signAuthToken(found.username);
      res.json({ success: true, user, token });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Lets a client (mobile app) verify a stored token is still valid and fetch the
  // real, up-to-date user record for it — used on app start instead of re-logging in.
  app.get("/api/auth/me", async (req, res) => {
    const authUsername = (req as any).authUsername;
    if (!authUsername) {
      return res.status(401).json({ error: "توکن نامعتبر یا منقضی شده است." });
    }
    const store = getActiveDataProvider();
    const row = await store.getUserByUsername(authUsername);
    if (!row) {
      return res.status(401).json({ error: "کاربر یافت نشد." });
    }
    res.json({
      success: true,
      user: { username: row.username, email: row.email, phone: row.phone || "", loyaltyPoints: row.loyaltyPoints, role: row.role || "gamer" }
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // JWT logout is client-side: the browser discards the token. Nothing is
      // stored server-side for a session, so there is nothing to clear here.
      res.json({ success: true, user: { username: "Guest", email: "", phone: "", loyaltyPoints: 0, role: "gamer" } });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Chat Room Endpoints
  app.get("/api/chat/rooms", async (req, res) => {
    try {
      const rooms = await resolveSampleList(await getActiveDataProvider().listChatRooms(), SAMPLE_CHAT_ROOMS);
      res.json(rooms);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/chat/rooms", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "نام اتاق گفتگو الزامی است." });
      }
      const store = getActiveDataProvider();
      await store.createChatRoom(name);
      const rooms = await store.listChatRooms();
      res.json({ success: true, chatRooms: rooms });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/chat-rooms/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const store = getActiveDataProvider();
      await store.deleteChatRoom(decodeURIComponent(name));
      const rooms = await store.listChatRooms();
      res.json({ success: true, chatRooms: rooms });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/chat/messages/:room", async (req, res) => {
    try {
      const { room } = req.params;
      const messages = await getActiveDataProvider().listChatMessages(room);
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const { room, username, message } = req.body;
      if (!room || !username || !message) {
        return res.status(400).json({ error: "اطلاعات پیام ناقص است." });
      }

      const newMsg = {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        room,
        username,
        message,
        timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
      };

      await getActiveDataProvider().addChatMessage(newMsg);

      // Broadcast to all WebSocket clients
      const payload = JSON.stringify({ event: "message", data: newMsg });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

      res.json({ success: true, message: newMsg });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // User Endpoints
  app.get("/api/user", async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/user/points", async (req, res) => {
    try {
      const { points, description } = req.body;
      if (typeof points === "number") {
        const store = getActiveDataProvider();
        const user = await getCurrentUser(req);
        if (user.username !== "Guest") {
          await store.addLoyaltyPointsToUser(user.username, points);
          user.loyaltyPoints += points;
        }

        const newTx = {
          id: Math.random().toString(36).substring(2, 9),
          points,
          description,
          type: points > 0 ? "Earned" : "Redeemed",
          date: "امروز",
          username: user.username !== "Guest" ? user.username : "",
        };
        await store.addTransaction(newTx);
        const transactions = (await store.listTransactions()).filter(t => (t.username || "") === user.username);
        res.json({ success: true, user, transactions });
      } else {
        res.status(400).json({ error: "Invalid points amount" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // تاریخچه‌ی امتیاز خودِ کاربر. قبلاً کل جدول برگردانده می‌شد، یعنی هر مشتری الگوی خرید و
  // رفت‌وآمد بقیه را می‌دید. ردیف‌های بدون username میراث‌اند و فقط به ادمین نشان داده می‌شوند.
  app.get("/api/transactions", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const username = (req as any).authUsername as string | undefined;
      const all = await resolveTransactionalList(await store.listTransactions(), SAMPLE_TRANSACTIONS);

      if (!username) return res.json([]);
      if (await isAdminUsername(username)) return res.json(all);

      const transactions = all.filter((t: any) => (t.username || "") === username);
      res.json(transactions);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // کدهای تبلیغاتی عمومی (بدون مالک) + کدهای شخصیِ خودِ کاربر. یک کد LOYAL-… که مشتری با
  // امتیازش خریده نباید در لیست بقیه ظاهر شود؛ چون یک‌بارمصرف است، اولین کسی که می‌دیدش آن را
  // خرج می‌کرد و امتیاز صاحبش از بین می‌رفت.
  app.get("/api/coupons", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const username = (req as any).authUsername as string | undefined;
      const all = await resolveTransactionalList(await store.listCoupons(), SAMPLE_COUPONS);

      if (username && (await isAdminUsername(username))) return res.json(all);

      const coupons = all.filter((c: any) => {
        const owner = c.ownerUsername || "";
        return owner === "" || owner === username;
      });
      res.json(coupons);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // تبدیل امتیاز به کد تخفیف.
  //
  // نرخ تبدیل و خودِ کد **فقط اینجا** تعیین می‌شوند. قبلاً `couponValue` و `code` از بدنه‌ی
  // درخواست خوانده می‌شدند و تنها اعتبارسنجی «آیا کاربر این‌قدر امتیاز دارد؟» بود؛ یعنی با یک
  // درخواست دستی می‌شد با ۱ امتیاز یک کوپن ۵۰ میلیون تومانی ساخت، یا کدی ساخت که با یک کد
  // تبلیغاتی موجود تداخل کند. همان قاعده‌ای که برای رزرو و سفارش رعایت شده بود، اینجا از قلم
  // افتاده بود: هرگز به عددی که کلاینت می‌فرستد اعتماد نکن.
  const POINTS_TO_TOMAN = 100;      // ۱ امتیاز = ۱۰۰ تومان
  const MIN_REDEEM_POINTS = 100;

  app.post("/api/loyalty/redeem", requireAuth, async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const user = await getCurrentUser(req);

      const points = Math.floor(Number(req.body?.points));
      if (!Number.isFinite(points) || points < MIN_REDEEM_POINTS) {
        return res.status(400).json({ error: `حداقل امتیاز قابل تبدیل ${MIN_REDEEM_POINTS} امتیاز است.` });
      }
      if (user.loyaltyPoints < points) {
        return res.status(400).json({ error: "امتیاز کافی ندارید" });
      }

      const couponValue = points * POINTS_TO_TOMAN;

      // کد یکتا، سمت سرور. اگر برخورد داشت چند بار دیگر تلاش می‌شود.
      let code = "";
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = `LOYAL-${randomBytes(4).toString("hex").toUpperCase()}`;
        if (!(await store.getCouponByCode(candidate))) { code = candidate; break; }
      }
      if (!code) {
        return res.status(500).json({ error: "تولید کد تخفیف ناموفق بود. دوباره تلاش کنید." });
      }

      await store.addLoyaltyPointsToUser(user.username, -points);
      user.loyaltyPoints -= points;

      await store.addTransaction({
        id: Math.random().toString(36).substring(2, 9),
        points: -points,
        description: `تبدیل ${points} امتیاز به کد تخفیف ${couponValue.toLocaleString()} تومانی (${code})`,
        type: "Redeemed",
        date: "امروز",
        username: user.username,
      });

      await store.createCoupon({
        code,
        type: "Fixed",
        value: couponValue,
        minOrder: couponValue * 1.5,
        expiry: "۳۰ روز دیگر",
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        maxUsageCount: 1,
        usageCount: 0,
        isActive: true,
        ownerUsername: user.username,      // کد شخصی است: فقط خودش می‌بیند و خرج می‌کند
      });

      const allTransactions = await store.listTransactions();
      const allCoupons = await store.listCoupons();

      res.json({
        success: true,
        user,
        code,
        couponValue,
        transactions: allTransactions.filter(t => (t.username || "") === user.username),
        activeCoupons: allCoupons.filter(c => !c.ownerUsername || c.ownerUsername === user.username),
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Systems & Reservations
  app.get("/api/systems", async (req, res) => {
    try {
      const systems = await resolveSampleList(await getActiveDataProvider().listSystems(), SAMPLE_SYSTEMS);
      res.json(systems);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Computes hour difference between two "HH:MM" strings (e.g. "14:00" -> "16:30" = 2.5)
  function hoursBetween(startTime: string, endTime: string): number {
    const [sh, sm] = String(startTime).split(":").map(Number);
    const [eh, em] = String(endTime).split(":").map(Number);
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return 0;
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff / 60 : 0;
  }

  // Adds a number of hours to an "HH:MM" string, wrapping within a 24h day (e.g. "22:30" + 3 -> "01:30")
  function addHoursToTimeString(time: string, hours: number): string {
    const [h, m] = String(time).split(":").map(Number);
    const totalMinutes = ((h * 60 + m) + hours * 60) % (24 * 60);
    const newH = Math.floor(totalMinutes / 60);
    const newM = Math.round(totalMinutes % 60);
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  }

  app.post("/api/systems/reserve", async (req, res) => {
    try {
      const { systemId, startTime, endTime, date, couponCode } = req.body;
      const store = getActiveDataProvider();
      const system = await resolveSampleById(() => store.getSystemById(systemId), SAMPLE_SYSTEMS, systemId);

      if (!system) {
        return res.status(404).json({ error: "System not found" });
      }

      const st = startTime || "12:00";
      const et = endTime || "14:00";
      const reservationDate = date || "امروز";

      // Business rule: never allow two paid reservations to overlap on the same system/date
      const overlapping = await store.hasOverlappingReservation(systemId, reservationDate, st, et);
      if (overlapping) {
        return res.status(409).json({ error: "این سیستم در بازه زمانی انتخابی شما قبلاً رزرو شده است. لطفاً بازه دیگری انتخاب کنید." });
      }

      // Price and points are always computed server-side from the system's real
      // hourly rate — the client cannot influence how much is charged or earned.
      const durationHours = hoursBetween(st, et) || 1;
      const baseTotal = Math.round(durationHours * system.hourlyRate);
      const { discountAmount, coupon } = await validateCouponServerSide(baseTotal, couponCode, (req as any).authUsername);
      const totalPrice = Math.max(0, baseTotal - discountAmount);
      const pointsEarned = Math.floor(totalPrice / 10000);

      await store.setSystemReserved(systemId, true);

      const user = await getCurrentUser(req);
      if (user.username !== "Guest") {
        await store.addLoyaltyPointsToUser(user.username, pointsEarned);
        user.loyaltyPoints += pointsEarned;
      }

      // Add loyalty transaction
      const newTx = {
        id: Math.random().toString(36).substring(2, 9),
        points: pointsEarned,
        description: `امتیاز بابت رزرو سانس سیستم ${system.name}`,
        type: "Earned",
        date: "امروز",
        username: user.username !== "Guest" ? user.username : "",
      };
      await store.addTransaction(newTx);

      // Save reservation logs
      const log = {
        id: Math.random().toString(36).substring(2, 9),
        systemId,
        username: user.username !== "Guest" ? user.username : "",
        systemName: system.name,
        startTime: st,
        endTime: et,
        totalPrice,
        date: reservationDate,
        checkedIn: false,
        timestamp: new Date().toISOString()
      };
      await store.addReservationLog(log);

      // Record the usage (increments usageCount; deactivates once maxUsageCount is reached)
      if (coupon) {
        const consumed = await store.recordCouponUsage(couponCode);
        if (!consumed) {
          return res.status(409).json({ error: "این کد تخفیف هم‌زمان توسط درخواست دیگری مصرف شد. لطفاً دوباره تلاش کنید." });
        }
      }

      const systems = await store.listSystems();
      const transactions = await store.listTransactions();
      const reservationLogs = await store.listReservationLogs();

      res.json({
        success: true,
        systems,
        user,
        transactions,
        reservationLogs,
        totalPrice,
        pointsEarned
      });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ error: e.message || String(e) });
    }
  });

  // A customer's own bookings and QR check-in codes. Private on purpose: a QR
  // token is what unlocks a seat, so showing someone else's would let a visitor
  // walk in on a session they never paid for.
  //
  //   • anonymous          → [] (the UI then asks them to sign in)
  //   • signed-in customer → only rows whose username matches their token
  //   • admin              → everything, so the front desk can see the floor
  //
  // Sample rows carry username: "" and are only ever returned while the club
  // has no real bookings yet, so a fresh install doesn't look broken.
  app.get("/api/reservations", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const username = (req as any).authUsername as string | undefined;
      const all = await resolveTransactionalList(await store.listReservationLogs(), SAMPLE_RESERVATION_LOGS);

      if (!username) return res.json([]);
      if (await isAdminUsername(username)) return res.json(all);

      res.json(all.filter((r: any) => r.username === username));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/reservations/:id/checkin", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      const reservation = await resolveSampleById(() => store.getReservationLogById(id), SAMPLE_RESERVATION_LOGS, id);
      if (reservation) {
        // A sample reservation must be materialised first, otherwise the
        // check-in UPDATE matches no rows and the guest is never marked present.
        await ensurePersisted(
          () => store.getReservationLogById(id),
          r => store.addReservationLog(r),
          reservation
        );
        await store.setReservationCheckedIn(id);
        const reservationLogs = await store.listReservationLogs();
        res.json({
          success: true,
          reservation: { ...reservation, checkedIn: true },
          reservationLogs
        });
      } else {
        res.status(404).json({ error: "Reservation not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/reservations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteReservationLog(id);
      const reservationLogs = await store.listReservationLogs();
      res.json({ success: true, reservationLogs });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Real reservation extension (used by the website, the app, and the Jarvis assistant).
  // Cost is always 50 loyalty points per hour, computed and charged server-side.
  app.post("/api/reservations/extend", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const user = await getCurrentUser(req);
      if (user.username === "Guest") {
        return res.status(401).json({ error: "برای تمدید رزرو باید وارد حساب کاربری خود شوید." });
      }

      const hours = Math.max(1, Math.min(4, Number(req.body?.hours) || 1));
      const active = await store.getActiveReservationForUser(user.username);
      if (!active) {
        return res.status(404).json({ error: "در حال حاضر هیچ رزرو فعالی برای شما یافت نشد." });
      }

      const pointsNeeded = hours * 50;
      const freshUser = await store.getUserByUsername(user.username);
      if (!freshUser || freshUser.loyaltyPoints < pointsNeeded) {
        return res.status(400).json({ error: `امتیاز باشگاه کافی نیست. تمدید ${hours} ساعت به ${pointsNeeded} امتیاز نیاز دارد.` });
      }

      const newEndTime = addHoursToTimeString(active.endTime, hours);
      const overlapping = await store.hasOverlappingReservation(active.systemId, active.date, active.endTime, newEndTime);
      if (overlapping) {
        return res.status(409).json({ error: "بلافاصله بعد از پایان رزرو فعلی شما، این سیستم برای کاربر دیگری رزرو شده است." });
      }

      const system = await store.getSystemById(active.systemId);
      const additionalPrice = (system?.hourlyRate || 0) * hours;
      await store.extendReservation(active.id, newEndTime, additionalPrice);
      await store.addLoyaltyPointsToUser(user.username, -pointsNeeded);
      await store.addTransaction({
        id: Math.random().toString(36).substring(2, 9),
        points: -pointsNeeded,
        description: `تمدید ${hours} ساعته ${active.systemName}`,
        type: "Redeemed",
        date: "امروز",
        username: user.username,
      });

      const updatedReservation = await store.getReservationLogById(active.id);
      res.json({ success: true, reservation: updatedReservation, pointsCharged: pointsNeeded, newEndTime });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Real support request from a user to on-duty staff (shows up in the admin panel's messages list)
  app.post("/api/support/request", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "متن درخواست نمی‌تواند خالی باشد." });
      }
      const store = getActiveDataProvider();
      const user = await getCurrentUser(req);

      const supportMsg = {
        id: "sup-" + Math.random().toString(36).substring(2, 9),
        sender: user.username,
        recipient: "Admin",
        title: "درخواست پشتیبانی حضوری",
        body: message,
        date: "امروز",
        isRead: false,
        type: "support",
      };
      await store.addUserMessage(supportMsg);

      const payload = JSON.stringify({ event: "notification", data: supportMsg });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      });

      res.json({ success: true, message: supportMsg });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  type JarvisAiProviderConfig = {
    id: string;
    provider: "gemini" | "groq" | "openrouter" | "ollama" | "custom";
    label?: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    enabled: boolean;
  };

  const defaultModelForProvider = (provider: string) => {
    if (provider === "groq") return "llama-3.1-8b-instant";
    if (provider === "openrouter") return "meta-llama/llama-3.1-8b-instruct:free";
    if (provider === "ollama") return "qwen2.5:3b";
    return "gemini-3.6-flash";
  };

  async function getJarvisAiProviders(includeEnvFallback = true): Promise<JarvisAiProviderConfig[]> {
    let providers: JarvisAiProviderConfig[] = [];
    try {
      const raw = await getActiveDataProvider().getSetting(JARVIS_AI_PROVIDERS_SETTING);
      if (raw) providers = JSON.parse(raw);
    } catch {
      providers = [];
    }
    providers = providers
      .filter((p: any) => p && p.provider && p.model)
      .map((p: any, index: number) => ({
        id: String(p.id || `provider-${index + 1}`),
        provider: p.provider,
        label: p.label || p.provider,
        model: p.model || defaultModelForProvider(p.provider),
        apiKey: p.apiKey || "",
        baseUrl: p.baseUrl || "",
        enabled: p.enabled !== false,
      }));

    if (includeEnvFallback && providers.filter(p => p.enabled).length === 0) {
      if (process.env.GROQ_API_KEY) providers.push({ id: "env-groq", provider: "groq", label: "Groq (env)", model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", apiKey: process.env.GROQ_API_KEY, enabled: true });
      if (process.env.OPENROUTER_API_KEY) providers.push({ id: "env-openrouter", provider: "openrouter", label: "OpenRouter (env)", model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free", apiKey: process.env.OPENROUTER_API_KEY, enabled: true });
      if (process.env.OLLAMA_BASE_URL) providers.push({ id: "env-ollama", provider: "ollama", label: "Ollama (env)", model: process.env.OLLAMA_MODEL || "qwen2.5:3b", baseUrl: process.env.OLLAMA_BASE_URL, enabled: true });
      if (process.env.GEMINI_API_KEY) providers.push({ id: "env-gemini", provider: "gemini", label: "Gemini (env)", model: process.env.GEMINI_MODEL || "gemini-3.6-flash", apiKey: process.env.GEMINI_API_KEY, enabled: true });
    }
    return includeEnvFallback ? providers.filter(p => p.enabled) : providers;
  }

  function maskJarvisProvider(p: JarvisAiProviderConfig) {
    return { ...p, apiKey: p.apiKey ? "********" : "" };
  }

  // =========================================================================
  // JARVIS SMART ASSISTANT — real backend brain.
  // The client (web or Flutter) only ever sends raw text. This endpoint
  // decides what the user wants (via Gemini function-calling when available,
  // otherwise a keyword-based fallback) and then performs the REAL action
  // against the REAL database — never just a scripted reply.
  // =========================================================================
  function heuristicJarvisIntent(command: string) {
    const cmd = command.toLowerCase();
    if (/(سفارش|کافه|بوفه|پیتزا|همبرگر|نوشیدنی|ردبول)/.test(cmd)) {
      const itemName = cmd.includes("همبرگر") ? "همبرگر" : (cmd.includes("ردبول") || cmd.includes("نوشیدنی")) ? "ردبول" : "پیتزا";
      return { action: "order_cafe_item", params: { itemName }, aiReply: "" };
    }
    if (/(تمدید|شارژ|زمان)/.test(cmd)) return { action: "extend_reservation", params: { hours: 1 }, aiReply: "" };
    if (/(ادمین|پشتیبان|خراب|کمک)/.test(cmd)) return { action: "contact_admin", params: { message: command }, aiReply: "" };
    if (/(چت|ارسال پیام|پیام بفرست)/.test(cmd)) return { action: "send_chat_message", params: { room: "", message: command }, aiReply: "" };
    if (/(رزرو کن|رزرو سیستم|سیستم بگیر|کامپیوتر بگیر)/.test(cmd)) return { action: "reserve_system", params: { hours: 1 }, aiReply: "" };
    if (/(لغو رزرو|کنسل رزرو|رزرو را لغو)/.test(cmd)) return { action: "cancel_reservation", params: {}, aiReply: "" };
    if (/(کیف پول|امتیاز|کوپن|کد تخفیف)/.test(cmd)) return { action: "show_wallet", params: {}, aiReply: "" };
    if (/(بهترین سیستم|سیستم آزاد|پیشنهاد سیستم)/.test(cmd)) return { action: "suggest_best_system", params: {}, aiReply: "" };
    if (/(تورنمنت|مسابقه)/.test(cmd) && /(لیست|چی|نمایش)/.test(cmd)) return { action: "list_tournaments", params: {}, aiReply: "" };
    if (/(ثبت.?نام).*(تورنمنت|مسابقه)/.test(cmd)) return { action: "register_tournament", params: { tournamentName: command }, aiReply: "" };
    if (/(جستجو|پیدا کن).*(فروشگاه|کالا|موس|کیبورد|هدست)/.test(cmd)) return { action: "search_shop", params: { query: command }, aiReply: "" };
    if (/(بخر|خرید).*(موس|کیبورد|هدست|دسته|ماوس)/.test(cmd)) return { action: "purchase_shop_item", params: { query: command }, aiReply: "" };
    if (/(پیام‌ها|پیام ها|نوتیفیکیشن|اعلان)/.test(cmd)) return { action: "read_messages", params: {}, aiReply: "" };
    if (/(زبان|language)/.test(cmd)) return { action: "change_language", params: { language: cmd.includes('english') || cmd.includes('انگلیسی') ? 'en' : cmd.includes('روسی') ? 'ru' : cmd.includes('ترکی') ? 'tr' : 'fa' }, aiReply: "" };
    if (/(برو به|باز کن|نشان بده)/.test(cmd)) return { action: "open_app_section", params: { section: command }, aiReply: "" };
    return null;
  }

  const jarvisActionNames = [
    "chitchat", "order_cafe_item", "extend_reservation", "contact_admin", "send_chat_message",
    "reserve_system", "cancel_reservation", "show_wallet", "suggest_best_system", "list_tournaments",
    "register_tournament", "search_shop", "purchase_shop_item", "read_messages", "change_language", "open_app_section"
  ];

  function parseJarvisAiJson(text: string) {
    const cleaned = String(text || "").replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response did not contain JSON");
    const parsed = JSON.parse(match[0]);
    const action = jarvisActionNames.includes(parsed.action) ? parsed.action : "chitchat";
    return { action, params: parsed.params || {}, aiReply: parsed.reply || parsed.aiReply || "" };
  }

  async function callOpenAiCompatibleJarvis(provider: JarvisAiProviderConfig, messages: any[]) {
    const base = provider.provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : provider.provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : (provider.baseUrl || "").replace(/\/$/, "");
    if (!base) throw new Error("Missing OpenAI-compatible base URL");
    if (!provider.apiKey && provider.provider !== "ollama") throw new Error("Missing API key");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
        ...(provider.provider === "openrouter" ? { "HTTP-Referer": "https://bazino.pro", "X-Title": "Bazino Jarvis" } : {})
      },
      body: JSON.stringify({ model: provider.model, messages, temperature: 0.2, response_format: { type: "json_object" } })
    });
    if (!response.ok) throw new Error(`${provider.provider} ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async function callOllamaJarvis(provider: JarvisAiProviderConfig, messages: any[]) {
    const base = (provider.baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: provider.model, messages, stream: false, format: "json" })
    });
    if (!response.ok) throw new Error(`ollama ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.message?.content || "";
  }

  async function callGeminiJarvis(provider: JarvisAiProviderConfig, prompt: string) {
    if (!provider.apiKey) throw new Error("Missing Gemini API key");
    const client = new GoogleGenAI({ apiKey: provider.apiKey });
    const response = await client.models.generateContent({ model: provider.model || "gemini-3.6-flash", contents: prompt });
    return response.text || "";
  }

  async function resolveAssistantIntent(command: string, context: { user: any; activeReservation?: any; language?: string }) {
    // Cost saver + safety: clear app commands are routed deterministically without any LLM call.
    const deterministic = heuristicJarvisIntent(command);
    if (deterministic) return deterministic;

    const replyLanguage = context.language === "en" ? "English" : context.language === "ru" ? "Russian" : context.language === "tr" ? "Turkish" : "Persian";
    const systemPrompt = `You are Jarvis, the in-app assistant for BAZINO gaming lounge. Current user: ${context.user.username === "Guest" ? "guest" : context.user.username}. ${context.activeReservation ? `Active reservation: ${context.activeReservation.systemName}.` : "No active reservation."}
Return ONLY valid JSON: {"action":"one_of_allowed_actions","params":{},"reply":"short natural reply in ${replyLanguage}"}.
Allowed actions: ${jarvisActionNames.join(", ")}.
Use chitchat for normal conversation or unclear requests. For app tasks, choose the closest action and fill params. Never invent prices or claim an action happened; server executes actions after you classify.`;
    const userPrompt = `User said: ${command}`;
    const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }];
    const providers = await getJarvisAiProviders(true);

    for (const provider of providers) {
      try {
        let text = "";
        if (provider.provider === "gemini") text = await callGeminiJarvis(provider, `${systemPrompt}\n\n${userPrompt}`);
        else if (provider.provider === "ollama") text = await callOllamaJarvis(provider, messages);
        else text = await callOpenAiCompatibleJarvis(provider, messages);
        const parsed = parseJarvisAiJson(text);
        return { ...parsed, provider: provider.label || provider.provider };
      } catch (err) {
        console.error(`[Jarvis] Provider ${provider.label || provider.provider} failed, trying next:`, err);
      }
    }

    return { action: "chitchat", params: {}, aiReply: "پیامت رو شنیدم. برای فرمان‌های دقیق مثل رزرو، خرید، پیام‌ها یا تغییر زبان آماده‌ام؛ اگر خواستی می‌تونی دستور را واضح‌تر بگی." };
  }

  async function executeAssistantIntent(intent: { action: string; params: any; aiReply: string }, ctx: { user: any; activeReservation?: any }) {
    const store = getActiveDataProvider();
    const { user } = ctx;

    switch (intent.action) {
      case "order_cafe_item": {
        const items = await store.listCafeItems();
        const needle = String(intent.params.itemName || "").toLowerCase().trim();
        const match = items.find(i => needle && (i.name.toLowerCase().includes(needle) || needle.includes(i.name.toLowerCase().split(" ")[0])));
        if (!match) {
          return { reply: `متاسفم، آیتمی شبیه «${intent.params.itemName || ""}» توی منوی کافه پیدا نکردم.` };
        }
        if (match.inventory < 1 || !match.isAvailable) {
          return { reply: `متاسفانه «${match.name}» موقتاً موجود نیست.` };
        }

        await store.decrementCafeInventory(match.id, 1);
        const pointsEarned = Math.floor(match.price / 10000);
        if (user.username !== "Guest") {
          await store.addLoyaltyPointsToUser(user.username, pointsEarned);
        }
        await store.addTransaction({
          id: Math.random().toString(36).substring(2, 9),
          points: pointsEarned,
          description: `سفارش صوتی ${match.name} از طریق جارویس`,
          type: "Earned",
          date: "امروز",
          username: user.username !== "Guest" ? user.username : "",
        });
        const orderId = "CF-" + Math.floor(1000 + Math.random() * 9000);
        await store.addCafeOrder({
          id: orderId,
          items: JSON.stringify([{ item: match, quantity: 1 }]),
          totalPrice: match.price,
          discountApplied: 0,
          finalAmount: match.price,
          couponCode: "",
          tableNumber: ctx.activeReservation ? ctx.activeReservation.systemName : "میز عمومی",
          date: "امروز",
          status: "Pending",
        });
        return { reply: `سفارش «${match.name}» با موفقیت ثبت شد (شماره سفارش ${orderId}) و مستقیم به بوفه ارسال شد. تا چند دقیقه دیگه براتون میارن! 🍕`, orderId };
      }

      case "extend_reservation": {
        if (user.username === "Guest") {
          return { reply: "برای تمدید رزرو باید اول وارد حساب کاربریت بشی." };
        }
        const active = ctx.activeReservation || await store.getActiveReservationForUser(user.username);
        if (!active) {
          return { reply: "الان هیچ رزرو فعالی برات پیدا نکردم. اول باید یک سیستم رزرو کنی." };
        }
        const hours = Math.max(1, Math.min(4, Number(intent.params.hours) || 1));
        const pointsNeeded = hours * 50;
        const freshUser = await store.getUserByUsername(user.username);
        if (!freshUser || freshUser.loyaltyPoints < pointsNeeded) {
          return { reply: `امتیاز باشگاه‌ت کافی نیست. تمدید ${hours} ساعت به ${pointsNeeded} امتیاز نیاز داره.` };
        }
        const newEndTime = addHoursToTimeString(active.endTime, hours);
        const overlapping = await store.hasOverlappingReservation(active.systemId, active.date, active.endTime, newEndTime);
        if (overlapping) {
          return { reply: "متاسفانه بلافاصله بعد از رزرو فعلیت، این سیستم برای کاربر دیگه‌ای رزرو شده و امکان تمدید نیست." };
        }
        const system = await store.getSystemById(active.systemId);
        const additionalPrice = (system?.hourlyRate || 0) * hours;
        await store.extendReservation(active.id, newEndTime, additionalPrice);
        await store.addLoyaltyPointsToUser(user.username, -pointsNeeded);
        await store.addTransaction({
          id: Math.random().toString(36).substring(2, 9),
          points: -pointsNeeded,
          description: `تمدید ${hours} ساعته ${active.systemName} از طریق جارویس`,
          type: "Redeemed",
          date: "امروز",
          username: user.username,
        });
        return { reply: `تمدید شد! ${active.systemName} تا ساعت ${newEndTime} تمدید شد و ${pointsNeeded} امتیاز کسر شد. خوش بگذره! ⚡`, newEndTime };
      }

      case "contact_admin": {
        const supportMsg = {
          id: "sup-" + Math.random().toString(36).substring(2, 9),
          sender: user.username,
          recipient: "Admin",
          title: "درخواست پشتیبانی از طریق جارویس",
          body: intent.params.message || "کاربر از طریق دستیار هوشمند درخواست کمک کرد.",
          date: "امروز",
          isRead: false,
          type: "support",
        };
        await store.addUserMessage(supportMsg);
        return { reply: "پیامت مستقیم برای ادمین سالن ارسال شد، به‌زودی بهت رسیدگی می‌کنه. 🚨", supportMsg };
      }

      case "send_chat_message": {
        if (user.username === "Guest") {
          return { reply: "برای ارسال پیام توی چت‌روم باید وارد حساب کاربریت بشی." };
        }
        const rooms = await store.listChatRooms();
        if (rooms.length === 0) {
          return { reply: "الان هیچ اتاق گفتگویی فعال نیست." };
        }
        const needle = String(intent.params.room || "").toLowerCase();
        const roomMatch = (needle && rooms.find(r => r.toLowerCase().includes(needle))) || rooms[0];
        const chatMsg = {
          id: "msg-" + Math.random().toString(36).substring(2, 9),
          room: roomMatch,
          username: user.username,
          message: `🎙️ ${intent.params.message || ""}`,
          timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        };
        await store.addChatMessage(chatMsg);
        return { reply: `پیامت با موفقیت توی اتاق «${roomMatch}» فرستاده شد. 🔫`, chatMsg };
      }

      case "reserve_system": {
        if (user.username === "Guest") return { reply: "برای رزرو سیستم باید اول وارد حساب کاربری بشی." };
        const systems = await resolveSampleList(await store.listSystems(), SAMPLE_SYSTEMS);
        const wanted = String(intent.params.systemType || "").toLowerCase();
        const system = systems.find(s => s.isActive && !s.isReserved && (!wanted || s.type.toLowerCase().includes(wanted) || s.name.toLowerCase().includes(wanted)))
          || systems.find(s => s.isActive && !s.isReserved);
        if (!system) return { reply: "فعلاً سیستم آزادی برای رزرو پیدا نکردم." };
        const startTime = String(intent.params.startTime || new Date().toTimeString().slice(0, 5));
        const hours = Math.max(1, Math.min(6, Number(intent.params.hours) || 1));
        const endTime = addHoursToTimeString(startTime, hours);
        const overlapping = await store.hasOverlappingReservation(system.id, "امروز", startTime, endTime);
        if (overlapping) return { reply: `سیستم پیشنهادی در بازه ${startTime} تا ${endTime} رزرو است؛ یک بازه دیگر بگو.` };
        await store.setSystemReserved(system.id, true);
        const totalPrice = Math.round(system.hourlyRate * hours);
        const pointsEarned = Math.floor(totalPrice / 10000);
        await store.addLoyaltyPointsToUser(user.username, pointsEarned);
        const log = { id: "res-" + Math.random().toString(36).substring(2, 9), systemId: system.id, username: user.username, systemName: system.name, startTime, endTime, totalPrice, date: "امروز", checkedIn: false, timestamp: new Date().toISOString() };
        await store.addReservationLog(log);
        await store.addTransaction({ id: Math.random().toString(36).substring(2, 9), points: pointsEarned, description: `رزرو ${system.name} از طریق جارویس`, type: "Earned", date: "امروز", username: user.username !== "Guest" ? user.username : "" });
        return { reply: `رزرو انجام شد: ${system.name} از ${startTime} تا ${endTime}. ${pointsEarned} امتیاز هم به حسابت اضافه شد.`, reservation: log };
      }

      case "cancel_reservation": {
        if (user.username === "Guest") return { reply: "برای لغو رزرو باید وارد حساب کاربری باشی." };
        const active = ctx.activeReservation || await store.getActiveReservationForUser(user.username);
        if (!active) return { reply: "رزرو فعالی برای لغو پیدا نکردم." };
        await store.deleteReservationLog(active.id);
        await store.setSystemReserved(active.systemId, false);
        return { reply: `رزرو ${active.systemName} لغو شد.` };
      }

      case "show_wallet": {
        if (user.username === "Guest") return { reply: "برای دیدن کیف پول و امتیازها باید وارد حساب کاربری بشی." };
        const fresh = await store.getUserByUsername(user.username);
        const coupons = await resolveTransactionalList(await store.listCoupons(), SAMPLE_COUPONS);
        const activeCoupons = coupons.filter(c => c.isActive).slice(0, 3).map(c => c.code).join("، ") || "کد فعالی نداری";
        const tx = (await store.listTransactions()).slice(0, 3).map(t => `${t.description}: ${t.points}`).join(" | ");
        return { reply: `امتیاز فعلی شما ${fresh?.loyaltyPoints ?? user.loyaltyPoints} است. کدهای فعال: ${activeCoupons}. آخرین تراکنش‌ها: ${tx || "هنوز تراکنشی ثبت نشده"}` };
      }

      case "suggest_best_system": {
        const systems = await resolveSampleList(await store.listSystems(), SAMPLE_SYSTEMS);
        const free = systems.filter(s => s.isActive && !s.isReserved).sort((a, b) => b.hourlyRate - a.hourlyRate);
        if (free.length === 0) return { reply: "الان هیچ سیستم آزادی پیدا نکردم." };
        const s = free[0];
        return { reply: `پیشنهاد من ${s.name} است؛ نوع ${s.type} با تعرفه ${s.hourlyRate.toLocaleString()} تومان در ساعت و الان آزاد است.` };
      }

      case "list_tournaments": {
        const tournaments = await resolveMergedList(await store.listTournaments(), SAMPLE_TOURNAMENTS);
        const list = tournaments.filter(t => t.status !== "Completed").slice(0, 4).map(t => `${t.title} (${t.game})`).join("، ");
        return { reply: list ? `تورنمنت‌های فعال و آینده: ${list}` : "فعلاً تورنمنت فعالی نداریم." };
      }

      case "register_tournament": {
        if (user.username === "Guest") return { reply: "برای ثبت‌نام تورنمنت باید وارد حساب کاربری باشی." };
        const tournaments = await resolveMergedList(await store.listTournaments(), SAMPLE_TOURNAMENTS);
        const needle = String(intent.params.tournamentName || "").toLowerCase();
        const tournament = tournaments.find(t => needle && (t.title.toLowerCase().includes(needle) || needle.includes(t.game.toLowerCase()))) || tournaments.find(t => t.status !== "Completed");
        if (!tournament) return { reply: "تورنمنت مناسبی برای ثبت‌نام پیدا نکردم." };
        const teams = JSON.parse(tournament.teams || "[]");
        const team = { name: intent.params.teamName || `${user.username} Team`, leader: intent.params.leader || user.username, members: Array.isArray(intent.params.members) ? intent.params.members : [] };
        teams.push(team);
        await store.registerTournamentTeam(tournament.id, JSON.stringify(teams), tournament.registeredTeamsCount + 1);
        return { reply: `تیم «${team.name}» برای تورنمنت «${tournament.title}» ثبت شد.` };
      }

      case "search_shop": {
        const items = await resolveSampleList(await store.listAccessories(), SAMPLE_ACCESSORIES);
        const q = String(intent.params.query || "").toLowerCase();
        const matches = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || q.includes(i.category.toLowerCase())).slice(0, 5);
        return { reply: matches.length ? `این کالاها را پیدا کردم: ${matches.map(i => `${i.name} (${i.price.toLocaleString()} تومان)`).join("، ")}` : "کالایی با این مشخصات پیدا نکردم." };
      }

      case "purchase_shop_item": {
        const items = await resolveSampleList(await store.listAccessories(), SAMPLE_ACCESSORIES);
        const q = String(intent.params.query || "").toLowerCase();
        const item = items.find(i => i.name.toLowerCase().includes(q) || q.includes(i.category.toLowerCase())) || items[0];
        if (!item || item.stock < 1) return { reply: "این کالا موجود نیست." };
        const { discountAmount, coupon } = await validateCouponServerSide(item.price, intent.params.couponCode, user.username);
        await store.decrementAccessoryStock(item.id, 1);
        const finalAmount = Math.max(0, item.price - discountAmount);
        const pointsEarned = Math.floor(finalAmount / 10000);
        if (user.username !== "Guest") await store.addLoyaltyPointsToUser(user.username, pointsEarned);
        await store.addShopOrder({ id: "ACC-" + Math.floor(1000 + Math.random() * 9000), cart: JSON.stringify([{ item, quantity: 1 }]), totalPrice: item.price, discountApplied: discountAmount, finalAmount, couponCode: coupon ? intent.params.couponCode : "", date: "امروز", status: "Processing" });
        return { reply: `خرید «${item.name}» ثبت شد. مبلغ نهایی ${finalAmount.toLocaleString()} تومان است.` };
      }

      case "read_messages": {
        const messages = (await store.listUserMessages()).filter(m => m.recipient === "All" || m.recipient === user.username).slice(0, 5);
        return { reply: messages.length ? `آخرین پیام‌ها: ${messages.map(m => `${m.title}: ${m.body}`).join(" | ")}` : "پیام جدیدی نداری." };
      }

      case "change_language": {
        const lang = ["fa", "en", "ru", "tr"].includes(String(intent.params.language)) ? String(intent.params.language) : "fa";
        return { reply: `زبان اپ به ${lang} تغییر کرد.`, clientCommand: { type: "change_language", language: lang } };
      }

      case "open_app_section": {
        const raw = String(intent.params.section || "").toLowerCase();
        const section = raw.includes("message") || raw.includes("پیام") || raw.includes("اعلان") ? "messages" : raw.includes("chat") || raw.includes("چت") ? "chat" : raw.includes("blog") || raw.includes("بلاگ") || raw.includes("خبر") ? "blog" : raw.includes("cafe") || raw.includes("کافه") ? "cafe" : raw.includes("shop") || raw.includes("فروشگاه") ? "shop" : raw.includes("tournament") || raw.includes("مسابق") ? "tournaments" : raw.includes("loyal") || raw.includes("باشگاه") || raw.includes("امتیاز") ? "loyalty" : raw.includes("reserve") || raw.includes("رزرو") ? "reserve" : "home";
        return { reply: `بخش ${section} را باز می‌کنم.`, clientCommand: { type: "open_section", section } };
      }

      default:
        return { reply: intent.aiReply || "پیامت رو شنیدم! می‌تونم رزرو کنم، رزرو رو لغو یا تمدید کنم، فروشگاه و تورنمنت‌ها رو مدیریت کنم، پیام‌هات رو بخونم، زبان اپ رو تغییر بدم یا به بخش‌های مختلف اپ ببرمت. چیکار کنیم؟ 😉" };
    }
  }

  app.post("/api/assistant/command", async (req, res) => {
    try {
      const { command, language } = req.body;
      if (!command || !String(command).trim()) {
        return res.status(400).json({ error: "دستور نمی‌تواند خالی باشد." });
      }

      const store = getActiveDataProvider();
      const user = await getCurrentUser(req);
      const activeReservation = user.username !== "Guest" ? await store.getActiveReservationForUser(user.username) : undefined;

      const intent = await resolveAssistantIntent(String(command), { user, activeReservation, language });
      const result = await executeAssistantIntent(intent, { user, activeReservation });

      // Real-time side effects: broadcast to WebSocket clients exactly like the normal endpoints do
      if (intent.action === "send_chat_message" && (result as any).chatMsg) {
        const payload = JSON.stringify({ event: "message", data: (result as any).chatMsg });
        wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(payload); });
      }
      if (intent.action === "contact_admin" && (result as any).supportMsg) {
        const payload = JSON.stringify({ event: "notification", data: (result as any).supportMsg });
        wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(payload); });
      }

      const updatedUser = await getCurrentUser(req);
      res.json({ success: true, action: intent.action, reply: result.reply, user: updatedUser, clientCommand: (result as any).clientCommand });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ error: e.message || String(e) });
    }
  });

  // ==========================================
  // BAZINO PRO Game Net Desktop App Sync APIs
  // ==========================================
  // In-memory audit trail of sync activity (connect/test/reservation-update events) shown
  // in the Management App's "لاگ‌ها" tab (WebSyncModal.tsx). Capped at the most recent 50
  // entries — this is operational telemetry, not business data, so it intentionally isn't
  // persisted to the database and resets on server restart (same tradeoff as `dbQueryLogs`
  // in server/dataProviders.ts).
  const syncActivityLogs: { id: string; timestamp: string; action: string; status: "SUCCESS" | "WARNING" | "ERROR"; details: string; itemsSyncedCount: number }[] = [];
  function logSyncEvent(action: string, status: "SUCCESS" | "WARNING" | "ERROR", details: string, itemsSyncedCount = 0) {
    syncActivityLogs.unshift({
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      action,
      status,
      details,
      itemsSyncedCount,
    });
    if (syncActivityLogs.length > 50) syncActivityLogs.length = 50;
  }

  // Guards every /api/sync/* route. The expected key is read from the generic settings
  // store under `gamenet_sync_api_key` (set it via `POST /api/admin/settings` with
  // `{ key: "gamenet_sync_api_key", value: "..." }`, or from the site's admin settings UI
  // once one exists for it).
  //
  // Access rules:
  //   • key configured  → a matching `Authorization: Bearer <key>` header is required.
  //   • no key, request from the same machine (loopback) → allowed, so the zero-config
  //     co-located desktop client keeps working exactly as before.
  //   • no key, request from anywhere else → refused. Previously these were allowed,
  //     which published station/reservation data on any internet-facing deployment.
  /** Is this request coming from the machine the server itself runs on? */
  function isLoopbackRequest(req: express.Request): boolean {
    // req.ip honours trust proxy; fall back to the raw socket address.
    const raw = (req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "");
    if (raw !== "127.0.0.1" && raw !== "::1" && raw !== "localhost") return false;
    // A reverse proxy on the same host would also look like loopback, so a
    // forwarding header means the request really came from outside.
    if (req.headers["x-forwarded-for"]) return false;
    return true;
  }

  async function requireSyncApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const expectedKey = await getActiveDataProvider().getSetting(SYNC_API_KEY_SETTING);

      if (expectedKey) {
        const header = req.headers.authorization;
        if (header && header.startsWith("Bearer ") && header.slice(7) === expectedKey) {
          return next();
        }
        return res.status(401).json({ success: false, error: "Invalid or missing sync API key" });
      }

      // No key configured yet. The original behaviour was to allow EVERYONE
      // through, which exposes desktop-sync data on any public deployment.
      // Keep the zero-config path working for the co-located desktop client
      // (same machine → loopback) but refuse anonymous remote callers and tell
      // the operator how to enable remote sync properly.
      if (isLoopbackRequest(req)) return next();

      return res.status(401).json({
        success: false,
        error: "Sync API key is not configured. Set the 'gamenet_sync_api_key' setting in the admin panel to allow remote sync clients.",
      });
    } catch (err) {
      console.error("[Sync Auth] Error checking API key:", err);
      res.status(500).json({ error: "Failed to verify sync API key" });
    }
  }

  app.post("/api/sync/webservice", requireSyncApiKey, async (req, res) => {
    try {
      const { action, station_id, stations, active_stations_count, total_revenue_today } = req.body || {};
      const store = getActiveDataProvider();

      // Store the synced status in settings table
      await store.setSetting("gamenet_sync_status", JSON.stringify({
        station_id: station_id || "BAZINO_CLIENT_01",
        active_stations_count: active_stations_count || 0,
        total_revenue_today: total_revenue_today || 0,
        stations: stations || [],
        timestamp: new Date().toISOString()
      }));

      // Fetch pending reservations from website database
      const pendingLogs = await store.listPendingReservationLogs();
      const pendingReservations = pendingLogs.map((log, index) => ({
        id: log.id,
        customerName: `مشتری آنلاین #${index + 1}`,
        phone: "09121112233",
        stationType: log.systemName.includes("VIP") ? "PS5_VIP" : "PC_GAMING",
        stationName: log.systemName,
        reservedTime: log.startTime,
        depositPaid: log.totalPrice,
        status: "PENDING",
        createdAt: log.timestamp || new Date().toISOString()
      }));

      logSyncEvent(
        action || "FULL_SYNC",
        "SUCCESS",
        `همگام‌سازی موفق با ایستگاه ${station_id || "BAZINO_CENTRAL_01"} — ${pendingReservations.length} رزرو در انتظار دریافت شد.`,
        pendingReservations.length
      );

      res.json({
        success: true,
        syncTime: new Date().toISOString(),
        actionPerformed: action || "FULL_SYNC",
        webPortalMessage: "اتصال با موفقیت برقرار شد. کلیه ایستگاه‌ها، رزروهای آنلاین و مانده حساب‌ها با سایت همگام شدند.",
        data: {
          serverStationId: station_id || "BAZINO_CENTRAL_01",
          pendingReservations,
          confirmedReservationsCount: pendingLogs.filter(l => l.checkedIn).length,
          systemHealth: "OPTIMAL",
          cloudSyncDelayMs: 15
        }
      });
    } catch (e) {
      logSyncEvent("FULL_SYNC", "ERROR", `همگام‌سازی ناموفق: ${String(e)}`, 0);
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/sync/reservations", requireSyncApiKey, async (req, res) => {
    try {
      const pendingLogs = await getActiveDataProvider().listPendingReservationLogs();
      const reservations = pendingLogs.map((log, index) => ({
        id: log.id,
        customerName: `مشتری آنلاین #${index + 1}`,
        phone: "09121112233",
        stationType: log.systemName.includes("VIP") ? "PS5_VIP" : "PC_GAMING",
        stationName: log.systemName,
        reservedTime: log.startTime,
        depositPaid: log.totalPrice,
        status: "PENDING",
        createdAt: log.timestamp || new Date().toISOString()
      }));
      res.json({
        success: true,
        reservations,
        pendingCount: reservations.length
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/sync/reservations/update", requireSyncApiKey, async (req, res) => {
    try {
      const { reservationId, newStatus } = req.body || {};
      if (newStatus === "CONFIRMED" || newStatus === "REJECTED") {
        await getActiveDataProvider().setReservationCheckedIn(reservationId);
        logSyncEvent(
          "RESERVATION_UPDATE",
          "SUCCESS",
          `رزرو ${reservationId} روی سایت با وضعیت ${newStatus} ثبت نهایی شد.`,
          1
        );
        res.json({ success: true, message: `رزرو ${reservationId} در سایت ثبت نهایی شد.` });
      } else {
        logSyncEvent("RESERVATION_UPDATE", "WARNING", `وضعیت نامعتبر برای رزرو ${reservationId}: ${newStatus}`, 0);
        res.status(400).json({ success: false, message: "وضعیت نامعتبر" });
      }
    } catch (e) {
      logSyncEvent("RESERVATION_UPDATE", "ERROR", `به‌روزرسانی رزرو ناموفق: ${String(e)}`, 0);
      res.status(500).json({ error: String(e) });
    }
  });

  // Backs the Management App's "لاگ‌ها" (sync activity log) tab — was previously missing
  // entirely (the client called this exact path but the server had no matching route, so
  // the tab silently stayed empty forever).
  app.get("/api/sync/logs", requireSyncApiKey, (req, res) => {
    res.json({ success: true, logs: syncActivityLogs });
  });

  // Cafe Buffet Catalog & Orders
  app.get("/api/cafe", async (req, res) => {
    try {
      const cafeItems = await resolveSampleList(await getActiveDataProvider().listCafeItems(), SAMPLE_CAFE_ITEMS);
      res.json(cafeItems);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Server-authoritative coupon validation shared by cafe orders, shop orders,
  // and the standalone /api/discount/validate endpoint. The client only ever
  // sends a coupon *code* — the discount amount is always computed here.
  async function validateCouponServerSide(amount: number, code?: string, username?: string) {
    if (!code) return { discountAmount: 0, coupon: null as any };
    const store = getActiveDataProvider();
    const coupon = await resolveSampleById(() => store.getCouponByCode(code), SAMPLE_COUPONS, code, "code");
    // مخفی‌کردن کد از لیست کافی نیست: کسی که کد را از جای دیگری ببیند یا حدس بزند باز هم
    // می‌تواند دستی واردش کند، پس مالکیت هنگام استفاده هم بررسی می‌شود.
    if (coupon && (coupon as any).ownerUsername && (coupon as any).ownerUsername !== username) {
      throw Object.assign(new Error("این کد تخفیف متعلق به حساب کاربری شما نیست."), { statusCode: 403 });
    }
    if (!coupon || !coupon.isActive) {
      throw Object.assign(new Error("کد تخفیف معتبر نیست یا قبلاً استفاده شده است."), { statusCode: 400 });
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      throw Object.assign(new Error("این کد تخفیف منقضی شده است."), { statusCode: 400 });
    }
    if (typeof coupon.maxUsageCount === "number" && coupon.usageCount >= coupon.maxUsageCount) {
      throw Object.assign(new Error("این کد تخفیف به سقف تعداد مجاز استفاده رسیده است."), { statusCode: 400 });
    }
    if (amount < coupon.minOrder) {
      throw Object.assign(new Error(`حداقل مبلغ خرید جهت استفاده از این کد ${coupon.minOrder.toLocaleString()} تومان است.`), { statusCode: 400 });
    }
    const discountAmount = coupon.type === "Percent" ? amount * (coupon.value / 100) : coupon.value;
    return { discountAmount: Math.min(discountAmount, amount), coupon };
  }

  app.post("/api/cafe/order", async (req, res) => {
    try {
      const { items, couponCode, tableNumber } = req.body;
      const store = getActiveDataProvider();

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "سبد خرید خالی است." });
      }

      // Price is always computed server-side from the real menu prices/stock —
      // never trust item.price or a total sent by the client.
      let totalPrice = 0;
      for (const orderItem of items) {
        const menuItem = await resolveSampleById(() => store.getCafeItemById(orderItem.item.id), SAMPLE_CAFE_ITEMS, orderItem.item.id);
        if (!menuItem) {
          return res.status(404).json({ error: `آیتم منو یافت نشد: ${orderItem.item?.id}` });
        }
        if (menuItem.inventory < orderItem.quantity) {
          return res.status(400).json({ error: `موجودی «${menuItem.name}» کافی نیست.` });
        }
        totalPrice += menuItem.price * orderItem.quantity;
      }

      const { discountAmount, coupon } = await validateCouponServerSide(totalPrice, couponCode, (req as any).authUsername);
      const finalAmount = Math.max(0, totalPrice - discountAmount);
      const pointsEarned = Math.floor(finalAmount / 10000);

      // Deduct stock inventory (already validated above)
      for (const orderItem of items) {
        await store.decrementCafeInventory(orderItem.item.id, orderItem.quantity);
      }

      const user = await getCurrentUser(req);
      if (user.username !== "Guest") {
        await store.addLoyaltyPointsToUser(user.username, pointsEarned);
        user.loyaltyPoints += pointsEarned;
      }

      const newTx = {
        id: Math.random().toString(36).substring(2, 9),
        points: pointsEarned,
        description: "امتیاز بابت سفارش بوفه کافه گیم‌نت",
        type: "Earned",
        date: "امروز",
        username: user.username !== "Guest" ? user.username : "",
      };
      await store.addTransaction(newTx);

      // Save cafe order for Admin panel
      const orderId = "CF-" + Math.floor(1000 + Math.random() * 9000);
      const newOrder = {
        id: orderId,
        items: JSON.stringify(items),
        totalPrice,
        discountApplied: discountAmount,
        finalAmount,
        couponCode: coupon ? couponCode : "",
        tableNumber: tableNumber || "میز عمومی",
        date: "امروز",
        status: "Pending", // Pending, Preparing, Delivered
      };
      await store.addCafeOrder(newOrder);

      // Record the usage (increments usageCount; deactivates once maxUsageCount is reached)
      if (coupon) {
        const consumed = await store.recordCouponUsage(couponCode);
        if (!consumed) {
          return res.status(409).json({ error: "این کد تخفیف هم‌زمان توسط درخواست دیگری مصرف شد. لطفاً دوباره تلاش کنید." });
        }
      }

      const cafeItems = await store.listCafeItems();
      const transactions = await store.listTransactions();

      res.json({
        success: true,
        cafeItems,
        user,
        transactions,
        order: { ...newOrder, items }
      });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ error: e.message || String(e) });
    }
  });

  // Accessory Shop & Orders
  app.get("/api/accessories", async (req, res) => {
    try {
      const accessories = await resolveSampleList(await getActiveDataProvider().listAccessories(), SAMPLE_ACCESSORIES);
      res.json(accessories);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/accessories/order", async (req, res) => {
    try {
      const { cart, couponCode } = req.body;
      const store = getActiveDataProvider();

      if (!Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: "سبد خرید خالی است." });
      }

      // Price is always computed server-side from the real catalog prices/stock —
      // never trust item.price or a total sent by the client.
      let totalPrice = 0;
      for (const cartItem of cart) {
        const catalogItem = await resolveSampleById(() => store.getAccessoryById(cartItem.item.id), SAMPLE_ACCESSORIES, cartItem.item.id);
        if (!catalogItem) {
          return res.status(404).json({ error: `کالا یافت نشد: ${cartItem.item?.id}` });
        }
        if (catalogItem.stock < cartItem.quantity) {
          return res.status(400).json({ error: `موجودی «${catalogItem.name}» کافی نیست.` });
        }
        totalPrice += catalogItem.price * cartItem.quantity;
      }

      const { discountAmount, coupon } = await validateCouponServerSide(totalPrice, couponCode, (req as any).authUsername);
      const finalAmount = Math.max(0, totalPrice - discountAmount);
      const pointsEarned = Math.floor(finalAmount / 10000);

      for (const cartItem of cart) {
        await store.decrementAccessoryStock(cartItem.item.id, cartItem.quantity);
      }

      const user = await getCurrentUser(req);
      if (user.username !== "Guest") {
        await store.addLoyaltyPointsToUser(user.username, pointsEarned);
        user.loyaltyPoints += pointsEarned;
      }

      const newTx = {
        id: Math.random().toString(36).substring(2, 9),
        points: pointsEarned,
        description: "امتیاز خرید موفق لوازم جانبی گیمینگ",
        type: "Earned",
        date: "امروز",
        username: user.username !== "Guest" ? user.username : "",
      };
      await store.addTransaction(newTx);

      const orderId = "ACC-" + Math.floor(1000 + Math.random() * 9000);
      const newOrder = {
        id: orderId,
        cart: JSON.stringify(cart),
        totalPrice,
        discountApplied: discountAmount,
        finalAmount,
        couponCode: coupon ? couponCode : "",
        date: "امروز",
        status: "Processing", // Processing, Shipped, Delivered
      };
      await store.addShopOrder(newOrder);

      // Record the usage (increments usageCount; deactivates once maxUsageCount is reached)
      if (coupon) {
        const consumed = await store.recordCouponUsage(couponCode);
        if (!consumed) {
          return res.status(409).json({ error: "این کد تخفیف هم‌زمان توسط درخواست دیگری مصرف شد. لطفاً دوباره تلاش کنید." });
        }
      }

      const accessories = await store.listAccessories();
      const transactions = await store.listTransactions();

      res.json({
        success: true,
        accessories,
        user,
        transactions,
        order: { ...newOrder, cart }
      });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ error: e.message || String(e) });
    }
  });

  // Tournaments
  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await resolveMergedList(await getActiveDataProvider().listTournaments(), SAMPLE_TOURNAMENTS);
      res.json(tournaments.map(t => ({
        ...t,
        teams: JSON.parse(t.teams),
        bracket: JSON.parse(t.bracket)
      })));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/tournaments/register", async (req, res) => {
    try {
      const { tournamentId, team } = req.body;
      const store = getActiveDataProvider();
      const tournament = await resolveSampleById(() => store.getTournamentById(tournamentId), SAMPLE_TOURNAMENTS, tournamentId);

      if (tournament) {
        // Same as article comments: a sample tournament has to be materialised
        // before registerTournamentTeam()'s UPDATE can persist the new team.
        await ensurePersisted(
          () => store.getTournamentById(tournamentId),
          t => store.createTournament(t),
          tournament
        );
        const teams = JSON.parse(tournament.teams);
        teams.push(team);
        const registeredTeamsCount = tournament.registeredTeamsCount + 1;

        await store.registerTournamentTeam(tournamentId, JSON.stringify(teams), registeredTeamsCount);

        const tournamentsList = await store.listTournaments();
        res.json({
          success: true,
          tournaments: tournamentsList.map(t => ({
            ...t,
            teams: JSON.parse(t.teams),
            bracket: JSON.parse(t.bracket)
          }))
        });
      } else {
        res.status(404).json({ error: "Tournament not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Blog News Articles & Comments
  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await resolveMergedList(await getActiveDataProvider().listArticles(), SAMPLE_ARTICLES);
      res.json(articles.map(a => ({
        ...a,
        comments: JSON.parse(a.comments)
      })));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/articles/:id/comment", async (req, res) => {
    try {
      const { id } = req.params;
      const { gamerTag, content } = req.body;
      const store = getActiveDataProvider();
      const article = await resolveSampleById(() => store.getArticleById(id), SAMPLE_ARTICLES, id);

      if (article) {
        // The article may only exist as sample data; persist it first, otherwise
        // the UPDATE below silently writes to nothing and the comment is lost.
        await ensurePersisted(() => store.getArticleById(id), a => store.createArticle(a), article);
        const comments = JSON.parse(article.comments);
        const newComment = {
          id: Math.random().toString(36).substring(2, 9),
          gamerTag,
          content,
          date: "هم‌اکنون",
        };
        comments.push(newComment);

        await store.setArticleComments(id, JSON.stringify(comments));

        const articlesList = await store.listArticles();
        res.json({
          success: true,
          articles: articlesList.map(a => ({
            ...a,
            comments: JSON.parse(a.comments)
          }))
        });
      } else {
        res.status(404).json({ error: "Article not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Validate coupon codes
  app.get("/api/discount/validate", async (req, res) => {
    try {
      const { code, total } = req.query;
      const amount = Number(total || 0);
      const { discountAmount, coupon } = await validateCouponServerSide(amount, String(code), (req as any).authUsername);
      res.json({ valid: true, discountAmount, coupon });
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ valid: false, error: e.message || String(e) });
    }
  });

  // =========================================================================
  // ADMIN PANEL BACKEND CONTROLLERS
  // =========================================================================

  // Get general statistics for Admin dashboard
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const mode = await getDataSourceMode();
      // سفارش‌ها همیشه مستقیم از دیتابیس خوانده می‌شوند. قبلاً در حالت sample
      // (که پیش‌فرض است) به‌جای لیست واقعی، آرایه‌ی خالی برگردانده می‌شد؛ نتیجه
      // این بود که مشتری سفارش می‌داد، سفارش در جدول cafe_orders ثبت می‌شد، ولی
      // داشبورد ادمین «No active cafe orders» و «کل درآمد: ۰ تومان» نشان می‌داد.
      // برای سفارش‌ها اصلاً داده‌ی نمونه‌ای وجود ندارد، پس چیزی برای پر کردن
      // داشبوردِ نصب تازه از دست نمی‌رود.
      const cafeOrdersRows = await store.listCafeOrders();
      const shopOrdersRows = await store.listShopOrders();
      const reservationLogsRows = await resolveTransactionalList(await store.listReservationLogs(), SAMPLE_RESERVATION_LOGS);
      const systemsRows = await resolveSampleList(await store.listSystems(), SAMPLE_SYSTEMS);

      const parsedCafeOrders = cafeOrdersRows.map(o => ({ ...o, items: JSON.parse(o.items) }));
      const parsedShopOrders = shopOrdersRows.map(o => ({ ...o, cart: JSON.parse(o.cart) }));

      const totalCafeSales = parsedCafeOrders.reduce((sum, o) => sum + o.finalAmount, 0);
      const totalShopSales = parsedShopOrders.reduce((sum, o) => sum + o.finalAmount, 0);
      const totalReservationsCount = reservationLogsRows.length;

      let gamenetSyncStatus = null;
      try {
        const raw = await store.getSetting("gamenet_sync_status");
        if (raw) gamenetSyncStatus = JSON.parse(raw);
      } catch (err) {
        console.error("Error reading gamenet sync status settings:", err);
      }

      res.json({
        totalSales: totalCafeSales + totalShopSales,
        totalReservations: totalReservationsCount,
        cafeSales: totalCafeSales,
        shopSales: totalShopSales,
        activeReservations: systemsRows.filter(s => s.isReserved).length,
        activeSystems: systemsRows.length,
        cafeOrdersCount: parsedCafeOrders.length,
        shopOrdersCount: parsedShopOrders.length,
        totalUsers: await store.countUsers(),
        cafeOrders: parsedCafeOrders,
        shopOrders: parsedShopOrders,
        reservationLogs: reservationLogsRows,
        dataSource: mode,
        gamenetSyncStatus
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Game systems CRUD
  app.post("/api/admin/systems", async (req, res) => {
    try {
      const { name, type, hourlyRate, isActive } = req.body;
      const store = getActiveDataProvider();
      const nextId = "s" + ((await store.countSystems()) + 1);

      await store.createSystem({
        id: nextId,
        name,
        type,
        hourlyRate: Number(hourlyRate),
        isActive: isActive !== false,
        isReserved: false
      });

      const list = await store.listSystems();
      res.json({ success: true, systems: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.put("/api/admin/systems/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, hourlyRate, isActive, isReserved } = req.body;
      const store = getActiveDataProvider();
      const system = await store.getSystemById(id);

      if (system) {
        await store.updateSystem(id, {
          name: name !== undefined ? name : system.name,
          type: type !== undefined ? type : system.type,
          hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : system.hourlyRate,
          isActive: isActive !== undefined ? !!isActive : system.isActive,
          isReserved: isReserved !== undefined ? !!isReserved : system.isReserved,
        });

        const list = await store.listSystems();
        res.json({ success: true, systems: list });
      } else {
        res.status(404).json({ error: "System not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/systems/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteSystem(id);
      const list = await store.listSystems();
      res.json({ success: true, systems: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Cafe Items CRUD
  app.post("/api/admin/cafe", async (req, res) => {
    try {
      const { name, category, price, imageUrl, mobileImageUrl, autoGenerateMobile, inventory, isAvailable } = req.body;
      const store = getActiveDataProvider();
      const nextId = "c" + ((await store.countCafeItems()) + 1);

      const finalImageUrl = imageUrl || "/images/home/pizza-480.webp";
      // اولویت: مقدار دستی ادمین ← ساخت خودکار با sharp (پیش‌فرض روشن) ← undefined که
      // در آن صورت اپ خودش به imageUrl اصلی برمی‌گردد (رفتار قبلیِ fallback حذف شده؛
      // دیگر پلیس‌هولدر عمومیِ pizza-400 به همه آیتم‌ها نمی‌چسبانیم)
      const finalMobileUrl = await resolveAdminMobileImageUrl(mobileImageUrl, autoGenerateMobile !== false, finalImageUrl, "item");

      await store.createCafeItem({
        id: nextId,
        name,
        category,
        price: Number(price),
        imageUrl: finalImageUrl,
        mobileImageUrl: finalMobileUrl,
        inventory: Number(inventory),
        isAvailable: isAvailable !== false
      });

      const list = await store.listCafeItems();
      res.json({ success: true, cafeItems: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.put("/api/admin/cafe/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, price, imageUrl, mobileImageUrl, autoGenerateMobile, inventory, isAvailable } = req.body;
      const store = getActiveDataProvider();
      const item = await store.getCafeItemById(id);

      if (item) {
        const finalImageUrl = imageUrl !== undefined ? imageUrl : item.imageUrl;
        // در ویرایش: مقدار دستی جدید ← در غیر این صورت اگر «ساخت خودکار» فرستاده شده
        // دوباره از روی تصویر نهایی می‌سازیم ← وگرنه مقدار قبلی حفظ می‌شود
        const wantsAuto = autoGenerateMobile === true || (typeof mobileImageUrl === "string" && !mobileImageUrl.trim() && autoGenerateMobile !== false);
        const finalMobileUrl = typeof mobileImageUrl === "string" && mobileImageUrl.trim()
          ? mobileImageUrl.trim()
          : (wantsAuto ? await generateMobileImageVariant(finalImageUrl, "item") : undefined) ?? item.mobileImageUrl;

        await store.updateCafeItem(id, {
          name: name !== undefined ? name : item.name,
          category: category !== undefined ? category : item.category,
          price: price !== undefined ? Number(price) : item.price,
          imageUrl: finalImageUrl,
          mobileImageUrl: finalMobileUrl,
          inventory: inventory !== undefined ? Number(inventory) : item.inventory,
          isAvailable: isAvailable !== undefined ? !!isAvailable : item.isAvailable,
        });

        const list = await store.listCafeItems();
        res.json({ success: true, cafeItems: list });
      } else {
        res.status(404).json({ error: "Cafe item not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/cafe/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteCafeItem(id);
      const list = await store.listCafeItems();
      res.json({ success: true, cafeItems: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Update Cafe Order status
  app.put("/api/admin/cafe-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const store = getActiveDataProvider();
      const order = await store.getCafeOrderById(id);

      if (order) {
        await store.setCafeOrderStatus(id, status);
        const list = await store.listCafeOrders();
        res.json({ success: true, cafeOrders: list.map(o => ({ ...o, items: JSON.parse(o.items) })) });
      } else {
        res.status(404).json({ error: "Order not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Accessory Shop CRUD
  app.post("/api/admin/accessories", async (req, res) => {
    try {
      const { name, description, price, imageUrl, mobileImageUrl, autoGenerateMobile, stock, category } = req.body;
      const store = getActiveDataProvider();
      const nextId = "a" + ((await store.countAccessories()) + 1);

      const finalImageUrl = imageUrl || "/images/home/gear-shop-480.webp";
      const finalMobileUrl = await resolveAdminMobileImageUrl(mobileImageUrl, autoGenerateMobile !== false, finalImageUrl, "item");

      await store.createAccessory({
        id: nextId,
        name,
        description,
        price: Number(price),
        imageUrl: finalImageUrl,
        mobileImageUrl: finalMobileUrl,
        stock: Number(stock),
        category
      });

      const list = await store.listAccessories();
      res.json({ success: true, accessories: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.put("/api/admin/accessories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, imageUrl, mobileImageUrl, autoGenerateMobile, stock, category } = req.body;
      const store = getActiveDataProvider();
      const acc = await store.getAccessoryById(id);

      if (acc) {
        const finalImageUrl = imageUrl !== undefined ? imageUrl : acc.imageUrl;
        const wantsAuto = autoGenerateMobile === true || (typeof mobileImageUrl === "string" && !mobileImageUrl.trim() && autoGenerateMobile !== false);
        const finalMobileUrl = typeof mobileImageUrl === "string" && mobileImageUrl.trim()
          ? mobileImageUrl.trim()
          : (wantsAuto ? await generateMobileImageVariant(finalImageUrl, "item") : undefined) ?? acc.mobileImageUrl;

        await store.updateAccessory(id, {
          name: name !== undefined ? name : acc.name,
          description: description !== undefined ? description : acc.description,
          price: price !== undefined ? Number(price) : acc.price,
          imageUrl: finalImageUrl,
          mobileImageUrl: finalMobileUrl,
          stock: stock !== undefined ? Number(stock) : acc.stock,
          category: category !== undefined ? category : acc.category,
        });

        const list = await store.listAccessories();
        res.json({ success: true, accessories: list });
      } else {
        res.status(404).json({ error: "Accessory not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/accessories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteAccessory(id);
      const list = await store.listAccessories();
      res.json({ success: true, accessories: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Update shop order status
  app.put("/api/admin/shop-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const store = getActiveDataProvider();
      const order = await store.getShopOrderById(id);

      if (order) {
        await store.setShopOrderStatus(id, status);
        const list = await store.listShopOrders();
        res.json({ success: true, shopOrders: list.map(o => ({ ...o, cart: JSON.parse(o.cart) })) });
      } else {
        res.status(404).json({ error: "Order not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Tournaments CRUD
  app.post("/api/admin/tournaments", async (req, res) => {
    try {
      const { title, game, registrationFee, startDate, maxTeams, status } = req.body;
      const store = getActiveDataProvider();
      const nextId = "t" + ((await store.countTournaments()) + 1);

      const newTour = {
        id: nextId,
        title,
        game,
        registrationFee: Number(registrationFee),
        startDate,
        maxTeams: Number(maxTeams),
        status: status || "Upcoming",
        registeredTeamsCount: 0,
        teams: "[]",
        bracket: JSON.stringify({
          round1: [],
          semis: [],
          finals: []
        })
      };

      await store.createTournament(newTour);

      const list = await store.listTournaments();
      res.json({
        success: true,
        tournaments: list.map(t => ({
          ...t,
          teams: JSON.parse(t.teams),
          bracket: JSON.parse(t.bracket)
        }))
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/tournaments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteTournament(id);
      const list = await store.listTournaments();
      res.json({
        success: true,
        tournaments: list.map(t => ({ ...t, teams: JSON.parse(t.teams), bracket: JSON.parse(t.bracket) }))
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Blog News Articles CRUD
  app.post("/api/admin/articles", async (req, res) => {
    try {
      const { title, content, category, imageUrl, mobileImageUrl, autoGenerateMobile, author, date } = req.body;
      const store = getActiveDataProvider();
      const nextId = "a" + ((await store.countArticles()) + 1);

      const finalImageUrl = imageUrl || "/images/home/esports-480.webp";
      const finalMobileUrl = await resolveAdminMobileImageUrl(mobileImageUrl, autoGenerateMobile !== false, finalImageUrl, "article");

      const newArt = {
        id: nextId,
        title,
        content,
        category,
        imageUrl: finalImageUrl,
        mobileImageUrl: finalMobileUrl,
        author: author || "سیستم مدیریت",
        date: date || "۱۴۰۵/۰۴/۱۴",
        comments: "[]",
      };

      await store.createArticle(newArt);

      // Broadcast news notification to all WebSocket clients
      const payload = JSON.stringify({
        event: "notification",
        data: {
          id: newArt.id,
          sender: "اخبار سالن",
          title: `انتشار خبر جدید: ${title}`,
          body: content,
          type: "news",
          date: "امروز"
        }
      });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

      const list = await store.listArticles();
      res.json({
        success: true,
        articles: list.map(a => ({
          ...a,
          comments: JSON.parse(a.comments)
        }))
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteArticle(id);
      const list = await store.listArticles();
      res.json({ success: true, articles: list.map(a => ({ ...a, comments: JSON.parse(a.comments) })) });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // User Messages & Notifications APIs
  app.get("/api/admin/users", async (req, res) => {
    try {
      const list = await getActiveDataProvider().listUsers();
      // Never leak password hashes to the admin panel UI
      res.json(list.map(({ passwordHash, ...safe }) => safe));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const { username } = req.query;
      const store = getActiveDataProvider();
      if (username) {
        const list = await store.listUserMessagesFor(String(username));
        res.json(list);
      } else {
        const list = await store.listUserMessages();
        res.json(list);
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/admin/messages", async (req, res) => {
    try {
      const { recipient, title, body, sendAsNotification } = req.body;
      if (!recipient || !title || !body) {
        return res.status(400).json({ error: "اطلاعات پیام ناقص است." });
      }

      const newMsg = {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        sender: "مدیریت سالن",
        recipient,
        title,
        body,
        date: "امروز",
        isRead: false,
        type: sendAsNotification ? "notification" : "message"
      };

      await getActiveDataProvider().addUserMessage(newMsg);

      // Broadcast live notification
      const payload = JSON.stringify({
        event: "notification",
        data: {
          id: newMsg.id,
          sender: newMsg.sender,
          recipient: newMsg.recipient,
          title: newMsg.title,
          body: newMsg.body,
          date: newMsg.date,
          type: newMsg.type
        }
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

      const list = await getActiveDataProvider().listUserMessages();
      res.json({ success: true, messages: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/messages/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      const msg = await store.getUserMessageById(id);
      if (msg) {
        await store.setUserMessageRead(id);
        res.json({ success: true, message: { ...msg, isRead: true } });
      } else {
        res.status(404).json({ error: "Message not found" });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Themes Management Endpoints
  app.get("/api/themes", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const themes = await store.listThemes();
      const activeThemeId = await store.getSetting("activeThemeId");
      // قالب‌های نصب‌شده روی سرور (هر قالب پوشه اختصاصی خودش را دارد)
      const serverThemes = listInstalledThemes();
      res.json({ themes, serverThemes, activeThemeId: activeThemeId || "dark-gold" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // THEME STORE — نصب/حذف/سرو قالب‌های سروری (پوشه اختصاصی هر قالب)
  // ═══════════════════════════════════════════════════════════════════

  // نصب قالب از فایل ZIP (body خام با Content-Type: application/zip)
  // ساختار: theme.json + theme.css + assets/
  app.post(
    "/api/admin/themes/install",
    express.raw({ type: ["application/zip", "application/octet-stream"], limit: "30mb" }),
    async (req, res) => {
      try {
        const buffer = req.body as Buffer | undefined;
        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: "فایل ZIP ارسال نشده است" });
        }
        const fallbackName = (req.query.name as string) || undefined;
        const result = await installThemeZip(new Uint8Array(buffer), fallbackName);
        if ("error" in result) {
          return res.status(400).json({ error: result.error, performance: result.performance });
        }
        logDbQuery(getActiveDataProvider().name, "SYSTEM", `Theme "${result.theme.id}" installed (${result.parsed.assets ? Object.keys(result.parsed.assets).length : 0} assets)`);
        res.json({ success: true, theme: result.theme, performance: result.performance });
      } catch (e) {
        console.error("Theme install error:", e);
        res.status(500).json({ error: String(e) });
      }
    }
  );

  // سرو فایل CSS قالب (با بازنویسی مسیرهای assets)
  app.get("/api/themes/:id/theme.css", (req, res) => {
    try {
      const result = readThemeCss(req.params.id);
      if (!result) return res.status(404).json({ error: "Theme not found" });
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Cache-Control", "no-cache");
      res.send(result.css);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // سرو کامپوننت قالب (theme.js) — اختیاری؛ فقط اگر در پوشه قالب باشد
  app.get("/api/themes/:id/theme.js", (req, res) => {
    try {
      const result = getThemeComponentJs(req.params.id);
      if (!result) return res.status(404).json({ error: "Theme has no component" });
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.send(Buffer.from(result.data));
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // سرو فایل‌های assets قالب (تصویر/ویدئو/فونت/...)
  const ASSET_MIME: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", ico: "image/x-icon",
    mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", ogv: "video/ogg",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", eot: "application/vnd.ms-fontobject",
    css: "text/css", js: "text/javascript", json: "application/json", txt: "text/plain",
  };
  app.get("/api/themes/:id/assets/*", (req, res) => {
    try {
      const rel = (req.params[0] as string) || "";
      const asset = getThemeAsset(req.params.id, rel);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      res.setHeader("Content-Type", ASSET_MIME[asset.ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(Buffer.from(asset.data));
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // خروجی ZIP از قالب نصب‌شده (شامل پوشه assets)
  app.get("/api/themes/:id/export", (req, res) => {
    try {
      const zip = exportThemeZip(req.params.id);
      if (!zip) return res.status(404).json({ error: "Theme not found" });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.zip"`);
      res.send(Buffer.from(zip));
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  // حذف قالب (پوشه کامل قالب حذف می‌شود)
  app.delete("/api/admin/themes/:id", (req, res) => {
    try {
      const removed = deleteTheme(req.params.id);
      if (!removed) return res.status(404).json({ error: "Theme not found" });
      logDbQuery(getActiveDataProvider().name, "SYSTEM", `Theme "${req.params.id}" deleted (folder removed)`);
      res.json({ success: true, serverThemes: listInstalledThemes() });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  app.post("/api/admin/themes", async (req, res) => {
    try {
      const { name, nameEn, primaryColor, primaryHover, darkBg, darkCard, accentRed } = req.body;
      if (!name || !primaryColor || !darkBg || !darkCard) {
        return res.status(400).json({ error: "اطلاعات تم ناقص است." });
      }
      const store = getActiveDataProvider();
      const newTheme = {
        id: "theme-" + Math.random().toString(36).substring(2, 9),
        name,
        nameEn: nameEn || name,
        primaryColor,
        primaryHover: primaryHover || primaryColor,
        darkBg,
        darkCard,
        accentRed: accentRed || "#ff3b30",
      };

      await store.createTheme(newTheme);

      const list = await store.listThemes();
      const activeThemeId = await store.getSetting("activeThemeId");

      res.json({ success: true, themes: list, activeThemeId: activeThemeId || "dark-gold" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/admin/themes/activate", async (req, res) => {
    try {
      const { themeId } = req.body;
      const store = getActiveDataProvider();
      const themes = await store.listThemes();
      const themeExists = themes.some(t => t.id === themeId);

      if (!themeExists) {
        return res.status(404).json({ error: "تم یافت نشد." });
      }

      await store.setSetting("activeThemeId", themeId);
      res.json({ success: true, themes, activeThemeId: themeId });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // App Sliders APIs
  app.get("/api/app-sliders", async (req, res) => {
    try {
      const sliders = await resolveSampleList(await getActiveDataProvider().listSliders(), SAMPLE_SLIDERS);
      res.json(sliders);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/admin/app-sliders", async (req, res) => {
    try {
      const { imageUrl, mobileImageUrl, autoGenerateMobile, target, titleFa, titleEn, titleRu, titleTr } = req.body;
      if (!imageUrl || !target) {
        return res.status(400).json({ error: "آدرس تصویر و بخش هدف الزامی هستند." });
      }
      const store = getActiveDataProvider();
      // اسلایدر اپ عمودی است (کادر Expanded + BoxFit.cover)؛ واریانت موبایل ۳:۴ ساخته می‌شود
      const finalMobileUrl = await resolveAdminMobileImageUrl(mobileImageUrl, autoGenerateMobile !== false, imageUrl, "slide");
      const newSlide = {
        id: "slide-" + Math.random().toString(36).substring(2, 9),
        imageUrl,
        mobileImageUrl: finalMobileUrl,
        target,
        titleFa: titleFa || "",
        titleEn: titleEn || "",
        titleRu: titleRu || "",
        titleTr: titleTr || ""
      };

      await store.createSlider(newSlide);

      const list = await store.listSliders();
      res.json({ success: true, appSliders: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.put("/api/admin/app-sliders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { imageUrl, mobileImageUrl, autoGenerateMobile, target, titleFa, titleEn, titleRu, titleTr } = req.body;
      const store = getActiveDataProvider();
      const slide = await store.getSliderById(id);

      if (slide) {
        const finalImageUrl = imageUrl !== undefined ? imageUrl : slide.imageUrl;
        const wantsAuto = autoGenerateMobile === true || (typeof mobileImageUrl === "string" && !mobileImageUrl.trim() && autoGenerateMobile !== false);
        const finalMobileUrl = typeof mobileImageUrl === "string" && mobileImageUrl.trim()
          ? mobileImageUrl.trim()
          : (wantsAuto ? await generateMobileImageVariant(finalImageUrl, "slide") : undefined) ?? slide.mobileImageUrl;

        await store.updateSlider(id, {
          imageUrl: finalImageUrl,
          mobileImageUrl: finalMobileUrl,
          target: target !== undefined ? target : slide.target,
          titleFa: titleFa !== undefined ? titleFa : slide.titleFa,
          titleEn: titleEn !== undefined ? titleEn : slide.titleEn,
          titleRu: titleRu !== undefined ? titleRu : (slide.titleRu || ""),
          titleTr: titleTr !== undefined ? titleTr : (slide.titleTr || ""),
        });

        const list = await store.listSliders();
        res.json({ success: true, appSliders: list });
      } else {
        res.status(404).json({ error: "اسلاید پیدا نشد." });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/admin/app-sliders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const store = getActiveDataProvider();
      await store.deleteSlider(id);
      const list = await store.listSliders();
      res.json({ success: true, appSliders: list });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // =========================================================================
  // MOBILE APP DOWNLOADS — مستقل از قالب سایت
  // =========================================================================
  const getMobileAppDownloadDir = () => path.join(process.env.BAZINO_STATIC_ROOT || process.cwd(), "public", "downloads");
  const getMobileAppApkPath = () => path.join(getMobileAppDownloadDir(), MOBILE_APP_APK_FILE_NAME);
  const MAX_APK_BYTES = 160 * 1024 * 1024;

  const getMobileAppConfig = async () => {
    const store = getActiveDataProvider();
    let storeLinks: any[] = [];
    let apkMeta: any = {};
    try {
      const rawLinks = await store.getSetting(MOBILE_APP_STORE_LINKS_SETTING);
      if (rawLinks) storeLinks = JSON.parse(rawLinks);
    } catch {
      storeLinks = [];
    }
    try {
      const rawMeta = await store.getSetting(MOBILE_APP_APK_META_SETTING);
      if (rawMeta) apkMeta = JSON.parse(rawMeta);
    } catch {
      apkMeta = {};
    }
    const apkPath = getMobileAppApkPath();
    const apkAvailable = fs.existsSync(apkPath);
    const stat = apkAvailable ? fs.statSync(apkPath) : null;
    return {
      apkAvailable,
      apkFileName: apkMeta.originalName || MOBILE_APP_APK_FILE_NAME,
      apkSize: stat?.size || apkMeta.size || 0,
      apkUploadedAt: apkMeta.uploadedAt || (stat ? stat.mtime.toISOString() : ""),
      directDownloadUrl: "/api/mobile-app/download",
      storeLinks: Array.isArray(storeLinks) ? storeLinks : []
    };
  };

  app.get("/api/mobile-app", async (_req, res) => {
    try {
      res.json(await getMobileAppConfig());
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/mobile-app/download", async (_req, res) => {
    const apkPath = getMobileAppApkPath();
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ error: "فایل APK هنوز توسط مدیر آپلود نشده است." });
    }
    res.download(apkPath, MOBILE_APP_APK_FILE_NAME, (err) => {
      if (err) {
        console.error("Error downloading mobile APK:", err);
        if (!res.headersSent) res.status(500).json({ error: "خطا در دانلود فایل APK" });
      }
    });
  });

  app.get("/api/mobile-app/qr.png", async (req, res) => {
    try {
      const rawSize = Number(req.query.size || 1400);
      const size = Math.min(Math.max(Number.isFinite(rawSize) ? rawSize : 1400, 512), 2200);
      const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
      const proto = forwardedProto || req.protocol || "https";
      const host = req.get("host");
      const downloadPageUrl = `${proto}://${host}/app-download`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=64&format=png&data=${encodeURIComponent(downloadPageUrl)}`;
      const qrResponse = await fetch(qrUrl);
      if (!qrResponse.ok) {
        throw new Error(`QR provider responded with ${qrResponse.status}`);
      }
      const buffer = Buffer.from(await qrResponse.arrayBuffer());
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename=BAZINO_APP_DOWNLOAD_QR_${size}.png`);
      res.setHeader("Cache-Control", "no-store");
      res.send(buffer);
    } catch (e) {
      console.error("Mobile app QR generation failed:", e);
      res.status(502).json({ error: "خطا در ساخت QR Code دانلود اپلیکیشن" });
    }
  });

  const isMultipartApkUpload = (req: express.Request) =>
    /^multipart\/form-data(?:\s*;|$)/i.test(String(req.headers["content-type"] || ""));

  // Keep the raw whole-file parser for already-cached admin bundles. Multipart requests
  // bypass it so formidable receives the original request stream and writes the upload
  // directly to a temporary file on the downloads volume.
  const legacyApkRawParser = express.raw({
    type: ["application/octet-stream", "application/vnd.android.package-archive", "application/x-apk", "application/zip", "application/json"],
    limit: "260mb"
  });
  const parseApkUploadBody = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isMultipartApkUpload(req)) return next();

    console.info("[APK Upload] Legacy whole-file request started", {
      fileName: req.query.fileName || "unknown",
      contentLength: req.headers["content-length"] || "unknown",
      contentType: req.headers["content-type"] || "unknown",
    });
    legacyApkRawParser(req, res, (error?: any) => {
      if (!error) return next();
      const status = error.type === "entity.too.large" || error.status === 413 ? 413 : 400;
      console.error("[APK Upload] Legacy request body rejected", {
        status,
        type: error.type,
        message: error.message,
        contentLength: req.headers["content-length"] || "unknown",
      });
      return res.status(status).json({
        error: status === 413 ? "APK upload request is too large" : "APK upload body could not be read",
        code: error.type || "APK_BODY_PARSE_ERROR",
        status,
        details: error.message || String(error),
      });
    });
  };

  app.post(
    "/api/admin/mobile-app/upload-apk",
    parseApkUploadBody,
    async (req, res) => {
      if (isMultipartApkUpload(req)) {
        const temporaryPaths = new Set<string>();
        console.info("[APK Upload] Multipart request started", {
          contentLength: req.headers["content-length"] || "unknown",
          contentType: req.headers["content-type"] || "unknown",
        });

        try {
          await fs.promises.mkdir(getMobileAppDownloadDir(), { recursive: true });
          const form = formidable({
            uploadDir: getMobileAppDownloadDir(),
            filename: () => `.${MOBILE_APP_APK_FILE_NAME}.${randomUUID()}.tmp`,
            maxFiles: 1,
            maxFileSize: MAX_APK_BYTES,
            maxTotalFileSize: MAX_APK_BYTES,
            minFileSize: 1,
            allowEmptyFiles: false,
            multiples: false,
          });
          form.on("fileBegin", (_fieldName, file) => temporaryPaths.add(file.filepath));
          form.on("file", (_fieldName, file) => temporaryPaths.add(file.filepath));

          const [fields, files] = await form.parse(req);
          const fieldNames = Object.keys(fields);
          const fileFieldNames = Object.keys(files);
          const uploadedFiles = files.file || [];
          if (fieldNames.length > 0 || fileFieldNames.length !== 1 || fileFieldNames[0] !== "file" || uploadedFiles.length !== 1) {
            console.warn("[APK Upload] Multipart request rejected: expected exactly one file field", {
              fieldNames,
              fileFieldNames,
              fileCount: uploadedFiles.length,
            });
            return res.status(400).json({
              error: "Exactly one APK must be provided in the file field",
              code: "INVALID_APK_FORM",
              status: 400,
            });
          }

          const uploadedFile = uploadedFiles[0];
          const originalName = String(uploadedFile.originalFilename || "").trim();
          if (!originalName.toLowerCase().endsWith(".apk")) {
            console.warn("[APK Upload] Multipart request rejected: filename is not an APK", { originalName });
            return res.status(400).json({ error: "Only .apk files are allowed", code: "INVALID_APK_FILE", status: 400 });
          }
          if (uploadedFile.size < 1) {
            return res.status(400).json({ error: "Empty APK file", code: "EMPTY_APK_FILE", status: 400 });
          }
          if (uploadedFile.size > MAX_APK_BYTES) {
            return res.status(413).json({ error: "APK file is too large", code: "APK_TOO_LARGE", status: 413 });
          }

          // The temporary upload lives in the mounted downloads directory, so this
          // replacement is an atomic rename on the same filesystem.
          await fs.promises.rename(uploadedFile.filepath, getMobileAppApkPath());
          temporaryPaths.delete(uploadedFile.filepath);
          const meta = {
            originalName,
            size: uploadedFile.size,
            uploadedAt: new Date().toISOString()
          };
          await getActiveDataProvider().setSetting(MOBILE_APP_APK_META_SETTING, JSON.stringify(meta));
          console.info("[APK Upload] Multipart APK upload completed", { fileName: meta.originalName, size: meta.size });
          return res.json({ success: true, ...(await getMobileAppConfig()) });
        } catch (error: any) {
          const reportedStatus = Number(error?.httpCode || error?.status || 0);
          const status = reportedStatus === 413 ? 413 : (reportedStatus >= 400 && reportedStatus < 500 ? reportedStatus : 500);
          const message = status === 413
            ? "APK file is too large"
            : (status < 500 ? "Invalid multipart APK upload" : "Failed to store APK");
          console.error("[APK Upload] Multipart APK upload failed", {
            status,
            code: error?.code,
            message: error?.message || String(error),
          });
          if (!res.headersSent) {
            return res.status(status).json({
              error: message,
              code: error?.code || "APK_UPLOAD_FAILED",
              status,
              details: error?.message || String(error),
            });
          }
        } finally {
          await Promise.all(
            [...temporaryPaths].map((temporaryPath) => fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined))
          );
        }
        return;
      }

      try {
        const raw = req.body as Buffer | undefined;
        if (!Buffer.isBuffer(raw) || raw.length === 0) {
          console.warn("[APK Upload] Legacy request did not contain file data");
          return res.status(400).json({ error: "APK file data is missing" });
        }

        let buffer: Buffer;
        let fileName = "";
        const contentType = String(req.headers["content-type"] || "");

        if (contentType.includes("application/json")) {
          // Legacy base64 JSON upload from older cached clients.
          let parsed: any;
          try {
            parsed = JSON.parse(raw.toString("utf8"));
          } catch {
            return res.status(400).json({ error: "Invalid APK upload payload" });
          }
          fileName = String(parsed?.fileName || "");
          const dataBase64 = String(parsed?.dataBase64 || "");
          if (!dataBase64) return res.status(400).json({ error: "Missing APK file data" });
          const base64 = dataBase64.includes(",") ? dataBase64.split(",").pop()! : dataBase64;
          buffer = Buffer.from(base64, "base64");
        } else {
          buffer = raw;
          fileName = typeof req.query.fileName === "string" ? req.query.fileName.trim() : "";
        }

        if (buffer.length === 0) {
          return res.status(400).json({ error: "Empty APK file" });
        }
        if (buffer.length > MAX_APK_BYTES) {
          return res.status(413).json({ error: "APK file is too large" });
        }
        if (fileName && !fileName.toLowerCase().endsWith(".apk")) {
          return res.status(400).json({ error: "Only .apk files are allowed" });
        }

        fs.mkdirSync(getMobileAppDownloadDir(), { recursive: true });
        fs.writeFileSync(getMobileAppApkPath(), buffer);
        const meta = { originalName: fileName || MOBILE_APP_APK_FILE_NAME, size: buffer.length, uploadedAt: new Date().toISOString() };
        await getActiveDataProvider().setSetting(MOBILE_APP_APK_META_SETTING, JSON.stringify(meta));
        console.info("[APK Upload] Legacy whole-file upload completed", { fileName: meta.originalName, size: meta.size });
        return res.json({ success: true, ...(await getMobileAppConfig()) });
      } catch (error) {
        console.error("[APK Upload] Legacy whole-file upload failed", error);
        return res.status(500).json({ error: "Failed to store APK", status: 500, details: String(error) });
      }
    }
  );

  // =========================================================================
  // CHUNKED APK UPLOAD — آپلود تکه‌تکه برای عبور از تایم‌اوت پروکسی/Cloudflare
  //
  // HTTP 524 یعنی گیت‌وی (Cloudflare) حدود ۱۰۰ ثانیه منتظر اوریجین ماند و
  // جواب نگرفت. یک درخواست HTTP واحد با کل فایل APK (تا ۱۶۰MB) عملاً تضمینی
  // است که در مسیر اینترنتِ واقعی از این پنجره رد شود — بدنه‌اش کامل فرستاده
  // می‌شود ولی پاسخ هرگز نمی‌رسد. این API به‌جای آن، فایل را تکه‌تکه می‌گیرد:
  // هر تکه یک درخواست کوتاهِ مستقل است که خیلی قبل از هر تایم‌اوتی تمام
  // می‌شود؛ ایندکس تکه‌ها ترتیبی است و تکه تکراری (بعد از قطعی شبکه) به‌صورت
  // idempotent نادیده گرفته می‌شود؛ و فایل نهایی فقط در finalize با یک rename
  // اتمیک روی همان فایل‌سیستم منتشر می‌شود. اگر وسط کار قطع شود، هیچ فایل
  // نیمه‌کاره‌ای به‌عنوان APK فعال دیده نمی‌شود.
  // =========================================================================
  const APK_CHUNK_MAX_BYTES = 16 * 1024 * 1024;
  const APK_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

  interface ApkUploadSession {
    sessionId: string;
    fileName: string;
    totalSize: number;
    received: number;
    expectedIndex: number;
    partPath: string;
    lastActivity: number;
    /** زنجیرهٔ نوشتن روی دیسک: نوشتن تکه‌ها را ترتیبی می‌کند تا ارسال‌های
     *  هم‌زمانِ یک تکه نتوانند به فایلِ part آسیب بزنند. */
    writeChain: Promise<void>;
    writeError?: any;
  }
  const apkUploadSessions = new Map<string, ApkUploadSession>();

  const isValidApkSessionId = (sessionId: string) => /^[A-Za-z0-9._-]{8,128}$/.test(sessionId);

  const cleanupApkSession = async (session: ApkUploadSession) => {
    apkUploadSessions.delete(session.sessionId);
    await fs.promises.rm(session.partPath, { force: true }).catch(() => undefined);
  };

  const sweepStaleApkSessions = async () => {
    const now = Date.now();
    for (const session of [...apkUploadSessions.values()]) {
      if (now - session.lastActivity > APK_SESSION_TTL_MS) {
        console.warn("[APK Upload] Dropping stale chunked session", {
          sessionId: session.sessionId,
          received: session.received,
          totalSize: session.totalSize,
        });
        await cleanupApkSession(session);
      }
    }
  };

  // Chunk bodies are raw bytes (application/octet-stream), so this route must be
  // skipped by the global JSON parser — it is, in the skip list above.
  const apkChunkRawParser = express.raw({
    type: () => true,
    limit: String(APK_CHUNK_MAX_BYTES + 1024 * 1024),
  });

  app.post(
    "/api/admin/mobile-app/upload-apk/chunk",
    apkChunkRawParser,
    async (req, res) => {
      try {
        const sessionId = String(req.query.sessionId || "").trim();
        const fileName = String(req.query.fileName || "").trim();
        const rawIndex = String(req.query.index ?? "").trim();
        const rawTotalSize = String(req.query.totalSize ?? "").trim();

        if (!isValidApkSessionId(sessionId)) {
          return res.status(400).json({ error: "Invalid APK upload session id", code: "INVALID_APK_SESSION", status: 400 });
        }
        const index = Number(rawIndex);
        const totalSize = Number(rawTotalSize);
        if (
          rawIndex === "" || rawTotalSize === "" ||
          !Number.isInteger(index) || index < 0 ||
          !Number.isInteger(totalSize) || totalSize <= 0 || totalSize > MAX_APK_BYTES
        ) {
          return res.status(400).json({ error: "Invalid APK chunk parameters", code: "INVALID_APK_CHUNK_PARAMS", status: 400 });
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "APK chunk body is empty", code: "EMPTY_APK_CHUNK", status: 400 });
        }
        if (req.body.length > APK_CHUNK_MAX_BYTES) {
          return res.status(413).json({ error: "APK chunk is too large", code: "APK_CHUNK_TOO_LARGE", status: 413 });
        }
        if (fileName && !fileName.toLowerCase().endsWith(".apk")) {
          return res.status(400).json({ error: "Only .apk files are allowed", code: "INVALID_APK_FILE", status: 400 });
        }

        await sweepStaleApkSessions();

        let session = apkUploadSessions.get(sessionId);
        if (!session) {
          await fs.promises.mkdir(getMobileAppDownloadDir(), { recursive: true });
          session = {
            sessionId,
            fileName: fileName || MOBILE_APP_APK_FILE_NAME,
            totalSize,
            received: 0,
            expectedIndex: 0,
            partPath: path.join(getMobileAppDownloadDir(), `.${MOBILE_APP_APK_FILE_NAME}.${sessionId}.part`),
            lastActivity: Date.now(),
            writeChain: Promise.resolve(),
          };
          apkUploadSessions.set(sessionId, session);
          console.info("[APK Upload] Chunked session started", { sessionId, fileName: session.fileName, totalSize });
        }

        if (session.totalSize !== totalSize) {
          return res.status(409).json({ error: "APK upload session size mismatch", code: "APK_SESSION_CONFLICT", status: 409 });
        }

        // Chunks arrive strictly sequentially. A re-sent chunk (network retry after
        // a lost response, or a proxy double-delivery) is an idempotent no-op — the
        // bytes are already on disk, so we never write the same index twice.
        if (index < session.expectedIndex) {
          return res.json({ success: true, received: session.received, expectedIndex: session.expectedIndex, totalSize: session.totalSize });
        }
        if (index > session.expectedIndex) {
          return res.status(409).json({ error: "APK chunk out of order", code: "APK_CHUNK_OUT_OF_ORDER", status: 409, expectedIndex: session.expectedIndex });
        }

        const chunk = req.body;
        session.lastActivity = Date.now();
        session.writeChain = session.writeChain
          .then(() => fs.promises.appendFile(session!.partPath, chunk))
          .catch((error: any) => { session!.writeError = error; });
        await session.writeChain;
        if (session.writeError) {
          const writeError = session.writeError;
          session.writeError = undefined;
          throw writeError;
        }

        session.received += chunk.length;
        session.expectedIndex += 1;
        if (session.received > session.totalSize) {
          await cleanupApkSession(session);
          return res.status(400).json({ error: "APK chunk overflow", code: "APK_CHUNK_OVERFLOW", status: 400 });
        }

        return res.json({ success: true, received: session.received, expectedIndex: session.expectedIndex, totalSize: session.totalSize });
      } catch (error: any) {
        console.error("[APK Upload] Chunk append failed", { message: error?.message || String(error) });
        if (!res.headersSent) {
          return res.status(500).json({ error: "Failed to store APK chunk", code: "APK_CHUNK_WRITE_FAILED", status: 500, details: error?.message || String(error) });
        }
      }
    }
  );

  app.post("/api/admin/mobile-app/upload-apk/finalize", async (req, res) => {
    try {
      const sessionId = String(req.body?.sessionId || "").trim();
      if (!isValidApkSessionId(sessionId)) {
        return res.status(400).json({ error: "Invalid APK upload session id", code: "INVALID_APK_SESSION", status: 400 });
      }
      const session = apkUploadSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: "APK upload session not found or expired — re-upload the file", code: "APK_SESSION_NOT_FOUND", status: 404 });
      }

      const stat = await fs.promises.stat(session.partPath).catch(() => null);
      const onDisk = stat?.size || 0;
      if (onDisk !== session.totalSize || onDisk === 0) {
        return res.status(409).json({
          error: "APK upload is incomplete — re-upload the remaining chunks",
          code: "APK_INCOMPLETE",
          status: 409,
          received: onDisk,
          totalSize: session.totalSize,
        });
      }

      // Atomic publish on the same filesystem: the .part file is never visible as
      // the live APK until every byte is on disk.
      await fs.promises.rename(session.partPath, getMobileAppApkPath());
      const meta = { originalName: session.fileName, size: onDisk, uploadedAt: new Date().toISOString() };
      await getActiveDataProvider().setSetting(MOBILE_APP_APK_META_SETTING, JSON.stringify(meta));
      apkUploadSessions.delete(sessionId);
      console.info("[APK Upload] Chunked upload finalized", { fileName: meta.originalName, size: meta.size });
      return res.json({ success: true, ...(await getMobileAppConfig()) });
    } catch (error) {
      console.error("[APK Upload] Finalize failed", error);
      return res.status(500).json({ error: "Failed to finalize APK upload", status: 500, details: String(error) });
    }
  });

  app.delete("/api/admin/mobile-app/upload-apk/session", async (req, res) => {
    try {
      const sessionId = String(req.query.sessionId || "").trim();
      const session = apkUploadSessions.get(sessionId);
      if (session) await cleanupApkSession(session);
      return res.json({ success: true });
    } catch (error) {
      console.error("[APK Upload] Cancel failed", error);
      return res.status(500).json({ error: "Failed to cancel APK upload", status: 500 });
    }
  });

  app.post("/api/admin/mobile-app/store-links", async (req, res) => {
    try {
      const links = Array.isArray(req.body?.links) ? req.body.links : [];
      const cleanLinks = links
        .filter((x: any) => x && typeof x.url === "string" && /^https?:\/\//i.test(x.url))
        .map((x: any) => ({
          id: String(x.id || "store-" + Math.random().toString(36).substring(2, 9)),
          kind: String(x.kind || "other"),
          labelFa: String(x.labelFa || x.labelEn || "دانلود اپلیکیشن"),
          labelEn: String(x.labelEn || x.labelFa || "Download app"),
          url: String(x.url),
          isActive: x.isActive !== false
        }));
      await getActiveDataProvider().setSetting(MOBILE_APP_STORE_LINKS_SETTING, JSON.stringify(cleanLinks));
      res.json({ success: true, storeLinks: cleanLinks });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Get dynamic C# code including EF Code-First Migrations
  app.get("/api/csharp/migrations", (req, res) => {
    const migrationsCode = `using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace GameNet.Infrastructure.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Username = table.Column<string>(nullable: false),
                    PasswordHash = table.Column<string>(nullable: false),
                    Email = table.Column<string>(nullable: true),
                    LoyaltyPoints = table.Column<int>(nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Users");
        }
    }
}`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(migrationsCode);
  });

  // =========================================================================
  // CUSTOMIZATION & SETTINGS APIs
  // =========================================================================
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await getActiveDataProvider().listSettings();
      const settingsObj = settings.reduce((acc, curr) => {
        // Secrets (AI provider keys, the desktop-sync API key) are managed through
        // their own admin-only endpoints; never leak them through the public
        // /api/settings response, which any visitor can read.
        if (SECRET_SETTING_KEYS.has(curr.key)) return acc;
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, string>);

      // مقادیر نمونه به‌عنوان پایه (پیش‌فرض)؛ مقادیر ذخیره‌شده در دیتابیس
      // همیشه اولویت دارند — یعنی اگر ادمین چیزی را سفارشی کرده باشد،
      // در هر دو حالت sample/database همان مقدار دیده می‌شود.
      const sampleObj = SAMPLE_SETTINGS.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, string>);

      res.json({ ...sampleObj, ...settingsObj, data_source: await getDataSourceMode() });
    } catch (err) {
      console.error("Error fetching settings:", err);
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }
      if (key === JARVIS_AI_PROVIDERS_SETTING) {
        return res.status(403).json({ error: "Jarvis AI providers must be managed through /api/admin/jarvis-ai-providers" });
      }
      await getActiveDataProvider().setSetting(key, value);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving setting:", err);
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  app.get("/api/admin/jarvis-ai-providers", async (_req, res) => {
    try {
      const providers = await getJarvisAiProviders(false);
      res.json({ providers: providers.map(maskJarvisProvider) });
    } catch (err) {
      res.status(500).json({ error: "Failed to load Jarvis AI providers" });
    }
  });

  app.post("/api/admin/jarvis-ai-providers", async (req, res) => {
    try {
      const incoming = Array.isArray(req.body?.providers) ? req.body.providers.slice(0, 3) : [];
      const existing = await getJarvisAiProviders(false);
      const existingById = new Map(existing.map(p => [p.id, p]));
      const clean = incoming.map((p: any, index: number) => {
        const id = String(p.id || `provider-${index + 1}`);
        const provider = ["gemini", "groq", "openrouter", "ollama", "custom"].includes(String(p.provider)) ? String(p.provider) as JarvisAiProviderConfig["provider"] : "groq";
        const old = existingById.get(id);
        const apiKey = p.apiKey && p.apiKey !== "********" ? String(p.apiKey) : (old?.apiKey || "");
        return {
          id,
          provider,
          label: String(p.label || provider),
          model: String(p.model || defaultModelForProvider(provider)),
          apiKey,
          baseUrl: String(p.baseUrl || ""),
          enabled: p.enabled !== false,
        } as JarvisAiProviderConfig;
      });
      await getActiveDataProvider().setSetting(JARVIS_AI_PROVIDERS_SETTING, JSON.stringify(clean));
      res.json({ success: true, providers: clean.map(maskJarvisProvider) });
    } catch (err) {
      console.error("Error saving Jarvis AI providers:", err);
      res.status(500).json({ error: "Failed to save Jarvis AI providers" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // DATA SOURCE — «منبع داده (نمونه / دیتابیس)»
  // اطلاعات وضعیت فعلی + تعداد آیتم‌های هر بخش در هر دو منبع
  // ═══════════════════════════════════════════════════════════════
  app.get("/api/data-source", async (req, res) => {
    try {
      const store = getActiveDataProvider();
      const mode = await getDataSourceMode();
      const dbCounts = {
        systems: (await store.listSystems()).length,
        cafeItems: (await store.listCafeItems()).length,
        accessories: (await store.listAccessories()).length,
        tournaments: (await store.listTournaments()).length,
        articles: (await store.listArticles()).length,
        sliders: (await store.listSliders()).length,
        coupons: (await store.listCoupons()).length,
        transactions: (await store.listTransactions()).length,
        chatRooms: (await store.listChatRooms()).length,
        reservations: (await store.listReservationLogs()).length
      };
      res.json({ mode, sample: SAMPLE_COUNTS, database: dbCounts });
    } catch (err) {
      console.error("Error reading data source:", err);
      res.status(500).json({ error: "Failed to read data source" });
    }
  });

  app.post("/api/admin/data-source", async (req, res) => {
    try {
      const { mode } = req.body;
      if (mode !== "sample" && mode !== "database") {
        return res.status(400).json({ error: "mode must be 'sample' or 'database'" });
      }
      await setDataSourceMode(mode);
      logDbQuery(getActiveDataProvider().name, "SYSTEM", `Data source switched to "${mode}"`);
      res.json({ success: true, mode });
    } catch (err) {
      console.error("Error switching data source:", err);
      res.status(500).json({ error: "Failed to switch data source" });
    }
  });

  // Management App (Bazino, served at /management-app) full-state persistence.
  // The Management App POSTs its entire in-memory state (stations, buffet items,
  // customers, tariffs, expenses, invoices, operators) here every time anything changes,
  // so a power outage/crash never loses more than a few seconds of data. Stored as a
  // single JSON blob under the generic settings key/value store (same mechanism as every
  // other setting) since it's always read/written as one atomic unit, not queried by field.
  // NOTE: like the /api/admin/settings pair above, this does not currently go through
  // requireAuth — consistent with the existing pattern in this file, but worth revisiting
  // if the Management App is ever exposed outside a trusted local network.
  app.get("/api/state", async (req, res) => {
    try {
      const raw = await getActiveDataProvider().getSetting("managementAppState");
      res.json(raw ? JSON.parse(raw) : null);
    } catch (err) {
      console.error("Error loading Management App state:", err);
      res.status(500).json({ error: "Failed to load state" });
    }
  });

  app.post("/api/state", async (req, res) => {
    try {
      await getActiveDataProvider().setSetting("managementAppState", JSON.stringify(req.body));
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving Management App state:", err);
      res.status(500).json({ error: "Failed to save state" });
    }
  });

  // Loads every sample dataset (systems, cafe items, accessories, tournaments,
  // articles, chat rooms, reservation logs, sliders) — the same toggle used by
  // the install wizard, callable again any time from the admin panel.
  app.post("/api/admin/reset-database", async (req, res) => {
    try {
      await getActiveDataProvider().seedSampleData();
      res.json({ success: true, message: "دیتای نمونه با موفقیت بارگذاری شد." });
    } catch (err) {
      console.error("Error seeding sample data:", err);
      res.status(500).json({ error: "Failed to load sample data" });
    }
  });

  // Removes every sample dataset the toggle above would have created, without
  // touching the admin account, theme settings, or any real customer data.
  app.post("/api/admin/clear-database", async (req, res) => {
    try {
      await getActiveDataProvider().purgeSampleData();
      res.json({ success: true, message: "دیتای نمونه با موفقیت حذف شد." });
    } catch (err) {
      console.error("Error clearing sample data:", err);
      res.status(500).json({ error: "Failed to purge sample data" });
    }
  });

  // Lazy initialize Gemini client and helper
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'bazino-pro-server',
          }
        }
      });
    }
    return aiClient;
  }

  app.post("/api/admin/translate", async (req, res) => {
    const { text, sourceLang } = req.body;
    try {
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Text is required" });
      }

      // Check if API key exists. If not, perform simulated translations for testing
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Using simulated translations.");
        const mockTranslations = {
          fa: sourceLang === "fa" ? text : `[Persian translation of: ${text}]`,
          en: sourceLang === "en" ? text : `[English translation of: ${text}]`,
          ru: `[Russian translation of: ${text}]`,
          tr: `[Turkish translation of: ${text}]`
        };
        return res.json({ success: true, translations: mockTranslations });
      }

      const client = getGeminiClient();
      const systemPrompt = `You are an expert translator for "BAZINO" (Farsi: بازینو), an elite gaming center, esports stadium, and high-tech console arcade.
Your job is to translate the given user input text into Farsi (fa), English (en), Russian (ru), and Turkish (tr).
Ensure the tone is exciting, gaming-oriented, professional, and fits a premium futuristic cyber lounge atmosphere.
You must return only a valid JSON object with the keys: fa, en, ru, tr.
Do not wrap in markdown code blocks.
Example format:
{
  "fa": "توضیحات فارسی",
  "en": "English description",
  "ru": "Описание на русском",
  "tr": "Türkçe açıklama"
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Translate this text: "${text}" (Source language is likely ${sourceLang || 'auto'}).`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fa: { type: Type.STRING, description: "Persian (Farsi) translation" },
              en: { type: Type.STRING, description: "English translation" },
              ru: { type: Type.STRING, description: "Russian translation" },
              tr: { type: Type.STRING, description: "Turkish translation" }
            },
            required: ["fa", "en", "ru", "tr"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response text returned from Gemini");
      }

      const parsed = JSON.parse(resultText.trim());
      res.json({ success: true, translations: parsed });
    } catch (err: any) {
      console.error("Translation API error:", err);
      // Nice mock fallback so the application never breaks if the model is busy or key issue
      const mockFallback = {
        fa: sourceLang === "fa" ? text : `${text} (ترجمه)`,
        en: sourceLang === "en" ? text : `${text} (EN)`,
        ru: `${text} (RU)`,
        tr: `${text} (TR)`
      };
      res.json({
        success: true,
        translations: mockFallback,
        warning: "Fallback translation applied due to service error",
        errorDetails: err.message
      });
    }
  });

  // =========================================================================
  // INSTALLATION AND DATABASE ENGINE ENDPOINTS
  // =========================================================================
  app.get("/api/install/status", async (req, res) => {
    try {
      const installConfigPath = path.join(process.cwd(), 'install-config.json');
      if (fs.existsSync(installConfigPath)) {
        const configData = JSON.parse(fs.readFileSync(installConfigPath, 'utf8'));
        return res.json({
          isInstalled: !!configData.isInstalled,
          dbType: configData.dbType || 'sqlite',
          installedAt: configData.installedAt || ''
        });
      }
      res.json({ isInstalled: false });
    } catch (e) {
      res.json({ isInstalled: false });
    }
  });

  app.post("/api/install/setup", async (req, res) => {
    try {
      const {
        storeName,
        adminEmail,
        adminUsername,
        adminPassword,
        dbType,
        useConnectionString,
        connectionString,
        dbConfig,
        createDbIfNotExist,
        installSampleData
      } = req.body;

      if (!adminEmail || !adminUsername || !adminPassword) {
        return res.status(400).json({ error: "اطلاعات حساب مدیر کل الزامی است." });
      }

      let provider;
      if (dbType === 'sqlserver') {
        provider = new SqlServerStore();
      } else if (dbType === 'mongodb') {
        provider = new MongoStore();
      } else {
        provider = new SqliteStore();
      }

      provider.config = useConnectionString ? { connectionString } : (dbConfig || {});

      // Connect
      const connResult = await provider.connect();
      if (!connResult.success) {
        return res.status(400).json({ error: connResult.message });
      }

      // Create Database if checked
      if (createDbIfNotExist) {
        await provider.createDatabaseIfNotExist();
      }

      // Initialize schemas & seed admin user (password is hashed inside seedMinimal)
      await provider.seedMinimal({
        username: adminUsername,
        password: adminPassword,
        email: adminEmail,
        phone: "09123456780"
      });

      // Save custom store settings
      await provider.setSetting("storeName", storeName || "بازینو (Bazino)");

      // Seed sample data ONLY if the admin explicitly checked this box —
      // this is the single place sample data ever gets loaded automatically.
      if (installSampleData) {
        await provider.seedSampleData();
      }

      // Save to config
      const installConfig = {
        isInstalled: true,
        dbType,
        connectionString: useConnectionString ? connectionString : null,
        dbConfig: useConnectionString ? null : dbConfig,
        installSampleData,
        adminEmail,
        installedAt: new Date().toISOString()
      };

      const installConfigPath = path.join(process.cwd(), 'install-config.json');
      fs.writeFileSync(installConfigPath, JSON.stringify(installConfig, null, 2), 'utf8');

      // Set global active provider
      setActiveDataProvider(provider);
      logDbQuery(provider.name, 'SYSTEM', `Site successfully installed. Welcome back, ${adminUsername}!`);

      // Hand back a real token for the admin that was just created: /api/admin/*
      // now requires a signed JWT, so without this the operator would land on a
      // freshly installed site with an admin panel they can't call.
      res.json({
        success: true,
        message: "نصب با موفقیت انجام شد.",
        token: signAuthToken(adminUsername),
        user: { username: adminUsername, email: adminEmail || "", phone: "", loyaltyPoints: 1000, role: "admin" }
      });
    } catch (err: any) {
      console.error("Installation failure:", err);
      res.status(500).json({ error: `خطا در فرآیند نصب: ${err.message}` });
    }
  });

  app.get("/api/admin/db-logs", (req, res) => {
    try {
      res.json({ logs: dbQueryLogs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route to download project_code.zip directly from the browser preview
  app.get("/project_code.zip", (req, res) => {
    const filePath = path.join(process.cwd(), "project_code.zip");
    res.download(filePath, "project_code.zip", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(404).send("File not found or still generating. Please refresh and try again.");
      }
    });
  });

  // =========================================================================
  // DESKTOP APP DOWNLOADS (Management App → Settings → "دانلود نسخه دسکتاپ")
  // =========================================================================
  // Real installers are NOT built by this server — they're produced separately by running
  // `npm run dist:win` / `dist:mac` / `dist:linux` inside /desktop-app on a real machine of
  // each target OS (native modules can't be reliably cross-compiled — see
  // desktop-app/README.md). Whatever ends up in /desktop-builds/<platform>/ after that gets
  // served here. Until a real build is placed there, this responds with 404 + a clear
  // message instead of pretending a download exists.
  const desktopBuildsDir = path.join(process.env.BAZINO_STATIC_ROOT || process.cwd(), "desktop-builds");
  const desktopPlatforms: Record<string, { dir: string; label: string }> = {
    windows: { dir: "windows", label: "ویندوز (.exe)" },
    mac: { dir: "mac", label: "مک (.dmg)" },
    linux: { dir: "linux", label: "لینوکس (.AppImage)" },
  };

  // Tells the UI which platforms actually have a real installer available right now, so it
  // can show working download buttons instead of dead links for platforms not built yet.
  app.get("/api/desktop/availability", (req, res) => {
    const availability: Record<string, boolean> = {};
    for (const [platform, { dir }] of Object.entries(desktopPlatforms)) {
      const platformDir = path.join(desktopBuildsDir, dir);
      try {
        availability[platform] = fs.existsSync(platformDir) && fs.readdirSync(platformDir).length > 0;
      } catch {
        availability[platform] = false;
      }
    }
    res.json({ availability });
  });

  app.get("/api/desktop/download/:platform", (req, res) => {
    const platform = desktopPlatforms[req.params.platform];
    if (!platform) {
      return res.status(400).json({ error: "پلتفرم نامعتبر است" });
    }
    const platformDir = path.join(desktopBuildsDir, platform.dir);
    if (!fs.existsSync(platformDir)) {
      return res.status(404).json({
        error: `نسخه‌ی دسکتاپ برای ${platform.label} هنوز build نشده است.`,
        hint: "راهنما: desktop-app/README.md — دستور 'npm run dist' را روی یک دستگاه واقعی همان سیستم‌عامل اجرا کنید و خروجی را در desktop-builds/" + platform.dir + "/ قرار دهید."
      });
    }
    const files = fs.readdirSync(platformDir).filter(f => !f.startsWith("."));
    if (files.length === 0) {
      return res.status(404).json({ error: `فایلی برای ${platform.label} پیدا نشد.` });
    }
    // If multiple files exist (e.g. both nsis installer + portable exe), prefer the first one alphabetically.
    const fileName = files.sort()[0];
    res.download(path.join(platformDir, fileName), fileName, (err) => {
      if (err) {
        console.error("Error downloading desktop build:", err);
        if (!res.headersSent) res.status(500).json({ error: "خطا در دانلود فایل" });
      }
    });
  });

  // Serve Presentation PDF - Desktop Version
  app.get("/Bazino_Pro_Presentation.pdf", (req, res) => {
    const filePath = path.join(process.cwd(), "Bazino_Pro_Presentation.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Bazino_Pro_Presentation.pdf");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending presentation PDF:", err);
        res.status(404).send("فایل یافت نشد یا در حال تولید است. لطفا مجددا تلاش کنید.");
      }
    });
  });

  // Serve Presentation PDF - Mobile Version
  app.get("/Bazino_Pro_Mobile_Presentation.pdf", (req, res) => {
    const filePath = path.join(process.cwd(), "Bazino_Pro_Mobile_Presentation.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Bazino_Pro_Mobile_Presentation.pdf");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending mobile presentation PDF:", err);
        res.status(404).send("فایل یافت نشد یا در حال تولید است. لطفا مجددا تلاش کنید.");
      }
    });
  });

  // Serve Presentation HTML - Desktop Version
  app.get("/Bazino_Pro_Presentation.html", (req, res) => {
    const filePath = path.join(process.cwd(), "Bazino_Pro_Presentation.html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending presentation HTML:", err);
        res.status(404).send("Presentation HTML file not found.");
      }
    });
  });

  // Serve Presentation HTML - Mobile Version
  app.get("/Bazino_Pro_Mobile_Presentation.html", (req, res) => {
    const filePath = path.join(process.cwd(), "Bazino_Pro_Mobile_Presentation.html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending mobile presentation HTML:", err);
        res.status(404).send("Mobile presentation HTML file not found.");
      }
    });
  });

  // =========================================================================
  // VITE DEV SERVER AND PRODUCTION ASSET HANDLER
  // =========================================================================

  // Normally the built site (dist/) and Management App (Management App/Bazino/dist/) sit
  // relative to process.cwd() (true for every normal `node dist/server.cjs` deployment,
  // since cwd = project root). The Electron desktop build chdir's to a writable per-user
  // data folder instead (so the SQLite file/install-config.json survive app updates), which
  // would break relative static-file lookup — so it sets BAZINO_STATIC_ROOT to point back
  // at the actual bundled files before requiring this module. Unset in every other case,
  // so normal deployments are completely unaffected.
  const staticRoot = process.env.BAZINO_STATIC_ROOT || process.cwd();

  // Serve the Game Net Management Desktop App built folder
  const managementAppDist = path.join(staticRoot, "Management App/Bazino/dist");
  app.use("/management-app", express.static(managementAppDist));
  app.get("/management-app/*", (req, res) => {
    res.sendFile(path.join(managementAppDist, "index.html"));
  });

  // فایل‌های بهینه‌شده‌ی موبایل که پنل مدیریت در لحظه (runtime) می‌سازد. در production
  // فقط dist سرو می‌شود و این فایل‌ها در public نوشته می‌شوند، پس بدون این mount
  // موقتی ۴۰۴ می‌شدند. نام فایل هشِ محتواست پس کش immutable همیشه امن است.
  const generatedImagesDir = generatedMobileDir();
  try {
    fs.mkdirSync(generatedImagesDir, { recursive: true });
    app.use("/images/mobile/generated", express.static(generatedImagesDir, {
      index: false,
      fallthrough: true,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }));
  } catch (e) {
    console.error("[Static] Failed to mount generated mobile images dir:", e);
  }

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Allow preview/forwarded hosts (sandbox preview domains) —
        // dev only; production serves static files below.
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(staticRoot, "dist");
    // محاسبه‌ی نسخه‌ی دارایی‌ها برای مهر «?v=»: اولویت با متغیرهای محیطی دپلو است؛
    // در نبودشان اثر انگشت محتوای پوشه‌ی تصاویر + نام باندل‌های هش‌دارِ اصلی ساخته
    // می‌شود (با تعویض هر تصویر یا بازسازی JS تغییر می‌کند)؛ fallback آخر زمان بوت است.
    try {
      const envVersion = process.env.ASSET_VERSION || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || "";
      if (envVersion) {
        ASSET_VERSION = envVersion;
      } else {
        const parts: string[] = [];
        const homeDir = path.join(distPath, "images", "home");
        for (const name of (await fs.promises.readdir(homeDir)).sort()) {
          const st = await fs.promises.stat(path.join(homeDir, name));
          if (st.isFile()) parts.push(`${name}:${st.size}`);
        }
        const builtAssets = await fs.promises.readdir(path.join(distPath, "assets")).catch(() => [] as string[]);
        parts.push("#", builtAssets.filter((n) => /^index-.*\.(js|css)$/.test(n)).sort().join(","));
        ASSET_VERSION = createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 12);
      }
    } catch {
      ASSET_VERSION = String(Date.now());
    }
    // فایل‌های هش‌شده (assets) کش طولانی‌مدت؛ HTML باید بدون کش باشد تا هر دپلو
    // فوراً دیده شود — پس index: false می‌گذاریم تا index.html به‌جای static، از
    // هندلر پایین (با تزریق بوت‌استرپ و Cache-Control: no-cache) سرو شود.
    // تصاویرِ نسخه‌دار (?v= هم‌ارز ASSET_VERSION) کش immutable یک‌ساله می‌گیرند؛
    // URL بدون نسخه (dev یا کلاینت قدیمی) همان کش ۷روزه‌ی پیش‌فرض را نگه می‌دارد.
    app.use(express.static(distPath, {
      index: false,
      maxAge: "7d",
      etag: true,
      setHeaders: (res, filePath) => {
        if (/\/assets\//.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }
        if (/\/images\//.test(filePath)) {
          const reqQueryV = ((res as unknown as { req?: { query?: { v?: unknown } } }).req?.query?.v);
          if (ASSET_VERSION && reqQueryV === ASSET_VERSION) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
      }
    }));
    // Inline bootstrap: داده‌های لازم برای اولین رندر (مسابقات صفحه‌ی اصلی)
    // داخل خودِ HTML تزریق می‌شود. قبلاً کلاینت بعد از دانلود و اجرای باندل JS
    // یک رفت‌وبرگشت اضافه به /api/tournaments می‌زد و Lighthouse آن را به‌عنوان
    // بخشی از زنجیره‌ی بحرانی LCP (HTML → JS → API) گزارش می‌کرد؛ با این تزریق،
    // داده همزمان با HTML می‌رسد و آن لینک از زنجیره حذف می‌شود.
    // قالب HTML فقط یک‌بار از دیسک خوانده می‌شود (dist در هر دپلو عوض می‌شود و
    // فرایند ری‌استارت می‌شود، پس کهنگی قالب ممکن نیست). خودِ HTML کش نمی‌شود،
    // پس داده‌ی تزریق‌شده هم همیشه تازه است؛ کلاینت هم بعداً با refreshAll
    // به‌روزرسانی را انجام می‌دهد.
    let indexHtmlTemplate: string | null = null;
    app.get("*", async (req, res) => {
      try {
        if (!indexHtmlTemplate) {
          let template = await fs.promises.readFile(path.join(distPath, "index.html"), "utf8");
          // مهر نسخه روی URLهای images/* داخل HTML (مثل imagesrcset پیش‌بارگذاری
          // تصویر قهرمان) تا آن‌ها هم بتوانند با کش immutable یک‌ساله سرو شوند.
          // نکته: Vite با base:'./' مسیرهای public را در HTML بیلدشده «نسبی» می‌نویسد
          // (images/home/… بدون اسلش اول)، پس الگو اسلش ابتدایی را اختیاری گرفته است.
          // الگو بعد از «?»/«v=» موجود متوقف می‌شود، پس مهر دوباره زده نمی‌شود.
          if (ASSET_VERSION) {
            template = template.replace(/(\/?images\/[^\s"'<>?()]+)/g, (match, url: string, offset: number, whole: string) => {
              const nextChar = whole.charAt(offset + match.length);
              return nextChar === "?" ? match : `${url}?v=${encodeURIComponent(ASSET_VERSION)}`;
            });
          }
          indexHtmlTemplate = template;
        }
        const bootstrap = {
          tournaments: await resolveMergedList(await getActiveDataProvider().listTournaments(), SAMPLE_TOURNAMENTS),
          assetVersion: ASSET_VERSION,
        };
        // جلوگیری از شکستن HTML توسط دنباله‌هایی مثل "</script>" داخل JSON
        const json = JSON.stringify(bootstrap).replace(/</g, "\\u003c");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.send(indexHtmlTemplate.replace("</head>", `<script>window.__BAZINO_BOOTSTRAP__=${json};</script></head>`));
      } catch {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    const store = getActiveDataProvider();
    console.log(`[BAZINO Backend Server] is running beautifully with ${store.name} on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server bootstrap error:", err);
});
