# طرح سیستم Affiliate Marketing اینستاگرام برای Bazino Pro

**وضعیت:** طرح پیشنهادی برای بررسی و تصمیم‌گیری — به‌روزرسانی قانون ارسال کد و لینک در ۷ سپتامبر ۲۰۲۶

**دامنه:** جذب فالوور، اشتراک‌گذاری پست و Reel، هدایت به سایت و اپلیکیشن، و تبدیل ارجاع‌ها به رزرو یا حضور پرداخت‌شده از طریق حساب حرفه‌ای `@bazinopro`.

**مبنای طراحی:** این طرح از سند Affiliate فعلی Bazino Pro برای کانال‌ها و جوامع محلی استفاده می‌کند و همان منطق را به رفتارهای قابل‌اندازه‌گیری اینستاگرام منتقل می‌کند: شناسه همکار، لینک اختصاصی، کد ارجاع، پنجره انتساب، ثبت رزرو، تأیید پرداخت/حضور و تسویه.

## ۱. قانون صداقت و شرط اجرایی Friend Gate

از این پس اگر هر بخش از درخواست یا طرح از نظر فنی، دسترسی، سیاست پلتفرم یا ابزارهای موجود امکان‌پذیر نباشد، باید پیش از اجرا صریحاً اعلام شود. جایگزین‌ها باید با برچسب **محدودیت**، **خوداظهاری** یا **شاهد غیرمستقیم** ارائه شوند و هرگز به‌عنوان تأیید قطعی معرفی نشوند.

در فلو جدید، Share اجباری به‌عنوان یک **شرط قابل‌پیگیری کمپین** حفظ می‌شود، اما سیستم ادعا نمی‌کند که API اینستاگرام دکمه‌ی Share یا متن دایرکت خصوصی را برای هر فرد خوانده و تأیید کرده است. معیار عملی کمپین این است: کامنت همکار، پیام خصوصی، Follow/تأیید Follow در سطح پشتیبانی‌شده، ارسال کد عددی همراه پست، کامنت همان کد توسط دوست، کلیک روی لینک دعوت و سپس عبور از شرط‌های فعال‌سازی.

کمیسیون Affiliate همچنان فقط برای **رزرو یا حضور پرداخت‌شده‌ی مشتری جدید** ایجاد می‌شود. کوپن دوست می‌تواند پس از عبور از حداقل Gate مصوب صادر شود. در این کمپین، کامنت کد یکتای دوست زیر خود پست با وضعیت `share_confirmed_by_friend_code` به‌عنوان شاهد عملی دریافت پست و Share ثبت می‌شود؛ این یک وضعیت عملیاتی کمپین است و نباید با آمار کلی Media Insights یا تأیید رسمی فردی Meta اشتباه گرفته شود.

## ۲. کمپین پیشنهادی: «Invite Your Squad»

### تجربه‌ی کاربر در فلو جدید

این متن‌ها **نمونه هستند** و متن نهایی هر کمپین را ادمین تعیین می‌کند؛ ادمین می‌تواند زبان، لحن، کد، CTA و شرایط کوپن را تغییر دهد، اما نباید معنای فلو یا وضعیت تأیید را تحریف کند.

> **قانون اجرایی جدید:** لینک دعوت هرگز برای همکار ارسال نمی‌شود. همکار فقط کد یکتای خود و متن آمادهٔ دعوت را دریافت می‌کند. پس از اینکه دوست کد را زیر پست تأییدشده کامنت کرد و شروط مصوب را تکمیل کرد، لینک دعوت دقیقاً برای دوست ارسال می‌شود.

۱. همکار زیر پست یا Reel تأییدشده‌ی بازینو کامنت می‌گذارد. سیستم کامنت را از Webhook دریافت می‌کند و برای همان کامنت، با کنترل تکراری‌نبودن، پیام نمونه‌ی اول را Private Reply می‌کند.

۲. پیام نمونه‌ی اول باید هم درخواست Follow را بگوید و هم روش کامل را توضیح دهد: همکار پیج را Follow می‌کند، روی «فالو دارم» می‌زند، پیام دوم را با کد شناسایی اختصاصی دریافت می‌کند و سپس پیام دوم را عیناً برای دوستش می‌فرستد و پست بازی‌نو که برایش فرستاده شده را نیز برای دوست Share می‌کند.

۳. پس از رویداد قابل‌پشتیبانی دکمه یا تأیید Follow در سطح کمپین، پیام نمونه‌ی دوم شامل **فقط کد عددی یکتای همکار و متن آماده‌ی ارسال برای دوست** فرستاده می‌شود و هیچ `invite_url`ای در آن وجود ندارد. این پیام باید مستقل از خود پست باشد و بگوید: «پست بازی‌نو که برایت فرستادم را برای دوستت Share کن»؛ نه اینکه بگوید «همین پست». سیستم `affiliate_id`، `campaign_id`، `media_id`، `partner_code` و `comment_id` را نگه می‌دارد.

۴. دوست پس از دریافت پست بازی‌نو و پیام کد، همان عدد را زیر خود پست بازی‌نو کامنت می‌کند. Webhook کامنت دوست را به `partner_code` وصل می‌کند. در این کمپین، این کامنت کد زیر خود پست، شاهد عملی دریافت پست و انجام Share برای Friend Gate محسوب می‌شود و نیازی به ارسال مجدد پست به Direct بازینو وجود ندارد.

۵. پس از کامنت کد، پیام نمونه‌ی دوست از او می‌خواهد پیج را Follow کند و روی «فالو دارم» بزند. پس از عبور از حداقل Gate مصوب، **لینک دعوت و راهنمای فعال‌سازی کوپن یک‌بارمصرف فقط برای دوست** ارسال می‌شود. رمز عبور اینستاگرام هرگز دریافت نمی‌شود.

۶. وضعیت Share در این فلو با `share_confirmed_by_friend_code` ثبت می‌شود: این وضعیت تأیید عملی کمپین است که پست به دوست رسیده و Friend Gate را فعال کرده است؛ لازم نیست برای صدور کوپن منتظر Webhook رسمی Share خود Meta بمانیم.

۷. اگر دوست رزرو کند، کد ارجاع را وارد کند یا مراجعه‌ی حضوری را با همان کد ثبت کند، قیف به `Reserved` می‌رود و بعد از پرداخت/حضور واجد کمیسیون می‌شود.

### سطح‌های اثبات Share

| سطح | چه چیزی واقعاً قابل‌سنجش است | کاربرد |
| --- | --- | --- |
| سطح ۱: Campaign Share | تعداد کل `shares` پست یا Reel از Media Insights | سنجش جذابیت کمپین، نه شناسایی فرد |
| سطح ۲: Partner Comment | کامنت همکار، `comment_id` و Private Reply موفق | شروع رسمی فلو و تولید کد همکار |
| سطح ۳: Friend Code Comment | کامنت کد عددی دوست زیر خود پست بازی‌نو و تطبیق با `partner_code` | تأیید عملی کمپین از رسیدن پست و Share برای Friend Gate |
| سطح ۴: Referral Click | کلیک یکتا روی لینک دعوت با `ref` و `partner_code` | تأیید استفاده از لینک اختصاصی |
| سطح ۵: Qualified Referral | رزرو/پرداخت/حضور از همان لینک یا کد | تنها سطح مناسب برای پاداش یا کمیسیون |
| سطح ۶: Optional Evidence | اسکرین‌شات Share/Like/Follow یا بررسی دستی | کنترل کمکی؛ غیرقطعی و بدون پاداش مستقل |

کامنت کد عددی دوست زیر خود پست بازی‌نو، در این کمپین **شاهد عملی Share و دریافت پست** است و با وضعیت `share_confirmed_by_friend_code` ثبت می‌شود. برای فعال‌سازی لینک و کوپن لازم نیست Share با Webhook رسمی Meta تأیید شود؛ معیار کمپین، رسیدن دوست به خود پست و کامنت‌کردن کد یکتای همان همکار است. Follow واقعی، در صورت وجود سیگنال رسمی Meta، با `follow_verified` ثبت می‌شود؛ کلیک دکمه بدون آن سیگنال با `button_event_only` یا خوداظهاری ثبت می‌گردد.

### پیام‌های Private Reply نهایی و چهارزبانه

هر زبان کلمهٔ کلیدی مستقل خود را دارد و پاسخ همان زبان را فعال می‌کند: فارسی `آماده`، ترکی `Hazır`، انگلیسی `Ready` و روسی `Готово`. تطبیق باید Whole Word، با Deduplication بر اساس `comment_id + campaign_id + language` و بدون ارسال پاسخ زبان دیگر باشد.

#### فارسی — کلمهٔ کلیدی: `آماده`

**پیام اول برای همکار:**

> برای شرکت در طرح دعوت بازینو، پیج @bazinopro را Follow کن و روی دکمهٔ «فالو دارم» بزن. بعد از این مرحله، یک پیام دوم برایت ارسال میشود که شامل کد شناسایی اختصاصی تو و متن آمادهٔ دعوت است. آن پیام را عیناً برای دوستت بفرست و این پست را نیز برای دوستت Share کن. دوستت باید عدد داخل پیام را زیر همان پست کامنت کند و پیج بازینو را Follow کند تا لینک دعوتبرایش ارسال و کوپن تخفیف برایش فعال شود. ما رمز عبور اینستاگرام را نمیخواهیم.

**پیام دوم برای همکار — بدون لینک دعوت:**

> این کد: [عدد یکتا] را زیر پستی که برایت فرستادم کامنت کن و پیج @bazinopro را Follow کن. این پیام را عیناً برای دوستت بفرست و پست بازی‌نو را نیز برای او Share کن. دوستت باید عدد داخل پیام را زیر همان پست کامنت کند و پیج @bazinopro را Follow کند تا لینک دعوت و کوپن تخفیف برای او فعال شود. ممنون میشوم اگر این کار را برایم انجام بدهی.

#### ترکی — کلمهٔ کلیدی: `Hazır`

**Mesaj 1:**

> Bazino davet kampanyasına katılmak için @bazinopro sayfasını Follow et ve “Takip ettim” butonuna dokun. Bu adımdan sonra sana özel kimlik kodunu ve arkadaşına gönderebileceğin hazır mesajı içeren ikinci bir mesaj gönderilecek. Bu mesajı olduğu gibi arkadaşına gönder ve bu gönderiyi de arkadaşınla Share et. Arkadaşın mesajdaki numarayı aynı gönderinin altına yorumlamalı ve Bazino sayfasını Follow etmelidir; ardından davet bağlantısı gönderilecek ve indirim kuponu onun için etkinleştirilecektir. Instagram şifreni istemiyoruz.

**Mesaj 2:**

> Bu kodu: [benzersiz numara], sana gönderdiğim gönderinin altına yorumla ve @bazinopro sayfasını Follow et. Bu mesajı olduğu gibi arkadaşına gönder ve Bazino gönderisini de onunla Share et. Arkadaşın bu numarayı aynı gönderinin altına yorumlamalı ve @bazinopro sayfasını Follow etmelidir; davet bağlantısı ve indirim kuponu yalnızca arkadaşına gönderilecektir. Bunu benim için yaparsan çok memnun olurum.

#### انگلیسی — کلمهٔ کلیدی: `Ready`

**Message 1:**

> To join Bazino’s invitation campaign, Follow @bazinopro and tap the “I followed” button. After this step, you will receive a second message containing your unique identification code and a ready-to-send invitation message. Send that message to your friend exactly as written and Share this post with your friend. Your friend must comment the number in the message under the same post and Follow Bazino; then an invitation link will be sent and the discount coupon will be activated for them. We do not need your Instagram password.

**Message 2:**

> Comment this code: [unique number] under the post I sent you and Follow @bazinopro. Send this message to your friend exactly as written and Share the Bazino post with them. Your friend must comment this number under the same post and Follow @bazinopro; the invitation link and discount coupon will be sent only to your friend. I would really appreciate it if you could do this for me.

#### روسی — کلمهٔ کلیدی: `Готово`

**Сообщение 1:**

> Чтобы участвовать в пригласительной кампании Bazino, подпишись на @bazinopro и нажми кнопку «Я подписался». После этого тебе будет отправлено второе сообщение с твоим уникальным идентификационным кодом и готовым текстом приглашения. Отправь это сообщение другу без изменений и поделись с ним этой публикацией. Друг должен прокомментировать число из сообщения под этой же публикацией и подписаться на Bazino; после этого ему будет отправлена пригласительная ссылка и активирован купон на скидку. Нам не нужен пароль от Instagram.

**Сообщение 2:**

> Прокомментируй этот код: [уникальный номер] под публикацией, которую я отправил тебе, и подпишись на @bazinopro. Отправь это сообщение другу без изменений и поделись публикацией Bazino с ним. Друг должен прокомментировать это число под той же публикацией и подписаться на @bazinopro; пригласительная ссылка и купон на скидку будут отправлены только другу. Буду очень благодарен, если ты сделаешь это для меня.

این پیام‌ها باید به زبان محتوای همان پست ارسال شوند. متن فارسی پیام دوم دقیقاً طبق نسخهٔ تأییدشده حفظ شده است و `[عدد یکتا]` فقط هنگام اجرا با کد اختصاصی جایگزین می‌شود.

## ۳. ساختار شناسه و لینک

هر Affiliate یا شرکت‌کننده‌ی واجد شرایط یک شناسه‌ی یکتا دریافت می‌کند. برای کاربر عادی کمپین می‌توان شناسه‌ی موقت و برای همکار تأییدشده شناسه‌ی پایدار داشت.

| نوع | نمونه | کاربرد |
| --- | --- | --- |
| شناسه همکار | `ISKELE01` | انتساب پایدار صاحب کانال یا Creator |
| شناسه کمپین | `SQUAD26` | مقایسه کمپین Invite Your Squad |
| لینک پایه | `https://bazino.pro/?ref=ISKELE01` | ورود عمومی با انتساب |
| لینک اینستاگرام | `https://bazino.pro/?ref=ISKELE01&utm_source=instagram&utm_medium=affiliate&utm_campaign=SQUAD26` | تفکیک کانال و کمپین |
| لینک محتوایی | `https://bazino.pro/tournaments?ref=ISKELE01&content=REEL03` | انتساب پست یا Reel خاص |
| کد حضوری | `ISKELE01` | ثبت در رزرو حضوری توسط کارکنان |

لینک دعوت اختصاصی پس از کامنت کد و تکمیل شروط، فقط برای دوست به‌صورت خصوصی ارسال می‌شود. لینک دعوت برای همکار ارسال نمی‌شود و نباید در پیام همکار، کامنت عمومی یا لاگ قابل‌مشاهده قرار گیرد. هر لینک عمومی احتمالی همکار حرفه‌ای در Bio، Story، Caption مجاز یا محتوای Creator، یک مسیر عمومی جداگانه است و جایگزین لینک اختصاصی دوست نیست. مقصد باید صفحه‌ی مرتبط رزرو، تورنومنت یا اپلیکیشن باشد و جزئیات جایزه، مبلغ، تاریخ و شرایط فقط از اطلاعات رسمی سایت خوانده شود.

## ۴. مدل پاداش و کمیسیون

اعداد زیر از سند پایه‌ی Affiliate آمده‌اند و **پیشنهاد اولیه هستند، نه تصمیم مالی نهایی**. پیش از اعلام عمومی باید توسط مالک کسب‌وکار و مشاور مالی/حقوقی تأیید شوند.

| رویداد | وضعیت | پیشنهاد اولیه |
| --- | --- | --- |
| Follow یا Comment | محرک کمپین | بدون کمیسیون نقدی |
| Share یا کلیک | تعامل بازاریابی | بدون کمیسیون قطعی |
| اولین رزرو یا حضور پرداخت‌شده مشتری جدید | واجد شرایط اصلی | ۱۰٪ مبلغ خالص دریافت‌شده |
| مشتری بازگشتی | مشروط به سیاست نهایی | ۵٪ تا حداکثر ۳۰ روز |
| ثبت‌نام تورنومنت از مسیر همکار | قابل تنظیم | مبلغ ثابت یا ۱۰٪ مبلغ خالص |
| لغو، بازپرداخت، تراکنش تستی یا تکراری | ردشده | صفر یا برگشت کمیسیون |

تعریف مبلغ خالص باید همان سند پایه باشد: مبلغ واقعاً دریافت‌شده پس از تخفیف تأمین‌شده توسط بازینو، بازپرداخت، لغو، مالیات یا کارمزد در صورت اعمال. کمیسیون تا پایان دوره‌ی بازپرداخت در حالت `Pending` باقی می‌ماند.

## ۵. منطق Attribution

انتساب پیش‌فرض، **آخرین لینک معتبر Affiliate پیش از رزرو** است، مگر اینکه کاربر کد دیگری را آگاهانه در فرم وارد کند؛ در آن صورت کد واردشده بر مقدار قبلی اولویت دارد. شناسه می‌تواند تا ۳۰ روز در مرورگر یا حساب کاربر نگه‌داری شود. برای جلوگیری از انتساب جعلی، ثبت سمت سرور لازم است و کوکی به‌تنهایی کافی نیست.

وضعیت‌های اصلی عبارت‌اند از `Clicked`، `Lead`، `Reserved`، `Paid`، `Attended`، `Approved`، `Reversed`، `Paid out` و `Rejected`. یک تراکنش فقط یک صاحب کمیسیون دارد. استفاده‌ی همکار از کد خودش، رزرو کارکنان، چند رزرو با هویت یکسان، پرداخت و بازپرداخت سریع، کلیک مصنوعی و تراکنش تکراری باید علامت‌گذاری شود.

## ۶. قیف محتوایی اینستاگرام

| مرحله | محتوای پیشنهادی | CTA | شاخص اصلی |
| --- | --- | --- | --- |
| جذب | Reel کوتاه از PS5/Xbox، VIP و نمایشگر ۸۵ اینچی | Follow + کامنت `SQUAD` | Reach، Follows، Comments |
| فعال‌سازی | پاسخ خصوصی و Story آموزشی | دریافت لینک اختصاصی | Private Replies sent، Link opens |
| اشتراک‌گذاری | کارت «Invite your squad» و Reel تجربه‌محور | Share با دوستان علاقه‌مند | Shares، لینک‌های یکتا |
| تبدیل | تورنومنت، Café یا VIP با لینک مقصد اختصاصی | رزرو در سایت/اپ | Sessions، Leads، Reservations |
| درآمد | پیگیری پرداخت و حضور | استفاده از کد در رزرو | Paid، Attended، Net sales |
| بازگشت | Story یادآوری و پیشنهاد رویداد رسمی | رزرو بعدی | Repeat visits، retention |

برای حفظ هویت ثابت بازینو، پست‌ها چهاراسلایدی با ترتیب ترکی، فارسی، انگلیسی و روسی باقی می‌مانند و کپشن پست ترکی است. Reels طبق نسبت ثابت بازینو تولید می‌شوند: ۸۰٪ ترکی، ۱۰٪ فارسی و ۱۰٪ انگلیسی؛ روسی برای Voice Reel پیش‌فرض نیست. هر محتوای Affiliate باید صریح، غیرگمراه‌کننده و مطابق قالب تصویری مشکی/سرمه‌ای، زرد قهرمانی، آبی نئونی و فضای کنسولی باشد.

هر محتوای Affiliate باید پیش از انتشار preview کامل داشته باشد: رسانه، زبان، کپشن، CTA، هشتگ، لینک، شناسه کمپین و روش اعلام همکاری. انتشار فقط با تأیید صریح همان batch انجام می‌شود و batching ثابت سه پست یا سه Reel حفظ می‌گردد.

## ۷. شفافیت تبلیغاتی و قواعد Meta

اگر Creator یا Publisher در ازای محتوا کمیسیون دریافت می‌کند، محتوا دارای exchange of value است. راهنمای رسمی Instagram می‌گوید محتوایی که از لینک Affiliate درآمد ایجاد می‌کند باید از Paid Partnership Label استفاده کند [2]. راهنمای Meta نیز می‌گوید Creator باید Business Partner را در Branded Content تگ کند و برچسب «Paid partnership with» نمایش داده می‌شود؛ پرداخت Creator خارج از اپلیکیشن انجام می‌شود [3].

بنابراین در قرارداد و محتوای Creator باید هم «همکاری تبلیغاتی/Affiliate» به زبان قابل‌فهم ذکر شود و هم در صورت شمول، ابزار Paid Partnership اینستاگرام استفاده شود. همکار نباید خود را مشتری مستقل جا بزند، نتیجه‌ی قطعی وعده دهد، جایزه یا تخفیف تأییدنشده اعلام کند یا با پیام خصوصی انبوه کاربران را مزاحم شود.

## ۸. معماری فنی MVP

برای اجرای خودکار، یک سرور رویدادمحور باید وب‌هوک‌های کامنت را دریافت کند، کلمه‌ی کلیدی را تطبیق دهد، Private Reply را فقط یک‌بار و در مهلت مجاز ارسال کند، و رویداد لینک را به سیستم رزرو منتقل کند. Meta برای کامنت‌های Media Objects وب‌هوک ارائه می‌کند و مستندات Private Replies نیز دریافت webhook، استفاده از comment ID و ارسال پاسخ خصوصی را توضیح می‌دهد [1] [4]. مستندات فعلی Media Insights همچنین metricهای `shares`، `reposts`، `saved` و `total_interactions` را برای Feed posts و Reels فهرست می‌کند؛ این‌ها در سطح Media هستند و جایگزین انتساب فردی Share نمی‌شوند [5]. به‌روزرسانی رسمی Meta درباره‌ی Collaboration نیز دسترسی به Mediaهای collaborative و metricهای engagement را توضیح می‌دهد، اما آن هم Share را به‌صورت فردبه‌فردِ فرستنده و گیرنده گزارش نمی‌کند [6].

مدل داده‌ی پیشنهادی شامل `affiliate_partners`، `campaigns`، `campaign_members`، `tracking_links`، `instagram_media`، `comment_events`، `private_reply_events`، `click_events`، `friend_consents`، `friend_action_events`، `follow_checks`، `like_attestations`، `share_attestations`، `coupon_issuances`، `leads`، `reservations`، `commission_events`، `payouts` و `audit_logs` است. هر رویداد باید `verification_method`، زمان، Media ID، token، نتیجه و نسخه‌ی policy را نگه دارد. داده‌ی شخصی مشتری برای Affiliate نمایش داده نشود؛ داشبورد همکار باید تجمیعی باشد و فقط مدیر/مالی به شناسه داخلی تراکنش دسترسی داشته باشند.

### منطق ساده‌ی رویداد

```
Comment webhook
  -> idempotency check(comment_id, keyword )
  -> campaign eligibility check
  -> private reply to partner with unique code only
  -> partner shares post/Reel + code message with friend
  -> friend comments the code under the approved post/Reel
  -> friend gate: Follow + Like + Share required
  -> private reply to friend with the exact referral URL
  -> friend opens URL and records handle with consent
  -> Follow API check when IGSID/consent exists; otherwise pending/self-attested
  -> activate link and issue one-time coupon only after policy gate
  -> click/ref attribution on bazino.pro
  -> reservation + payment/attendance confirmation
  -> pending commission
  -> approve after refund window
  -> monthly payout
```

Meta اعلام کرده است که Private Reply فقط یک پیام برای کامنت‌کننده اجازه می‌دهد و باید حداکثر تا هفت روز پس از کامنت ارسال شود [1]. بنابراین سیستم باید idempotency key داشته باشد و برای خطا یا تکرار، پاسخ دوم خودکار نفرستد. اگر Private Reply ارسال نشد، پاسخ عمومی غیرحساس می‌تواند کاربر را به دریافت لینک از Bio هدایت کند؛ نباید توکن، داده‌ی شخصی یا لینک اختصاصی در کامنت عمومی منتشر شود.

## ۹. دو مسیر قابل‌اجرا

| رویکرد | نتیجه و مزیت | Trade-off | هزینه | پیچیدگی راه‌اندازی |
| --- | --- | --- | --- | --- |
| بتای دستی ۲ تا ۴ هفته‌ای | سریع‌ترین راه برای سنجش کامنت، Share، کلیک، رزرو و نرخ تبدیل با ۵ تا ۱۰ همکار | پاسخ خصوصی، ثبت کد و تسویه دستی؛ خطای انسانی بیشتر | کم | کم |
| MVP خودکار متصل به وب‌سایت | وب‌هوک کامنت، Private Reply، لینک یکتا، انتساب و گزارش خودکار | نیازمند اپ Meta، مجوزها، وب‌هوک، دسترسی رزرو و تست App Review | متوسط | متوسط تا زیاد |
| ابزار Affiliate آماده | داشبورد و گزارش آماده | هزینه اشتراک، وابستگی به ابزار و احتمال ناسازگاری با رزرو حضوری/Private Reply | متوسط تا زیاد |

پیشنهاد اجرایی این سند، شروع با بتای دستی برای دو تا چهار هفته و ۵ تا ۱۰ همکار/Creator است. پس از مشاهده‌ی نرخ واقعی Share به Click، Click به Reservation و Reservation به Paid/Attended، MVP خودکار ساخته شود. اگر تیم نیاز دارد بدون بازماندن مرورگر به‌صورت خودکار به کامنت‌ها پاسخ دهد، مسیر MVP باید با وب‌هوک و سرور رویدادمحور اجرا شود؛ برای پایش دوره‌ای یا کارهای زمان‌بندی‌شده، اجرای پس‌زمینه باید در یک سرویس پایدار انجام شود، نه با polling پرهزینه‌ی مداوم.

## ۱۰. KPI و داشبورد

داشبورد مدیر باید برای هر کمپین و همکار این موارد را نشان دهد: Reach، Impressions/Views در صورت دسترسی، Follows attributed، Comments keyword، Private Replies sent/failed، Shares در صورت دسترسی، Link opens، Leads، Reservations، Paid، Attended، فروش خالص، کمیسیون Pending، Approved و Paid out، نرخ لغو/بازپرداخت، و درآمد خالص پس از کمیسیون.

فرمول‌های پایه:

- **Comment activation rate** = کامنت‌های کلمه‌ی کلیدی ÷ Reach

- **Share-to-click rate** = کلیک‌های لینک ÷ Shareهای کل Media؛ این نرخ فقط یک نسبت کمپینی است و ثابت نمی‌کند کدام فرد Share را انجام داده است.

- **Attributed referral rate** = Qualified Referral ÷ کلیک یکتای لینک دعوت؛ این شاخص برای تصمیم کمیسیون معتبرتر از Share خام است.

- **Lead-to-reservation rate** = رزرو ÷ لید

- **Reservation-to-attended rate** = حضور ÷ رزرو

- **Affiliate conversion rate** = مشتری جدید Paid/Attended ÷ کلیک یکتا

- **Net contribution** = فروش خالص − کمیسیون تأییدشده − هزینه‌های مستقیم کمپین

نکته‌ی تحلیلی: تعداد فالوور، کامنت یا Share معیار نهایی موفقیت نیست. معیار اصلی باید **مشتری جدید پرداخت‌کرده/حاضر و درآمد خالص** باشد. تغییر فالوور کل پیج باید با تغییرات روزانه و کمپین‌های دیگر تفکیک شود و به‌تنهایی به یک Affiliate نسبت داده نشود.

## ۱۱. تصمیم‌های لازم پیش از اجرا

پیش از ساخت یا فعال‌سازی سیستم باید درصد کمیسیون، تعریف مشتری جدید، پنجره‌ی Attribution، حداقل تسویه، روش قانونی پرداخت، فرد مسئول اختلاف، فهرست همکاران بتا، کلمات کلیدی هر کمپین، مقصد دقیق لینک‌ها، و وضعیت دسترسی Meta/وب‌هوک مشخص شوند. برای جلوگیری از وعده‌ی غیرواقعی، مبلغ جایزه، تخفیف، تاریخ و قوانین تورنومنت فقط بعد از تأیید در سایت وارد محتوای Affiliate شود.

این سند طرح اجرایی است و جایگزین مشاوره‌ی حقوقی، مالیاتی یا بررسی نهایی سیاست‌های Meta و قوانین محلی نمی‌شود.

## References

[1]: https://developers.facebook.com/documentation/instagram-platform/private-replies "Meta for Developers — Send a Private Reply to a Commenter"

[2]: https://help.instagram.com/616901995832907 "Instagram Help Center — What is considered branded content"

[3]: https://www.facebook.com/business/help/788160621327601 "Meta for Business — About branded content on Facebook, Instagram and Threads"

[4]: https://developers.facebook.com/documentation/instagram-platform/webhooks "Meta for Developers — Setup Webhooks Subscriptions"

[5]: https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights "Meta for Developers — Instagram Media Insights"

[6]: https://developers.facebook.com/blog/post/2026/04/22/instagram-api-updates-for-partnerships-metrics-collaboration-and-engagement/ "Meta for Developers — Instagram API Updates for Partnerships, Metrics, Collaboration, and Engagement"
