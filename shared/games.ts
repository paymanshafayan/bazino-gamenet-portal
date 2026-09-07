/**
 * هلپرهای مشترک صفحهٔ Games (هم سمت سایت، هم سمت سرور — بدون وابستگی به React).
 *
 * هر سیستم بازی می‌تواند «مخاطب» داشته باشد: kids / adults / خالی.
 * مقدار خالی یعنی «همه» — سیستم‌های قدیمی که audience ندارند در هر دو دسته
 * نمایش داده می‌شوند تا هیچ سیستمی بعد از این تغییر از رزرو پنهان نشود.
 */
export type GameAudience = 'kids' | 'adults';

export const GAME_AUDIENCES: readonly GameAudience[] = ['kids', 'adults'] as const;

/** هر ورودی دلخواه → '' | 'kids' | 'adults' (whitelist؛ برای ذخیره‌سازی و مقایسه) */
export function normalizeAudience(value: unknown): string {
  const s = String(value ?? '').trim().toLowerCase();
  return (GAME_AUDIENCES as readonly string[]).includes(s) ? s : '';
}

/** آیا این سیستم در دستهٔ درخواستی نمایش داده می‌شود؟ (audience خالی = در همهٔ دسته‌ها) */
export function systemMatchesAudience<T extends { audience?: string }>(system: T, audience?: GameAudience | null): boolean {
  if (!audience) return true;
  const a = normalizeAudience(system.audience);
  return a === '' || a === audience;
}

/** فیلتر فهرست سیستم‌ها بر اساس دستهٔ انتخاب‌شده در صفحهٔ Games */
export function filterSystemsForAudience<T extends { audience?: string }>(systems: T[] | undefined | null, audience?: GameAudience | null): T[] {
  return (systems || []).filter(s => systemMatchesAudience(s, audience));
}

/** متن آزاد «بازی درخواستی» رزرو: حذف فاصله‌های اضافی + سقف ۸۰ کاراکتر */
export function sanitizeRequestedGame(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}
