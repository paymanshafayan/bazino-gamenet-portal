# انتخاب رویدادهای Zernio و معماری ناشر قابل‌تعویض

تاریخ: **۱۴۰۵/۰۶/۱۶ — 2026-09-07**
وضعیت جاری: **V4 پیاده‌سازی و روی `45dd2ad` با 506 تست و ۲۰ تصویر واقعی بازتأیید شد؛ [گزارش تحویل](V4_DELIVERY.md) و [راهنمای اجرا](DEPLOY_AND_OPERATE.md) ملاک‌اند.** متن زیر قرارداد طراحی است؛ استقرار production/تماس live جدا و هنوز تأییدنشده‌اند. فهرست انجام‌شده/باقی‌مانده: هندآف §۲۳.
مرجع مکمل: [پلن افیلیت/انتشار، نسخهٔ ۴](../payments/INSTAGRAM_MEDIA_ONLY_PLAN.md) و [اصل سند کاربر](../payments/INSTAGRAM_AFFILIATE_DESIGN.md). Composer رسانه/کپشن/قالب در §۵٫۱ و **سوییچ دستی/عامل، مدیریت عامل‌ها با API Key و Manus پیش‌فرضِ ذخیره‌شده** در §۵٫۲ آمده‌اند. فهرست ۲۳ تیک اصلی تغییر نکرده است.

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
| اجرای انتشار | publicationId، occurrenceId، executionMode، agentId?، agentConfigVersion?، publishingOwner، attemptId، وضعیت |
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

## ۵٫۱ انتشار دستی ادمین از پنل — Post Composer، رسانه و کپشن

**درخواست صریح جدید کاربر:** ادمین بتواند در خود پنل، تصویر/ویدئو بارگذاری، کپشن وارد و قالب پست اسلایدی یا غیره را انتخاب کند و از طریق Zernio منتشر کند. این یک ابزار کاملِ آماده‌سازی و ارسال است، نه صرفاً انتخاب ناشر یا واردکردن URL فایل. همین قابلیت در بچ ۷ پلن نسخهٔ ۳ قرار دارد؛ هنوز پیاده‌سازی نشده است.

### تجربهٔ ادمین و قالب‌ها

- در بخش محتوای موجودِ پنل سایت، «پست جدید → انتشار با Zernio». Composer و API مشترک با نرم‌افزار مدیریت، مطابق معماری `shared/management`؛ نه پنل/CMS مستقل. ایجاد پیش‌نویس از مجوز انتشار جدا و هر دو سمت سرور کنترل شوند.
- انتخاب حساب/کانال مجاز، زبان و قالب: **تک‌تصویر، Carousel اسلایدیِ تصویر/ویدئو ترکیبی، Reel تک‌ویدئو**؛ **Story تک‌تصویر/ویدئو فقط در صورت قابلیت/مجوز معتبر حساب**. قالب‌های پشتیبانی‌نشده پنهان یا با علت غیرفعال باشند؛ ویدیوی تک‌فایلی به‌عنوان Reel تفسیر شود، نه وعدهٔ قالب ویدیویی ناموجود.
- بارگذاری از دستگاه با file picker و drag-and-drop، چندفایلی برای Carousel؛ thumbnail/پخش ویدئو، وضعیت واقعی هر فایل، درصد پیشرفت، لغو و retry. ویدئوی بزرگ با upload session و انتقال جریانی/قطعه‌ای متناسب با محدودیت proxy، نه base64 داخل JSON یا نگه‌داشتن کل فایل در حافظهٔ سرور.
- مرتب‌سازی اسلایدها با drag و دکمه‌های قابل‌استفاده با کیبورد، حذف/جایگزینی و شمارهٔ واضح. **ترتیب `mediaItems` ارسال‌شده باید دقیقاً برابر preview باشد.** یک اسلاید ناقص باعث انتشار خاموشِ بقیهٔ اسلایدها نشود.
- کپشن با خط جدید، ایموجی، hashtag، mention، شمارندهٔ طول و اعتبارسنجی همان قالب. caption اینستاگرام HTML/Markdown رندرشده فرض نشود؛ ساخت نوشتهٔ روی تصویر، تدوین حرفه‌ای ویدئو یا ویرایشگر شبیه Canva از «انتخاب قالب پست» نتیجه گرفته نمی‌شود. Story نیز نباید قابلیت caption/استیکر/overlay نامستند را در preview وعده بدهد.
- انتخاب کاور/thumbnail ویدئو در قالب‌هایی که API پشتیبانی می‌کند؛ پیش‌نمایش واقعی رسانه/ترتیب/کپشن، با اعلام اینکه شبیه‌سازی پنل تضمین پیکسل‌به‌پیکسل ظاهر همهٔ نسخه‌های اپ Instagram نیست.
- پیش‌نویس و ادامهٔ ویرایش، preview نهایی، تأیید و «انتشار اکنون» یا تاریخ/ساعت با timezone صریح. ویرایش رسانه، ترتیب، کپشن، قالب، حساب یا مقصد پس از تأیید، approval را باطل می‌کند و نسخهٔ تازه نیاز به تأیید دارد.
- قالب آمادهٔ Affiliate چهاراسلایدی tr/fa/en/ru و caption/policy مصوب از قالب عمومی جداست. پست عمومی بدون اتصال به کمپین مجاز است؛ هیچ پست یا Story ادمین خودکار عضو کمپین نمی‌شود. سیاست batch سه‌تاییِ محتوای Affiliate حفظ می‌شود؛ به پست عمومی مستقل تعمیم پنهان داده نمی‌شود.

Instagram به رسانه نیاز دارد و text-only post ندارد؛ Carousel ترکیبی تصویر/ویدئو و Reel/Story با قواعد متفاوت مستند شده‌اند. سقف هر قالب/حساب از capability validator می‌آید؛ سقف عمومی upload مجوز انتشار فایل همان‌اندازه در Instagram نیست. در راهنمای فعلی، Carousel حداکثر ۱۰ آیتم دارد؛ افزایش آیندهٔ سقف با به‌روزرسانی adapter/قواعد ممکن است، نه هاردکد مستقل در UI. [5](https://docs.zernio.com/platforms/instagram) [4](https://docs.zernio.com/guides/media-uploads)

### رسانهٔ ماندگار، نه فقط یک URL موقت

- افزودن **Media Asset Library** روی storage adapter و دیتابیس فعلی: `assetId`، مالک/دسترسی، hash، MIME واقعی، اندازه/ابعاد/مدت/codec، وضعیت بارگذاری/اعتبارسنجی و مسیر اصل فایل. Draft رسانه‌های مرتب‌شده را با assetId/version ارجاع می‌دهد؛ `mediaUrl` تک‌مقداری فعلی برای Carousel کافی نیست و با مهاجرت سازگار تکمیل می‌شود.
- اصل فایل خصوصی و پایدار نگه‌داری شود: object storage مناسب در صورت پیکربندی، یا مسیر رسانه در `BAZINO_DATA_DIR` **با Volume واقعاً متصل** و ظرفیت کنترل‌شده. صرف متفاوت‌بودن مسیر از cwd، اثبات ماندگاری نیست؛ ماندگاری با تنظیم هاست و restart/deploy آزموده شود. فایل در `public/`/`dist/`/Git یا فایل‌سیستم موقت کنار کد رها نشود.
- MVP می‌تواند از Volume موجود و upload قطعه‌ای استفاده کند؛ رابط storage امکان انتقال بعدی به object storage و upload مستقیم امن را بدون تغییر Composer/ناشر فراهم کند. در نبود فضای ماندگار، ذخیرهٔ موفق کاذب یا وعدهٔ حفظ پیش‌نویس داده نشود.
- وضعیت فایل `uploading → validating → ready` یا `failed/cancelled` مستقل از وضعیت پست است. filename کاربر مسیر ذخیره را تعیین نمی‌کند؛ session/asset به مالک و draft مقید است، حد حجم/تعداد و quota کنترل می‌شود، MIME/بایت واقعی و metadata لازم سمت سرور بررسی می‌شوند. metadata ارسالی مرورگر به‌تنهایی معتبر نیست.
- حذف یک اسلاید، اصل فایلی را که draft/job دیگر به آن ارجاع دارد حذف نکند؛ پاکسازی فقط بخش‌های موقت منقضی و فایل‌های بی‌مرجع طبق سیاست روشن. ویرایش هم‌زمان دو پنل با version/CAS، نه last-write-wins بی‌صدا.

### انتقال به Zernio و زمان‌بندی دورتر از یک هفته

قرارداد رسمی بارگذاری: بک‌اند با API Key، `POST /v1/media/presign` را با **`filename`، `contentType` و در صورت نیاز `size`** فراخوانی می‌کند؛ فایل به `uploadUrl` با PUT فرستاده و `publicUrl` در `mediaItems` انتشار استفاده می‌شود. API Key هرگز به مرورگر یا میزبان uploadUrl فرستاده نمی‌شود. نام‌های قدیمیِ ناسازگار `fileName/fileType` در برخی snippetهای جست‌وجو مبنا نیستند. [2](https://docs.zernio.com/media/get-media-presigned-url) [4](https://docs.zernio.com/guides/media-uploads)

راهنمای فعلی می‌گوید uploadUrl یک ساعت و فایل temp هفت روز عمر دارد؛ پس از انتشار، Zernio رسانه را به storage دائمی منتقل می‌کند. `permanent: true` نیز در Changelog حذف‌شده اعلام شده و نباید راه‌حل پیش‌فرض باشد. [4](https://docs.zernio.com/guides/media-uploads) [3](https://docs.zernio.com/changelog)

بنابراین:

1. اصل فایل در کتابخانهٔ ماندگار بازینو باقی بماند؛ source of truth پیش‌نویس و برنامهٔ بلندمدت، لینک temp زرنیو نیست.
2. انتقال فایل آمادهٔ مصوب به Zernio نزدیک زمان ارسال انجام شود؛ `providerUploadRef/expiry` جدا از asset اصلی ثبت شود. uploadUrl منقضی، فقط مجوز upload تازه می‌خواهد؛ حذف فایل اصلی یا تغییر asset مصوب نیست.
3. اگر مرجع temp پیش از نشر منقضی شده، همان نسخه/hash از اصل فایل دوباره stage و در payload همان job قرار گیرد. در نبود اصل، `needs_reupload` با علت واقعی؛ هیچ پست ناقص/رسانهٔ جایگزین خودسرانه منتشر نشود.
4. URL ارجاع‌شدهٔ provider فقط از upload session معتبر همان draft پذیرفته شود؛ endpoint کامل‌کردن upload یک SSRF proxy یا پذیرندهٔ publicUrl دلخواه نشود. URL امضاشده و اطلاعات دسترسی در log، audit یا state پایدار مرورگر ذخیره نشوند.
5. پیش از `POST /v1/posts`، همهٔ اسلایدها/کاورهای الزامی ready و snapshot مصوب ثابت باشند. موفقیت upload یا پذیرش API، `published` محسوب نشود؛ native Media ID و وضعیت انتشار از receipt/reconciliation معتبر بیاید.
6. خطای یک پست در batch یا یک مقصد، نتیجهٔ موفق پست/مقصد دیگر را پاک نکند. retry فقط برای بخش تعیین‌تکلیف‌شده و ارسال‌نشده؛ timeout نامشخص مطابق outbox قبلی رسیدگی شود، نه انتشار دوبارهٔ همهٔ batch.

### داده و اعتبارسنجی Composer

- ساختار پیشنهادی نسخهٔ اجتماعی: `postFormat`, `caption`, `language`, `mediaItems[{assetId, assetVersion, position, type, optionalAltText}]`, `cover`, `accountId`, `scheduledAt/timezone`, `campaignId?` و flags مجاز provider. موارد اختیاری فقط در صورت پشتیبانی واقعی API نمایش/ارسال شوند.
- snapshot/hash تأیید شامل همهٔ موارد بالا و hash رسانه‌ها باشد؛ «ذخیرهٔ متن» یا drag ترتیب بعد از approval، همان job مصوب قبلی را بی‌صدا تغییر ندهد.
- تبدیل تصویر/ویدئو، crop یا فشرده‌سازی اگر لازم شد، فقط با نتیجهٔ قابل‌preview و حفظ اصل فایل؛ codec/اندازه/مدت نامعتبر خطای روشن داشته باشد. pipeline نباید تغییر کیفیت/برش بی‌اطلاع انجام دهد.
- ویرایش draft منتشرشده به معنای تغییر خودکار پست زنده نیست؛ انتشار دوباره/ویرایش remote command جدا و تأیید جدا دارد. clone پست، draft جدید با approval جدید است.
- پس از انتشار واقعی، registry همان رسانه به‌روز شود. فقط پست/Reel متصل به کمپین مصوب می‌تواند وارد افیلیت شود؛ Story و پست عمومی نامرتبط صرفاً رکورد نشر دارند.

### آزمون‌های اختصاصی

- پست تک‌تصویر، Reel و Carousel ترکیبی با ترتیب عوض‌شده؛ preview و payload واقعی یکسان باشند.
- فایل چندبخشی، لغو، retry، قطعهٔ تکراری/اشتباه، upload ناقص، MIME جعلی، محدودیت حجم/ابعاد/مدت و دسترسی غیرمجاز؛ هیچ خروجی ناقص منتشر نشود.
- چند draft که از یک asset استفاده می‌کنند و ویرایش هم‌زمان دو پنل؛ حذف/جایگزینی باعث خرابی job دیگر نشود.
- زمان‌بندی بیش از هفت روز، uploadUrl منقضی، فایل temp منقضی، restart و نبود Volume واقعی؛ ماندگاری یا نیاز به upload مجدد صادقانه گزارش شود.
- تغییر کپشن/رسانه/ترتیب/قالب بعد از approval و دوبار کلیک انتشار؛ نسخهٔ تأییدنشده یا duplicate ایجاد نشود.
- workflow دستی بدون `MANUS_API_KEY` کار کند؛ Story/text-only/تعداد اسلاید نامجاز و ورود خودکار به کمپین رد شوند.
- Chromium واقعی چهارزبانه، RTL، موبایل/دسکتاپ، انتخاب/پخش/ترتیب رسانه و اسکرین‌شات کاملِ بازبینی‌شده؛ فایل تستی جای انتشار واقعی حساب کاربر گزارش نشود.

## ۵٫۲ سوییچ «دستی / انتشار توسط عامل» و مدیریت عامل‌ها

**درخواست جدید کاربر:** حالت انتشار در پنل قابل تعویض بین دستی و عامل باشد؛ ادمین بتواند عامل را با API Key تعریف کند؛ **Manus به‌عنوان عامل پیش‌فرض در دیتابیس ذخیره شده باشد**. این افزودهٔ نسخهٔ ۴ است، نه اعلام ساخت UI یا ثبت کلید واقعی در این نشست.

### مدل انتخاب و رابط کاربری

- در همان بخش انتشار مشترک دو پنل، سوییچ **«دستی» / «توسط عامل»**؛ انتخاب از بک‌اند خوانده و ذخیره شود، پس refresh/ورود دوباره/restart انتخاب مدیر را از بین نبرد.
- **دستی:** Composer بارگذاری تصویر/ویدئو، caption، قالب، preview و approval؛ انتشار از backend با آداپتور Zernio، بدون فراخوانی Manus یا خرج اعتبار عامل.
- **توسط عامل:** انتخاب عامل فعال و سازگار، شرح کار/ورودی‌های مجاز و نمایش وضعیت task؛ عامل پس از تأیید لازم کار مصوب را انجام می‌دهد. مسیر آماده‌سازی پیش‌نویس از دستور انتشار واقعی جدا و هزینه/محدودهٔ هر اقدام مشخص باشد.
- `executionMode = manual | agent`، `agentId` و انتخاب فنی `publishingProvider` سه مفهوم جدا هستند. UI ترکیب نامعتبر را نمی‌پذیرد: عاملِ صرفاً تولیدکننده، به‌عنوان عاملِ قادر به انتشار نمایش داده نشود. انتشار عامل ممکن است از transport خودش یا مسیر پشتیبانی‌شدهٔ Zernio استفاده کند؛ این را adapter/capability مشخص می‌کند، نه وجود یک API Key.
- قالب‌ها، رسانه‌ها، کپشن، مقصد/کمپین و snapshot تأیید، در هر دو حالت همان قرارداد مشترک هستند. سوییچ، اطلاعات draft را خودکار پاک یا برای بازنویسی به عامل ارسال نکند.
- پیش‌فرضِ **عامل** Manus است؛ پیش‌فرض **حالت** مستقل است. انتخاب حالت قبلی مدیر حفظ شود؛ اگر هیچ انتخاب معتبری ذخیره نشده، پیش از اولین job مدیر باید حالت را انتخاب کند. seed عامل به‌تنهایی حالت یا کارهای قدیمی را تغییر نمی‌دهد.

### دفتر عامل‌ها (Agent Registry)

از `IDataStore`/رکوردهای نسخه‌دار موجود استفاده شود؛ پنل، DB یا agent server موازی لازم نیست. رکورد metadata پیشنهادی:

```text
AgentProfile:
  id, name, adapterId, adapterVersion, credentialRef,
  capabilities, enabled, configVersion, createdAt, updatedAt
PublishingSettings:
  selectedMode, defaultAgentId, version
```

- UI ادمین: افزودن، تغییر نام/تنظیمات، درج/تعویض/پاک‌کردن API Key، فعال/غیرفعال‌کردن، انتخاب عامل پیش‌فرض و تست اتصالِ آگاهانه؛ مقدار ذخیره‌شدهٔ Secret در GET یا فرم ویرایش بازگردانده نشود.
- نوع/adapter عامل انتخاب می‌شود؛ برای هر پروتکل، auth، درخواست، پاسخ، task/status و callback به‌صورت مشخص و تست‌شده نگاشت می‌شوند. **API Key به‌تنهایی قرارداد هر سرویس دلخواه را به عامل ناشر تبدیل نمی‌کند.** نوع فاقد adapter یا قابلیت publish، می‌تواند به‌عنوان پروفایل غیرفعال/نیازمند پشتیبانی ثبت شود، اما ready یا قابل‌انتشار معرفی نشود.
- نخستین adapter هدف Manus است؛ اصلاح/تطبیق قرارداد API و callback آن جزو تست یکپارچه‌سازی است. کد فعلیِ hardcoded Manus، صرفاً به‌خاطر وجود نام/کلید «آداپتور آمادهٔ نشر» محسوب نمی‌شود. اگر آداپتورهای دیگر اضافه شوند، هستهٔ افیلیت و Composer عوض نمی‌شوند.
- capabilityها فقط از آداپتور معتبر سمت سرور بیایند؛ checkbox ادمین یا پاسخ متنی عامل، مجوز مالی/انتشار یا توان واقعی سرویس ایجاد نمی‌کند. endpoint دلخواه بدون کنترل HTTPS/host/redirect و SSRF مجاز نیست و کد اجرایی عامل در بک‌اند eval/run نمی‌شود.
- وضعیت‌ها تفکیک شوند: `unconfigured`، `configured_untested`، `ready`، `disabled`، `unsupported` و خطای اتصال/اعتبار؛ API Key موجود، به‌تنهایی شاهد اتصال موفق نیست. زمان آخرین بررسی نمایش داده شود.

### Manus پیش‌فرض واقعاً ذخیره شود

1. در نصب اولیه، رکورد ثابت مثلاً `builtin-manus` با نام Manus/adapter Manus و ارجاع `defaultAgentId` ساخته شود؛ **رکورد واقعی DB، نه فقط انتخاب hardcoded در React**.
2. seed idempotent و فقط برای دادهٔ غایبِ نصب اولیه باشد؛ default انتخاب‌شده، تغییر نام/کلید یا غیرفعال‌سازی عمدی مدیر با restart دوباره به Manus برنگردد. یک مرجع defaultAgentId معتبر، نه چند isDefault ناسازگار.
3. هیچ API Key ساختگی در seed، Git یا کد قرار نگیرد. اگر کلید معتبرِ موجود پیکربندی نشده، Manus همچنان پیش‌فرض تعریف‌شده است ولی «نیازمند API Key/بررسی اتصال» نمایش داده می‌شود و اجرای واقعی غیرفعال است.
4. انتخاب Manus یا نبود کلید، خودبه‌خود تماس، task، مصرف اعتبار، شبیه‌سازِ موفق‌نما یا انتشار ایجاد نکند. Demo در صورت وجود، صریح و جدا از حالت واقعی باشد.
5. حذف/غیرفعال‌کردن عامل پیش‌فرض، انتخاب جایگزین یا وضعیت نیازمند انتخاب ایجاد کند؛ fallback خاموش به Manus/عامل دیگر یا فعال‌کردن مجدد عامل لغوشده ممنوع است. پروفایل دارای job/سابقه ترجیحاً soft-disable شود و history حفظ بماند.

### امنیت کلید و مهاجرت تنظیمات فعلی

- API Key سرویس عامل (Portal → Manus) با توکن محدود `baz_…` برای اعلام media_id (Agent → Portal) و با کلید/Secret زرنیو یکی نیست؛ UI/راهنما آن‌ها را جدا معرفی کند.
- API Key از فرم امن به endpoint اختصاصی ادمین برسد، در vault رمزگذاری‌شده با `credentialRef` نگه‌داری شود و هرگز در AgentProfile عمومی، PublicationJob، prompt، log، audit، localStorage یا پاسخ وضعیت قرار نگیرد. فقط backend از آن استفاده می‌کند؛ کلید اصلی رمزگذاری خارج DB، مطابق طراحی قبلی است.
- **منبع کلید Manus فعلی را ناخواسته عوض نکنیم:** `ContentService.generate` الان `manus_api_key` ذخیره‌شده را قبل از `MANUS_API_KEY` محیط می‌خواند. مهاجرت باید binding/منبع مؤثر فعلی را حفظ و به ادمین اعلام کند؛ قاعدهٔ اولویت env برای Zernio نباید بی‌صدا حساب/کلید Manus را عوض کند. در نبود setting، env fallback قابل اتصال است؛ انتقال به vault با کلید اصلی موجود و بدون افشای مقدار انجام شود.
- اگر مقدار legacy و env متفاوت‌اند، وضعیت تعارض منبع بدون نمایش Secret مشخص شود؛ انتخاب صریح ادمین لازم است، نه جایگزینی خاموش. اگر کلید از هاست گرفته می‌شود، API خواندن پنل فقط منبع/وضعیت را نشان دهد و env را برای پرکردن فرم به مرورگر نفرستد.
- **پاک‌کردن صریح credential با نبودن مقدار یکی نیست.** حذف کلید/disable باید اجرای جدید را متوقف کند؛ نباید دوباره از env/setting قدیمی کلید پیدا و عامل را بی‌صدا فعال کند. fallback فقط مطابق binding مصوب و بدون override لغو مدیر است.
- تنظیمات عامل/credential/default از مسیر عمومی `/api/settings` و generic settings writer قابل افشا/دورزدن نباشند؛ نام‌های legacy نیز در مهاجرت محافظت شوند. داده‌های Jarvis/چت با عامل ناشر یکی فرض نشوند؛ reuse زیرساخت Secret مجاز است، reuse بی‌قید اختیار/کلید نه.
- تست اتصال بدون اقدام صریح ادمین اجرا نشود؛ تا جای پشتیبانی read-only باشد و اگر نیاز به task هزینه‌دار یا انتشار دارد، قبل از اجرا مجوز همان اقدام لازم است. شکست اتصال به معنی موفقیت شبیه‌ساز یا تغییر عامل نیست.

### محدودهٔ اختیار عامل و تغییر حالت وسط کار

- هیچ حالت یا API Key، approval همان نسخه/batch را دور نمی‌زند. generation فقط draft می‌سازد؛ publish نیاز به approvalId معتبر و مجوز/قابلیت صریح دارد. حدود کانال، حساب، ورودی و هزینه/زمان در job ثبت و تا حد پشتیبانی سرویس enforce شود؛ دستور زبانی به‌تنهایی تضمین محدودیت فنیِ عامل بیرونی نیست.
- در فلو افیلیت، حتی Manus پیش‌فرض فقط شناسهٔ رسانهٔ منتشرشده را با توکن ingest محدود اعلام می‌کند؛ تصمیم کد/لینک خصوصی دوست/Gate/کوپن/کمیسیون در backend باقی می‌ماند. Secret زرنیو یا اطلاعات مشتریان برای انجام این کار در prompt عامل قرار نگیرد.
- `executionMode`, `agentId`, `agentConfigVersion`, `publishingProvider`, `publishingOwner`, approvalId و شناسهٔ task/attempt در job snapshot شوند؛ نه متن API Key. taskId بین دو عامل/protocol بدون namespace برابر فرض نشود و callback معتبر به همان job/نسخه/عامل وصل شود.
- تغییر سوییچ/عامل پیش‌فرض فقط کارهای تازه را تغییر دهد؛ کار submitted به ناشر دوم کپی نشود. در draftِ درحال تولید، لغو/تغییر مسیر صریح ثبت شود و پاسخ دیررس عامل قبلی نسخهٔ دستی جدید را overwrite یا منتشر نکند.
- لغو remote فقط اگر سرویس واقعاً پشتیبانی کند «لغوشده» گزارش شود؛ در غیر این صورت کار ممکن است در سرویس بیرونی ادامه یابد، ولی خروجی آن در backend superseded/نیازمند رسیدگی است. هزینهٔ مصرف‌شده با تغییر سوییچ خودکار برنمی‌گردد.
- تغییر mode/عامل/قالب/مقصدِ draft تأییدشده، approval را باطل کند. تعویض/ابطال کلید یا disable عامل، کارهای جاری را بی‌صدا به credential/account یا عامل دیگری منتقل نکند؛ recovery با وضعیت روشن و reconciliation انجام شود.
- مهاجرت داده‌های قبلی صرف وجود `taskId` یا استفاده از Manus برای تولید متن را به «انتشار توسط عامل» تبدیل نکند؛ اطلاعات نامعلوم با برچسب legacy و مالک ثابت حفظ شوند.

### تست‌های لازم

- seed Manus و defaultAgentId واقعی، یک‌باراجرایی، ماندگاری refresh/restart و عدم بازنویسی default سفارشی/disabled.
- نبود API Key، configured بدون تست، کلید غلط، adapter نامعتبر و نبود capability نشر؛ هیچ task/انتشار/شبیه‌سازِ موفق‌نما ایجاد نشود.
- CRUD/default/enable/disable و اتصال credential فقط با مجوز ادمین؛ عدم نشت Secret در همهٔ خروجی‌ها و هم‌زمانی تغییر تنظیمات.
- حفظ تقدم فعلی کلید Manus در مهاجرت، تعارض منابع، نبود کلید اصلی و پاک‌کردن صریح credential بدون fallback پنهان.
- mode دستی بدون هیچ تماس Manus و mode عامل با پروفایل انتخاب‌شده؛ تغییر عامل با انجام job توسط عامل قبلی اشتباه نشود.
- تعویض mode در draft/generating/approved/submitted، callback دیررس/تکراری/عامل اشتباه، لغو نامطمئن و rotation؛ بدون overwrite، انتشار تکراری یا عبور از approval.
- همان منطق media registry/افیلیت/حریم خصوصی در هر دو حالت؛ توکن عامل نتواند API کد/کوپن/مالی یا webhook جدید را دور بزند.
- UI مشترک دو پنل، چهار زبان/RTL و Chromium واقعی؛ اسم Manus در dropdown به‌عنوان شاهد ثبت DB/اتصال واقعی کافی نباشد.

## ۶. مسیر مهاجرت بدون بازنویسی افیلیت

1. در اجرای پلن نسخهٔ ۴، قرارداد مشترک، dispatcher رویدادها، registry چندمنبعی و آداپتور انتشار مستقیم، همراه تست، آماده شوند؛ **حالت عملیاتی پیش‌فرض external/Manus باقی بماند**.
2. پنل، سوییچ دستی/عامل و عامل پیش‌فرضِ ذخیره‌شده داشته باشد؛ publishingProvider فنی از ترکیب مجاز adapter/capability تعیین شود. کلید API/مجوز publishing و پیش‌نمایش محتوا بررسی شود؛ انتخاب حالت/عامل یا تیک webhook این مجوزها را ایجاد نمی‌کند.
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
