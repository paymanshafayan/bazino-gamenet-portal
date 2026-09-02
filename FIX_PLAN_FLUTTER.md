# پلن رفع — اپ موبایل فلاتر (اولین اجرای واقعی CI)

**وضعیت:** پیش‌نویس — منتظر «شروع کن». **هیچ کد محصولی هنوز تغییر نکرده است.**
**منبع:** `FLUTTER_CI_REPORT.md` — اجرای `33646693262` روی Flutter 3.47.2 / Dart 3.13.2

---

## ۰. ⚠️ تصحیح مهم: جاب سبز است، ولی تست سبز نیست

نشان سبز گیت‌هاب گمراه‌کننده است و **تقصیر خودِ من است**: در ورک‌فلویی که به شما دادم عمداً
`set +e` گذاشتم تا اگر یک مرحله بشکند، بقیه هم اجرا شوند و گزارش کامل commit شود. عارضه‌اش این
است که جاب هیچ‌وقت قرمز نمی‌شود. جدول واقعی:

| مرحله | کد خروجی | نتیجه |
|---|---|---|
| `flutter --version` | 0 | ✅ Flutter 3.47.2 · Dart 3.13.2 |
| `flutter pub get` | 0 | ✅ همه‌ی ۱۲ وابستگی resolve شدند |
| **`flutter analyze`** | **1** | ❌ **۴ ایراد** |
| **`flutter test`** | **1** | ❌ **۰ پاس، ۱ شکست** |
| `flutter build web` | 0 | ✅ خروجی ۴۵ مگابایت ساخته شد |

خبر خوب: بیلد وب کامل **موفق** است — یعنی کل کد اپ واقعاً کامپایل می‌شود و خطای نوع یا
API ندارد. دو مورد شکست‌خورده هر دو قابل رفع‌اند و در ادامه آمده‌اند.

> در پلن، اصلاح خود ورک‌فلو هم آمده تا از این پس نشانِ سبز واقعاً یعنی سبز (بخش ۴).

---

## ۱. ❌ `flutter test` — فایل تست، قالب پیش‌فرض فلاتر است

```
❌ Counter increments smoke test (failed)
Expected: exactly one matching candidate
  Actual: _TextWidgetFinder:<Found 0 widgets with text "0": []>
  test/widget_test.dart:19
::error::0 tests passed, 1 failed.
```

`flutter_app/test/widget_test.dart` هرگز نوشته نشده — همان فایلی است که `flutter create`
می‌سازد و دنبال یک اپ شمارنده می‌گردد:

```dart
await tester.pumpWidget(const BazinoApp());
expect(find.text('0'), findsOneWidget);      // اپ بازینو شمارنده ندارد
await tester.tap(find.byIcon(Icons.add));    // چنین آیکونی وجود ندارد
```

پس این تست **همیشه** شکست می‌خورد و هیچ‌وقت چیزی از اپ را نسنجیده است.

**تغییر پیشنهادی:** جایگزینی با تست‌هایی که واقعاً به اپ مربوط‌اند:

1. **smoke test رندر:** `BazinoApp` بدون استثنا ساخته می‌شود و `MaterialApp` با عنوان
   `Bazino Esports Hub` می‌دهد. چون `_loadIntroPreference()` از `SharedPreferences` می‌خواند،
   تست باید `SharedPreferences.setMockInitialValues({})` بگذارد و بین pumpها `pumpAndSettle` بزند
   (اولین فریم یک `CircularProgressIndicator` است).
2. **تست حالت intro:** با `{'bazino_intro_seen_v1': false}` صفحه‌ی intro و با `true` صفحه‌ی اصلی.
3. **تست خالص روی مدل‌ها:** `lib/models.dart` منطق parse کردن JSON دارد؛ چند `fromJson` با نمونه‌ی
   واقعی پاسخ سرور تست می‌شود. این‌ها همان‌هایی هستند که اگر قرارداد API عوض شود می‌شکنند.

> نکته‌ای که از HANDOFF پروژه‌ی Mobilo شما آموختم و اینجا هم صدق می‌کند:
> «`flutter test` فقط فایل‌هایی را کامپایل می‌کند که تست‌ها import می‌کنند — فایل‌های UI توسط
> هیچ تستی import نمی‌شوند». پس تست‌های بالا عمداً `main.dart` را import می‌کنند تا درخت UI
> واقعاً کامپایل شود.

---

## ۲. ❌ `flutter analyze` — چهار API منسوخ در دستیار صوتی

```
info • 'localeId' is deprecated       • lib/screens/jarvis_assistant.dart:224:7
info • 'listenFor' is deprecated      • lib/screens/jarvis_assistant.dart:225:7
info • 'pauseFor' is deprecated       • lib/screens/jarvis_assistant.dart:226:7
info • 'partialResults' is deprecated • lib/screens/jarvis_assistant.dart:227:7
4 issues found.
```

`flutter analyze` هر ایرادی — حتی `info` — را شکست حساب می‌کند، پس این چهار مورد کل مرحله را قرمز می‌کنند.

**راستی‌آزمایی از سورس واقعی پکیج (نه از حافظه):** ریپوی `csdcorp/speech_to_text` کلون شد و امضای
تابع خوانده شد (`speech_to_text/lib/speech_to_text.dart:444`):

```dart
Future listen(
    {SpeechResultListener? onResult,
     @Deprecated('Use SpeechListenOptions.listenFor instead')      Duration? listenFor,
     @Deprecated('Use SpeechListenOptions.pauseFor instead')       Duration? pauseFor,
     @Deprecated('Use SpeechListenOptions.localeId instead')       String? localeId,
     SpeechSoundLevelChange? onSoundLevelChange,
     @Deprecated('Use SpeechListenOptions.partialResults instead') partialResults = true,
     ...
     SpeechListenOptions? listenOptions}) async {
```

و کلاس گزینه‌ها (`speech_to_text_platform_interface.dart:58`) دقیقاً همین فیلدها را دارد:
`localeId` · `listenFor` · `pauseFor` · `partialResults` · `cancelOnError` · `onDevice` ·
`listenMode` · `sampleRate` · `autoPunctuation` · `enableHapticFeedback`.

**تغییر پیشنهادی** در `lib/screens/jarvis_assistant.dart` (خطوط ۲۲۳–۲۲۷):

```dart
await _speech.listen(
  listenOptions: stt.SpeechListenOptions(
    localeId: localeId,
    listenFor: const Duration(minutes: 2),
    pauseFor: const Duration(seconds: 2),
    partialResults: true,
  ),
  onSoundLevelChange: (level) { ... },   // بدون تغییر
  onResult: (result) { ... },            // بدون تغییر
);
```

`onResult` و `onSoundLevelChange` منسوخ **نیستند** و سر جایشان می‌مانند. رفتار عوض نمی‌شود؛
فقط همان مقادیر از مسیر پشتیبانی‌شده رد می‌شوند.

---

## ۳. 🟠 یافته‌ی جانبی — کل `pubspec.lock` به میرور چینی اشاره می‌کند

```
$ grep -c 'pub.flutter-io.cn' flutter_app/pubspec.lock   →  74
$ grep -c 'pub.dev'           flutter_app/pubspec.lock   →   0
```

هر ۷۴ وابستگی، `url: "https://pub.flutter-io.cn"` دارند. یعنی lockfile روی ماشینی ساخته شده که
`PUB_HOSTED_URL` روی میرور CFUG بوده. سه پیامد:

* **زنجیره‌ی تأمین:** بیلدهای CI و هر توسعه‌دهنده‌ی جدید، پکیج‌ها را از یک میرور شخص ثالث می‌گیرند نه از pub.dev.
* **شکنندگی:** اگر آن میرور از دسترس خارج شود، `pub get` روی CI می‌شکند.
* `sha256` ها ثبت شده‌اند، پس دستکاری محتوا تشخیص داده می‌شود — ولی همچنان بهتر است مبدأ رسمی باشد.

**تغییر پیشنهادی:** بازتولید lockfile با مبدأ رسمی. چون `pub.dev` در sandbox بسته است، این کار
باید **در CI** انجام شود: یک مرحله که `flutter pub get` را با `PUB_HOSTED_URL` پیش‌فرض اجرا کند و
`pubspec.lock` به‌روزشده را مثل گزارش، به برنچ commit کند. **این مورد نیاز به تأیید جداگانه‌ی شما
دارد** چون نسخه‌ها ممکن است جابه‌جا شوند.

---

## ۴. اصلاح ورک‌فلو — سبز یعنی سبز

ورک‌فلوی فعلی هیچ‌وقت قرمز نمی‌شود. اصلاح پیشنهادی: گزارش همچنان کامل ساخته و commit شود، ولی
**در انتها اگر `analyze` یا `test` شکست خورده باشد، جاب با خطا تمام شود.** یک بلوک کوتاه به آخر
ورک‌فلو اضافه می‌شود؛ نسخه‌ی کامل YAML در چت داده خواهد شد (قاعده‌ی ۶) چون من اجازه‌ی
تغییر `.github/workflows/*` را ندارم.

---

## ۵. معیار پذیرش

1. `flutter analyze` → **exit 0** (۰ ایراد).
2. `flutter test` → حداقل **۴ تست، همه پاس**، شامل رندر واقعی `BazinoApp`.
3. `flutter build web` همچنان **exit 0**.
4. `tests/dart-syntax-check.py` → ۰ خطای نحوی.
5. `tests/flutter-contract.mjs` → همچنان ۳۰/۳۰.
6. رفتار دستیار صوتی تغییر نکند (همان locale، همان مدت‌ها، همان partial results).
7. جاب CI در صورت شکست هر مرحله، **قرمز** شود.

---

## ۶. آنچه همچنان تست‌نشده می‌ماند

بیلد وب سبز است، ولی `flutter build apk` در این ورک‌فلو اجرا نمی‌شود (ورک‌فلوی جدای
`main.yml` این کار را فقط روی `main` انجام می‌دهد). خطاهای مخصوص اندروید — Gradle، مانیفست،
مجوزها — تا وقتی آن اجرا نشود دیده نمی‌شوند. پیشنهاد می‌کنم بعد از سبز شدن این دو مورد،
یک job اندروید هم اضافه کنیم.
