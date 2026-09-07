# انتخاب رویدادهای Zernio و معماری ناشر قابل‌تعویض

تاریخ: **۱۴۰۵/۰۶/۱۶ — 2026-09-07**
وضعیت: **طراحی و پیشنهاد تنظیمات؛ نه اعلام تغییر وب‌هوک، پیاده‌سازی یا انتشار واقعی**.
مرجع مکمل: [پلن افیلیت، نسخهٔ ۲](../payments/INSTAGRAM_MEDIA_ONLY_PLAN.md) و [اصل سند کاربر](../payments/INSTAGRAM_AFFILIATE_DESIGN.md).

کاربر خواسته است امروز Manus فقط شناسهٔ رسانهٔ منتشرشده را اعلام کند، ولی بعداً انتشار از پنل خود بازینو با Zernio انجام شود؛ تغییر ناشر نباید موجب بازنویسی Friend Gate، کد، لینک، کوپن و کمیسیون شود. طراحی به وضعیت تجاری/مالکیت هیچ ارائه‌دهنده‌ای متکی نیست و دربارهٔ خبرهای مربوط به Manus/Meta در این بررسی ادعای تأیید نمی‌شود.

## ۱. فهرست تیک‌های وب‌هوک اصلی — ۲۳ رویداد

URL اصلیِ اعلام‌شدهٔ کاربر ثابت است:

```text
https://bazino.pro/api/webhooks/zernio
```

تیک‌های زیر **پیشنهاد برای اعمال در داشبورد** هستند، نه اینکه این نشست آن‌ها را فعال کرده باشد. هدف، پوشش انتشار/تعامل اینستاگرام با حذف سرویس‌های نامرتبط است؛ انتخاب همهٔ رویدادها، عملکرد بهتر ایجاد نمی‌کند.

### Posts — این ۹ مورد

- [x] `post.scheduled`
- [x] `post.published`
- [x] `post.failed`
- [x] `post.partial`
- [x] `post.cancelled`
- [x] `post.recycled`
- [x] `post.platform.published`
- [x] `post.platform.failed`
- [x] `post.platform.deleted`

### External Posts — هر ۳ مورد

- [x] `post.external.created`
- [x] `post.external.updated`
- [x] `post.external.deleted`

### Accounts — این ۲ مورد

- [x] `account.connected`
- [x] `account.disconnected`

### Messages — این ۷ مورد

- [x] `message.received`
- [x] `message.sent`
- [x] `message.edited`
- [x] `message.deleted`
- [x] `message.read`
- [x] `reaction.received`
- [x] `referral.received`

### Conversations

- [x] `conversation.started`

### Comments

- [x] `comment.received`

### فعلاً روی وب‌هوک اصلی تیک نخورند

| گروه | انتخاب‌های خاموش در این مرحله | علت |
|---|---|---|
| Posts | `post.tiktok.url_resolved` | TikTok جزو دامنهٔ فعلی نیست |
| Accounts | `account.ads.initial_sync_completed` | همگام‌سازی تبلیغات، نه انتشار ارگانیک/افیلیت فعلی |
| Analytics | `analytics.synced` | در اشتراک جداگانهٔ آمار؛ بخش ۲ |
| Messages | `message.delivered`، `message.failed` | برای اینستاگرامِ فعلی مبنای قابل‌اتکای تحویل/خطا نیستند؛ بخش ۳. در صورت افزودن کانال پشتیبان، از تنظیمات همان کانال فعال شوند |
| Calls | `call.received`، `call.ended`، `call.failed`، `call.permission_request` | تماس تلفنی در دامنه نیست |
| Reviews | `review.new`، `review.updated` | بررسی/امتیاز کسب‌وکار جزو این فلو نیست |
| Ads | `ad.status_changed`، `lead.received` | اتوماسیون تبلیغات و فرم لید در دامنه نیست؛ lead سایت از مسیر خودش ثبت می‌شود |
| WhatsApp | `whatsapp.template.status_updated`، `whatsapp.template.category_updated`، `whatsapp.account.name_status_updated`، `whatsapp.number.activated`، `whatsapp.number.declined`، `whatsapp.number.action_required`، `whatsapp.automatic_event`، `whatsapp.number.verification_required`، `whatsapp.number.suspended`، `whatsapp.number.reactivated`، `whatsapp.number.released`، `whatsapp.number.kyc_submitted` | راه‌اندازی واتساپ جزو این تغییر نیست |
| Phone Numbers | `phone_number.stock_available` | خرید/موجودی شماره تلفن در دامنه نیست |
| Verify | `verification.approved`، `verification.failed` | وضعیت فرایند verification ارائه‌دهنده؛ نه اثبات Follow/Like دوست |

بدنهٔ رویدادها همچنان بر اساس حساب/کانال/رسانه/کار انتشار خودمان فیلتر می‌شود؛ انتخاب یک event type به معنی مجوز پردازش تمام حساب‌های workspace نیست. `post.recycled` فقط پایش رویداد را فعال می‌کند، نه مجوز انتشار تکراری یا عبور از تأیید batch.

## ۲. آمار در اشتراک و صف جدا

پس از استقرار مسیر آمار، یک subscription جدا با **فقط** `analytics.synced` پیشنهاد می‌شود. نشانی برنامه‌ریزی‌شده (هنوز مستقر/تأیید نشده):

```text
POST https://bazino.pro/api/webhooks/zernio/analytics
```

در راهنمای رسمی، `analytics.synced` پس از همگام‌سازی موفق هر حساب رخ می‌دهد، خود metricها را حمل نمی‌کند و برای حجم بالا endpoint/اشتراک جدا توصیه شده است؛ شمار شکست متوالیِ subscription بین رویدادهای همان subscription مشترک است. دریافت سریع و خواندن delta خارج از درخواست انجام شود. منبع خوانده‌شده در این نشست: https://docs.zernio.com/webhooks/analytics .

طراحی:

1. HMAC و اعتبار حساب → ثبت پایدار → پاسخ سریع؛ آمار در HTTP handler واکشی نشود.
2. baseline یک‌بار و سپس `/v1/analytics/delta` با cursor؛ دسترسی معتبر Analytics شرط خواندن داده است، نه صرف تیک webhook.
3. cursor فقط بعد از ذخیرهٔ موفق صفحه پیش برود. طبق راهنما، صفحهٔ خالیِ فوری ممکن است ناشی از تأخیر materialized view باشد؛ همان cursor با backoff دوباره خوانده شود، نه اینکه تغییرات جا بیفتند.
4. cursor/feed و حساب‌های مجاز مشخص باشند؛ دادهٔ خارج از حساب‌های متعلق به این پروژه ذخیره/نمایش نشود. درخواست‌های هم‌پوشان ادغام و cache به‌صورت محدود باطل شود.
5. صف آمار/اکتشاف کم‌اولویت باشد تا موج backfill یا کندی Analytics، صف کامنت/دکمه را اشغال نکند.
6. اشتراک آمار ترجیحاً Secret مستقل داشته باشد؛ نام پیشنهادی جدید **`ZERNIO_ANALYTICS_WEBHOOK_SECRET`** در هاست یا رکورد رمزگذاری‌شدهٔ متناظر پنل. Secret اصلی فعلی تغییر نمی‌کند. مسیر/کلید جدید هنوز کد نشده و ساخت اشتراک دوم قبل از آماده‌شدن receiver لازم نیست.

تفکیک صف/اشتراک، اثر خطای آمار بر فلو تعاملی را محدود می‌کند؛ قطع مشترک دیتابیس/هاست همچنان می‌تواند هر دو را تحت تأثیر قرار دهد و تضمین جداسازی کامل زیرساخت داده نمی‌شود.

## ۳. معنی رویدادها؛ از آن‌ها چه چیزی استنباط نمی‌کنیم؟

- **انتشار هر مقصد:** `post.platform.published/failed/deleted` برای وضعیت همان مقصد؛ `post.published/partial/failed` جمع‌بندی همان کار انتشار است. رسیدن هر دو دسته نباید دوبار رسانه/عضویت بسازد. موفقیت Instagram و شکست مقصد دیگر به‌صورت مستقل نگه‌داری شود. [1](https://docs.zernio.com/changelog)
- **External Posts:** رویدادهای رسانه‌هایی هستند که مستقیماً روی پلتفرم و خارج از انتشار Zernio ایجاد/ویرایش/حذف شده‌اند؛ طبق Changelog کشف آن‌ها sync-based و حدوداً ساعتی است، نه تضمین real-time. بنابراین جای اعلام فوری Manus یا نتیجهٔ انتشار خودمان را نمی‌گیرند. [1](https://docs.zernio.com/changelog)
- **کشف ≠ تأیید کمپین:** `post.external.created` فقط رکورد `discovered/needs_review` می‌سازد؛ حتی اگر پست قدیمی هنگام اتصال/بازتطبیق ظاهر شود، خودش مجوز PR یا افیلیت نیست. تأیید ادمین یا اثبات تعلق به کار انتشار مصوب لازم است.
- **حذف رسانه:** ورود/پردازش تازهٔ وابسته به آن متوقف و مدیر مطلع شود؛ دادهٔ انتساب، کوپن‌های صادرشده و سوابق مالی پاک یا خودکار برگشت داده نشوند. تعهدات قبلی طبق policy خودشان رسیدگی شوند.
- **تحویل/خطای پیام:** Changelog صریحاً می‌گوید Instagram رسید تحویل مستقل نمی‌دهد؛ read از سیگنال seen می‌آید. `message.failed/delivered` در کانال‌هایی مانند SMS/WhatsApp و وضعیت‌های پشتیبانی‌شده کاربرد دارند. برای Instagram، نتیجهٔ API، state گفتگو و reconciliation مبناست؛ نبود callback یا read به معنی موفقیت/شکست/عدم مشاهدهٔ قطعی نیست. [1](https://docs.zernio.com/changelog)
- **reaction.received:** واکنش به پیام است؛ Like پست یا اثبات Share/Follow نیست. فقط به‌عنوان تعامل مکالمه ثبت شود. [1](https://docs.zernio.com/changelog)
- **referral.received:** context ارجاع Meta به گفتگو را می‌رساند، از جمله وقتی بازشدن thread پیام تازه تولید نمی‌کند. کلیک Affiliate روی سایت، Paid یا حق کمیسیون از آن استنباط نمی‌شود؛ tracker و دفتر مالی سایت مستقل‌اند. [1](https://docs.zernio.com/changelog)
- **message.edited/deleted:** فقط وضعیت متن/حذف و نگه‌داری حداقلیِ حریم خصوصی؛ بازکردن دوبارهٔ Gate، ارسال مجدد پیام و برگشت مالی خودکار مجاز نیست.
- **account.connected/disconnected:** سلامت/هویت اتصال و توقف/بازیابی کارهای همان حساب. نبود رویداد disconnect دلیل سلامت قطعی نیست؛ jobهای گیرکرده و خطاهای API باید نیز دیده شوند. بازاتصال به ID متفاوت بدون بررسی، مجوز انتقال خودکار داده به حساب دیگر نیست.

## ۴. معماری؛ یک هسته با ناشر قابل‌تعویض

```text
تولید محتوا: Manus / دستی / مولد دیگر
                  ↓
Content Service موجود → نسخهٔ محتوا + preview + تأیید batch
                  ↓
         Publishing Service / Publication Job
             ┌─────────────┴─────────────┐
   External Publisher Adapter      Zernio Publisher Adapter
   (امروز: Manus، فقط media_id)    (پنل بازینو → API رسمی انتشار)
             └─────────────┬─────────────┘
                    Normalized Publication
                            ↓
                 Published Media Registry
                            ↓
      Comment/Message Router → Affiliate Engine → Friend Gate / Coupon / Finance
```

### جداسازی‌های ضروری

1. **تولید از انتشار:** نبود Manus نباید دریافت webhook، انتشار محتوای دستی/موجود یا افیلیت را متوقف کند. انتخاب مولد متن/رسانه مستقل از ناشر است؛ Zernio به‌عنوان جایگزین خودکار همهٔ قابلیت‌های تولید Manus فرض نمی‌شود.
2. **ناشر از دامنهٔ افیلیت:** موتور افیلیت فقط «رسانهٔ واقعاً منتشرشده و مصوب» را می‌بیند؛ نمی‌داند Manus آن را ساخته یا بک‌اند با Zernio منتشر کرده است.
3. **دستور از اعلان:** webhook وضعیت را اعلام می‌کند؛ اجازهٔ ایجاد یک انتشار جدید/تغییر Secret/فعال‌سازی کمپین نیست. commandهای انتشار فقط از content version و approval معتبر می‌آیند.
4. **وضعیت کانال از وضعیت کل کار:** یک Publication می‌تواند چند مقصد داشته باشد؛ موفقیت/شکست هر مقصد، شناسه و زمان خودش را دارد.
5. **IDهای داخلی از بومی:** `contentId`, `publicationId`, `zernioPostId`, `providerAccountId`, `instagramMediaId`, `commentId`, `authorId` مستقل‌اند و همگی رشته. در schema بیرونی، `post.id`ِ ExternalPost شناسهٔ بومی است، ولی در رویدادهای انتشار Zernio ممکن است ID داخلی باشد؛ adapter اختصاصی هر خانواده تفسیر می‌کند، نه یک قانون عمومی `post.id`.

### قرارداد دادهٔ مشترک پیشنهادی

| مفهوم | فیلد/معنا |
|---|---|
| محتوا و تأیید | contentId، contentVersion، approvalId، policyVersion |
| اجرای انتشار | publicationId، occurrenceId، publishingOwner، attemptId، وضعیت |
| منبع تولید | generationProvider = manus / manual / other |
| ناشر | publishingProvider = external / zernio / adapter بعدی |
| منبع ثبت رسانه | registrationSource = manus_ingest / zernio_publication / external_discovery / admin |
| هویت مقصد | canonicalAccountId، providerAccountId، platform |
| هویت رسانه | providerPostId جدا از platformMediaId؛ URL فقط دادهٔ نمایشی است، نه کلید هویت |
| صلاحیت کمپین | campaignId، active، approval/state، زبان‌های مجاز و policy snapshot |

ثبت/به‌روزرسانی رسانه با کلید یکتای account + platform + native media id انجام شود؛ رسیدن اعلام Manus و webhook انتشار/اکتشاف برای همان رسانه، فقط یک رکورد را تکمیل کند. دادهٔ جدید نتواند approval یا منشأ معتبر قدیمی را بی‌صدا overwrite کند.

شرط افیلیت در نسخهٔ ۲:

```text
signatureValid
AND expectedInstagramAccount
AND webhookNativeMediaId == approvedRegistryNativeMediaId
AND media.active AND campaign.active AND policy.ready
```

در حالت Manus، registry از ingest مجاز او پر می‌شود؛ در حالت Zernio، از نتیجهٔ قطعیِ کار انتشار مصوب خودمان. عبارت «حتماً باید Manus ثبت کرده باشد» از هستهٔ افیلیت حذف می‌شود، اما **شرط مجازبودن رسانه ضعیف نمی‌شود**.

## ۵. انتشار مستقیم با Zernio؛ آماده ولی بدون تغییر خودکار حالت فعلی

- Publishing Service روی `server/management/content.ts` و صف/تأیید فعلی ساخته می‌شود؛ پنل، دیتابیس یا CMS موازی اضافه نمی‌شود.
- آداپتور Zernio از API رسمی انتشار `POST /v1/posts` و وضعیت همان post استفاده می‌کند. ارسال به `zernio_publish_webhook` دلخواهِ کد فعلی جای این قرارداد رسمی نیست؛ **URL گیرندهٔ وب‌هوک بازینو، API انتشار نیست**.
- content snapshot تأییدشده، account/channel و occurrence قبل از اولین ارسال ثابت شوند. یک مالک زمان‌بندی/ارسال برای هر job؛ هم backend و هم زمان‌بند provider مستقلاً همان محتوا را منتشر نکنند.
- پس از پاسخ پذیرش API، `submitted/scheduled` ثبت شود، نه published قطعی. تنها رسید/استعلام معتبر با native Media ID، همان مقصد را published می‌کند؛ رویداد کل و رویداد کانال از دفتر مشترک عبور کنند.
- API idempotency فقط در جاهایی استفاده شود که provider واقعاً پشتیبانی می‌کند؛ claim داخلی به‌تنهایی exactly-once خارجی تضمین نمی‌کند. timeout نامشخص → تطبیق/استعلام، نه انتشار مجدد یا failover خودکار به ناشر دیگر.
- رویدادهای دیررس/بی‌ترتیب با شناسهٔ attempt/occurrence و وضعیت معتبر تطبیق شوند؛ یک failed قدیمی نباید published جدید را خراب کند. در ابهام، snapshot API کار شناخته‌شده reconciliation می‌شود.
- `post.recycled` اجرای/زمان‌بندی تکرار را ردیابی می‌کند؛ فعال‌سازی recurrence نیازمند policy مصوب مستقل است و هیچ کدام از تأییدهای batch سه‌تایی خودکار تکرار نمی‌شوند.
- ثبت رسانه از `post.platform.published` فقط وقتی به job/account/campaign مصوب خودمان متصل است مجاز است؛ انتشار دستی در داشبورد Zernio که job شناخته‌شده ندارد، ابتدا discovered/needs_review است.

## ۶. مسیر مهاجرت بدون بازنویسی افیلیت

1. در اجرای پلن نسخهٔ ۲، قرارداد مشترک، dispatcher رویدادها، registry چندمنبعی و آداپتور انتشار مستقیم، همراه تست، آماده شوند؛ **حالت عملیاتی پیش‌فرض external/Manus باقی بماند**.
2. پنل ادمین گزینهٔ ناشر external یا Zernio را برای کارهای جدید داشته باشد؛ کلید API/مجوز publishing و پیش‌نمایش محتوا بررسی شود. آمار/وب‌هوک‌تیک‌ها به‌خودی‌خود این مجوزها را ایجاد نمی‌کنند.
3. یک batch آزمایشیِ مشخص با تأیید صریح از Zernio منتشر و دریافت ID/وضعیت آن بررسی شود؛ سپس انتخاب پیش‌فرض ناشر عوض شود.
4. کارهای درحال‌اجرای Manus تا تعیین نتیجه روی همان publishingOwner بمانند؛ تغییر تنظیمات، همان job را برای ناشر دوم کپی نکند. اعلام‌های دیررس پذیرفته/تطبیق شوند ولی انتشار دوم ایجاد نکنند.
5. پس از drain کارهای قدیمی، توکن ingest Manus غیرفعال/باطل شود؛ داده‌های شریک، کد، لینک، کوپن، انتساب و کمیسیون دست نخورند.
6. بازگشت به ناشر قبلی نیز فقط برای jobهای جدید/تعیین‌تکلیف‌شده باشد. این معماری نیاز به **بازطراحی هسته** را کم می‌کند؛ تغییر احتمالی API یا مجوزهای آینده ممکن است همچنان اصلاح همان آداپتور را لازم کند.

## ۷. عملکرد و تحمل خطا

- endpoint فقط محدودیت اندازه/schema، HMAC، اعتبار هویت و ثبت اتمیک انجام دهد؛ تأیید قبل از ذخیرهٔ پایدار یا fetch سنگین داخل HTTP ممنوع.
- inbox/dedup مشترک برای event id + account/source + hash؛ dispatcher نسخه‌دار برای Post / External / Account / Message / Comment / Analytics. schema هر خانواده جداست؛ global post event لزوماً فیلد account در ریشه ندارد و مالکیت از job/targets معتبر استخراج می‌شود.
- صف کامنت/دکمه اولویت بالا؛ وضعیت انتشار متوسط؛ backfill و analytics کم‌اولویت و با هم‌زمانی محدود. route/اشتراک و circuit خطای آمار جدا؛ همه در همان backend و دیتابیس موجود قابل اجراست، نه نیاز اجباری به Redis/Kafka یا سرویس جدید.
- analytics invalidation و کارهای تکراری ادغام شوند؛ delta cursor، lease و backoff برای جلوگیری از polling پرهزینه. external syncِ کند، در مسیر بحرانی شروع کمپین نباشد.
- رویداد ناشناخته یا کانال خارج از scope، ثبت حداقلی/ignored و بدون اثر تجاری؛ پیام کنترل‌نشده در webhook به فرمان تولید/انتشار تبدیل نشود.
- مانیتورینگ: زمان acknowledge، عمق/سن صف، دیرکرد پیام، duplicate، invalid signature، unknown delivery، jobهای گیرکرده و cache lag؛ اعداد کارایی تنها پس از تست گزارش شوند.
- خاموش‌شدن حساب، ارسال/انتشار جدید همان حساب را متوقف کند؛ فقدان رویداد disconnect با سلامت اشتباه نشود. حالت دریافت/آزمایش و kill switch مستقل از انتخاب ناشر باقی بمانند.

## ۸. تست‌های افزوده به پلن افیلیت

1. همان media از Manus و از Zernio، با approval معتبر، به **همان نتیجهٔ افیلیت** برسد؛ بدون Manus نیز partner-code/friend-link/coupon کار کند.
2. external.created و backfillِ ناشناس هیچ رسانه‌ای را خودکار برای کمپین مجاز نکنند؛ post.updated هم approval جدید نسازد.
3. post.platform.published و post.published برای یک مقصد، فقط یک registry entry بسازند؛ Instagram موفق + مقصد دیگر ناموفق، نتیجهٔ per-channel درست بدهد.
4. زرنيو post ID داخلی با Instagram Media ID اشتباه نشود؛ schema خانواده‌های مختلف و account/accountId/targets واقعی تست شوند.
5. webhook تکراری، پیام دیررس، failed قدیمی، تغییر ناشر و timeout نامشخص، انتشار/پیام تکراری نسازند.
6. delete رسانه و disconnect حساب، ثبت تازه را مهار کنند ولی سوابق مالی/کوپن معتبر را پاک نکنند؛ reconnect هویت دیگر جای حساب قدیمی ننشیند.
7. reaction/read/referral/context گفتگو هیچ Gate، Like/Share قطعی، کلیک سایت یا کمیسیون نسازند.
8. نبود receipt برای Instagram، delivered/failed ساختگی نسازد؛ خطای واقعی API از نبود callback جدا گزارش شود.
9. در موج synthetic external/analytics، صف کامنت/دکمه starvation نگیرد؛ acknowledge فقط پس از نوشتن پایدار و پیش از fetch خارجی باشد.
10. analytics cursor با صفحهٔ خالیِ زودهنگام/خطای ذخیره پیش نرود؛ دادهٔ حساب خارج از scope ذخیره/نمایش نشود.
11. snapshot تأییدنشده، با تغییر ناشر، post.recycled یا خود webhook به انتشار واقعی تبدیل نشود؛ API پنل پشت مجوز ادمین بماند.
12. تمام قواعد نسخهٔ قبلی پابرجا: چهار زبان، یک PR، کد فقط برای همکار، لینک فقط برای دوست، Gate صادقانه، کوپن اختصاصی و مالی مرجع. آزمون‌های وب/مدیریت/Chromium و استقرار واقعی جدا از تست mock ثبت شوند.

## ۹. مرز بررسی و منابع

در این نوبت فقط مستندات رسمی و کد فعلی خوانده و طراحی به‌روز شد؛ هیچ API Key، subscription، کد محصول، حساب، انتشار یا تنظیم هاست تغییر نکرد. گزارش یا تأیید خبر معاملهٔ Manus/Meta انجام نشد. قواعد commit/push خودکار اسناد روی شاخهٔ جلسه رعایت می‌شوند.

- Changelog رسمی برای per-platform/external events، عدم receipt اینستاگرام، referral و reaction: [1](https://docs.zernio.com/changelog).
- راهنمای رسمی Analytics webhooks، از جمله delta و پیشنهاد جداسازی subscription: https://docs.zernio.com/webhooks/analytics .
- راهنمای Account webhooks و محدودیت تشخیص disconnect: https://docs.zernio.com/webhooks/accounts .
- مدل‌های SDK رسمی از GitHub با `gh api` خوانده شدند: `ExternalPostWebhookPost.md` (ID بومی)، `WebhookPayloadPostPlatform.md`، `WebhookPayloadPost.md` و `WebhookPayloadMessageDeliveryStatus.md` در `zernio-dev/zernio-php/docs/Model`. propertyهای snake_case SDK نباید بدون بررسی serialization به‌عنوان نام wire JSON کپی شوند.
- صفحات Posts/Inbox در بعضی فراخوانی‌های ابزار فقط پوستهٔ navigation برگرداندند؛ محتوای نخوانده به‌عنوان شاهد استفاده نشد و Changelog/مدل‌های رسمی برای تطبیق به کار رفتند.
