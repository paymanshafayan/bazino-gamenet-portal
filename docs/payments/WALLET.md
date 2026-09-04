# کیف پول بازینو و پرداخت در محل (تسک ۱۳)

> وضعیت: پیاده‌سازی‌شده و تست‌شده روی SQLite (سوئیت‌های API ۳۵، Unit ۱۳، UI ۳۹). درگاه آنلاین PayTR **حذف نشده** — فقط با پرچم محیطی خاموش است.

## ۱. خلاصهٔ سیاست پرداخت

| بخش | روش‌های مجاز | قانون پرداخت در محل |
|---|---|---|
| رزرو ایستگاه | کیف پول **یا** پرداخت در محل | باید حداقل **۱۰ دقیقه قبل از شروع سانس** در کلاب حاضر شده و پرداخت کنید؛ وگرنه رزرو خودکار باطل می‌شود |
| ثبت‌نام تورنمنت | کیف پول **یا** پرداخت در محل | باید حداقل **۴۸ ساعت قبل از شروع تورنمنت** حضوری پرداخت کنید؛ وگرنه ثبت‌نام خودکار باطل می‌شود |
| بوفه | فقط پرداخت در محل | سفارش «در انتظار» ثبت می‌شود؛ هنگام تحویل تسویه می‌شود؛ امتیاز پس از تأیید |
| فروشگاه | فقط پرداخت در محل | کالا در کلاب تحویل و تسویه می‌شود؛ امتیاز پس از تأیید |

- واحد پول: **TL**. امتیاز باشگاه: مبلغ ÷ ۱۰ (مثل قبل).
- موجودی کیف پول **هرگز منفی نمی‌شود** (بررسی اتمیک هنگام ثبت هر تراکنش؛ خطای `INSUFFICIENT_FUNDS` با HTTP 402).
- شارژ کیف پول **فقط حضوری** (اپ مدیریت / پنل ادمین سایت). هیچ درگاه آنلاینی استفاده نمی‌شود.
- منبع حقیقتِ موجودی: **سرور سایت**. اپ مدیریت فقط آینه است و از طریق API sync می‌نویسد.
- پرداخت با کیف پول برای رزرو/تورنمنت **فوراً** رزرو/ثبت‌نام را قطعی می‌کند و امتیاز می‌دهد.
- لغو توسط کاربر قبل از مهلت: سفارش حضوری → آزاد شدن جا؛ سفارش کیف‌پولی → **بازگشت کامل وجه** به کیف پول.

## ۲. معماری

```
server/wallet/routes.ts        ← همهٔ مسیرهای کیف پول/در محل + قواعد مهلت + sweep ابطال خودکار
server/dataProviders.ts        ← جدول‌های wallet_transactions و onsite_orders (SQLite / SQL Server / Mongo)
server/payments/paytr.ts       ← isOnlinePaymentEnabled(): درگاه فقط با PAYMENT_ONLINE_ENABLED=1
server.ts                      ← paymentFulfil (پرچم‌های __noPoints / __pointsOnly) و paymentUnfulfil (آزادسازی جا/refund)
src/legal/CheckoutModal.tsx    ← مودال انتخاب روش (مستقل از قالب؛ createPortal روی body)
src/components/profile/ProfileWallet.tsx   ← تب «کیف پول» پروفایل (/profile/wallet)
src/components/AdminWalletSection.tsx      ← بخش «کیف پول و پرداخت حضوری» ادمین (/admin/wallet)
Management App/Bazino/src/utils/walletSync.ts      ← صف آفلاین + idempotency + توابع sync
Management App/Bazino/src/components/WebWalletPanel.tsx ← فهرست سفارش‌های حضوری + تأیید/لغو + ارسال صف
```

### جدول‌ها

`wallet_transactions(id, username, amount, type[topup|purchase|refund|adjust], ref, operator, note, idempotencyKey UNIQUE, balanceAfter, createdAt)`
— دفتر کل append-only؛ `balanceAfter` هر ردیف موجودی بعد از تراکنش است؛ `users.walletBalance` کش است.

`onsite_orders(id, kind, username, amount, status, dueAt, payload, description, result, createdAt, updatedAt, settledAt, settledBy)`
— هر سفارشِ «در محل» و همچنین رکورد سفارش‌های کیف‌پولی (`WL-…`, status=settled, settledBy=wallet) برای امکان لغو/بازگشت وجه.

وضعیت‌ها: `pending_onsite` → `settled` | `cancelled_unpaid` (گذشت مهلت) | `cancelled_user` | `cancelled_admin`.

### ابطال خودکار

`expireOnsiteOrders` هر ۶۰ ثانیه + هنگام خواندن فهرست‌ها اجرا می‌شود: هر سفارش `pending_onsite` که `dueAt` آن گذشته → `cancelled_unpaid` و `paymentUnfulfil` (حذف رزرو / حذف تیم از تورنمنت). بوفه/فروشگاه مهلت ندارند (`dueAt=''`).

## ۳. API

### عمومی / کاربر (JWT)
| متد | مسیر | توضیح |
|---|---|---|
| GET | `/api/payments/methods` | `{online, currency, methods:{kind:[...]}, onsiteLeadMinutes:{reservation:10, tournament:2880}}` — با `PAYMENT_ONLINE_ENABLED=1` گزینهٔ `online` هم اضافه می‌شود |
| GET | `/api/me/wallet` | `{balance, currency, transactions[]}` |
| GET | `/api/me/onsite-orders` | سفارش‌های کاربر (همهٔ وضعیت‌ها) |
| POST | `/api/checkout/wallet` `{kind, params}` | کسر از کیف پول + انجام فوری. خطاها: 402 `INSUFFICIENT_FUNDS` (با `balance`)، 400 `METHOD_NOT_ALLOWED` (بوفه/فروشگاه) |
| POST | `/api/checkout/onsite` `{kind, params}` | ثبت در انتظار. پاسخ `{orderId:'OS-…', status:'pending_onsite', dueAt, startsAt}`. خطا 400 `ONSITE_TOO_LATE` وقتی `now > start − lead` |
| POST | `/api/checkout/onsite/:id/cancel` | لغو توسط کاربر (فقط رزرو/تورنمنت). pending → آزادسازی؛ کیف‌پولی قبل از مهلت → `refunded` |

`params` همان ورودی مسیرهای قبلی است: رزرو `{systemId,startTime,endTime,date,couponCode}`، تورنمنت `{tournamentId, team:{name,leader,members}}`، بوفه `{items,couponCode,tableNumber}`، فروشگاه `{cart,couponCode}`.

### Sync (اپ مدیریت — `Authorization: Bearer <sync API key>`؛ loopback بدون کلید)
| متد | مسیر | توضیح |
|---|---|---|
| POST | `/api/sync/wallet/topup` `{phone, amount, operator, note, idempotencyKey}` | شارژ حضوری. شماره نرمال می‌شود (+90 پیش‌فرض؛ تطبیق ۱۰ رقم آخر برای رکوردهای قدیمی)؛ اگر کاربر نباشد ساخته می‌شود. کلید تکراری → `{duplicate:true}` بدون اثر |
| POST | `/api/sync/wallet/charge` | برداشت حضوری (مثلاً خرید بوفه با کیف پول در کلاب)؛ 402 اگر کافی نباشد |
| GET | `/api/sync/wallet/:phone` | موجودی + ۱۰۰ تراکنش آخر |
| GET | `/api/sync/onsite-orders?status=pending_onsite` | فهرست برای تأیید حضوری |
| POST | `/api/sync/onsite-orders/:id/settle` `{method: cash|pos|wallet, operator}` | تسویه؛ بوفه/فروشگاه همین‌جا واقعاً ثبت می‌شوند (کسر موجودی انبار + امتیاز)؛ رزرو/تورنمنت فقط امتیاز می‌گیرند |
| POST | `/api/sync/onsite-orders/:id/cancel` | لغو توسط پرسنل |

### ادمین (JWT ادمین)
`GET /api/admin/wallet/transactions`, `GET /api/admin/wallet/:username`, `POST /api/admin/wallet/adjust {username|phone, amount(±), note}`, `GET /api/admin/onsite-orders[?status=]`, `POST /api/admin/onsite-orders/:id/settle|cancel`.

## ۴. درگاه آنلاین (PayTR) — خاموش ولی حذف‌نشده

- `PAYMENT_ONLINE_ENABLED` (پیش‌فرض خاموش). بدون آن `readPaytrConfig()` همیشه `null` است حتی اگر کلیدها تنظیم باشند؛ `/api/payments/config` → `{enabled:false, onlineDisabled:true}`؛ `/api/payments/paytr/create` → 503.
- برای فعال‌سازی دوباره: `PAYMENT_ONLINE_ENABLED=1` + کلیدهای `PAYTR_*` (رجوع به `PAYTR.md`). مودال پرداخت خودش گزینهٔ «پرداخت آنلاین» را اضافه می‌کند و به `PaymentCheckout` قبلی می‌رود.
- پنل ادمین (`/admin/legal` و `/admin/wallet`) وضعیت «موقتاً غیرفعال» را نشان می‌دهد؛ فوتر به‌جای نشان‌های کارت متن «کیف پول / پرداخت در محل» می‌گذارد.
- سوئیت تست ۱۷ (PayTR mock) با `PAYMENT_ONLINE_ENABLED=1` اجرا می‌شود تا مسیر درگاه همچنان تست‌شده بماند.

## ۵. اپ مدیریت

- هر شارژ/برداشت در «اعضا و کیف پول» علاوه بر ثبت محلی، به صف `bazino_wallet_sync_queue` (localStorage) اضافه و بلافاصله ارسال می‌شود. در قطعی اینترنت در صف می‌ماند؛ با رویداد `online` یا باز شدن تب دوباره ارسال می‌شود. هر آیتم `idempotencyKey` ثابت دارد (`mgmt-<uuid>`) → ارسال چندباره بی‌خطر.
- `BONUS_DISCOUNT` (اعتبار هدیهٔ محلی) به سایت ارسال نمی‌شود.
- پنل «پرداخت‌های حضوریِ سایت» بالای فهرست اعضا: سفارش‌های pending با مهلت، دکمه‌های نقدی/کارت/کیف پول/لغو، و شمارندهٔ صف.
- تنظیم آدرس سرور و کلید API مثل قبل در «همگام‌سازی وب».

## ۶. متن‌های اعلام‌شده به کاربر (۴ زبان در `CheckoutModal.onsiteRuleText`)

- رزرو: «برای رزرو ایستگاه باید حداقل ۱۰ دقیقه قبل از شروع سانس در محل حاضر شده و هزینه را حضوری پرداخت کنید؛ در غیر این صورت رزرو به‌صورت خودکار باطل می‌شود.»
- تورنمنت: «برای ثبت‌نام تورنمنت باید حداقل ۴۸ ساعت قبل از شروع تورنمنت هزینه را حضوری پرداخت کنید؛ در غیر این صورت ثبت‌نام به‌صورت خودکار باطل می‌شود.»
- کاربر باید قبل از ثبت حضوری تیک «قانون را خوانده‌ام» را بزند؛ پس از ثبت، مهلت دقیق (تاریخ/ساعت) در نوتیفیکیشن و تب کیف پول نمایش داده می‌شود.

## ۷. تست‌نشده / محدودیت‌ها

- SQL Server و Mongo فقط از نظر شکل کوئری/تطابق اینترفیس تست شده‌اند (سوئیت providers)؛ اجرای واقعی روی آن‌ها نه.
- زمان‌بندی مهلت‌ها بر اساس ساعت سرور و تاریخ‌های رشته‌ای سایت («امروز»/«فردا»/جلالی/ISO) است؛ اگر رزرو تاریخ دیگری ذخیره کند باید `parseSiteDate` را گسترش داد.
- انتقال بین کاربران و انقضای اعتبار خارج از محدوده است.
