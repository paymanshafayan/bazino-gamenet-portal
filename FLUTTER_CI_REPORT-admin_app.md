# Flutter CI report — admin_app

- commit: `600a8242c136c5647a75e06ed642d5081b22926f`
- branch: `arena/01a089a9-bazino-gamenet-portal`
- run:    34740749761
- date:   2026-09-13 05:38 UTC

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

  error • A value of type 'Map<dynamic, dynamic>' can't be returned from the method '_load' because it has a return type of 'Future<Map<String, dynamic>>' • lib/sections/affiliates_messaging_section.dart:164:12 • return_of_invalid_type
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/affiliates_messaging_section.dart:239:11 • prefer_const_constructors
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/affiliates_messaging_section.dart:240:20 • prefer_const_constructors
   info • Use 'const' literals as arguments to constructors of '@immutable' classes. Try adding 'const' before the literal • lib/sections/affiliates_messaging_section.dart:241:25 • prefer_const_literals_to_create_immutables
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/affiliates_messaging_section.dart:242:17 • prefer_const_constructors
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/affiliates_messaging_section.dart:248:17 • prefer_const_constructors
  error • Expected an identifier • lib/sections/affiliates_messaging_section.dart:306:59 • missing_identifier
  error • Expected to find ':' • lib/sections/affiliates_messaging_section.dart:306:59 • expected_token
  error • Expected to find ';' • lib/sections/affiliates_messaging_section.dart:306:77 • expected_token
  error • Expected an identifier • lib/sections/affiliates_messaging_section.dart:306:79 • missing_identifier
  error • Unexpected text ':'. Try removing the text • lib/sections/affiliates_messaging_section.dart:306:79 • unexpected_token
   info • Unnecessary empty statement. Try removing the empty statement or restructuring the code • lib/sections/affiliates_messaging_section.dart:306:83 • empty_statements
  error • A value of type 'Map<dynamic, dynamic>' can't be returned from the method '_audience' because it has a return type of 'Future<Map<String, dynamic>>' • lib/sections/affiliates_messaging_section.dart:428:12 • return_of_invalid_type
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/affiliates_messaging_section.dart:490:23 • prefer_const_constructors
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/app_mobile_section.dart:186:25 • prefer_const_constructors
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/content_chat_section.dart:151:17 • prefer_const_constructors
  error • A value of type 'Map<dynamic, dynamic>' can't be returned from the method '_load' because it has a return type of 'Future<Map<String, dynamic>>' • lib/sections/customization_section.dart:18:12 • return_of_invalid_type
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/customization_section.dart:41:27 • prefer_const_constructors
   info • Use 'const' with the constructor to improve performance. Try adding the 'const' keyword to the constructor invocation • lib/sections/customization_section.dart:85:36 • prefer_const_constructors
warning • The value of the local variable 'lang' isn't used. Try removing the variable or using it • lib/sections/jarvis_section.dart:213:11 • unused_local_variable
warning • The value of the local variable 'pending' isn't used. Try removing the variable or using it • lib/sections/jarvis_section.dart:274:19 • unused_local_variable
  error • A value of type 'Map<dynamic, dynamic>' can't be returned from the method '_load' because it has a return type of 'Future<Map<String, dynamic>>' • lib/sections/misc_sections.dart:15:12 • return_of_invalid_type
   info • 'value' is deprecated and shouldn't be used. Use initialValue instead. This will set the initial value for the form field. This feature was deprecated after v3.33.0-1.0.pre. Try replacing the use of the deprecated member with the replacement • lib/sections/misc_sections.dart:245:21 • deprecated_member_use
  error • A value of type 'Map<dynamic, dynamic>' can't be returned from the method '_load' because it has a return type of 'Future<Map<String, dynamic>>' • lib/sections/systems_section.dart:90:12 • return_of_invalid_type
  error • A value of type 'Map<dynamic, dynamic>' can't be returned from the method '_load' because it has a return type of 'Future<Map<String, dynamic>>' • lib/sections/themes_section.dart:18:12 • return_of_invalid_type
   info • Unnecessary braces in a string interpolation. Try removing the braces • lib/sections/themes_section.dart:245:21 • unnecessary_brace_in_string_interps
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:39:68 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:40:62 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:41:63 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:42:55 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:43:61 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:44:75 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:45:80 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:46:56 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:47:72 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:48:70 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:49:59 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:50:66 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:51:61 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:52:60 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:53:72 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:54:69 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:55:71 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:56:61 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:57:74 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:58:68 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:59:75 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:60:70 • const_eval_method_invocation
  error • Methods can't be invoked in constant expressions • lib/shell/home_shell.dart:61:67 • const_eval_method_invocation
warning • The value of the field '_saving' isn't used. Try removing the field, or using it • lib/widgets/crud.dart:231:8 • unused_field
warning • The value of the field '_error' isn't used. Try removing the field, or using it • lib/widgets/crud.dart:232:11 • unused_field
warning • The declaration '_save' isn't referenced. Try removing the declaration of '_save' • lib/widgets/crud.dart:260:16 • unused_element
   info • 'value' is deprecated and shouldn't be used. Use initialValue instead. This will set the initial value for the form field. This feature was deprecated after v3.33.0-1.0.pre. Try replacing the use of the deprecated member with the replacement • lib/widgets/crud.dart:329:17 • deprecated_member_use
  error • Expected to find ')' • lib/widgets/crud.dart:336:15 • expected_token
  error • Expected to find ']' • lib/widgets/crud.dart:337:13 • expected_token
  error • Expected an identifier • lib/widgets/crud.dart:355:11 • missing_identifier
  error • Expected to find ')' • lib/widgets/crud.dart:355:11 • expected_token

57 issues found. (ran in 8.7s)
```
**exit 1 — FAILED**

## flutter test
```
lib/widgets/crud.dart:315:20: Error: Too many positional arguments: 0 allowed, but 1 found.
Try removing the extra positional arguments.
      child: Column(
                   ^
/opt/hostedtoolcache/flutter/stable-3.47.4-x64/flutter/packages/flutter/lib/src/widgets/basic.dart:5897:9: Context: Found this candidate, but the arguments don't match.
  const Column({
        ^^^^^^
::group::❌ loading /home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/test/widget_test.dart (failed)
Failed to load "/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/test/widget_test.dart":
Compilation failed for testPath=/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/test/widget_test.dart: lib/widgets/crud.dart:328:46: Error: Can't find ')' to match '('.
              DropdownButtonFormField<String>(
                                             ^
lib/shell/home_shell.dart:39:68: Error: Method invocation is not a constant expression.
  AdminSection('dashboard', 'dashboard', Icons.dashboard_outlined, _b(DashboardSection())),
                                                                   ^^
lib/shell/home_shell.dart:40:62: Error: Method invocation is not a constant expression.
  AdminSection('jarvis', 'jarvis', Icons.smart_toy_outlined, _b(JarvisSection())),
                                                             ^^
lib/shell/home_shell.dart:41:63: Error: Method invocation is not a constant expression.
  AdminSection('systems', 'systems', Icons.computer_outlined, _b(SystemsSection())),
                                                              ^^
lib/shell/home_shell.dart:42:55: Error: Method invocation is not a constant expression.
  AdminSection('cafe', 'cafe', Icons.coffee_outlined, _b(CafeSection())),
                                                      ^^
lib/shell/home_shell.dart:43:61: Error: Method invocation is not a constant expression.
  AdminSection('shop', 'shop', Icons.shopping_bag_outlined, _b(ShopSection())),
                                                            ^^
lib/shell/home_shell.dart:44:75: Error: Method invocation is not a constant expression.
  AdminSection('tournaments', 'tournaments', Icons.emoji_events_outlined, _b(TournamentsSection())),
                                                                          ^^
lib/shell/home_shell.dart:45:80: Error: Method invocation is not a constant expression.
  AdminSection('tournamentOps', 'tournamentOps', Icons.military_tech_outlined, _b(TournamentOpsSection())),
                                                                               ^^
lib/shell/home_shell.dart:46:56: Error: Method invocation is not a constant expression.
  AdminSection('blog', 'blog', Icons.article_outlined, _b(BlogSection())),
                                                       ^^
lib/shell/home_shell.dart:47:72: Error: Method invocation is not a constant expression.
  AdminSection('promotions', 'promotions', Icons.local_offer_outlined, _b(PromotionsSection())),
                                                                       ^^
lib/shell/home_shell.dart:48:70: Error: Method invocation is not a constant expression.
  AdminSection('content', 'contentOps', Icons.auto_awesome_outlined, _b(ContentSection())),
                                                                     ^^
lib/shell/home_shell.dart:49:59: Error: Method invocation is not a constant expression.
  AdminSection('chat', 'chatRooms', Icons.forum_outlined, _b(ChatSection())),
                                                          ^^
lib/shell/home_shell.dart:50:66: Error: Method invocation is not a constant expression.
  AdminSection('migrations', 'database', Icons.storage_outlined, _b(MigrationsSection())),
                                                                 ^^
lib/shell/home_shell.dart:51:61: Error: Method invocation is not a constant expression.
  AdminSection('messages', 'messages', Icons.mail_outlined, _b(MessagesSection())),
                                                            ^^
lib/shell/home_shell.dart:52:60: Error: Method invocation is not a constant expression.
  AdminSection('themes', 'themes', Icons.palette_outlined, _b(ThemesSection())),
                                                           ^^
lib/shell/home_shell.dart:53:72: Error: Method invocation is not a constant expression.
  AdminSection('appSlider', 'appSlider', Icons.view_carousel_outlined, _b(AppSliderSection())),
                                                                       ^^
lib/shell/home_shell.dart:54:69: Error: Method invocation is not a constant expression.
  AdminSection('mobileApp', 'mobileApp', Icons.smartphone_outlined, _b(MobileAppSection())),
                                                                    ^^
lib/shell/home_shell.dart:55:71: Error: Method invocation is not a constant expression.
  AdminSection('customization', 'customization', Icons.tune_outlined, _b(CustomizationSection())),
                                                                      ^^
lib/shell/home_shell.dart:56:61: Error: Method invocation is not a constant expression.
  AdminSection('dbLogs', 'dbLogs', Icons.terminal_outlined, _b(DbLogsSection())),
                                                            ^^
lib/shell/home_shell.dart:57:74: Error: Method invocation is not a constant expression.
  AdminSection('presentation', 'presentation', Icons.slideshow_outlined, _b(PresentationSection())),
                                                                         ^^
lib/shell/home_shell.dart:58:68: Error: Method invocation is not a constant expression.
  AdminSection('tickets', 'tickets', Icons.support_agent_outlined, _b(TicketsSection())),
                                                                   ^^
lib/shell/home_shell.dart:59:75: Error: Method invocation is not a constant expression.
  AdminSection('wallet', 'wallet', Icons.account_balance_wallet_outlined, _b(WalletSection())),
                                                                          ^^
lib/shell/home_shell.dart:60:70: Error: Method invocation is not a constant expression.
  AdminSection('affiliates', 'affiliates', Icons.handshake_outlined, _b(AffiliatesSection())),
                                                                     ^^
lib/shell/home_shell.dart:61:67: Error: Method invocation is not a constant expression.
  AdminSection('messaging', 'messaging', Icons.campaign_outlined, _b(MessagingSection())),
                                                                  ^^
lib/sections/affiliates_messaging_section.dart:164:23: Error: A value of type 'Map<dynamic, dynamic>' can't be returned from an async function with return type 'Future<Map<String, dynamic>>'.
 - 'Map' is from 'dart:core'.
 - 'Future' is from 'dart:async'.
    return res is Map ? res : <String, dynamic>{};
                      ^
lib/sections/affiliates_messaging_section.dart:306:59: Error: Expected ':' before this.
        data = res is Map ? Map<String, dynamic>.from(res)..remove('success') : {};
                                                          ^^
lib/sections/affiliates_messaging_section.dart:306:59: Error: Expected an identifier, but got '..'.
Try inserting an identifier before '..'.
        data = res is Map ? Map<String, dynamic>.from(res)..remove('success') : {};
                                                          ^^
lib/sections/affiliates_messaging_section.dart:306:77: Error: Expected ';' after this.
        data = res is Map ? Map<String, dynamic>.from(res)..remove('success') : {};
                                                                            ^
lib/sections/affiliates_messaging_section.dart:306:79: Error: Expected an identifier, but got ':'.
Try inserting an identifier before ':'.
        data = res is Map ? Map<String, dynamic>.from(res)..remove('success') : {};
                                                                              ^
lib/sections/affiliates_messaging_section.dart:306:79: Error: Unexpected token ':'.
        data = res is Map ? Map<String, dynamic>.from(res)..remove('success') : {};
                                                                              ^
lib/sections/affiliates_messaging_section.dart:428:23: Error: A value of type 'Map<dynamic, dynamic>' can't be returned from an async function with return type 'Future<Map<String, dynamic>>'.
 - 'Map' is from 'dart:core'.
 - 'Future' is from 'dart:async'.
    return res is Map ? res : <String, dynamic>{};
                      ^
lib/sections/customization_section.dart:18:23: Error: A value of type 'Map<dynamic, dynamic>' can't be returned from an async function with return type 'Future<Map<String, dynamic>>'.
 - 'Map' is from 'dart:core'.
 - 'Future' is from 'dart:async'.
    return res is Map ? res : <String, dynamic>{};
                      ^
lib/sections/misc_sections.dart:15:22: Error: A value of type 'Map<dynamic, dynamic>' can't be returned from an async function with return type 'Future<Map<String, dynamic>>'.
 - 'Map' is from 'dart:core'.
 - 'Future' is from 'dart:async'.
    return ds is Map ? ds : <String, dynamic>{};
                     ^
lib/sections/systems_section.dart:90:25: Error: A value of type 'Map<dynamic, dynamic>' can't be returned from an async function with return type 'Future<Map<String, dynamic>>'.
 - 'Map' is from 'dart:core'.
 - 'Future' is from 'dart:async'.
    return floor is Map ? floor : <String, dynamic>{};
                        ^
lib/sections/themes_section.dart:18:23: Error: A value of type 'Map<dynamic, dynamic>' can't be returned from an async function with return type 'Future<Map<String, dynamic>>'.
 - 'Map' is from 'dart:core'.
 - 'Future' is from 'dart:async'.
    return res is Map ? res : <String, dynamic>{};
                      ^
lib/widgets/crud.dart:337:13: Error: Expected ']' before this.
            else if (f.type == FieldType.toggle)
            ^^^^
lib/widgets/crud.dart:355:11: Error: Expected an identifier, but got 'if'.
Try inserting an identifier before 'if'.
          if (_error != null)
          ^^
lib/widgets/crud.dart:355:11: Error: Expected ')' before this.
          if (_error != null)
          ^^
lib/widgets/crud.dart:315:20: Error: Too many positional arguments: 0 allowed, but 1 found.
Try removing the extra positional arguments.
      child: Column(
                   ^
/opt/hostedtoolcache/flutter/stable-3.47.4-x64/flutter/packages/flutter/lib/src/widgets/basic.dart:5897:9: Context: Found this candidate, but the arguments don't match.
  const Column({
        ^^^^^^
.

::endgroup::

::error::0 tests passed, 1 failed.
```
**exit 1 — FAILED**

## flutter build web
```
This project is not configured for the web.
To configure this project for the web, run flutter create . --platforms web
```
**exit 1 — FAILED**

## flutter build apk
```
Flutter failed to read file at "/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/app/build.gradle". The file or directory could not be found.
PathNotFoundException: Cannot open file, path = '/home/runner/work/bazino-gamenet-portal/bazino-gamenet-portal/admin_app/android/app/build.gradle' (OS Error: No such file or directory, errno = 2)
This can sometimes happen if the file was deleted or moved while the tool was running. Try running "flutter clean" and try again.
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

web size: 
apk size: 
