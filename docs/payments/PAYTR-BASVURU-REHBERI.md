# راهنمای گام‌به‌گام دریافت درگاه PayTR (ثبت‌نام → مدارک → کلیدها → تست → زنده)

> برای مدیر کلوپ Bazino. تاریخ: 2026-09-04. تکمیل‌کنندهٔ `PAYTR.md` (چک‌لیست سایت) و `paytr-api-reference.md` (فنی).
> ⚠️ منوها و نام صفحات پنل PayTR از مستندات رسمی برداشته شده‌اند؛ چون ما حساب نداریم، ظاهر دقیق فرم‌ها **تست‌نشده** است و ممکن است کمی متفاوت باشد.

---

## مرحلهٔ ۰ — قبل از ثبت‌نام: چیزهایی را که PayTR بررسی می‌کند آماده کنید

### الف) اطلاعات شرکت (یک‌جا در یک فایل بنویسید)
| مورد | مثال / توضیح |
|---|---|
| نام قانونی کامل شرکت (Ticari Unvan) | مثلاً `Bazino Gaming Ltd.` — دقیقاً مطابق سند ثبت |
| نوع شرکت | Ltd. / A.Ş. / Şahıs |
| شمارهٔ مالیاتی (Vergi No) + ادارهٔ مالیات | برای KKTC: Vergi Güvenlik Numarası |
| آدرس ثبتی | `Derviş İzzigil Sokak No.12, İskele — Vista Mare Ana Lobi, dükkan No.5` |
| تلفن ثابت + موبایل | `+90 539 133 37 47` (+ ثابت اگر هست) |
| ایمیل شرکتی روی دامنه | مثلاً `info@bazino…` — **gmail/hotmail نباشد** |
| IBAN شرکت (به نام شرکت، بانک ترکیه یا KKTC) | تسویه به همین حساب می‌رود |
| آدرس سایت | دامنهٔ نهایی با HTTPS |
| نوع فعالیت | «رزرو آنلاین سیستم گیمینگ، فروش خوراکی کافه، لوازم جانبی گیمینگ، ورودی مسابقات مهارتی» |
| میانگین مبلغ تراکنش / حجم ماهانه | تخمین واقع‌بینانه (مثلاً ۲۰۰ TL / ۵۰٬۰۰۰ TL) |

### ب) مدارک (اسکن رنگی، PDF/JPG خوانا)
**شرکت Ltd./A.Ş.**
1. Vergi Levhası (برگهٔ مالیاتی جدید)
2. Ticaret Sicil Gazetesi / سند ثبت شرکت (برای KKTC: Şirket Tescil Belgesi + Onay Belgesi)
3. İmza Sirküleri (گواهی امضای محضری مدیر)
4. کارت شناسایی/پاسپورت شرکا و مدیر (رو و پشت)
5. مدرک تأیید IBAN (نامهٔ بانک یا اسکرین‌شات اینترنت‌بانک با نام شرکت)
6. Faaliyet Belgesi (گواهی فعالیت از اتاق بازرگانی) — گاهی خواسته می‌شود
7. **اگر خواستند:** Mesafeli Satış Sözleşmesi امضاشده (متن سایت را PDF کنید)

**شخص حقیقی (Şahıs):** İmza Beyannamesi (محضری)، Vergi Levhası، کارت شناسایی، مدرک IBAN.

### ج) سایت باید «کامل» دیده شود (خلاصهٔ `PAYTR.md §۳`)
- HTTPS ✔ — قیمت‌ها به **TL** — فرآیند خرید تا صفحهٔ پرداخت قابل مشاهده
- فوتر: لینک‌های **Gizlilik/KVKK، Mesafeli Satış Sözleşmesi، Ön Bilgilendirme، İptal-İade، Teslimat، İletişim** + لوگوهای Visa/Mastercard/Troy/PayTR
- صفحهٔ İletişim با نام قانونی، آدرس، تلفن، ایمیل، شماره مالیاتی
- سایت در حال ساخت/خالی نباشد؛ فعالیت اعلام‌شده با محتوای سایت یکی باشد

> بازبین PayTR سایت را باز می‌کند. اگر این‌ها نباشند بیشترین احتمال «Onaylanmamıştır» بدون توضیح است.

---

## مرحلهٔ ۱ — پیش‌ثبت‌نام (Ön Başvuru) در paytr.com
1. به https://www.paytr.com بروید → دکمهٔ **«Hemen Başvur» / «Ücretsiz Başvur»** (بالای صفحه).
2. فرم: نوع کسب‌وکار (Şirket/Şahıs)، نام شرکت، نام و نام خانوادگی، **ایمیل شرکتی**، موبایل، آدرس سایت، حجم تقریبی، حوزهٔ فعالیت (E-ticaret / Hizmet).
3. کد تأیید پیامک/ایمیل را وارد کنید → حساب «Mağaza Paneli» ساخته می‌شود (`https://www.paytr.com/magaza`).
4. ایمیل خوش‌آمد می‌آید؛ در همان ایمیل یا در پنل، لیست مدارک درخواستی و لینک آپلود هست.

**نکتهٔ KKTC:** در فیلد کشور/شهر اگر KKTC نبود، «Türkiye → Mersin/Gazimağusa» نگذارید؛ در توضیحات صادقانه بنویسید شرکت در KKTC ثبت است. رد شدن با اطلاعات نادرست قطعی‌تر از رد شدن به‌خاطر KKTC است.

## مرحلهٔ ۲ — آپلود مدارک و بررسی
1. Mağaza Paneli → **Destek & Kurulum → Belgeler** (یا لینک ایمیل) → هر مدرک را در جای خودش آپلود کنید.
2. قرارداد خدمات PayTR (Üye İşyeri Sözleşmesi) را الکترونیکی/امضا برگردانید.
3. بررسی معمولاً ۱–۵ روز کاری. نتیجه با ایمیل: **Onaylandı** یا **Onaylanmadı**.
4. اگر رد شد: Mağaza Paneli → **Destek** → تیکت بزنید: «KKTC’de kayıtlı şirketiz, web sitemiz tüm yasal metinlerle hazırdır, başvurumuzun yeniden değerlendirilmesini rica ederiz» + لینک سایت + لیست مدارک. تجربهٔ کاربران: اعتراض مؤدبانه گاهی جواب می‌دهد.
5. اگر باز رد شد → پلن B: **Tiko/Tikokart** (`tiko.com.tr`) یا **Paynet** (`paynet.com.tr`) که KKTC را می‌پذیرند؛ معماری ما آداپتری است.

## مرحلهٔ ۳ — دریافت کلیدها (توکن‌های فروشگاه)
بعد از تأیید:
1. Mağaza Paneli → **Destek & Kurulum → Entegrasyon Bilgileri** (`https://www.paytr.com/magaza/entegrasyon-bilgileri`).
2. سه مقدار را کپی کنید:
   - **Mağaza No** → `PAYTR_MERCHANT_ID`
   - **Mağaza Parola** → `PAYTR_MERCHANT_KEY`
   - **Mağaza Gizli Anahtar** → `PAYTR_MERCHANT_SALT`
3. این‌ها را **فقط** در متغیرهای محیطی سرور (Railway → Variables) بگذارید؛ هرگز در گیت یا فرانت‌اند.
4. در همان صفحه ماژول‌های آماده و لینک پک لوگوها هست (`PayTR_Gorselleri.zip`).

> «توکن» در PayTR دو معنی دارد: (۱) این سه کلید ثابت فروشگاه؛ (۲) `paytr_token`/`iframe token` که سرور ما با HMAC برای **هر تراکنش** می‌سازد — خودکار است (`paytr-api-reference.md §۲`).

## مرحلهٔ ۴ — تنظیمات پنل
1. **Ayarlar → Bildirim URL** → «Değiştir» → آدرس callback ما را وارد کنید:
   `https://<دامنه>/api/payments/paytr/callback`
   (باید HTTPS، عمومی، بدون لاگین باشد؛ فقط `OK` برمی‌گرداند.)
2. **Yönetim & Ayarlar → Taksit Ayarları**: تقسیط را ببندید یا محدود کنید (ما `no_installment=1` می‌فرستیم).
3. **Ayarlar → Mağaza Bilgileri**: نام نمایشی که روی صورت‌حساب کارت مشتری می‌آید را «BAZINO» بگذارید.
4. **Bildirimler**: ایمیل/SMS تراکنش‌ها را فعال کنید.

## مرحلهٔ ۵ — تست
1. در Railway: `PAYTR_MERCHANT_ID/KEY/SALT` + `PAYTR_TEST_MODE=1` + `PUBLIC_URL=https://<دامنه>`.
2. در سایت یک رزرو/خرید کنید → iFrame PayTR با پیام «İŞLEMİ TEST MODUNDA YAPIYORSUNUZ» باز می‌شود؛ کارت تستی خودکار پر است (یا: `4355 0843 5508 4358`، انقضا آینده، CVV `000`).
3. پرداخت را کامل کنید → باید به `/payment/success` بیایید و ظرف چند ثانیه وضعیت «تأیید شد» شود.
4. Mağaza Paneli → **İşlem & Döküm → İşlemler** → با ایمیل تست جست‌وجو کنید:
   - **Başarılı** = callback ما `OK` داده ✔
   - **Devam Ediyor** = Bildirim URL جواب نداده (آدرس غلط/HTTPS/لاگین/چیزی غیر از OK) ✖
5. یک پرداخت ناموفق و یک **İade** (بازگشت وجه) هم از پنل ادمین سایت تست کنید.

## مرحلهٔ ۶ — زنده‌کردن (Canlı Mod)
1. بعد از حداقل یک تست موفق: **Destek & Kurulum → Canlı Mod** → «Canlı moda geç».
2. در Railway: `PAYTR_TEST_MODE=0` → ری‌دیپلوی.
3. یک خرید واقعی کوچک (مثلاً ۵ TL) با کارت خودتان بزنید و بعد از پنل İade کنید.
4. تسویه: روز کاری بعد به IBAN؛ کارمزد در **Yönetim & Ayarlar → Komisyon Oranları**.

---

## چک‌لیست نهایی (تیک بزنید)
- [ ] اطلاعات شرکت + IBAN + ایمیل دامنه‌ای آماده
- [ ] مدارک اسکن‌شده
- [ ] سایت: صفحات قانونی، İletişim، لوگوها، قیمت TL، HTTPS
- [ ] پیش‌ثبت‌نام paytr.com → تأیید ایمیل/SMS
- [ ] مدارک آپلود، قرارداد امضا
- [ ] تأیید (یا اعتراض / پلن B)
- [ ] کلیدها در Railway Variables
- [ ] Bildirim URL در پنل
- [ ] تست موفق «Başarılı» در İşlemler
- [ ] Canlı Mod + `PAYTR_TEST_MODE=0`

## لینک‌ها
- ثبت‌نام: https://www.paytr.com/ · پنل: https://www.paytr.com/magaza
- کلیدها: https://www.paytr.com/magaza/entegrasyon-bilgileri · Bildirim URL: https://www.paytr.com/magaza/ayarlar · زنده: https://www.paytr.com/magaza/canli-mod · تراکنش‌ها: https://www.paytr.com/magaza/islemler · پشتیبانی: https://www.paytr.com/magaza/destek
- مستندات: https://dev.paytr.com/ · FAQ: https://dev.paytr.com/sikca-sorulan-sorular
- لوگوها: https://dev.paytr.com/sikca-sorulan-sorular/PayTR_Gorselleri.zip
