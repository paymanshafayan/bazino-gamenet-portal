/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME INSTALL JOBS — نصب قالب خارج از چرخهٔ درخواست HTTP
 *
 * چرا این ماژول وجود دارد (حادثهٔ 524 قالب bazino-arena3d، 2026-09-12):
 * نصب قالب‌های با صدها asset (مثل ۳۹۴ فریم WebP) روی volume شبکه‌ای
 * Railway آن‌قدر طول می‌کشید که Cloudflare بعد از ~۱۰۰ ثانیه پاسخ ۵۲۴ می‌داد.
 * حالا endpoint نصب فقط ZIP را می‌گیرد، اعتبارسنجیِ سریعِ اولیه (بدون
 * decompress کل بسته) انجام می‌دهد و با 202 برمی‌گردد؛ استخراج/نصب در
 * background ادامه پیدا می‌کند و وضعیتش از endpoint جداگانه poll می‌شود.
 *
 * طراحی (الزام پرامت §2 و §4):
 *   themes/.staging/<jobId>/source.zip   ← فایل خام همین‌جا می‌ماند
 *   themes/.staging/<jobId>/job.json     ← وضعیت job روی دیسک (قابل بازیابی)
 *
 * بازیابی: سرور اگر وسط job ری‌استارت شود، در boot هر stagingِ ناتمام به
 * failed با پیام روشن تبدیل و پاک‌سازی می‌شود (fire-and-forget ناامن نیست —
 * وضعیت هر job همیشه روی دیسک است). jobهای تمام‌شده تا ۶ ساعت برای
 * poll دیرهنگام باقی می‌مانند و بعد sweep می‌شوند.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { unzipSync, strFromU8 } from "fflate";
import { THEMES_DIR, ensureThemesDir, installThemeZip, listInstalledThemes } from "./themeStore";

export type ThemeInstallJobStatus =
  | "queued"
  | "validating"
  | "extracting"
  | "installing"
  | "completed"
  | "failed";

export interface ThemeInstallProgress {
  filesDone: number;
  filesTotal: number;
}

export interface ThemeInstallJob {
  jobId: string;
  status: ThemeInstallJobStatus;
  /** شناسه/نسخهٔ قالب — بعد از preflight معتبر؛ قبل از آن ممکن است خالی */
  themeId: string;
  version: string;
  replace: boolean;
  activate: boolean;
  progress: ThemeInstallProgress;
  /** متن فاز جاری برای نمایش در پنل */
  phase: string;
  error?: string;
  errorCode?: string;
  /** فقط در completed — همان شکلی که پاسخ sync قدیمی می‌داد */
  theme?: any;
  /** گزارش بهینه‌سازی/پرفورمنس (همان performance مسیر sync — برای نوتیفیکیشن‌های پنل) */
  performance?: any;
  replaced?: boolean;
  activeThemeId?: string;
  serverThemes?: any[];
  createdAt: string;
  updatedAt: string;
}

/* ── محدودیت‌های امنیتی preflight (پرامت §5) ──────────────────────────────
 * اعداد براساس زیرساخت واقعی پروژه: سقف آپلود 30MB (express.raw)، قالب
 * هدف 10.6MB/405 entry. سقفها طوری تنظیم شده‌اند که این قالب منطقی و
 * مشابه‌هایش قبول شوند ولی ZIP bomb و پکت‌های عظیم هنوز رد شوند. */
export const MAX_ZIP_BYTES = 30 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1500;
export const MAX_ZIP_UNCOMPRESSED_BYTES = 24 * 1024 * 1024;
/** نسبت فشرده‌سازی مجاز — ZIP معمولی ۲–۱۰ برابر است؛ بمب‌ها ۱۰۰۰+ برابر.
 *  assetهای WebP از قبل فشرده‌اند (نسبت ≈1) پس قالب هدف کاملاً امن رد می‌شود. */
export const MAX_ZIP_COMPRESSION_RATIO = 100;

const STAGING_DIR = path.join(THEMES_DIR, ".staging");
const FINISHED_JOB_TTL_MS = 6 * 60 * 60 * 1000;

const jobs = new Map<string, ThemeInstallJob>();

export function themeInstallStagingDir(): string {
  return STAGING_DIR;
}

/* ── preflight: اعتبارسنجی سریع بدون decompress کل ZIP ────────────────────
 * fflate به filter هر entry را می‌دهد (نام + سایز فشرده/خاموش) ولی فقط
 * entryهایی که true برگردانند decompress می‌شوند. پس یک پاسِ واحد هم
 * امنیت مسیرها را چک می‌کند، هم سقفها، و فقط theme.json/css/js (چند KB)
 * واقعاً باز می‌شوند — ZIP فقط یک بار و به‌صورت ارزان خوانده می‌شود. */
export interface ZipPreflight {
  ok: boolean;
  error?: string;
  code?: string;
  themeId?: string;
  version?: string;
  name?: string;
  entries?: number;
  totalUncompressed?: number;
}

const META_ENTRY_RE = /(^|\/)theme\.(json|css|js)$/;

export function quickValidateThemeZip(bytes: Uint8Array, fallbackName?: string): ZipPreflight {
  if (!bytes || bytes.byteLength === 0) return { ok: false, error: "فایل ZIP خالی است", code: "ZIP_MISSING" };
  if (bytes.byteLength > MAX_ZIP_BYTES) {
    return { ok: false, error: `حجم ZIP از سقف ${Math.round(MAX_ZIP_BYTES / 1024 / 1024)} مگابایت بیشتر است`, code: "ZIP_TOO_LARGE" };
  }

  let entries = 0;
  let totalUncompressed = 0;
  let totalCompressed = 0;
  let unsafeEntry = false;
  const meta: Record<string, Uint8Array> = {};
  try {
    // فیلتر: همهٔ entryها را می‌بینیم (شمارش/سقف/امنیت) ولی فقط فایل‌های
    // متادیتای قالب را decompress می‌کنیم.
    const out = unzipSync(bytes, {
      filter: (f) => {
        entries += 1;
        totalUncompressed += f.originalSize || 0;
        totalCompressed += f.size || 0;
        const name = String(f.name || "");
        if (name.startsWith("/") || name.includes("..") || /\\/.test(name) || /^[a-zA-Z]:/.test(name)) {
          unsafeEntry = true; // zip-slip / مسیر مطلق — رد صریح (نه نادیده‌گرفتن)
          return false;
        }
        return META_ENTRY_RE.test(name);
      },
    });
    Object.assign(meta, out as Record<string, Uint8Array>);
  } catch {
    return { ok: false, error: "فایل ZIP معتبر نیست یا خراب است", code: "invalid-zip" };
  }

  if (entries === 0) return { ok: false, error: "فایل ZIP خالی است", code: "invalid-zip" };
  if (unsafeEntry) {
    return { ok: false, error: "ZIP شامل مسیر ناامن است (خارج از پوشهٔ قالب — zip-slip)", code: "unsafe-entry" };
  }
  if (entries > MAX_ZIP_ENTRIES) {
    return { ok: false, error: `تعداد فایل‌های ZIP (${entries}) از سقف ${MAX_ZIP_ENTRIES} بیشتر است`, code: "too-many-entries" };
  }
  if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
    return { ok: false, error: `حجم استخراج‌شدهٔ ZIP (${(totalUncompressed / 1024 / 1024).toFixed(1)}MB) از سقف ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / 1024 / 1024)}MB بیشتر است`, code: "zip-bomb-size" };
  }
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > MAX_ZIP_COMPRESSION_RATIO) {
    return { ok: false, error: "نسبت فشرده‌سازی ZIP غیرعادی است (احتمال ZIP bomb)", code: "zip-bomb-ratio" };
  }

  const jsonKey = Object.keys(meta).find((k) => /(^|\/)theme\.json$/.test(k));
  const cssKey = Object.keys(meta).find((k) => /(^|\/)theme\.css$/.test(k));
  if (!cssKey) return { ok: false, error: "فایل CSS قالب (theme.css) داخل ZIP پیدا نشد", code: "no-css" };
  if (!jsonKey) return { ok: false, error: "theme.json داخل ZIP پیدا نشد", code: "no-meta" };

  let parsedMeta: any = {};
  try {
    parsedMeta = JSON.parse(strFromU8(meta[jsonKey]));
  } catch {
    return { ok: false, error: "theme.json قابل خواندن نیست (JSON نامعتبر)", code: "bad-meta" };
  }
  const themeId = typeof parsedMeta?.id === "string" ? parsedMeta.id.trim() : "";
  const version = typeof parsedMeta?.version === "string" ? parsedMeta.version.trim() : "";
  const name = typeof parsedMeta?.name === "string" ? parsedMeta.name.trim() : (fallbackName || themeId);
  if (!themeId || !/^[a-z0-9][a-z0-9-_]*$/i.test(themeId)) {
    return { ok: false, error: "شناسهٔ قالب (theme.json → id) معتبر نیست", code: "bad-theme-id" };
  }
  if (!version) return { ok: false, error: "نسخهٔ قالب (theme.json → version) قابل خواندن نیست", code: "bad-theme-version" };

  return { ok: true, themeId, version, name, entries, totalUncompressed };
}

/* ── Job store: حافظه + دیسک (job.json) ─────────────────────────────────── */

function jobDir(jobId: string): string {
  return path.join(STAGING_DIR, jobId);
}

function persistJob(job: ThemeInstallJob): void {
  try {
    fs.mkdirSync(jobDir(job.jobId), { recursive: true });
    fs.writeFileSync(path.join(jobDir(job.jobId), "job.json"), JSON.stringify(job, null, 2), "utf8");
  } catch (e) {
    // نوشتن وضعیت best-effort است؛ حافظه همچنان مرجعِ درون‌پروسه است.
    console.warn("[ThemeInstallJobs] failed to persist job state:", e);
  }
}

function mutate(job: ThemeInstallJob, patch: Partial<ThemeInstallJob>): ThemeInstallJob {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  jobs.set(job.jobId, job);
  persistJob(job);
  return job;
}

export function getThemeInstallJob(jobId: string): ThemeInstallJob | null {
  const live = jobs.get(jobId);
  if (live) return live;
  // بعد از ری‌استارت: job.json از دیسک (فقط وضعیت‌های نهایی اینجا هستند،
  // چون recover ناتمام‌ها را در boot به failed برمی‌گرداند)
  try {
    const raw = fs.readFileSync(path.join(STAGING_DIR, jobId, "job.json"), "utf8");
    const job = JSON.parse(raw) as ThemeInstallJob;
    jobs.set(jobId, job);
    return job;
  } catch {
    return null;
  }
}

/* ── اجرای job در background ────────────────────────────────────────────── */

export interface CreateJobOptions {
  replace?: boolean;
  activate?: boolean;
  fallbackName?: string;
  /** فعال‌سازی سراسری قالب — از server.ts تزریق می‌شود (setSetting) */
  activateTheme?: (themeId: string) => Promise<void>;
  /** خواندن قالب فعال — از server.ts تزریق می‌شود (getSetting) */
  readActiveThemeId?: () => Promise<string | null>;
  /** برای تست‌ها: اجرا را متوقف نکن (صبر کن تمام شود) */
  wait?: boolean;
}

const activeJobCount = { value: 0 };
/** هم‌زمانی کل نصب‌ها — نصب‌های موازیِ زیاد، دیسک و CPU را می‌کشند. */
const MAX_CONCURRENT_INSTALLS = 2;
const pendingQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeJobCount.value < MAX_CONCURRENT_INSTALLS) {
    activeJobCount.value += 1;
    return;
  }
  await new Promise<void>((resolve) => pendingQueue.push(resolve));
  activeJobCount.value += 1;
}

function releaseSlot(): void {
  activeJobCount.value -= 1;
  const next = pendingQueue.shift();
  if (next) next();
}

interface RunJobDeps {
  activateTheme?: (themeId: string) => Promise<void>;
  readActiveThemeId?: () => Promise<string | null>;
}

async function runJob(job: ThemeInstallJob, zipBytes: Uint8Array, deps: RunJobDeps): Promise<void> {
  try {
    await acquireSlot();
    try {
      mutate(job, { status: "validating", phase: "اعتبارسنجی بستهٔ قالب" });

      // TEST-ONLY (پیش‌فرض صفر): مکث اختیاری برای تست بازیابیِ ری‌استارت —
      // هیچ محیط پروداکشنی این env را ست نمی‌کند.
      const testDelayMs = Number(process.env.BAZINO_TEST_INSTALL_DELAY_MS || "0");
      if (testDelayMs > 0) await new Promise((r) => setTimeout(r, testDelayMs));

      mutate(job, { status: "extracting", phase: "استخراج و پردازش فایل‌ها" });
      const result = await installThemeZip(zipBytes, job.themeId || undefined, {
        replace: job.replace,
        onProgress: (p) => {
          // فازهای درونی موتور نصب؛ job همچنان در extracting است تا swap شروع شود
          if (job.status === "extracting") {
            job.progress = p;
            job.updatedAt = new Date().toISOString();
            jobs.set(job.jobId, job);
            persistJob(job);
          }
        },
        onInstalling: () => {
          mutate(job, { status: "installing", phase: "جایگزینی اتمیک و فعال‌سازی" });
        },
      });

      if ("error" in result) {
        mutate(job, { status: "failed", phase: "ناموفق", error: result.error, errorCode: result.code });
        return;
      }

      // فعال‌سازی — همان قرارداد مسیر sync قبلی (activate=1 پیش‌فرض)
      if (job.activate && deps.activateTheme) {
        await deps.activateTheme(result.theme.id);
      }
      const activeThemeId = (await (deps.readActiveThemeId?.() ?? null)) || "dark-gold";
      mutate(job, {
        status: "completed",
        phase: "نصب کامل شد",
        theme: result.theme,
        performance: result.performance,
        replaced: !!result.replaced,
        activeThemeId,
        serverThemes: listInstalledThemes(),
        progress: { filesDone: job.progress.filesTotal, filesTotal: job.progress.filesTotal },
      });
      console.info(`[ThemeInstallJobs] job ${job.jobId} completed — theme "${result.theme.id}" (${result.theme.assetFiles?.length ?? 0} assets)`);
    } finally {
      releaseSlot();
    }
  } catch (e: any) {
    mutate(job, { status: "failed", phase: "ناموفق", error: String(e?.message || e), errorCode: "INSTALL_ERROR" });
    console.error(`[ThemeInstallJobs] job ${job.jobId} failed:`, e);
  } finally {
    // فایل خام فقط تا پایان job لازم است؛ وضعیت (job.json) برای poll می‌ماند.
    fs.promises.rm(path.join(jobDir(job.jobId), "source.zip"), { force: true }).catch(() => undefined);
  }
}

export async function createThemeInstallJob(
  zipBytes: Uint8Array,
  options: CreateJobOptions = {}
): Promise<ThemeInstallJob> {
  ensureThemesDir();
  sweepStaleThemeInstallJobs();
  const pre = quickValidateThemeZip(zipBytes, options.fallbackName);
  if (!pre.ok) {
    throw Object.assign(new Error(pre.error || "invalid zip"), { code: pre.code });
  }

  const jobId = `theme-install-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const job: ThemeInstallJob = {
    jobId,
    status: "queued",
    themeId: pre.themeId || "",
    version: pre.version || "",
    replace: !!options.replace,
    activate: options.activate !== false,
    progress: { filesDone: 0, filesTotal: pre.entries || 0 },
    phase: "در صف اجرا",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(jobId, job);

  // ZIP خام در staging می‌نشیند (خودِ job.json هم همان‌جا) — دریافت HTTP
  // تمام شده و بقیهٔ کار روی دیسک ادامه پیدا می‌کند.
  fs.mkdirSync(jobDir(jobId), { recursive: true });
  fs.writeFileSync(path.join(jobDir(jobId), "source.zip"), Buffer.from(zipBytes));
  persistJob(job);
  console.info(`[ThemeInstallJobs] job ${jobId} queued — theme "${job.themeId}" v${job.version} (${pre.entries} entries)`);

  const running = runJob(job, zipBytes, {
    activateTheme: options.activateTheme,
    readActiveThemeId: options.readActiveThemeId,
  });
  if (options.wait) await running;
  return job;
}

/* ── بازیابی در boot + پاک‌سازی ─────────────────────────────────────────── */

/** در startup صدا زده می‌شود: هر job ناتمام → failed واضح + پاک‌سازی staging همان job. */
export function recoverThemeInstallJobs(): void {
  try {
    if (!fs.existsSync(STAGING_DIR)) return;
    for (const d of fs.readdirSync(STAGING_DIR, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const jp = path.join(STAGING_DIR, d.name, "job.json");
      if (!fs.existsSync(jp)) {
        // staging بی-صاحب (مثلاً کرش قبل از نوشتن job.json) → پاک
        fs.rmSync(path.join(STAGING_DIR, d.name), { recursive: true, force: true });
        continue;
      }
      try {
        const job = JSON.parse(fs.readFileSync(jp, "utf8")) as ThemeInstallJob;
        if (job.status === "queued" || job.status === "validating" || job.status === "extracting" || job.status === "installing") {
          job.status = "failed";
          job.error = "سرور حین نصب این قالب ری‌استارت شد؛ لطفاً دوباره نصب کنید.";
          job.errorCode = "SERVER_RESTARTED";
          job.phase = "ناموفق (ری‌استارت سرور)";
          job.updatedAt = new Date().toISOString();
          fs.writeFileSync(jp, JSON.stringify(job, null, 2), "utf8");
          // ZIP خامِ ناتمام دیگر لازم نیست (retry = ارسال مجدد همان فایل از کلاینت)
          fs.rmSync(path.join(STAGING_DIR, d.name, "source.zip"), { force: true });
          console.warn(`[ThemeInstallJobs] recovered job ${job.jobId} as failed (server restarted mid-install)`);
        }
        jobs.set(job.jobId, job);
      } catch {
        fs.rmSync(path.join(STAGING_DIR, d.name), { recursive: true, force: true });
      }
    }
  } catch (e) {
    console.warn("[ThemeInstallJobs] recovery scan failed:", e);
  }
}

/** jobهای تمام‌شدهٔ قدیمی (> 6h) و stagingهای بی‌صاحب پاک می‌شوند. */
export function sweepStaleThemeInstallJobs(): void {
  try {
    if (!fs.existsSync(STAGING_DIR)) return;
    const now = Date.now();
    for (const d of fs.readdirSync(STAGING_DIR, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const dir = path.join(STAGING_DIR, d.name);
      const jp = path.join(dir, "job.json");
      try {
        const st = fs.statSync(jp);
        if (now - st.mtimeMs > FINISHED_JOB_TTL_MS) fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // job.json ندارد؛ اگر قدیمی است حذف، وگرنه بگذار (شاید وسط نوشتن است)
        const st = fs.statSync(dir);
        if (now - st.mtimeMs > FINISHED_JOB_TTL_MS) fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  } catch { /* ignore */ }
}
