import type { LanguageType } from './translations';

/** رشته‌های چهارزبانه‌ی درون‌خطی. زبان‌های بدون ترجمه به انگلیسی سقوط می‌کنند. */
export type LocalizedText = { fa: string; en: string; ru?: string; tr?: string };

export function L(language: LanguageType | string, text: LocalizedText): string {
  switch (language) {
    case 'fa': return text.fa;
    case 'ru': return text.ru ?? text.en;
    case 'tr': return text.tr ?? text.en;
    default: return text.en;
  }
}

/** locale مناسب برای toLocaleString / Intl بر اساس زبان سایت */
export function localeOf(language: LanguageType | string): string {
  switch (language) {
    case 'fa': return 'fa-IR';
    case 'ru': return 'ru-RU';
    case 'tr': return 'tr-TR';
    default: return 'en-US';
  }
}

/* ── محلی‌سازی رکوردهای کاتالوگ ─────────────────────────────────────────────
 * داده‌های نمونه/دیتابیس برای هر فیلد متنی نسخه‌های چهارزبانه دارند
 * (name + nameFa/nameEn/nameRu/nameTr و همین‌طور title/description/content/author).
 * این تابع فیلد پایه را با نسخه‌ی زبان فعال جایگزین می‌کند؛ اگر ترجمه‌ای برای
 * زبان فعلی نبود → انگلیسی → مقدار اصلی. رکوردهایی که فیلد محلی ندارند (داده‌ی
 * دستی مدیر) دست‌نخورده می‌مانند.
 */
const LOCALIZABLE_FIELDS = ['name', 'title', 'description', 'content', 'author', 'excerpt', 'specs'] as const;
const SUFFIX: Record<string, string> = { fa: 'Fa', en: 'En', ru: 'Ru', tr: 'Tr' };

export function localizeRecord<T extends Record<string, any>>(record: T, language: LanguageType | string): T {
  const suf = SUFFIX[language] ?? 'En';
  let out: T | null = null;
  for (const field of LOCALIZABLE_FIELDS) {
    const localized = record[`${field}${suf}`] ?? (suf !== 'En' ? record[`${field}En`] : undefined);
    if (typeof localized === 'string' && localized.trim() && localized !== record[field]) {
      if (!out) out = { ...record };
      (out as Record<string, any>)[field] = localized;
    }
  }
  return out ?? record;
}

export function localizeList<T extends Record<string, any>>(list: T[], language: LanguageType | string): T[] {
  if (!Array.isArray(list) || list.length === 0) return list;
  let changed = false;
  const mapped = list.map(r => { const l = localizeRecord(r, language); if (l !== r) changed = true; return l; });
  return changed ? mapped : list;
}

/* ── نمایش تاریخ شمسی برای زبان‌های غیرفارسی ──────────────────────────────
 * تاریخ‌های کاتالوگ (مثلاً شروع تورنمنت) به‌صورت رشته‌ی شمسی «۱۴۰۵/۰۴/۲۰» ذخیره
 * شده‌اند. برای fa عیناً نمایش داده می‌شوند؛ برای بقیه‌ی زبان‌ها به میلادی تبدیل و
 * با locale همان زبان قالب‌بندی می‌شوند. اگر رشته قابل‌تجزیه نبود، دست‌نخورده برمی‌گردد.
 */
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function jalaliToGregorianDate(jy: number, jm: number, jd: number): Date {
  // الگوریتم استاندارد تبدیل جلالی → میلادی
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > sal[gm]; gm++) gd -= sal[gm];
  return new Date(gy, gm - 1, gd);
}

export function formatJalaliForLanguage(jalali: string | undefined | null, language: LanguageType | string): string {
  if (!jalali) return '';
  if (language === 'fa') return jalali;
  const parts = toLatinDigits(jalali).trim().split(/[\/\-.]/).map(p => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return jalali;
  const [y, m, d] = parts;
  if (y < 1300 || y > 1500 || m < 1 || m > 12 || d < 1 || d > 31) return jalali; // احتمالاً میلادی است
  try {
    return jalaliToGregorianDate(y, m, d).toLocaleDateString(localeOf(language), { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return jalali;
  }
}
