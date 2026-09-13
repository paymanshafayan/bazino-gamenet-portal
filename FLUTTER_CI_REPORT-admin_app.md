# Flutter CI report — admin_app

- commit: `687567463f9235e8d847a452cd32e763e0504710`
- branch: `arena/01a089a9-bazino-gamenet-portal`
- run:    34742528639
- date:   2026-09-13 06:21 UTC

## flutter --version
```
Flutter 3.47.4 • channel stable • https://github.com/flutter/flutter.git
Framework • revision 9584c6713b (2 days ago) • 2026-09-10 15:25:10 -0700
Engine • hash 0e228ec8c8d2abc9fcf1d053e8a40665bb859ec7 (revision 06a2e2a110) (9 days ago) • 2026-09-03 16:07:13.000Z
Tools • Dart 3.13.3 • DevTools 2.60.0
```
**exit 0 — OK**

## flutter pub get
```
Resolving dependencies...
Downloading packages...
+ async 2.13.1
+ boolean_selector 2.1.2
+ characters 1.4.1
+ clock 1.1.3
+ collection 1.19.1
+ cross_file 0.3.5+5
+ cupertino_icons 1.0.9
+ fake_async 1.3.3
+ ffi 2.2.0
+ file 7.0.1
+ file_picker 8.3.7 (12.3.0 available)
+ flutter 0.0.0 from sdk flutter
+ flutter_lints 4.0.0 (6.0.0 available)
+ flutter_localizations 0.0.0 from sdk flutter
+ flutter_plugin_android_lifecycle 2.0.35
+ flutter_test 0.0.0 from sdk flutter
+ flutter_web_plugins 0.0.0 from sdk flutter
+ http 1.6.0
+ http_parser 4.1.2
+ intl 0.20.3
+ leak_tracker 11.0.2
+ leak_tracker_flutter_testing 3.0.10
+ leak_tracker_testing 3.0.2
+ lints 4.0.0 (6.1.0 available)
+ matcher 0.12.20
+ material_color_utilities 0.13.0 (0.13.1 available)
+ meta 1.19.0
+ nested 1.0.0
+ path 1.9.1
+ path_provider_linux 2.2.2
+ path_provider_platform_interface 2.1.3
+ path_provider_windows 2.3.0
+ platform 3.2.0
+ plugin_platform_interface 2.1.8
+ provider 6.1.5+1
+ shared_preferences 2.5.5
+ shared_preferences_android 2.4.28
+ shared_preferences_foundation 2.5.7
+ shared_preferences_linux 2.4.1
+ shared_preferences_platform_interface 2.4.2
+ shared_preferences_web 2.4.3
+ shared_preferences_windows 2.4.1
+ sky_engine 0.0.0 from sdk flutter
+ source_span 1.10.2
+ stack_trace 1.12.2
+ stream_channel 2.1.4
+ string_scanner 1.4.1
+ term_glyph 1.2.2
+ test_api 0.7.12 (0.7.14 available)
+ typed_data 1.4.0
+ url_launcher 6.3.2
+ url_launcher_android 6.3.33
+ url_launcher_ios 6.4.2
+ url_launcher_linux 3.2.3
+ url_launcher_macos 3.2.6
+ url_launcher_platform_interface 2.3.2
+ url_launcher_web 2.4.3
+ url_launcher_windows 3.1.6
+ vector_math 2.4.2
+ vm_service 15.3.0
+ web 1.1.1
+ win32 5.15.0 (6.4.0 available)
+ xdg_directories 1.1.0
Changed 63 dependencies!
6 packages have newer versions incompatible with dependency constraints.
Try `flutter pub outdated` for more information.
Upgrading analysis_options.yaml to exclude build and platform directories.
```
**exit 0 — OK**

## flutter analyze
```
Analyzing admin_app...                                          
No issues found! (ran in 8.9s)
```
**exit 0 — OK**

## flutter test
```

::group::✅ Passing tests
✅ بدون لاگین: فقط صفحهٔ لاگین رندر می‌شود و هیچ بخشی دیده نمی‌شود
✅ با نشست معتبر: پوستهٔ مدیریت با داشبورد ساخته می‌شود
✅ 401 از API (انقضای توکن) → خروج خودکار به صفحهٔ لاگین
✅ خروج دستی → برگشت به صفحهٔ لاگین
✅ فرم ورود خالی → پیام خطا بدون ارسال
✅ بخش‌های امنیتی (کلیدهای API/توکن‌ها) در اپ وجود ندارند
✅ فهرست بخش‌ها: هر ۲۳ بخش عملیاتی موجودند و apiKeys نیست
::endgroup::
::group::❌ AuthController: خروج، توکن و نام کاربری ذخیره‌شده را پاک می‌کند (failed)
Expected: empty
  Actual: 'admin'

package:matcher                                     expect
package:flutter_test/src/widget_tester.dart 473:18  expect
test/widget_test.dart 150:5                         main.<fn>
::endgroup::
::group::✅ Passing tests
✅ AppLang: فارسی پیش‌فرض، تغییر زبان ذخیره می‌شود
::endgroup::

::error::8 tests passed, 1 failed.
```
**exit 1 — FAILED**

## flutter build web
```
Compiling lib/main.dart for the Web...                          
Wasm dry run succeeded. Consider building and testing your application with the `--wasm` flag. See docs for more info: https://docs.flutter.dev/platform-integration/web/wasm
Use --no-wasm-dry-run to disable these warnings.
Font asset "CupertinoIcons.ttf" was tree-shaken, reducing it from 257628 to 1472 bytes (99.4% reduction). Tree-shaking can be disabled by providing the --no-tree-shake-icons flag when building your app.
Font asset "MaterialIcons-Regular.otf" was tree-shaken, reducing it from 1645184 to 17744 bytes (98.9% reduction). Tree-shaking can be disabled by providing the --no-tree-shake-icons flag when building your app.
Compiling lib/main.dart for the Web...                             39.9s
✓ Built build/web
```
**exit 0 — OK**

## flutter build apk
```
Upgrading gradle.properties
Upgrading gradle.properties
Running Gradle task 'assembleRelease'...                        
Warning: Flutter support for your project's Gradle version (8.14.3) will soon be dropped. Please upgrade your Gradle version to a version of at least 9.1.0 soon.
Alternatively, use the flag "--android-skip-build-dependency-validation" to bypass this check.

Potential fix: Your project's gradle version is typically defined in the gradle wrapper file. By default, this can be found at /home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/gradle/wrapper/gradle-wrapper.properties. 
For more information, see https://docs.gradle.org/current/userguide/gradle_wrapper.html.

Warning: Flutter support for your project's Android Gradle Plugin version (Android Gradle Plugin version 8.11.1) will soon be dropped. Please upgrade your Android Gradle Plugin version to a version of at least Android Gradle Plugin version 9.0.1 soon.
Alternatively, use the flag "--android-skip-build-dependency-validation" to bypass this check.

Potential fix: Your project's AGP version is typically defined in the plugins block of the `settings.gradle` file (/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/settings.gradle), by a plugin with the id of com.android.application. 
If you don't see a plugins block, your project was likely created with an older template version. In this case it is most likely defined in the top-level build.gradle file (/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/build.gradle) by the following line in the dependencies block of the buildscript: "classpath 'com.android.tools.build:gradle:<version>'".

Warning: Flutter support for your project's Kotlin version (2.2.21) will soon be dropped. Please upgrade your Kotlin version to a version of at least 2.3.20 soon.
Alternatively, use the flag "--android-skip-build-dependency-validation" to bypass this check.

Potential fix: Your project's KGP version is typically defined in the plugins block of the `settings.gradle` file (/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/settings.gradle), by a plugin with the id of org.jetbrains.kotlin.android. 
If you don't see a plugins block, your project was likely created with an older template version, in which case it is most likely defined in the top-level build.gradle file (/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/build.gradle) by the ext.kotlin_version property.

Font asset "MaterialIcons-Regular.otf" was tree-shaken, reducing it from 1645184 to 11972 bytes (99.3% reduction). Tree-shaking can be disabled by providing the --no-tree-shake-icons flag when building your app.
Caught exception: Already watching path: /home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android
Running Gradle task 'assembleRelease'...                          250.0s
✓ Built build/app/outputs/flutter-apk/app-release.apk (55.7MB)
```
**exit 0 — OK**

## Summary
```
flutter --version=0
flutter pub get=0
flutter analyze=0
flutter test=1
flutter build web=0
flutter build apk=0
```

web size: 41M
apk size: 54M
