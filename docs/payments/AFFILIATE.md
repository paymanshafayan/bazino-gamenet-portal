# طرح همکاری در فروش بازینو (Affiliate Marketing)

> وضعیت: پیاده‌سازی‌شده روی هر سه پروایدر. نرخ‌ها **ردیف واقعی جدول `settings`** هستند (نه fallback اجرا). تست خودکار: Unit ۱۴، Database جداول+CRUD، API کلیک/چک‌اوت. Chromium واقعی در این batch اجرا نشد.

## ۱. محدوده

کمیسیون فقط روی **رزرو ایستگاه و ثبت‌نام تورنمنتِ پرداخت‌شده**. سفارش بوفه و فروشگاه مشمول نیست.

| رویداد | کلید تنظیمات (پیش‌فرض seed) |
|---|---|
| مشتری جدید — رزرو | `affiliate_new_pct` = **10** |
| مشتری بازگشتی — رزرو | `affiliate_return_pct` = **5** |
| تورنمنت | `affiliate_tournament_pct` = **10** |
| بالاسری سطح ۲ | `affiliate_override_pct` = **0** |
| پنجرهٔ انتساب (روز) | `affiliate_window_days` = **30** |
| حداقل نقد کیف پول (لیر) | `wallet_cashout_min_tl` = **0** |
| نقش‌های مستثنی | `affiliate_excluded_roles` = **admin** |
| طرح باز است | `affiliate_program_open` = **1** |

`seedAffiliateSettings` فقط کلید **غایب/خالی** را INSERT می‌کند؛ کلید موجود بازنویسی نمی‌شود. بوت سرور و `GET /api/admin/affiliate-settings` هر دو seed را صدا می‌زنند تا فیلد پنل خالی نماند. موتور `readAffiliateSettings` را می‌خواند.

نرخ سفارشی همکار: مقدار `≥ 0` جایگزین سراسری؛ `-1` یعنی ارث از تنظیمات.

## ۲. قیف و قوانین

1. کلیک `/?ref=CODE` → `localStorage` + `POST /api/affiliate/click` (تکرار همان IP+UA در ۱۵ دقیقه duplicate است، شمارش جدا نمی‌شود).
2. پس از لاگین `POST /api/affiliate/claim` انتساب را تا `window_days` می‌نویسد.
3. کد فرم رزرو/تورنمنت (`params.referralCode`، جدا از کوپن) بر کوکی اولویت دارد.
4. پرداخت قطعی (`onOrderPaid` بعد از checkout کیف پول یا settle حضوری) → کمیسیون `pending` تا `holdUntil` (= مهلت لغو: رزرو سانس−۱۰دقیقه، تورنمنت شروع−۴۸ساعت).
5. Sweep هر ۶۰ث (`approveDueCommissions` در wallet + affiliate routes) → `approved` سپس شارژ کیف پول نوع `commission` → `paid_out`.
6. لغو/ابطال سفارش → `onOrderReversed`؛ اگر قبلاً پرداخت شده باشد تلاش به `commission_reversal`؛ کسری کیف همکار → فلگ `reversal_failed` (سفارش مشتری معطل نمی‌ماند).
7. چک‌این رزرو → `onReservationAttended`.
8. خودمعرفی، نقش مستثنی، کد نامعتبر، طرح بسته: کمیسیون ساخته نمی‌شود.
9. عمق شبکه حداکثر ۲ سطح (والد نمی‌تواند خودش فرزند داشته باشد).

کد معرفی **کوپن تخفیف نیست**.

نقد کیف پول فقط حضوری: `POST /api/sync/wallet/cashout` از اپ مدیریت (نوع `CASHOUT` / `cashout`). انتساب حضوری: `POST /api/sync/affiliate/attach`.

## ۳. جدول‌ها (هر سه پروایدر)

- `affiliates` — کد، کاربر کیف پول، نرخ‌های سفارشی (−1=ارث)، والد، وضعیت
- `affiliate_clicks` — ipHash/uaHash (PII خام ذخیره نمی‌شود)
- `affiliate_attributions` — آخرین انتساب کاربر/بازدیدکننده
- `affiliate_commissions` — pending/approved/paid_out/reversed/rejected + holdUntil + flag
- `affiliate_audit`

نوع تراکنش کیف پول جدید: `commission`, `commission_reversal`, `cashout`.

## ۴. API

### عمومی
| متد | مسیر |
|---|---|
| POST | `/api/affiliate/click` `{code, path, visitorId}` |
| GET | `/api/affiliate/lookup?code=` |
| POST | `/api/affiliate/claim` `{code, visitorId}` (JWT اختیاری) |

### کاربر (JWT)
`GET /api/me/affiliate` — داشبورد همکار (کمیسیون‌ها بدون افشای غیرضروری).

### ادمین (`requireAdmin`)
- `GET/PUT /api/admin/affiliate-settings`
- `GET /api/admin/affiliates` و `GET /api/admin/affiliates/report`
- `GET/POST /api/admin/affiliates`, `PUT /api/admin/affiliates/:id`
- `POST /api/admin/affiliates/commissions/:id/approve|reject`

### Sync (کلید همگام / loopback)
- `POST /api/sync/wallet/cashout` `{phone, amount, operator, note, idempotencyKey}`
- `POST /api/sync/affiliate/attach` `{phone, code, operator}`

Checkout رزرو/تورنمنت فیلد `referralCode` را در `payload` نگه می‌دارد (جدا از `couponCode`).

## ۵. UI

- `/admin/affiliates` — اعداد طرح از جدول settings، ثبت همکار، فهرست+گزارش کل، جزئیات/زیرمجموعه
- `/profile/affiliate` — لینک، قیف، کمیسیون‌ها
- `/legal/affiliate` — متن ۴زبانه، مستقل از قالب
- فیلد کد معرفی در رزرو و تورنمنت (`data-referral-code`)
- اپ مدیریت: دکمهٔ «نقد حضوری» + فیلد کد معرفی walk-in

## ۶. فایل‌ها

```
server/affiliate/settings.ts   seed + read
server/affiliate/engine.ts     click/claim/paid/reverse/attend/approve/stats
server/affiliate/routes.ts     HTTP
server/wallet/routes.ts        هوک onOrderPaid / onOrderReversed + sweep
server.ts                      seed بوت، checkin، paymentQuote.referralCode
src/utils/affiliateCapture.ts
src/components/AdminAffiliatesSection.tsx
src/components/profile/ProfileAffiliate.tsx
```

## ۷. تست‌نشده / محدودیت

- اجرای واقعی SQL Server و Mongo (فقط شکل کوئری/اینترفیس).
- Chromium واقعی این batch.
- تخلف کلیک از چند دستگاه با VPN تشخیص داده نمی‌شود (فقط hash IP+UA در ۱۵ دقیقه).
