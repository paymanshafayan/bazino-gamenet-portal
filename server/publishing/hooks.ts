import type { SocialLanguage } from '../../shared/publishing/types';

/* ─────────────────────────────────────────────────────────────────────────────
 * کتابخانهٔ هوک وایرال (فاز ۲ — گام ۲)
 * الگوهای اثبات‌شدهٔ بازاریابی (Hook-Story-Offer / PAS / قاعدهٔ ۳ ثانیه) در ۶ دسته.
 * منبع پرامپتِ سرویس بریف (briefs.suggest) — فقط خواندنی؛ تولید الگوی جدید
 * با Groq انجام می‌شود و به دیتابیسِ کپی‌های استفاده‌شده اضافه نخواهد شد.
 * ───────────────────────────────────────────────────────────────────────────── */

export type HookCategory = 'curiosity' | 'fomo' | 'challenge' | 'numbers' | 'question' | 'announcement';

export interface HookPattern {
  id: string;
  category: HookCategory;
  language: SocialLanguage;
  /** الگوی متن — {topic} جای بازی/رویداد ترند، {club} جای نام کلاب است. */
  template: string;
}

export const HOOK_PATTERNS: HookPattern[] = [
  // ── کنجکاوی (curiosity) ──
  { id: 'fa-cur-1', category: 'curiosity', language: 'fa', template: 'راز {topic} که هیچ‌کس به تو نگفته…' },
  { id: 'fa-cur-2', category: 'curiosity', language: 'fa', template: 'چرا حرفه‌ای‌ها {topic} را فقط اینجا بازی می‌کنند؟' },
  { id: 'tr-cur-1', category: 'curiosity', language: 'tr', template: '{topic} hakkında kimsenin söylemediği sır…' },
  { id: 'tr-cur-2', category: 'curiosity', language: 'tr', template: 'Profesyoneller {topic} neden sadece burada oynuyor?' },
  { id: 'en-cur-1', category: 'curiosity', language: 'en', template: 'The {topic} secret nobody told you about…' },
  { id: 'en-cur-2', category: 'curiosity', language: 'en', template: 'Why do pros play {topic} only at {club}?' },
  // ── FOMO (ترس از جا ماندن) ──
  { id: 'fa-fomo-1', category: 'fomo', language: 'fa', template: 'اگر این پکیج {topic} را امتحان نکرده‌ای، پولت را دور ریخته‌ای!' },
  { id: 'fa-fomo-2', category: 'fomo', language: 'fa', template: 'فقط تا آخر هفته — بعد از دستت می‌رود' },
  { id: 'tr-fomo-1', category: 'fomo', language: 'tr', template: 'Bu {topic} paketini denemediysen paranı boşa harcamışsın!' },
  { id: 'tr-fomo-2', category: 'fomo', language: 'tr', template: 'Sadece hafta sonuna kadar — kaçırma!' },
  { id: 'en-fomo-1', category: 'fomo', language: 'en', template: 'If you have not tried this {topic} pack yet, you are missing out!' },
  { id: 'en-fomo-2', category: 'fomo', language: 'en', template: 'This weekend only — do not miss it' },
  // ── چالش (challenge) ──
  { id: 'fa-ch-1', category: 'challenge', language: 'fa', template: 'چالش جدید {topic} که فقط ۵٪ گیمرها می‌توانند ردش کنند!' },
  { id: 'fa-ch-2', category: 'challenge', language: 'fa', template: 'تو می‌توانی تا راند ۱۰ {topic} دوام بیاوری؟' },
  { id: 'tr-ch-1', category: 'challenge', language: 'tr', template: 'Sadece %5 oyuncunun geçebildiği yeni {topic} challenge!' },
  { id: 'tr-ch-2', category: 'challenge', language: 'tr', template: '{topic} 10. tura kadar dayanabilir misin?' },
  { id: 'en-ch-1', category: 'challenge', language: 'en', template: 'The new {topic} challenge only 5% of gamers can beat!' },
  { id: 'en-ch-2', category: 'challenge', language: 'en', template: 'Can you survive 10 rounds of {topic}?' },
  // ── اعداد (numbers) ──
  { id: 'fa-num-1', category: 'numbers', language: 'fa', template: '۳ دلیل که {topic} این هفته داغ‌ترین بازی کلاب است' },
  { id: 'fa-num-2', category: 'numbers', language: 'fa', template: '۹۰ دقیقه، ۵ دوست، ۱ برنده — آماده‌ای؟' },
  { id: 'tr-num-1', category: 'numbers', language: 'tr', template: '{topic} bu hafta kulübün en sıcak oyunu olmasının 3 sebebi' },
  { id: 'tr-num-2', category: 'numbers', language: 'tr', template: '90 dakika, 5 arkadaş, 1 kazanan — hazır mısın?' },
  { id: 'en-num-1', category: 'numbers', language: 'en', template: '3 reasons {topic} is the hottest game in the club this week' },
  { id: 'en-num-2', category: 'numbers', language: 'en', template: '90 minutes, 5 friends, 1 winner — ready?' },
  // ── سؤال (question) ──
  { id: 'fa-q-1', category: 'question', language: 'fa', template: 'آخرین بار کی با دوستانت {topic} بازی کردی؟' },
  { id: 'fa-q-2', category: 'question', language: 'fa', template: 'میز آزاد امشب — چه بازی‌ای می‌ریزیم؟' },
  { id: 'tr-q-1', category: 'question', language: 'tr', template: 'Arkadaşlarınla en son ne zaman {topic} oynadın?' },
  { id: 'tr-q-2', category: 'question', language: 'tr', template: 'Bu gece boş masa — hangi oyunu açalım?' },
  { id: 'en-q-1', category: 'question', language: 'en', template: 'When did you last play {topic} with your friends?' },
  { id: 'en-q-2', category: 'question', language: 'en', template: 'Free table tonight — which game are we loading?' },
  // ── اعلامیه (announcement) ──
  { id: 'fa-an-1', category: 'announcement', language: 'fa', template: '🎉 تورنمنت {topic} ثبت‌نامش شروع شد — ظرفیت محدود!' },
  { id: 'fa-an-2', category: 'announcement', language: 'fa', template: '🚀 {topic} از امروز روی میزهای {club} فعال است' },
  { id: 'tr-an-1', category: 'announcement', language: 'tr', template: '🎉 {topic} turnuvasına kayıtlar başladı — kontenjan sınırlı!' },
  { id: 'tr-an-2', category: 'announcement', language: 'tr', template: '🚀 {topic} bugünden itibaren {club} masalarında' },
  { id: 'en-an-1', category: 'announcement', language: 'en', template: '🎉 {topic} tournament registrations are open — limited slots!' },
  { id: 'en-an-2', category: 'announcement', language: 'en', template: '🚀 {topic} is live on {club} tables starting today' },
];

export function hooksFor(language: SocialLanguage): HookPattern[] {
  return HOOK_PATTERNS.filter(h => h.language === language);
}

export function hookCategories(): HookCategory[] {
  return [...new Set(HOOK_PATTERNS.map(h => h.category))];
}
