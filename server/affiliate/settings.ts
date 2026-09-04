/**
 * پیش‌فرض‌های برنامهٔ افیلیت — به‌صورت ردیف واقعی در جدول settings ثبت می‌شوند
 * تا ادمین در پنل ببیند و بتواند ویرایش کند. منطق کمیسیون فقط از همین کلیدها می‌خواند.
 */
export const AFFILIATE_SETTING_DEFAULTS: Record<string, string> = {
  affiliate_new_pct: '10',
  affiliate_return_pct: '5',
  affiliate_tournament_pct: '10',
  affiliate_override_pct: '0',
  affiliate_window_days: '30',
  wallet_cashout_min_tl: '0',
  affiliate_excluded_roles: 'admin',
  affiliate_program_open: '1',
};

export const AFFILIATE_SETTING_KEYS = Object.keys(AFFILIATE_SETTING_DEFAULTS);

export async function seedAffiliateSettings(store: { getSetting(k: string): Promise<string | undefined>; setSetting(k: string, v: string): Promise<void> }): Promise<number> {
  let n = 0;
  for (const [k, v] of Object.entries(AFFILIATE_SETTING_DEFAULTS)) {
    const existing = await store.getSetting(k);
    if (existing === undefined || existing === null || existing === '') {
      await store.setSetting(k, v);
      n++;
    }
  }
  return n;
}

export async function readAffiliateSettings(store: { getSetting(k: string): Promise<string | undefined> }): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...AFFILIATE_SETTING_DEFAULTS };
  for (const k of AFFILIATE_SETTING_KEYS) {
    const v = await store.getSetting(k);
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}

export function parsePct(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return n;
}

export function parseDays(raw: string | undefined, fallback: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 365) return fallback;
  return n;
}
