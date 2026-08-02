/**
 * Formatters and Currency Helper Functions for BAZINO PRO (North Cyprus)
 */

export type CurrencyCode = 'TRY' | 'GBP' | 'EUR' | 'USD';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, { symbol: string; label: string }> = {
  TRY: { symbol: '₺', label: 'لیر ترکیه (₺)' },
  GBP: { symbol: '£', label: 'پوند انگلیس (£)' },
  EUR: { symbol: '€', label: 'یورو (€)' },
  USD: { symbol: '$', label: 'دلار آمریکا ($)' }
};

/**
 * Converts English digits to Persian digits for localized presentation
 */
export function toPersianDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

/**
 * Format currency with localized digit commas & symbol
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'TRY',
  usePersianDigits = true
): string {
  const rounded = Math.round(amount);
  const formattedWithCommas = rounded.toLocaleString('en-US');
  const symbol = CURRENCY_SYMBOLS[currency]?.symbol || '₺';

  if (usePersianDigits) {
    return `${toPersianDigits(formattedWithCommas)} ${symbol}`;
  }
  return `${formattedWithCommas} ${symbol}`;
}

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatTimerSeconds(totalSeconds: number, usePersian = true): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  let result = '';

  if (hours > 0) {
    result = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    result = `${pad(minutes)}:${pad(seconds)}`;
  }

  return usePersian ? toPersianDigits(result) : result;
}

/**
 * Calculate game session cost given played duration & tariff rate
 */
export function calculateGameCost(durationMinutes: number, hourlyRate: number): number {
  if (durationMinutes <= 0) return 0;
  // Calculate exact pro-rated cost
  const rawCost = (durationMinutes / 60) * hourlyRate;
  return Math.round(rawCost);
}

/**
 * Calculates the REAL total game cost for a session whose hourly rate may
 * have been changed mid-session (via "تغییر تعرفه در حین بازی"). Each
 * segment of play time is billed at whatever rate was actually in effect
 * during that segment, instead of billing the entire elapsed time at only
 * the most recent rate.
 */
export function calculateBlendedGameCost(session: {
  elapsedSeconds: number;
  currentHourlyRate: number;
  costAccruedBeforeRateChange?: number;
  rateEffectiveFromSeconds?: number;
}): number {
  const accruedBefore = session.costAccruedBeforeRateChange || 0;
  const effectiveFrom = session.rateEffectiveFromSeconds || 0;
  const secondsAtCurrentRate = Math.max(0, session.elapsedSeconds - effectiveFrom);
  const costAtCurrentRate = calculateGameCost(secondsAtCurrentRate / 60, session.currentHourlyRate);
  return accruedBefore + costAtCurrentRate;
}

/**
 * Determines a customer's real, automatic loyalty rank from their actual
 * accumulated play hours (instead of a rank that has to be set manually and
 * never changes). Thresholds are expressed in hours.
 */
export const CUSTOMER_RANK_THRESHOLDS: { rank: 'عادی' | 'برنز' | 'نقره' | 'طلایی' | 'الماس'; minHours: number }[] = [
  { rank: 'الماس', minHours: 60 },
  { rank: 'طلایی', minHours: 30 },
  { rank: 'نقره', minHours: 15 },
  { rank: 'برنز', minHours: 5 },
  { rank: 'عادی', minHours: 0 },
];

export function calculateCustomerRank(totalHoursPlayed: number): 'عادی' | 'برنز' | 'نقره' | 'طلایی' | 'الماس' {
  const match = CUSTOMER_RANK_THRESHOLDS.find((r) => totalHoursPlayed >= r.minHours);
  return match ? match.rank : 'عادی';
}

/**
 * Resolves the REAL hourly rate that should apply right now for a tariff
 * that may have a "special hours of day" schedule configured. Handles
 * schedules that cross midnight (e.g. 22:00 -> 04:00).
 */
export function getActiveHourlyRate(
  tariff: { hourlyRate: number; specialScheduleActive?: boolean; startHour?: number; endHour?: number; specialRate?: number },
  now: Date = new Date()
): number {
  if (!tariff.specialScheduleActive || tariff.startHour === undefined || tariff.endHour === undefined || tariff.specialRate === undefined) {
    return tariff.hourlyRate;
  }
  const hour = now.getHours();
  const { startHour, endHour, specialRate } = tariff;
  const inRange = startHour <= endHour
    ? hour >= startHour && hour < endHour // normal range, e.g. 08:00 -> 18:00
    : hour >= startHour || hour < endHour; // overnight range, e.g. 22:00 -> 04:00
  return inRange ? specialRate : tariff.hourlyRate;
}

/**
 * Computes whether today or this month is a customer's real birthday, from
 * their actual stored birth date — instead of a flag that has to be set by
 * hand and never updates.
 */
export function getBirthdayFlags(birthDate: string, now: Date = new Date()): { isBirthdayToday: boolean; isBirthdayThisMonth: boolean } {
  if (!birthDate) return { isBirthdayToday: false, isBirthdayThisMonth: false };
  const parsed = new Date(birthDate);
  if (isNaN(parsed.getTime())) return { isBirthdayToday: false, isBirthdayThisMonth: false };

  const isBirthdayThisMonth = parsed.getMonth() === now.getMonth();
  const isBirthdayToday = isBirthdayThisMonth && parsed.getDate() === now.getDate();
  return { isBirthdayToday, isBirthdayThisMonth };
}

/**
 * Rounding helper for totals (Round Up, Round Down, or Exact)
 */
export function applyAmountRounding(
  amount: number,
  mode: 'EXACT' | 'ROUND_UP_5' | 'ROUND_DOWN_5' | 'ROUND_NEAREST_10'
): { finalAmount: number; roundedDifference: number } {
  let finalAmount = amount;

  if (mode === 'ROUND_UP_5') {
    finalAmount = Math.ceil(amount / 5) * 5;
  } else if (mode === 'ROUND_DOWN_5') {
    finalAmount = Math.floor(amount / 5) * 5;
  } else if (mode === 'ROUND_NEAREST_10') {
    finalAmount = Math.round(amount / 10) * 10;
  }

  const roundedDifference = finalAmount - amount;
  return { finalAmount, roundedDifference };
}

/**
 * Format Persian Date Display (Shamsi or Jalali approximation for UI)
 */
export function getFormattedPersianDate(dateObj: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
}
