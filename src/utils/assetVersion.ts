// مهرِ نسخه‌ی دارایی روی تصاویر «public» (پوشه‌ی /images) — سمت کلاینت.
//
// مسئله‌ی Lighthouse («A long cache lifetime can speed up repeat visits» /
// «Serve static assets with an efficient cache policy»): این فایل‌ها برخلاف
// باندل‌های Vite هش محتوایی نمی‌گیرند و فقط ۷ روز کش می‌شدند.
//
// راه‌حل: سرور در production نسخه‌ی دارایی را داخل
// window.__BAZINO_BOOTSTRAP__.assetVersion تزریق می‌کند؛ این ماژول آن را به‌صورت
// «?v=…» به URLهای داخلی /images/* اضافه می‌کند. سرور به URLهای نسخه‌دار کشِ
// immutable یک‌ساله می‌دهد و چون نسخه با هر دپلویِ محتوامتفاوت عوض می‌شود، کاربر
// بعد از هر دپلو دقیقاً فایل جدید را می‌گیرد — کش طولانی بدون ریسکِ تصویر قدیمی.
//
// در حالت توسعه (vite dev) نسخه وجود ندارد و همه‌ی توابع URL را دست‌نخورده برمی‌گردانند.

type BootstrapShape = { assetVersion?: string };

export const assetVersion: string =
  (typeof window !== "undefined"
    ? (window as unknown as { __BAZINO_BOOTSTRAP__?: BootstrapShape }).__BAZINO_BOOTSTRAP__?.assetVersion
    : undefined) || "";

const stamp: ((url: string) => string) | null = assetVersion
  ? (url: string) => `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(assetVersion)}`
  : null;

/**
 * به URLهای داخلی /images/* مهر نسخه می‌زند؛ سایر URLها (خارجی، /assets هش‌دار، …)
 * و همچنین URLهایی که از قبل مهر دارند، بدون تغییر برگردانده می‌شوند.
 */
export function vimg(url: string): string {
  if (!stamp || typeof url !== "string" || !url.startsWith("/images/") || url.includes("v=")) {
    return url;
  }
  return stamp(url);
}

/**
 * روی همه‌ی URLهای /images/* داخل یک رشته‌ی srcset (با جداکننده‌ی کاما و توصیف‌گر عرض)
 * مهر نسخه می‌زند.
 */
export function vsrcset(srcset: string): string {
  if (!stamp || !srcset) return srcset;
  return srcset.replace(/\/images\/[^\s,]+/g, (url) => (url.includes("v=") ? url : stamp(url)));
}
