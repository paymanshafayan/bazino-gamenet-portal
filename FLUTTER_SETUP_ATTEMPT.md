# نصب Flutter در sandbox — گزارش تلاش طبق قانون ۲

**تاریخ:** ۱۴۰۵/۰۶/۱۱ · **نتیجه:** نصب محلی ممکن نشد؛ **راه‌حل جایگزینِ کامل پیدا شد** (بخش ۴)
و آنچه بدون Flutter قابل تست بود همین حالا انجام شد (بخش ۵).

---

## ۱. پله‌ی اول — تلاش واقعی

### نقشه‌ی دقیق شبکه (اندازه‌گیری‌شده، نه حدس)

| باز ✅ | بسته ❌ |
|---|---|
| `github.com` · `codeload.github.com` · `api.github.com` | `storage.googleapis.com` · `dl.google.com` · `pub.dev` · `pub.dartlang.org` |
| `registry.npmjs.org` | `objects.githubusercontent.com` · `raw.githubusercontent.com` |
| `pypi.org` · `files.pythonhosted.org` | `ghcr.io` · `registry-1.docker.io` · `quay.io` · `mcr.microsoft.com` |
| | `deb.debian.org` · `gitlab.com` · `gitee.com` · همه‌ی میرورهای چینی فلاتر |

نکته‌ی کلیدی: **`codeload` باز است**، یعنی هر فایلی که در درخت یک ریپوی گیت‌هاب commit شده باشد
قابل دریافت است — ولی **release asset ها بسته‌اند** (به `objects.githubusercontent.com` ریدایرکت می‌شوند).

### آنچه امتحان شد

| تلاش | نتیجه |
|---|---|
| `git clone https://github.com/flutter/flutter.git` | ✅ **موفق** — ۲۲۷MB، SDK repo کامل |
| اجرای `flutter --version` | ❌ برای دانلود Dart SDK به `storage.googleapis.com` می‌رود |
| میرورهای رسمی فلاتر (CFUG، SJTU، TUNA) | ❌ همه بسته |
| `FLUTTER_STORAGE_BASE_URL` به میرور | ❌ میروری در دسترس نیست |
| Dart SDK از npm (`dart-sdk`, `flutter-sdk`, …) | ❌ وجود ندارد. `sass-embedded` فقط یک Dart VM محدود دارد، نه SDK |
| Dart SDK از PyPI | ❌ وجود ندارد |
| ایمیج داکرِ آماده‌ی فلاتر (`cirruslabs/flutter`) | ❌ هر سه رجیستری بسته |
| `apt-get` | ❌ مخزن دبیان بسته |
| **ریپوهای گیت‌هاب که SDK را commit کرده‌اند** | ✅ پیدا شدند، ❌ ولی هیچ‌کدام لینوکس نیستند (پایین) |

### جست‌وجوی SDK ویندورشده در گیت‌هاب

با `gh api search/code` روی مسیر `bin/cache/dart-sdk` هفت ریپو پیدا شد:

| ریپو | نسخه | پلتفرم موتور |
|---|---|---|
| `pudding0111/ShinkenOnline` | Flutter 3.27.1 / Dart 3.6.0 | `darwin-x64` (مک) |
| `arthurConforti80/FlutterEcommerce` | Dart 3.10.1 | `darwin-x64` |
| `choconus2/flutter` | Flutter 3.10.6 / Dart 3.0.6 | `darwin-x64` + اندروید |
| `hrithik232/Save-Max` | Dart 2.14.4 | `windows-x64` |
| `ajithshettyy/flutter-sdk` | Dart 2.12.3 | `windows-x64` |
| `dgh1818/flutter_flutter` | — | `ohos-arm64` |

و شش ریپوی دیگر با `dart-sdk/` مستقل — **هر شش‌تا ویندوزی** (`dart.exe`, `dartaotruntime.exe`).

**هیچ Dart SDK لینوکس x64 ایندکس‌شده‌ای روی گیت‌هاب وجود ندارد.**

### دیوار دوم: pub.dev

حتی با SDK هم `flutter pub get` شکست می‌خورد: اپ ۱۲ وابستگی مستقیم دارد
(`provider`, `http`, `intl`, `google_fonts`, `web_socket_channel`, `shared_preferences`,
`speech_to_text`, `permission_handler`, `video_player`, `flutter_tts`, `cupertino_icons`, `flutter_lints`)
به‌علاوه‌ی ده‌ها وابستگی غیرمستقیم — و `pub.dev` بسته است.

> یعنی حتی اگر کسی SDK را آپلود کند، باز هم `.pub-cache` هم لازم است. **آپلود دستی راه‌حل خوبی نیست.**

---

## ۲. پله‌ی دوم — تحقیق وب

* [docs.flutter.dev/community/china](https://docs.flutter.dev/community/china) — میرورهای مورد تأیید
  (`flutter-io.cn`, `mirror.sjtu.edu.cn`, `mirrors.tuna.tsinghua.edu.cn`): **همه در این sandbox بسته‌اند.**
* [docs.flutter.dev/install/archive](https://docs.flutter.dev/install/archive) — «برای کانال main بسته‌ی
  نصبی وجود ندارد؛ SDK را مستقیم از گیت‌هاب clone کنید و سپس `flutter --version` بزنید تا وابستگی‌ها
  دانلود شوند.» ← دقیقاً همان قدم دوم است که به GCS نیاز دارد.
* [dart.dev/get-dart](https://dart.dev/get-dart) — همه‌ی مسیرهای نصب Dart (apt، brew، choco، deb، zip، داکر)
  از هاست‌های بسته می‌آیند.

---

## ۳. کشف تعیین‌کننده — ورک‌فلوی فلاتر از قبل در ریپو هست

```
$ gh workflow list
Backend & Frontend Build + Tests   active   332157646
Deploy to Railway & Purge CDN      active   333641444
Flutter Build APK & IPA            active   325520422   ← .github/workflows/main.yml
```

`main.yml` از `subosito/flutter-action@v2` استفاده می‌کند و روی رانر گیت‌هاب (اینترنت آزاد) فلاتر را
نصب و APK می‌سازد. **پس زیرساخت تست اپ موبایل از قبل وجود دارد** و فقط دو محدودیت دارد:

```yaml
on:
  push:
    branches: [main]          # ← فقط main
    paths: ['flutter_app/**'] # ← فقط وقتی خود اپ عوض شود
# workflow_dispatch ندارد → قابل اجرای دستی نیست
```

و من **نمی‌توانم فایل ورک‌فلو را تغییر دهم**:

```
! [remote rejected] refusing to allow a GitHub App to create or update workflow
  `.github/workflows/flutter-probe.yml` without `workflows` permission
```

همچنین دانلود لاگ اجراها بسته است (`results-receiver.actions.githubusercontent.com`)،
ولی **وضعیت هر مرحله و annotationها از طریق `api.github.com` خواندنی‌اند** ✅

---

## ۴. پله‌ی سوم — دقیقاً چه چیزی از کاربر لازم است

**آپلود SDK را پیشنهاد نمی‌کنم** (چند صد مگابایت + `.pub-cache` + آلودگی ریپو).
درخواست درست، **یک فایل ورک‌فلو** است. محتوای کامل در چت داده شده است (قاعده‌ی ۶) و باید در
`.github/workflows/flutter-test.yml` قرار بگیرد.

آن ورک‌فلو:
1. روی **هر برنچ** و با **`workflow_dispatch`** اجرا می‌شود؛
2. `flutter analyze` و `flutter test` و `flutter build web` را اجرا می‌کند؛
3. **گزارش را داخل خود ریپو commit می‌کند** (`flutter_app/CI_REPORT.md`) — چون دانلود لاگ بسته است،
   این تنها راهی است که من نتیجه را کامل ببینم.

پس از آن، چرخه‌ی تست اپ موبایل کاملاً در دسترس من است: push → اجرا → خواندن گزارش → رفع → تکرار.

---

## ۵. آنچه بدون Flutter همین حالا تست شد

اپ فلاتر با سرور از طریق HTTP حرف می‌زند، پس **قرارداد API** بدون SDK هم قابل راستی‌آزمایی است —
و این دقیقاً بزرگ‌ترین ریسکِ تغییرات اخیر سرور بود (حذف fallback مهمان، per-user شدن تراکنش‌ها و
کوپن‌ها، تغییر شکل شناسه‌ها).

`tests/flutter-contract.mjs` سورس دارت را می‌خواند (۲۶ مسیر API و ۷۳ کلید JSON استخراج شد) و همان‌ها
را روی سرور زنده می‌آزماید:

```
30/30 passed

POST /api/auth/register → 200 + token + user        ✅
GET  /api/auth/me → data['user']                     ✅
۱۱ مسیر GET با توکن                                  ✅
۴ مسیر GET بدون توکن (حالت مهمان) → آرایه، بدون خطا  ✅
UserState: username, email, loyaltyPoints, role      ✅
GameSystem: id, name, type, hourlyRate, isActive…    ✅
POST /api/systems/reserve                            ✅
POST /api/loyalty/redeem (فقط points) → LOYAL-4D6A…  ✅
سازگاری عقب‌رو با بدنه‌ی قدیمی اپ                     ✅
```

**نتیجه‌ی مهم:** تغییرات امنیتی اخیر سرور اپ موبایل را نشکسته‌اند. اپ توکن می‌فرستد
(`_authHeaders()` در `lib/models.dart:685`)، پس per-user شدن داده‌ها برایش درست کار می‌کند و
کاربر مهمانِ اپ به‌جای کرش، لیست خالی می‌گیرد.

**اما این جایگزین تست واقعی UI نیست:** رندر صفحه‌ها، ناوبری، پخش ویدیو، میکروفون و WebSocket
همچنان **تست‌نشده** باقی می‌مانند تا وقتی ورک‌فلو اضافه شود.
