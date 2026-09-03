# PayTR API — مرجع فنی فشرده (برای پیاده‌سازی در `server.ts`)

منبع: dev.paytr.com (iFrame API گام ۱ و ۲، FAQ) و `github.com/paytr/paytr-postman` (collection v1.1). تاریخ: 2026-09-04. زبان اصلی اسناد ترکی است؛ نام فیلدها عیناً حفظ شده.

## 0) اعتبارنامه‌ها
از Mağaza Paneli → Destek & Kurulum → Entegrasyon Bilgileri:
`merchant_id` (شمارهٔ فروشگاه) · `merchant_key` (پارول) · `merchant_salt` (کلید مخفی). هیچ‌کدام نباید به کلاینت برسند.

## 1) الگوی عمومی امضا (همهٔ سرویس‌ها)
```
paytr_token = base64( HMAC_SHA256( key = merchant_key,
                                   msg = <فیلدهای مشخص هر سرویس به‌هم‌چسبیده> + merchant_salt ) )
```
Node:
```ts
import { createHmac } from 'node:crypto';
export const paytrToken = (parts: (string|number)[], key: string, salt: string) =>
  createHmac('sha256', key).update(parts.join('') + salt).digest('base64');
```
همهٔ درخواست‌ها `POST` با بدنهٔ `application/x-www-form-urlencoded` (یا multipart) به `https://www.paytr.com/...`؛ پاسخ JSON.

---

## 2) iFrame API — گام ۱: گرفتن توکن
`POST https://www.paytr.com/odeme/api/get-token`

| فیلد | اجباری | در hash | توضیح |
|---|---|---|---|
| merchant_id | ✔ | ✔ | |
| user_ip | ✔ | ✔ | IP واقعی/خارجی مشتری (≤39، IPv4) |
| merchant_oid | ✔ | ✔ | شمارهٔ سفارش یکتا، **فقط الفبا-عدد**، ≤64 |
| email | ✔ | ✔ | ≤100، بدون حروف ترکی |
| payment_amount | ✔ | ✔ | عدد صحیح، مبلغ ×100 (34.56 → 3456)؛ حداقل 100 |
| user_basket | ✔ | ✔ | `base64(JSON.stringify([[name, "unitPrice", qty], ...]))` |
| no_installment | ✔ | ✔ | 0/1 — 1 = فقط تک‌چکشی |
| max_installment | ✔ | ✔ | 0 (پیش‌فرض پنل) یا 2..12 |
| currency | ✔ | ✔ | `TL` (=`TRY`) / `USD` / `EUR` / `GBP` / `RUB` |
| test_mode | – | ✔ | 0/1 (1 = تراکنش تستی حتی در حالت زنده) |
| paytr_token | ✔ | — | فرمول زیر |
| user_name | ✔ | — | ≤60 |
| user_address | ✔ | — | ≤400 |
| user_phone | ✔ | — | ≤20 |
| merchant_ok_url | ✔ | — | ≤400، ریدایرکت بعد از موفقیت (بدون POST data!) |
| merchant_fail_url | ✔ | — | ≤400 |
| debug_on | – | — | 1 = نمایش خطای فنی (فقط توسعه) |
| timeout_limit | – | — | دقیقه، پیش‌فرض 30 |
| lang | – | — | `tr` (پیش‌فرض) / `en` |

**ترتیب hash (دقیقاً همین):**
```
merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket
+ no_installment + max_installment + currency + test_mode   (+ merchant_salt)
```
**پاسخ:** `{"status":"success","token":"..."}` یا `{"status":"failed","reason":"..."}`

**نمایش در کلاینت:**
```html
<script src="https://www.paytr.com/js/iframeResizer.min.js"></script>
<iframe src="https://www.paytr.com/odeme/guvenli/TOKEN" id="paytriframe"
        frameborder="0" scrolling="no" style="width:100%"></iframe>
<script>iFrameResize({}, '#paytriframe');</script>
```
CSP لازم: `frame-src https://www.paytr.com; script-src https://www.paytr.com`.

**رفتار:** بعد از پرداخت، iFrame کاربر را به ok_url/fail_url می‌برد (**بدون هیچ دادهٔ POST**) ⇒ تأیید سفارش فقط در گام ۲.

## 3) iFrame API — گام ۲: Bildirim URL (callback سرور به سرور)
- آدرس در Mağaza Paneli → Ayarlar → Bildirim URL ثبت می‌شود (یک آدرس برای همهٔ تراکنش‌ها). باید HTTPS، عمومی، **بدون لاگین/CSRF/Session** باشد.
- PayTR `POST` می‌کند:

| فیلد | در hash | توضیح |
|---|---|---|
| merchant_oid | ✔ | |
| status | ✔ | `success` / `failed` |
| total_amount | ✔ | مبلغ نهایی ×100 (ممکن است با تقسیط > payment_amount باشد) |
| hash | — | امضای PayTR |
| failed_reason_code / failed_reason_msg | — | فقط در failed (جدول زیر) |
| test_mode | — | 1 اگر تستی |
| payment_type | — | `card` / `eft` |
| currency | — | TL/USD/EUR/GBP/RUB |
| payment_amount | — | همان مبلغ گام ۱ |

**بررسی امضا (اجباری، وگرنه ضرر مالی):**
```ts
const expected = createHmac('sha256', MERCHANT_KEY)
  .update(merchant_oid + MERCHANT_SALT + status + total_amount).digest('base64');
if (expected !== hash) return res.status(400).send('PAYTR notification failed: bad hash');
```
**قوانین پاسخ:**
1. بدنهٔ پاسخ **دقیقاً** متن ساده `OK` (بدون HTML/JSON/فاصلهٔ اضافه)، HTTP 200.
2. ممکن است چند بار برای یک `merchant_oid` بیاید ⇒ idempotent: اگر قبلاً پردازش شده فقط `OK` بده.
3. اگر `OK` نگیرد تراکنش در پنل «Devam Ediyor» می‌ماند و پول تسویه نمی‌شود.
4. تست محلی: باید آدرس عمومی باشد (ngrok/Railway).

**کدهای خطای گام ۲:**

| code | معنی |
|---|---|
| 0 | پیام متغیر بانک (مثلاً موجودی ناکافی) |
| 1 | مشتری شمارهٔ موبایل را در احراز هویت وارد نکرد |
| 2 | رمز پیامکی اشتباه |
| 3 | رد در کنترل امنیتی PayTR |
| 6 | مشتری منصرف شد / timeout_limit تمام شد |
| 8 | این کارت تقسیط ندارد |
| 9 | فروشگاه مجوز این کارت را ندارد |
| 10 | باید 3D Secure استفاده شود |
| 11 | هشدار fraud — مشتری را بررسی کنید |
| 99 | خطای فنی یکپارچه‌سازی (وقتی debug_on=0) |

## 4) حالت تست
- در پنل: فروشگاه تا قبل از «Canlı Mod» در حالت تست است (پیام «İŞLEMİ TEST MODUNDA YAPIYORSUNUZ»). بعد از یک تست موفق از Destek & Kurulum → Canlı Mod زنده می‌شود.
- در حالت زنده با `test_mode=1` هم می‌شود تست کرد.
- در iFrame کارت تستی خودکار می‌آید. برای Direkt API/کارت دستی:

| نام | شماره | انقضا | CVV |
|---|---|---|---|
| PAYTR TEST | 4355 0843 5508 4358 | هر تاریخ آینده | 000 |
| PAYTR TEST | 5406 6754 0667 5403 | هر تاریخ آینده | 000 |
| PAYTR TEST | 9792 0303 9444 0796 (Troy) | هر تاریخ آینده | 000 |

- تراکنش‌های تستی در Mağaza Paneli → İşlem & Döküm → İşlemler با جست‌وجوی ایمیل دیده می‌شوند.

## 5) İade API (بازگشت وجه کامل/جزئی)
`POST https://www.paytr.com/odeme/iade`

| فیلد | توضیح |
|---|---|
| merchant_id | |
| merchant_oid | سفارش موفق |
| return_amount | مبلغ به **واحد اصلی با نقطه** (مثلاً `11.97`، نه ×100) |
| paytr_token | `HMAC(merchant_id + merchant_oid + return_amount + salt)` |

پاسخ: `{status:"success", is_test, merchant_oid, return_amount}` یا `{status:"error", err_no, err_msg}`.

## 6) Durum Sorgu API (استعلام وضعیت)
`POST https://www.paytr.com/odeme/durum-sorgu` — فیلدها: `merchant_id`, `merchant_oid`, `paytr_token = HMAC(merchant_id + merchant_oid + salt)`.
پاسخ شامل `status` (success/failed/waiting…), `payment_amount`, `payment_total`, `currency`, `payment_type`, `returns[]`… — برای reconcile سفارش‌های pending.

## 7) Havale/EFT iFrame (اختیاری)
`POST https://www.paytr.com/odeme/api/get-token` با `payment_type=eft` و hash:
`merchant_id + user_ip + merchant_oid + email + payment_amount + payment_type + test_mode (+salt)`.

## 8) سایر سرویس‌ها (فعلاً لازم نیست)
Link API (ساخت لینک پرداخت + ارسال SMS/ایمیل)، Kart Saklama (utoken/ctoken، پرداخت تکرارشونده Non‑3D — نیاز به مجوز)، Taksit Oranları، BIN Sorgulama، Platform Transfer (بازارگاه)، İşlem Dökümü (گزارش حداکثر ۳ روزه)، BKM Express (`payment_type=bex`). همهٔ این‌ها در Postman collection رسمی هستند.

## 9) اسکلت پیاده‌سازی پیشنهادی (Node/Express — هنوز نوشته نشده)
```ts
// server/payments/paytr.ts  (طرح)
const BASE = 'https://www.paytr.com';
export async function createIframeToken(o: {
  oid: string; amountKurus: number; currency: 'TL'|'USD'|'EUR'|'GBP'|'RUB';
  email: string; name: string; address: string; phone: string; ip: string;
  basket: [string, string, number][]; lang: 'tr'|'en';
}) {
  const userBasket = Buffer.from(JSON.stringify(o.basket), 'utf8').toString('base64');
  const noInst = 1, maxInst = 0, test = process.env.PAYTR_TEST_MODE ?? '1';
  const token = paytrToken([MID, o.ip, o.oid, o.email, o.amountKurus, userBasket, noInst, maxInst, o.currency, test], KEY, SALT);
  const body = new URLSearchParams({
    merchant_id: MID, user_ip: o.ip, merchant_oid: o.oid, email: o.email,
    payment_amount: String(o.amountKurus), user_basket: userBasket,
    no_installment: String(noInst), max_installment: String(maxInst), currency: o.currency,
    test_mode: test, paytr_token: token, user_name: o.name, user_address: o.address,
    user_phone: o.phone, merchant_ok_url: `${PUBLIC_URL}/payment/success`,
    merchant_fail_url: `${PUBLIC_URL}/payment/fail`, timeout_limit: '30', lang: o.lang, debug_on: '0',
  });
  const r = await fetch(`${BASE}/odeme/api/get-token`, { method: 'POST', body });
  const j = await r.json(); if (j.status !== 'success') throw new Error(j.reason); return j.token as string;
}

// app.post('/api/payments/paytr/callback', express.urlencoded({extended:false}), (req,res)=>{
//   verify hash → idempotent update → res.type('text/plain').send('OK') })
```
تست واحد پیشنهادی: hash گام ۱ و گام ۲ با مقادیر ثابت؛ callback تکراری فقط یک‌بار اعمال شود؛ hash غلط → 400 و سفارش دست‌نخورده.
