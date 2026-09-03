# درگاه پرداخت PayTR — چک‌لیست آماده‌سازی سایت + خلاصهٔ فنی

> تاریخ تهیه: 2026-09-04 — منابع: paytr.com، dev.paytr.com، مخزن رسمی `github.com/paytr/paytr-postman`، و راهنماهای عمومی «سانال پوز» ترکیه (لینک‌ها در انتهای فایل).
> وضعیت: **فقط مستندسازی؛ هیچ کدی پیاده‌سازی نشده است.** جزئیات فنی API در [`paytr-api-reference.md`](./paytr-api-reference.md).

---

## ۱) PayTR چیست و چه چیزی می‌دهد

| مورد | توضیح |
|---|---|
| محصول‌ها | Sanal POS (درگاه کارت)، Linkle Ödeme (پرداخت با لینک)، Abonelik (اشتراک/تکرارشونده)، Kart Saklama (ذخیره کارت)، Havale/EFT |
| امنیت | 3D‌Secure روی همهٔ تراکنش‌ها؛ فرم پرداخت روی سرور PayTR است ⇒ **ما نیازی به PCI‑DSS نداریم** (مدل iFrame) |
| هزینه راه‌اندازی | ندارد (فقط کارمزد تراکنش، درصد آن بعد از بررسی پرونده اعلام می‌شود) |
| تسویه | روز کاری بعد به IBAN شرکت |
| ارزها | TL (TRY)، USD، EUR، GBP، RUB |
| زبان صفحهٔ پرداخت | فقط **tr** و **en** (فارسی/روسی ندارد — متن‌های اطراف iFrame را خودمان ترجمه می‌کنیم) |
| حداقل مبلغ | ۱ TL (۱۰۰ kuruş) |
| مدل‌های اتصال | **iFrame API** (پیشنهادی برای ما)، Direkt API (فرم کارت خودمان؛ نیاز به PCI)، Link API، ماژول‌های آماده (WooCommerce, OpenCart, Magento…) |

### ⚠️ نکتهٔ مهم دربارهٔ شرکت KKTC (قبرس شمالی)
کلوپ در İskele / KKTC است. طبق تجربه‌های منتشرشده در فروم‌ها (r10.net, sikayetvar — ۲۰۲۰ تا ۲۰۲۶):
- PayTR **رسماً اعلام نمی‌کند** که KKTC را نمی‌پذیرد، ولی چند نفر ردِ بی‌دلیل گرفته‌اند و چند نفر دیگر (با اعتراض یا از قبل) سرویس فعال دارند.
- iyzico صراحتاً شرکت‌های KKTC را نمی‌پذیرد.
- گزینه‌های جایگزین محلی که کاربران KKTC ذکر کرده‌اند: **Tiko / Tikokart** (Figensoft)، **Paynet**، سانال پوز مستقیم از **Kıbrıs İş Bankası** (نیاز به سبد خرید).
- **توصیه:** فرم پیش‌ثبت‌نام PayTR را با اطلاعات کامل بفرستید و اگر رد شد، از طریق فرم Destek اعتراض کنید و لینک سایت + اسناد شرکت را دوباره ارسال کنید. هم‌زمان Tiko/Paynet را به‌عنوان پلن B نگه دارید. ساختار سرور ما باید طوری باشد که تعویض PSP فقط یک آداپتر باشد.

---

## ۲) مدارک شرکتی که PayTR می‌خواهد (خارج از سایت)

بعد از تأیید پیش‌ثبت‌نام (paytr.com → Hemen Başvur) با ایمیل درخواست می‌شوند:

**شرکت Ltd./A.Ş.:**
- Vergi levhası (برگهٔ مالیاتی، تاریخ جدید)
- Ticaret Sicil Gazetesi (روزنامهٔ ثبت شرکت)
- İmza sirküleri (گواهی امضای محضری)
- کپی کارت شناسایی شرکا/مدیر
- مدرک تأیید IBAN شرکت (نامهٔ بانک/تصویر حساب)
- Faaliyet belgesi (گواهی فعالیت) — بعضاً
- برای KKTC احتمالاً معادل‌های محلی: Şirket Tescil Belgesi، Vergi Güvenlik Numarası، Onay Belgesi

**شخص حقیقی (Şahıs):** İmza beyannamesi، Vergi levhası، کارت شناسایی، مدرک IBAN.

در فرم درخواست پرسیده می‌شود: نوع کالا/خدمت، مشتری هدف، میانگین مبلغ تراکنش، حجم ماهانهٔ تقریبی، پلتفرم پرداخت (وب/اپ). **فعالیت اعلام‌شده باید با آنچه سایت می‌فروشد یکی باشد** (رزرو سیستم گیمینگ، بوفه/کافه، فروشگاه لوازم جانبی، ورودی تورنمنت).

---

## ۳) چک‌لیست چیزهایی که باید روی سایت باشد (بررسی PayTR قبل از تأیید)

وضعیت فعلی سایت بر اساس بررسی کد (`4af6155`…`be84276`):

| # | الزام | چرا | وضعیت ما |
|---|---|---|---|
| 1 | **HTTPS/SSL معتبر** روی دامنهٔ اصلی + Bildirim URL | اجباری | ✅ Railway SSL دارد (تست‌نشده روی دامنهٔ سفارشی) |
| 2 | سایت **زنده و کامل**؛ نه «در دست ساخت»؛ محصولات/خدمات با قیمت واضح | بازبین PayTR سایت را باز می‌کند | ⚠️ قیمت‌ها هنوز «تومان» هستند (`common.currency`)؛ باید **TL** شود |
| 3 | **فرآیند خرید کامل**: انتخاب → سبد/جزئیات → صفحهٔ پرداخت | باید تا لحظهٔ پرداخت قابل مشاهده باشد | ⚠️ سبد Shop/Cafe و رزرو داریم، صفحهٔ پرداخت واقعی نداریم |
| 4 | **Mesafeli Satış Sözleşmesi** (قرارداد فروش از راه دور) — لینک در فوتر + تیک تأیید قبل از پرداخت | قانون ۶۵۰۲ ترکیه؛ PayTR در بازبینی چک می‌کند | ❌ ندارد |
| 5 | **Ön Bilgilendirme Formu** (فرم اطلاع‌رسانی اولیه) | همراه قرارداد بالا | ❌ ندارد |
| 6 | **Gizlilik Politikası + KVKK Aydınlatma Metni** (حریم خصوصی/داده شخصی) | اجباری | ❌ ندارد |
| 7 | **İptal ve İade Koşulları** (شرایط لغو/بازگشت وجه) — ۱۴ روز حق انصراف (cayma hakkı) برای کالا؛ برای خدمات زمان‌دار (رزرو) استثنا با ذکر صریح | PayTR و بانک‌ها حساس‌اند | ❌ ندارد |
| 8 | **Teslimat / Hizmet Koşulları** (نحوهٔ ارائهٔ خدمت: رزرو حضوری، تحویل کالا در محل) | | ❌ ندارد |
| 9 | **Üyelik Sözleşmesi + Çerez Politikası** (عضویت + کوکی) | پیشنهادی | ❌ ندارد |
| 10 | **صفحهٔ تماس/İletişim** با: نام قانونی کامل شرکت، آدرس ثبتی کامل، تلفن (ترجیحاً ثابت)، ایمیل شرکتی (روی دامنه نه gmail)، شمارهٔ مالیاتی/ثبت | بازبین تطبیق با مدارک می‌دهد | ⚠️ آدرس و موبایل در `site_settings` هست؛ **نام قانونی، ایمیل دامنه‌ای، شماره مالیاتی** نداریم؛ صفحهٔ مستقل İletişim نداریم |
| 11 | **لوگوهای کارت در فوتر و صفحهٔ پرداخت**: Visa, Mastercard, Troy (+ American Express اختیاری) + **لوگوی PayTR** + بج «3D Secure / SSL güvenli ödeme» | PayTR پک رسمی می‌دهد: `dev.paytr.com/sikca-sorulan-sorular/PayTR_Gorselleri.zip` | ❌ ندارد |
| 12 | **جدول تقسیط (Taksit tablosu)** در صفحهٔ محصول/پرداخت | فقط اگر تقسیط بدهیم؛ ما `no_installment=1` می‌فرستیم | — اختیاری |
| 13 | **ETBİS** ثبت (سامانهٔ تجارت الکترونیک ترکیه) + QR در فوتر | فقط برای شرکت ثبت‌شده در ترکیه؛ برای KKTC نامعلوم | ❓ باید از PayTR پرسید |
| 14 | **کالای/خدمات ممنوع** نباشد (قمار، الکل، تنباکو، Forex، محتوای بزرگسال، SMS‑onay، e‑pin…) | رد فوری | ✅ گیم‌نت/کافه/لوازم — مجاز (تورنمنت با جایزه نقدی را «ورودی مسابقه مهارتی» توصیف کنید، نه شرط‌بندی) |
| 15 | صفحات موفق/ناموفق پرداخت (`merchant_ok_url` / `merchant_fail_url`) | فنی | ❌ ندارد |
| 16 | **Bildirim URL** عمومی بدون لاگین که فقط `OK` برمی‌گرداند | فنی، بدون آن تراکنش «Devam Ediyor» می‌ماند | ❌ ندارد |
| 17 | اطلاعات فوتر: نام شرکت، © سال، لینک به همهٔ متن‌های قانونی | | ⚠️ فوتر داریم، لینک‌های قانونی نداریم |
| 18 | ایمیل/تلفن پشتیبانی روی صفحهٔ پرداخت و در متن قرارداد | | ❌ |

### فایل‌های تصویری موردنیاز (پوشهٔ پیشنهادی `public/images/payments/`)
`visa.svg`, `mastercard.svg`, `troy.svg`, `amex.svg` (اختیاری), `paytr-logo.svg`, `3d-secure.svg`, `ssl-secure.svg` — نسخهٔ روشن و تیره. لوگوهای برند از پک رسمی PayTR (zip بالا؛ **zip را کامیت نکنید**، فقط svg/png‌های لازم را).

---

## ۴) معماری پیشنهادی برای سایت ما (وقتی تأیید شد)

```
Browser ──POST /api/payments/paytr/create-order──▶ server.ts
                                                     │ ذخیرهٔ order (status=pending, merchant_oid یکتا)
                                                     │ POST https://www.paytr.com/odeme/api/get-token
                                                     ◀── {status:"success", token}
Browser ◀── {token} ─── نمایش <iframe src="https://www.paytr.com/odeme/guvenli/<token>">
        (اسکریپت https://www.paytr.com/js/iframeResizer.min.js — CSP: frame-src + script-src باید اجازه دهد)

PayTR ──POST /api/payments/paytr/callback (Bildirim URL)──▶ server.ts
        بررسی hash → اگر قبلاً پردازش شده فقط "OK" → وگرنه status success/failed → به‌روزرسانی order + رزرو/سفارش/امتیاز وفاداری → پاسخ متن ساده "OK"

Browser ── redirect به merchant_ok_url (/payment/success?oid=...) ── فقط «در حال تأیید…» نشان می‌دهد و از /api/orders/:oid وضعیت را poll می‌کند
```

- اسرار در env: `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`, `PAYTR_TEST_MODE=1`.
- جدول جدید `payment_orders(merchant_oid PK, kind(reservation|shop|cafe|tournament), ref_id, user_id, amount_kurus, currency, status pending|success|failed, paytr_total_amount, failed_code, failed_msg, raw_callback, created_at, updated_at)`.
- `merchant_oid` فقط `[A-Za-z0-9]` و ≤۶۴ کاراکتر — مثلاً `BZ` + timestamp + random (بدون `-` و `_`).
- IP کاربر: از `X-Forwarded-For` پشت Railway (اولین مقدار).
- **هرگز** روی ok_url سفارش را تأیید نکنید؛ فقط callback.
- Callback باید idempotent باشد (PayTR ممکن است چند بار بفرستد).
- CSP فعلی (`server.ts` helmet) باید `frame-src https://www.paytr.com` و `script-src https://www.paytr.com` را اضافه کند.
- بخش ادمین: فهرست تراکنش‌ها + دکمهٔ «İade/بازگشت وجه» (API `/odeme/iade`) + «Durum sorgu».

ترتیب پیشنهادی اجرا (بعد از تأیید شما):
1. صفحات قانونی چهارزبانه (fa/en/ru/tr) با محتوای قابل ویرایش از ادمین (`site_settings` یا جدول `legal_pages`) + مسیرها `/legal/<slug>` + لینک فوتر + تیک تأیید در checkout.
2. صفحهٔ İletişim با فیلدهای جدید در تنظیمات: `company_legal_name`, `company_tax_no`, `company_email`, `company_landline`.
3. لوگوهای کارت + بج امنیت در فوتر و checkout؛ تغییر واحد پول به TL.
4. ماژول پرداخت (`server/payments/paytr.ts`) با test_mode=1 + صفحات success/fail + callback + تست‌ها.
5. ارسال درخواست PayTR → بعد از دریافت merchant_id/key/salt → تست → Canlı Mod.

---

## ۵) لینک‌های مرجع
- سایت: https://www.paytr.com/ — پیش‌ثبت‌نام: https://www.paytr.com/ (Hemen Başvur) — FAQ EN: https://www.paytr.com/en/faq
- مستندات: https://dev.paytr.com/ — iFrame API: https://dev.paytr.com/iframe-api (گام ۱: `/iframe-api/iframe-api-1-adim`، گام ۲: `/iframe-api/iframe-api-2-adim`)
- FAQ فنی: https://dev.paytr.com/sikca-sorulan-sorular
- Postman collection رسمی (همهٔ سرویس‌ها + فرمول hash): https://github.com/paytr/paytr-postman
- پک لوگوها: https://dev.paytr.com/sikca-sorulan-sorular/PayTR_Gorselleri.zip — مستند کامل iFrame (zip): https://dev.paytr.com/iframe-api/PayTR_IFrame_API.zip
- پنل فروشگاه: Mağaza Paneli → Destek & Kurulum → Entegrasyon Bilgileri (کلیدها) / Ayarlar (Bildirim URL) / Canlı Mod
- تجربه‌های KKTC: r10.net «KKTC Şirketi İçin Sanal Pos Önerisi»، «KKTC Şirket Kurulumu (Sanal Pos)»
