/**
 * PayTR iFrame API — توابع خالص (بدون وابستگی به express یا دیتابیس).
 *
 * منبع: docs/payments/paytr-api-reference.md (dev.paytr.com + paytr-postman).
 *  - paytr_token گام ۱: HMAC-SHA256(key=merchant_key,
 *        merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket
 *        + no_installment + max_installment + currency + test_mode + merchant_salt) → base64
 *  - hash گام ۲ (Bildirim URL): HMAC-SHA256(key, merchant_oid + merchant_salt + status + total_amount) → base64
 *  - iade: HMAC-SHA256(key, merchant_id + merchant_oid + return_amount + merchant_salt) → base64
 *
 * همهٔ مبالغ به «کوروش» (×100، عدد صحیح) هستند مگر return_amount که با نقطهٔ اعشار می‌رود.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type PaytrCurrency = 'TL' | 'USD' | 'EUR' | 'GBP' | 'RUB';

export interface PaytrCredentials {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
}

export interface PaytrConfig extends PaytrCredentials {
  /** 1 = تراکنش تستی (حتی در حالت زنده). */
  testMode: boolean;
  /** آدرس عمومی سایت برای ok/fail URL. */
  publicUrl: string;
  /** حالت شبیه‌سازی محلی: بدون تماس با paytr.com (فقط برای توسعه/تست). */
  mock: boolean;
}

export const PAYTR_BASE = 'https://www.paytr.com';
export const PAYTR_IFRAME_RESIZER = `${PAYTR_BASE}/js/iframeResizer.min.js`;

/** خواندن پیکربندی از env؛ اگر کلیدها نباشند، درگاه غیرفعال است. */
export function readPaytrConfig(env: NodeJS.ProcessEnv = process.env): PaytrConfig | null {
  const merchantId = (env.PAYTR_MERCHANT_ID || '').trim();
  const merchantKey = (env.PAYTR_MERCHANT_KEY || '').trim();
  const merchantSalt = (env.PAYTR_MERCHANT_SALT || '').trim();
  const mock = env.PAYTR_MOCK === '1';
  if (!mock && (!merchantId || !merchantKey || !merchantSalt)) return null;
  return {
    merchantId: merchantId || 'MOCK',
    merchantKey: merchantKey || 'mock-key',
    merchantSalt: merchantSalt || 'mock-salt',
    testMode: env.PAYTR_TEST_MODE !== '0',
    publicUrl: (env.PUBLIC_URL || env.BAZINO_PUBLIC_URL || '').replace(/\/+$/, ''),
    mock,
  };
}

/** شمارهٔ سفارش PayTR: فقط حروف/ارقام، ≤64 کاراکتر. */
export function generateMerchantOid(prefix = 'BZ'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}${ts}${rnd}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 64);
}

export function isValidMerchantOid(oid: string): boolean {
  return /^[A-Za-z0-9]{6,64}$/.test(oid);
}

function hmacB64(key: string, msg: string): string {
  return createHmac('sha256', key).update(msg, 'utf8').digest('base64');
}

/** [name, unitPrice, qty][] → base64(JSON). قیمت واحد با دو رقم اعشار به‌صورت رشته. */
export function encodeBasket(items: Array<{ name: string; unitPrice: number; qty: number }>): string {
  const basket = items.map(i => [String(i.name).slice(0, 100), (Number(i.unitPrice) || 0).toFixed(2), Math.max(1, Math.floor(i.qty || 1))]);
  return Buffer.from(JSON.stringify(basket), 'utf8').toString('base64');
}

export interface TokenRequestInput {
  merchantOid: string;
  userIp: string;
  email: string;
  /** مبلغ کل به کوروش (×100). */
  amountKurus: number;
  userBasketB64: string;
  currency: PaytrCurrency;
  noInstallment?: 0 | 1;
  maxInstallment?: number;
  userName: string;
  userAddress: string;
  userPhone: string;
  okUrl: string;
  failUrl: string;
  lang?: 'tr' | 'en';
  timeoutLimit?: number;
  debugOn?: 0 | 1;
}

/** امضای گام ۱ (get-token). */
export function buildPaytrToken(c: PaytrCredentials, i: TokenRequestInput, testMode: boolean): string {
  const noInst = i.noInstallment ?? 1;
  const maxInst = i.maxInstallment ?? 0;
  const msg = c.merchantId + i.userIp + i.merchantOid + i.email + String(i.amountKurus) + i.userBasketB64
    + String(noInst) + String(maxInst) + i.currency + (testMode ? '1' : '0') + c.merchantSalt;
  return hmacB64(c.merchantKey, msg);
}

/** بدنهٔ کامل فرم get-token. */
export function buildTokenForm(cfg: PaytrConfig, i: TokenRequestInput): URLSearchParams {
  const noInst = i.noInstallment ?? 1;
  const maxInst = i.maxInstallment ?? 0;
  const p = new URLSearchParams();
  p.set('merchant_id', cfg.merchantId);
  p.set('user_ip', i.userIp);
  p.set('merchant_oid', i.merchantOid);
  p.set('email', i.email);
  p.set('payment_amount', String(i.amountKurus));
  p.set('user_basket', i.userBasketB64);
  p.set('no_installment', String(noInst));
  p.set('max_installment', String(maxInst));
  p.set('currency', i.currency);
  p.set('test_mode', cfg.testMode ? '1' : '0');
  p.set('paytr_token', buildPaytrToken(cfg, i, cfg.testMode));
  p.set('user_name', i.userName.slice(0, 60));
  p.set('user_address', i.userAddress.slice(0, 400));
  p.set('user_phone', i.userPhone.slice(0, 20));
  p.set('merchant_ok_url', i.okUrl.slice(0, 400));
  p.set('merchant_fail_url', i.failUrl.slice(0, 400));
  p.set('timeout_limit', String(i.timeoutLimit ?? 30));
  p.set('debug_on', String(i.debugOn ?? 0));
  p.set('lang', i.lang ?? 'tr');
  return p;
}

/** فراخوانی واقعی get-token. در حالت mock یک توکن محلی برمی‌گرداند. */
export async function requestIframeToken(cfg: PaytrConfig, i: TokenRequestInput, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (cfg.mock) return `MOCK-${i.merchantOid}`;
  const res = await fetchImpl(`${PAYTR_BASE}/odeme/api/get-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildTokenForm(cfg, i).toString(),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`PayTR get-token: پاسخ غیر JSON (${res.status}): ${text.slice(0, 200)}`); }
  if (json?.status !== 'success' || !json?.token) throw new Error(`PayTR get-token failed: ${json?.reason || text.slice(0, 200)}`);
  return String(json.token);
}

export function iframeUrlForToken(cfg: PaytrConfig, token: string): string {
  if (cfg.mock) return `/api/payments/paytr/mock/${encodeURIComponent(token.replace(/^MOCK-/, ''))}`;
  return `${PAYTR_BASE}/odeme/guvenli/${token}`;
}

export interface CallbackPayload {
  merchant_oid: string;
  status: string;
  total_amount: string;
  hash: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  test_mode?: string;
  payment_type?: string;
  currency?: string;
  payment_amount?: string;
}

/** امضای گام ۲ که PayTR می‌فرستد (برای تست و برای حالت mock). */
export function buildCallbackHash(c: PaytrCredentials, merchantOid: string, status: string, totalAmount: string | number): string {
  return hmacB64(c.merchantKey, merchantOid + c.merchantSalt + status + String(totalAmount));
}

/** بررسی امن امضای callback. */
export function verifyCallbackHash(c: PaytrCredentials, p: Pick<CallbackPayload, 'merchant_oid' | 'status' | 'total_amount' | 'hash'>): boolean {
  if (!p || typeof p.hash !== 'string' || !p.merchant_oid) return false;
  const expected = buildCallbackHash(c, String(p.merchant_oid), String(p.status), String(p.total_amount));
  const a = Buffer.from(expected);
  const b = Buffer.from(p.hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** امضای درخواست İade. return_amount با نقطه (مثلاً "11.97"). */
export function buildRefundForm(c: PaytrCredentials, merchantOid: string, returnAmount: number): URLSearchParams {
  const amountStr = (Math.round(returnAmount * 100) / 100).toFixed(2);
  const p = new URLSearchParams();
  p.set('merchant_id', c.merchantId);
  p.set('merchant_oid', merchantOid);
  p.set('return_amount', amountStr);
  p.set('paytr_token', hmacB64(c.merchantKey, c.merchantId + merchantOid + amountStr + c.merchantSalt));
  return p;
}

export async function requestRefund(cfg: PaytrConfig, merchantOid: string, returnAmount: number, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; raw: any }> {
  if (cfg.mock) return { ok: true, raw: { status: 'success', is_test: 1, merchant_oid: merchantOid, return_amount: returnAmount } };
  const res = await fetchImpl(`${PAYTR_BASE}/odeme/iade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildRefundForm(cfg, merchantOid, returnAmount).toString(),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { status: 'error', err_msg: text.slice(0, 200) }; }
  return { ok: json?.status === 'success', raw: json };
}

/** امضای Durum Sorgu. */
export function buildStatusForm(c: PaytrCredentials, merchantOid: string): URLSearchParams {
  const p = new URLSearchParams();
  p.set('merchant_id', c.merchantId);
  p.set('merchant_oid', merchantOid);
  p.set('paytr_token', hmacB64(c.merchantKey, c.merchantId + merchantOid + c.merchantSalt));
  return p;
}

/** IP واقعی مشتری پشت پروکسی (Railway/Cloudflare). */
export function clientIpFromHeaders(headers: Record<string, string | string[] | undefined>, fallback = '127.0.0.1'): string {
  const xf = headers['x-forwarded-for'];
  const first = (Array.isArray(xf) ? xf[0] : xf || '').split(',')[0].trim();
  const cf = headers['cf-connecting-ip'];
  const ip = (Array.isArray(cf) ? cf[0] : cf) || first || fallback;
  return String(ip).replace(/^::ffff:/, '').slice(0, 39);
}

/** ایمیل برای PayTR: بدون حروف ترکی/غیر ASCII و ≤100. */
export function sanitizeEmail(email: string, fallbackDomain = 'bazino.local'): string {
  const e = String(email || '').trim().toLowerCase();
  if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e) && e.length <= 100) return e;
  return `guest-${Date.now().toString(36)}@${fallbackDomain}`;
}

/** تبدیل مبلغ (واحد اصلی) به کوروش. */
export function toKurus(amount: number): number {
  return Math.max(0, Math.round((Number(amount) || 0) * 100));
}
