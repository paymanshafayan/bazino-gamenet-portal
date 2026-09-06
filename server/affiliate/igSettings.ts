/**
 * تنظیمات و متن‌های کمپین اینستاگرام (Invite Your Squad).
 * ردیف واقعی جدول settings — ادمین در پنل ویرایش می‌کند؛ موتور فقط همین‌ها را می‌خواند.
 */
import { randomBytes } from 'crypto';

export const IG_MSG_LANGS = ['tr', 'fa', 'en', 'ru'] as const;
export type IgMsgLang = (typeof IG_MSG_LANGS)[number];

/** متن‌های پیش‌فرض — متغیرها: {{code}} {{follow_button}} {{invite_url}} {{coupon_line}} {{handle}} */
export const IG_DEFAULT_MESSAGES: Record<string, string> = {
  ig_msg_partner1_tr: `Bazino Pro davet kampanyasına katılmak için @bazinopro sayfasını takip et ve «{{follow_button}}» düğmesine bas.

Sonraki mesajda sana özel kod ve arkadaşın için hazır metin gelir. O mesajı olduğu gibi arkadaşınla paylaş; sana gönderilen Bazino gönderisini de paylaş.

Instagram şifreni asla istemeyiz. Rezervasyon ve koşullar: bazino.pro`,
  ig_msg_partner1_fa: `برای شرکت در طرح دعوت بازینو، پیج @bazinopro را Follow کن و روی دکمهٔ «{{follow_button}}» بزن.

پیام بعدی کد شناسایی اختصاصی تو و متن آماده برای دوستت را دارد. همان پیام را بدون تغییر برای دوستت بفرست و پستی که برایت فرستاده شده را هم Share کن.

رمز اینستاگرام را هرگز نمی‌خواهیم. رزرو و شرایط: bazino.pro`,
  ig_msg_partner1_en: `To join the Bazino Pro invite campaign, follow @bazinopro and tap «{{follow_button}}».

The next message will include your unique code and a ready-made text for your friend. Send that message unchanged and share the Bazino post that was sent to you.

We never ask for your Instagram password. Booking details: bazino.pro`,
  ig_msg_partner1_ru: `Чтобы участвовать в кампании Bazino Pro, подпишись на @bazinopro и нажми «{{follow_button}}».

Следующее сообщение будет с твоим уникальным кодом и готовым текстом для друга. Перешли его без изменений и поделись постом Bazino, который тебе отправили.

Пароль Instagram мы никогда не просим. Бронь: bazino.pro`,

  ig_msg_partner2_tr: `Özel kodun: {{code}}

Bu metni değiştirmeden arkadaşınla paylaş ve sana gönderdiğim Bazino gönderisini de paylaş:

«Bazino davet linki ve kuponu için {{code}} sayısını, sana gönderdiğim Bazino gönderisinin altına yorum yaz. @bazinopro sayfasını takip et ve «{{follow_button}}» düğmesine bas.»`,
  ig_msg_partner2_fa: `کد شناسایی اختصاصی تو: {{code}}

این متن را بدون تغییر برای دوستت بفرست و پستی که برایت فرستادم را هم Share کن:

«برای دریافت لینک دعوت و کوپن بازینو، عدد {{code}} را زیر پستی که برایت فرستاده‌ام کامنت کن، پیج @bazinopro را Follow کن و روی «{{follow_button}}» بزن.»`,
  ig_msg_partner2_en: `Your unique code: {{code}}

Send this text unchanged to your friend and share the Bazino post I sent you:

«To get the Bazino invite link and coupon, comment {{code}} under the Bazino post I sent you, follow @bazinopro and tap «{{follow_button}}».»`,
  ig_msg_partner2_ru: `Твой код: {{code}}

Отправь этот текст другу без изменений и поделись постом Bazino:

«Чтобы получить ссылку и купон Bazino, напиши {{code}} комментарием под постом, который я тебе отправил, подпишись на @bazinopro и нажми «{{follow_button}}».»`,

  ig_msg_friend_tr: `Kodun alındı. @bazinopro sayfasını takip et ve «{{follow_button}}» düğmesine bas; davet linkin ve kupon koşulları gelecek.

Bu yorum, kampanyada gönderiyi aldığının ve paylaştığının pratik kaydıdır. Resmi rezervasyon: bazino.pro`,
  ig_msg_friend_fa: `کد دعوتت دریافت شد. پیج @bazinopro را Follow کن و روی «{{follow_button}}» بزن تا لینک دعوت و شرایط کوپن برایت ارسال شود.

کامنت کد تو زیر پست بازینو در این کمپین به‌عنوان تأیید عملی دریافت پست و Share ثبت شد. جزئیات رزرو: bazino.pro`,
  ig_msg_friend_en: `Your invite code was received. Follow @bazinopro and tap «{{follow_button}}» so we can send your invite link and coupon terms.

Commenting the code under the Bazino post is this campaign’s practical proof that the post reached you. Official booking: bazino.pro`,
  ig_msg_friend_ru: `Код получен. Подпишись на @bazinopro и нажми «{{follow_button}}» — пришлём ссылку и условия купона.

Этот комментарий в кампании считается практическим подтверждением, что пост до тебя дошёл. Бронь: bazino.pro`,

  ig_msg_invite_tr: `Davet linkin hazır:\n{{invite_url}}\n{{coupon_line}}\nRezervasyon ve turnuva koşulları sadece bazino.pro üzerindedir.`,
  ig_msg_invite_fa: `لینک دعوتت آماده است:\n{{invite_url}}\n{{coupon_line}}\nشرایط رزرو و تورنمنت فقط در bazino.pro است.`,
  ig_msg_invite_en: `Your invite link is ready:\n{{invite_url}}\n{{coupon_line}}\nBooking and tournament rules live only on bazino.pro.`,
  ig_msg_invite_ru: `Ссылка готова:\n{{invite_url}}\n{{coupon_line}}\nУсловия брони только на bazino.pro.`,

  ig_btn_follow_tr: 'Takip ediyorum',
  ig_btn_follow_fa: 'فالو دارم',
  ig_btn_follow_en: 'I follow',
  ig_btn_follow_ru: 'Я подписан',
};

export const IG_SETTING_DEFAULTS: Record<string, string> = {
  ig_campaign_ids: 'SQUAD26',
  ig_campaign_keyword: 'SQUAD',
  ig_program_open: '1',
  ig_invite_base_url: 'https://bazino.pro',
  ig_friend_coupon_type: 'percent',
  ig_friend_coupon_value: '0',
  ig_msg_lang: 'tr',
  ...IG_DEFAULT_MESSAGES,
};

export const IG_SETTING_KEYS = Object.keys(IG_SETTING_DEFAULTS);
export const IG_INGEST_TOKEN_KEY = 'ig_ingest_token';

export async function seedIgSettings(store: { getSetting(k: string): Promise<string | undefined>; setSetting(k: string, v: string): Promise<void> }): Promise<number> {
  let n = 0;
  for (const [k, v] of Object.entries(IG_SETTING_DEFAULTS)) {
    const existing = await store.getSetting(k);
    if (existing === undefined || existing === null || existing === '') {
      await store.setSetting(k, v);
      n++;
    }
  }
  const tok = await store.getSetting(IG_INGEST_TOKEN_KEY);
  if (!tok) {
    await store.setSetting(IG_INGEST_TOKEN_KEY, randomBytes(32).toString('hex'));
    n++;
  }
  return n;
}

export async function readIgSettings(store: { getSetting(k: string): Promise<string | undefined> }): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...IG_SETTING_DEFAULTS };
  for (const k of [...IG_SETTING_KEYS, IG_INGEST_TOKEN_KEY]) {
    const v = await store.getSetting(k);
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}

export function knownCampaignIds(settings: Record<string, string>): string[] {
  return String(settings.ig_campaign_ids || 'SQUAD26').split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

// ── Integration API tokens (Manus / Zernio) ─────────────────────────────────
// Standard rotating bearer tokens, stored as a secret setting; managed from the
// admin panel. An integration (Manus ingest/partner-invite, Zernio webhook) can
// authenticate with any active token.
export const API_TOKENS_SETTING = 'integration_api_tokens';
export interface ApiTokenRow { id: string; name: string; token: string; createdAt: string; lastUsedAt: string; }

export function generateApiToken(): string {
  return `baz_${randomBytes(24).toString('hex')}`;
}

async function readTokens(store: { getSetting(k: string): Promise<string | undefined> }): Promise<ApiTokenRow[]> {
  const raw = await store.getSetting(API_TOKENS_SETTING);
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}
async function writeTokens(store: { setSetting(k: string, v: string): Promise<void> }, tokens: ApiTokenRow[]): Promise<void> {
  await store.setSetting(API_TOKENS_SETTING, JSON.stringify(tokens));
}

/** Admin-facing list (full token included — admin only, needed for copy). */
export async function listApiTokens(store: any): Promise<ApiTokenRow[]> {
  return readTokens(store);
}
export async function createApiToken(store: any, name: string): Promise<ApiTokenRow> {
  const tokens = await readTokens(store);
  const row: ApiTokenRow = {
    id: newTokId(), name: String(name || '').slice(0, 80) || 'API token',
    token: generateApiToken(), createdAt: new Date().toISOString(), lastUsedAt: '',
  };
  tokens.push(row); await writeTokens(store, tokens); return row;
}
export async function renameApiToken(store: any, id: string, name: string): Promise<boolean> {
  const tokens = await readTokens(store);
  const t = tokens.find(x => x.id === id); if (!t) return false;
  t.name = String(name || '').slice(0, 80) || t.name; await writeTokens(store, tokens); return true;
}
export async function deleteApiToken(store: any, id: string): Promise<boolean> {
  const tokens = await readTokens(store);
  const next = tokens.filter(x => x.id !== id);
  if (next.length === tokens.length) return false;
  await writeTokens(store, next); return true;
}
/** True when `bearer` matches an active integration token (also stamps lastUsedAt). */
export async function isValidApiToken(store: any, bearer: string): Promise<boolean> {
  const t = String(bearer || '').trim();
  if (!t || !t.startsWith('baz_')) return false;
  const tokens = await readTokens(store);
  const match = tokens.find(x => x.token === t);
  if (!match) return false;
  match.lastUsedAt = new Date().toISOString();
  try { await writeTokens(store, tokens); } catch { /* best-effort stamp */ }
  return true;
}
function newTokId(): string { return `TOK-${randomBytes(6).toString('hex')}`; }

export function langFromCaptionVersion(raw: string | undefined, fallback: IgMsgLang = 'tr'): IgMsgLang {
  const s = String(raw || fallback).toLowerCase();
  if (s.startsWith('fa')) return 'fa';
  if (s.startsWith('en')) return 'en';
  if (s.startsWith('ru')) return 'ru';
  if (s.startsWith('tr')) return 'tr';
  return fallback;
}
