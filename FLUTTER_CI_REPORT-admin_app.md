# Flutter CI report — admin_app

- commit: `21f7f5fca729c5895f1ed7991ccd08779e2aeb56`
- branch: `arena/01a089a9-bazino-gamenet-portal`
- run:    34741804128
- date:   2026-09-13 06:03 UTC

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

  error • Undefined name 'lang'. Try correcting the name to one that is defined, or defining the name • lib/sections/jarvis_section.dart:303:34 • undefined_identifier
  error • Undefined name 'lang'. Try correcting the name to one that is defined, or defining the name • lib/sections/jarvis_section.dart:309:34 • undefined_identifier

2 issues found. (ran in 9.0s)
```
**exit 1 — FAILED**

## flutter test
```

lib/sections/jarvis_section.dart:303:34: Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
Try correcting the name to the name of an existing getter, or defining a getter or field named 'lang'.
                          label: lang.t('approve'),
                                 ^^^^
lib/sections/jarvis_section.dart:309:34: Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
Try correcting the name to the name of an existing getter, or defining a getter or field named 'lang'.
                          label: lang.t('reject'),
                                 ^^^^
::group::❌ loading /home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/test/widget_test.dart (failed)
Failed to load "/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/test/widget_test.dart":
Compilation failed for testPath=/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/test/widget_test.dart: lib/sections/jarvis_section.dart:303:34: Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
Try correcting the name to the name of an existing getter, or defining a getter or field named 'lang'.
                          label: lang.t('approve'),
                                 ^^^^
lib/sections/jarvis_section.dart:309:34: Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
Try correcting the name to the name of an existing getter, or defining a getter or field named 'lang'.
                          label: lang.t('reject'),
                                 ^^^^
.

::endgroup::

::error::0 tests passed, 1 failed.
```
**exit 1 — FAILED**

## flutter build web
```
Compiling lib/main.dart for the Web...                          
Wasm dry run succeeded. Consider building and testing your application with the `--wasm` flag. See docs for more info: https://docs.flutter.dev/platform-integration/web/wasm
Use --no-wasm-dry-run to disable these warnings.
Target dart2js failed: ProcessException: Process exited abnormally with exit code 1:
lib/sections/jarvis_section.dart:303:34:
Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
                          label: lang.t('approve'),
                                 ^^^^
lib/sections/jarvis_section.dart:309:34:
Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
                          label: lang.t('reject'),
                                 ^^^^
Error: Compilation failed.
  Command: /opt/hostedtoolcache/flutter/stable-3.47.4-x64/flutter/bin/cache/dart-sdk/bin/dart compile js --platform-binaries=/opt/hostedtoolcache/flutter/stable-3.47.4-x64/flutter/bin/cache/flutter_web_sdk/kernel --invoker=flutter_tool -Ddart.vm.product=true -DFLUTTER_BUILD_NAME=1.0.0 -DFLUTTER_BUILD_NUMBER=1 -DFLUTTER_VERSION=3.47.4 -DFLUTTER_CHANNEL=stable -DFLUTTER_GIT_URL=https://github.com/flutter/flutter.git -DFLUTTER_FRAMEWORK_REVISION=9584c6713b -DFLUTTER_ENGINE_REVISION=06a2e2a110 -DFLUTTER_DART_VERSION=3.13.3 -DFLUTTER_WEB_USE_SKIA=true -DFLUTTER_WEB_USE_SKWASM=false -DFLUTTER_WEB_CANVASKIT_URL=https://www.gstatic.com/flutter-canvaskit/06a2e2a110089dff50fe635cffd2a61e1b24fbcd/ --write-resources --native-null-assertions --no-source-maps -O4 --minify -o /home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/.dart_tool/flutter_build/b05189d13ea76cd9672b092c4b964d12/app.dill --packages=/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/.dart_tool/package_config.json --cfe-only /home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/.dart_tool/flutter_build/b05189d13ea76cd9672b092c4b964d12/main.dart
#0      RunResult.throwException (package:flutter_tools/src/base/process.dart:153:5)
#1      _DefaultProcessUtils.run (package:flutter_tools/src/base/process.dart:379:19)
<asynchronous suspension>
#2      Dart2JSTarget.build (package:flutter_tools/src/build_system/targets/web.dart:222:5)
<asynchronous suspension>
#3      _BuildInstance._invokeInternal (package:flutter_tools/src/build_system/build_system.dart:937:9)
<asynchronous suspension>
#4      Future.wait.<anonymous closure> (dart:async/future.dart:567:21)
<asynchronous suspension>
#5      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:875:32)
<asynchronous suspension>
#6      Future.wait.<anonymous closure> (dart:async/future.dart:567:21)
<asynchronous suspension>
#7      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:875:32)
<asynchronous suspension>
#8      Future.wait.<anonymous closure> (dart:async/future.dart:567:21)
<asynchronous suspension>
#9      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:875:32)
<asynchronous suspension>
#10     FlutterBuildSystem.build (package:flutter_tools/src/build_system/build_system.dart:684:16)
<asynchronous suspension>
#11     WebBuilder.buildWeb (package:flutter_tools/src/web/compile.dart:107:34)
<asynchronous suspension>
#12     BuildWebCommand.runCommand (package:flutter_tools/src/commands/build_web.dart:293:5)
<asynchronous suspension>
#13     FlutterCommand.run.<anonymous closure> (package:flutter_tools/src/runner/flutter_command.dart:1663:27)
<asynchronous suspension>
#14     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#15     CommandRunner.runCommand (package:args/command_runner.dart:212:13)
<asynchronous suspension>
#16     FlutterCommandRunner.runCommand.<anonymous closure> (package:flutter_tools/src/runner/flutter_command_runner.dart:496:9)
<asynchronous suspension>
#17     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#18     FlutterCommandRunner.runCommand (package:flutter_tools/src/runner/flutter_command_runner.dart:431:5)
<asynchronous suspension>
#19     FlutterCommandRunner.run.<anonymous closure> (package:flutter_tools/src/runner/flutter_command_runner.dart:307:33)
<asynchronous suspension>
#20     run.<anonymous closure>.<anonymous closure> (package:flutter_tools/runner.dart:104:11)
<asynchronous suspension>
#21     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#22     main (package:flutter_tools/executable.dart:103:3)
<asynchronous suspension>

Compiling lib/main.dart for the Web...                             34.3s
Error: Failed to compile application for the Web.
```
**exit 1 — FAILED**

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

lib/sections/jarvis_section.dart:303:34: Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
Try correcting the name to the name of an existing getter, or defining a getter or field named 'lang'.
                          label: lang.t('approve'),
                                 ^^^^
lib/sections/jarvis_section.dart:309:34: Error: The getter 'lang' isn't defined for the type '_ApprovalsTab'.
 - '_ApprovalsTab' is from 'package:bazino_admin_app/sections/jarvis_section.dart' ('lib/sections/jarvis_section.dart').
Try correcting the name to the name of an existing getter, or defining a getter or field named 'lang'.
                          label: lang.t('reject'),
                                 ^^^^
Target kernel_snapshot_program failed: Exception


FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:compileFlutterBuildRelease'.
> Process 'command '/opt/hostedtoolcache/flutter/stable-3.47.4-x64/flutter/bin/flutter'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 2m 5s
Running Gradle task 'assembleRelease'...                          127.8s
Gradle task assembleRelease failed with exit code 1
```
**exit 1 — FAILED**

## Summary
```
flutter --version=0
flutter pub get=0
flutter analyze=1
flutter test=1
flutter build web=1
flutter build apk=1
```

web size: 37M
apk size: 
