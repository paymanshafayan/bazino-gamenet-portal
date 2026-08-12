---
name: web-performance-optimizer
description: ممیزی و بهینه‌سازی عملی عملکرد هر پروژه وب با تمرکز بر LCP، CLS، INP/TBT، Main Thread، payload، cache policy، third-party code، تصاویر، فونت‌ها و JavaScript استفاده‌نشده.
version: 1.0.0
---

# Web Performance Optimizer

این مهارت برای تبدیل گزارش‌های Lighthouse، PageSpeed Insights، GTmetrix یا Chrome DevTools به تغییرات کدنویسیِ قابل‌اندازه‌گیری استفاده می‌شود. هدف فقط بهتر کردن عدد گزارش نیست؛ باید بدون آسیب به قابلیت‌ها، امنیت، دسترس‌پذیری یا طراحی، تجربه بازدید اول و بازدید مجدد بهتر شود.

## ورودی‌های لازم

حداقل یکی از موارد زیر را دریافت یا پیدا کن:

- URL محیط production یا preview.
- گزارش Lighthouse / GTmetrix / PageSpeed یا HAR.
- ریپوی پروژه و دستورهای build/test.

اگر URL یا گزارش وجود ندارد، ابتدا از روی ریپو یک baseline بساز. اگر اجرای مرورگر یا ابزار ممیزی در محیط ممکن نیست، محدودیت را شفاف بگو و با تحلیل build، network و کد ادامه بده.

## اصول غیرقابل‌مذاکره

1. **اول شواهد، بعد تغییر:** هر پیشنهاد باید به یک URL، chunk، تصویر، کامپوننت، header یا task قابل‌مشاهده وصل باشد.
2. **به production درست نگاه کن:** هش فایل‌ها، HTML، پاسخ headerها و providerهای CDN محیط deployed را با branch محلی اشتباه نگیر. گزارش دارای asset hash قدیمی را به‌عنوان baseline قدیمی علامت بزن.
3. **LCP را قربانی نکن:** تصویر و محتوای واقعی LCP را lazy نکن. برای LCP، ابعاد، `srcset`/`sizes`، `fetchpriority="high"` و مسیر رندر را بررسی کن.
4. **CLS را با فضای رزرو‌شده رفع کن:** برای media ابعاد یا `aspect-ratio` بده؛ از swap دیرهنگام فونت، banner، داده یا header جلوگیری کن. placeholder باید ابعاد نهایی را حفظ کند.
5. **کاربران را فریب نده:** حذف analytics، font یا محتوای قابل‌مشاهده باید آگاهانه، قابل‌توضیح و سازگار با نیاز محصول باشد. هیچ‌وقت با مخفی‌کردن محتوا فقط برای گزارش، معیارها را دستکاری نکن.
6. **امنیت را ضعیف نکن:** CSP، cache header، CORS و third-party policy باید متناسب با نوع deploy باشند. `unsafe-*` فقط در صورت نیاز واقعی و با توضیح استفاده شود.
7. **تغییر کوچک و قابل‌برگشت:** هر اصلاح باید محدود، قابل تست و همراه با دلیل باشد. از بازنویسی کامل framework بدون ROI روشن خودداری کن.

---

## گردش کار

### 1) شناسایی محیط و baseline

1. `package.json`، lockfile، config build، CDN/deploy config و server/static headers را بررسی کن.
2. نوع پروژه را تشخیص بده: SPA، SSR، SSG، static hosting، Node server، CDN Pages یا ترکیبی.
3. دستورات موجود برای lint، test، build و performance guard را پیدا کن.
4. از گزارش، این موارد را در یک جدول ثبت کن:
   - LCP element و breakdown آن: TTFB، load delay، load time، render delay
   - CLS element و trigger احتمالی
   - long tasks / main-thread categories
   - critical request chains
   - transfer size و unused JS/CSS
   - third-party providers و cache TTL
5. برای هر asset، مشخص کن آیا هش/URL آن متعلق به deploy فعلی است یا گزارش قدیمی است.

### 2) اولویت‌بندی

کارها را بر اساس «اثر × اطمینان ÷ ریسک» مرتب کن. معمولاً ترتیب درست این است:

1. LCP render delay، درخواست‌های بحرانی و تصویر LCP
2. CLS و layoutهای دیرهنگام
3. JavaScript اولیه، vendor runtime و long taskها
4. تصاویر بزرگ، responsive images و third-party media
5. fontها و CSS غیرضروری
6. cache policy و providerهای third-party
7. بهینه‌سازی‌های کوچک‌تر

برای هر مورد بنویس: **شاهد، علت محتمل، اصلاح پیشنهادی، ریسک، روش اعتبارسنجی**.

### 3) تشخیص و اصلاح الگوهای رایج

#### A. Critical request chain و فونت‌ها

- `@import` CSS، stylesheetهای blocking، preconnectهای بدون مصرف و تعداد family/weight/font subset را بررسی کن.
- اگر فونت باعث CLS می‌شود، یکی از راه‌های زیر را با توجه به محصول انتخاب کن:
  - self-hosting و subset کردن فونت،
  - کاهش family/weight،
  - استفاده از fallback metric-compatible،
  - حذف font خارجی در paint اولیه یا حذف کامل آن.
- فقط deferred کردن فونت کافی نیست اگر بعداً swap و CLS ایجاد می‌کند.

#### B. تصویر LCP و تصویرهای بزرگ

- تصویر LCP باید `width` و `height` یا ratio داشته باشد، eager باشد و candidate درست `srcset` را انتخاب کند.
- `sizes` باید با عرض واقعی نمایش هماهنگ باشد؛ `100vw` برای mediaای که واقعاً تمام viewport نیست، باعث دانلود نسخه بزرگ می‌شود.
- برای content imageها از AVIF/WebP، کیفیت مناسب، CDN resizing و `srcset` استفاده کن.
- تصاویر خارج از viewport باید lazy باشند؛ تصویر LCP نباید lazy شود.
- در صورت امکان critical media را same-origin/CDN کنترل‌شده نگه دار تا وابستگی third-party کم شود.

#### C. JavaScript، unused JS و Main Thread

- asset manifest/build output را بررسی کن؛ فقط به transfer size اکتفا نکن.
- route، modal، admin panel، code editor، ZIP parser، chart، SDK و ویژگی‌های نادر را با `lazy()`/dynamic import جدا کن.
- کد مورد نیاز LCP را از صفحه کامل پایین‌صفحه جدا کن؛ یک LCP shell کوچک می‌تواند قبل از chunk سنگین render شود.
- data fetch، JSON parse و updateهای غیرضروری را پس از paint یا idle اجرا کن؛ اما داده لازم برای LCP را به تأخیر نینداز.
- در React، updateهای غیر فوری را با `startTransition` اجرا کن؛ در هر framework از scheduler معادل استفاده کن.
- dependency سنگین را فقط با آزمایش build و smoke test جایگزین کن. runtime compatibility، animation و hydration را بررسی کن.
- کد server-only را هرگز داخل browser bundle وارد نکن.

#### D. CLS و Style/Layout

- برای image، iframe، ad، widget و async section فضای نهایی رزرو کن.
- placeholderهای lazy section باید حداقل ارتفاع واقع‌بینانه داشته باشند.
- تغییر late در header، navigation، font، carousel، cookie banner و داده remote را بررسی کن.
- mountهای بزرگ را پس از LCP یا در idle انجام بده، ولی جای محتوای اولیه را ثابت نگه دار.
- برای کاربر دارای `prefers-reduced-motion` و دستگاه‌های کند، animation و layout readهای پیوسته را محدود کن.

#### E. Third-party و Cache

- هر provider را در دسته‌های ضروری، قابل‌تعویق و قابل‌حذف قرار بده.
- برای providerی که header/cache آن تحت کنترل شما نیست، TTL را «رفع» نکن؛ یا آن را حذف/تعویق بده یا محدودیت مالکیت را گزارش کن.
- اگر analytics در CDN inject می‌شود، هم config provider و هم نوع deploy را بررسی کن:
  - Node/SSR: header را در server اعمال کن.
  - Cloudflare Pages/static: فایل `_headers` یا config معادل deploy را اضافه کن.
- برای assets hashدار `Cache-Control: public, max-age=31536000, immutable` مناسب است؛ HTML معمولاً نباید immutable باشد.
- CSP باید scriptهای third-party غیرضروری را قبل از fetch مسدود کند، نه اینکه بعد از دانلود آن‌ها را remove کند.

### 4) پیاده‌سازی

1. یک اصلاح با بیشترین ROI و کمترین ریسک را انجام بده.
2. بعد از هر گروه تغییر، diff را بررسی کن.
3. guard یا test کد اضافه کن تا regression مهم دوباره وارد نشود؛ نمونه‌ها:
   - نبود font CDN در HTML اولیه
   - eager بودن LCP و صحیح بودن `sizes`
   - جدا بودن chunk admin/editor/ZIP parser
   - وجود cache/CSP مناسب در مسیر deploy واقعی
4. commentها باید دلیل performance decision را توضیح دهند، نه فقط کاری که کد انجام می‌دهد.

### 5) اعتبارسنجی نهایی

حداقل این ترتیب را اجرا کن:

```bash
# دستورهای واقعی پروژه را جایگزین کن
npm run lint
npm test
npm run build
git diff --check
```

سپس در صورت امکان:

- build manifest یا output chunk size را قبل/بعد مقایسه کن.
- در preview، Network را برای LCP، font، third-party و chunkهای lazy بررسی کن.
- headerهای production/static output را بررسی کن.
- Lighthouse/GTmetrix را فقط بعد از deploy با asset hash جدید دوباره اجرا کن.

اگر test یا build به علت محدودیت شبکه/credential/native dependency اجرا نشد، علت دقیق و بخش‌های موفق را گزارش کن؛ آن را به‌عنوان pass اعلام نکن.

---

## قالب خروجی نهایی

گزارش را مختصر ولی قابل اقدام ارائه کن:

1. **خلاصه اثر:** چه bottleneckهایی رفع شد.
2. **تغییرات:** فایل‌ها و دلیل هر تغییر.
3. **اندازه‌گیری:** قبل/بعد واقعی build یا benchmark؛ در صورت نبود benchmark، «مورد انتظار» را جدا بنویس.
4. **اعتبارسنجی:** دستورهای اجراشده و وضعیت آن‌ها.
5. **موارد خارج از کنترل:** مثل TTL provider یا extension مرورگر.
6. **Deploy و re-test:** دقیقاً چه چیزی باید deploy شود و چه گزارش/URL جدیدی باید بررسی شود.

## معیار پذیرش

این مهارت زمانی کامل است که:

- حداقل یک bottleneck واقعی با تغییر کد/config رفع یا کاهش یافته باشد.
- قابلیت اصلی و ظاهر صفحه آسیب ندیده باشد.
- lint/build/testهای قابل اجرا پاس شده باشند.
- تغییرات بدون trailing whitespace و با diff تمیز باشند.
- اصلاحات برای نوع deploy واقعی (Node، static یا CDN) اعمال شده باشند.
- یک guard مناسب برای مهم‌ترین regression اضافه شده باشد.
