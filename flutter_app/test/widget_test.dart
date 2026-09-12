// تست‌های اپ بازینو.
//
// فایل قبلی، همان قالبی بود که `flutter create` می‌سازد: دنبال یک اپ شمارنده
// می‌گشت («۰»، «۱»، آیکون +) که در این اپ وجود ندارد. برای همین از روز اول
// همیشه قرمز بود و هیچ‌وقت چیزی از اپ را نسنجیده بود.
//
// این تست‌ها عمداً `main.dart` را import می‌کنند تا کل درخت ویجت‌ها واقعاً
// کامپایل شود؛ `flutter test` فقط فایل‌هایی را کامپایل می‌کند که تست‌ها
// import کرده باشند.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bazino_app/main.dart';
import 'package:bazino_app/models.dart';
import 'package:bazino_app/screens/hub_screen.dart';
import 'package:bazino_app/screens/intro_screen.dart';
import 'package:bazino_app/screens/jarvis_assistant.dart';
import 'package:bazino_app/screens/loyalty_screen.dart';
import 'package:bazino_app/screens/tournament_screen.dart';
import 'package:bazino_app/theme.dart';

/// اپ را با همان providerهای main() می‌سازد.
Widget _wrapApp() => MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => JarvisStateProvider()),
      ],
      child: const BazinoApp(),
    );

void main() {
  group('BazinoApp — رندر', () {
    testWidgets('بدون استثنا بالا می‌آید و MaterialApp با عنوان درست می‌دهد', (tester) async {
      SharedPreferences.setMockInitialValues({'bazino_intro_seen_v1': true});

      await tester.pumpWidget(_wrapApp());
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(tester.takeException(), isNull);

      final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
      expect(app.title, 'Bazino Esports Hub');
      expect(app.debugShowCheckedModeBanner, isFalse);
    });

    testWidgets('اولین فریم قبل از خواندن SharedPreferences، لودر نشان می‌دهد', (tester) async {
      SharedPreferences.setMockInitialValues({});

      await tester.pumpWidget(_wrapApp());
      await tester.pump(); // بدون settle: هنوز منتظر خواندن تنظیمات است

      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('کاربر تازه صفحه‌ی intro را می‌بیند', (tester) async {
      SharedPreferences.setMockInitialValues({}); // یعنی intro دیده نشده

      await tester.pumpWidget(_wrapApp());
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.byType(BazinoIntroScreen), findsOneWidget);
    });

    testWidgets('کاربری که intro را دیده، دیگر آن را نمی‌بیند', (tester) async {
      SharedPreferences.setMockInitialValues({'bazino_intro_seen_v1': true});

      await tester.pumpWidget(_wrapApp());
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.byType(BazinoIntroScreen), findsNothing);
    });
  });

  group('AppState', () {
    test('پیش‌فرض فارسی و راست‌به‌چپ است و کاربر مهمان است', () {
      final state = AppState();
      expect(state.language, 'fa');
      expect(state.textDirection, TextDirection.rtl);
      expect(state.isLoggedIn, isFalse);
      expect(state.user.username, 'Guest');
    });
  });

  // این‌ها دقیقاً همان‌هایی هستند که اگر قرارداد API سرور عوض شود می‌شکنند.
  group('parse کردن پاسخ سرور', () {    test('UserState.fromJson — پاسخ واقعی /api/auth/me', () {
      final u = UserState.fromJson({
        'username': 'Gamer_1',
        'email': 'g@bazino.test',
        'phone': '09120000000',
        'loyaltyPoints': 452,
        'role': 'gamer',
      });

      expect(u.username, 'Gamer_1');
      expect(u.loyaltyPoints, 452);
      expect(u.role, 'gamer');
    });

    test('UserState.fromJson — پاسخ ناقص نباید کرش کند', () {
      final u = UserState.fromJson({});
      expect(u.username, 'Guest');
      expect(u.loyaltyPoints, 0);
      expect(u.role, 'gamer');
    });

    test('GameSystem.fromJson — شناسه‌های جدید سرور (پیشوند sys-) پذیرفته می‌شوند', () {
      // سرور دیگر شناسه را از روی تعداد ردیف نمی‌سازد؛ حالا «sys-<hex>» است.
      final s = GameSystem.fromJson({
        'id': 'sys-2c95ca',
        'name': 'سیستم شماره ۱ (VIP PC)',
        'type': 'PC',
        'hourlyRate': 35000,
        'isActive': true,
        'isReserved': false,
      });

      expect(s.id, 'sys-2c95ca');
      expect(s.hourlyRate, 35000);
      expect(s.isActive, isTrue);
      expect(s.isReserved, isFalse);
    });

    test('LoyaltyTx.fromJson — نوع Bonus هم پشتیبانی می‌شود', () {
      final tx = LoyaltyTx.fromJson({
        'id': 'wel-1',
        'points': 100,
        'description': 'هدیه خوش‌آمدگویی',
        'type': 'Bonus',
        'date': 'امروز',
      });

      expect(tx.points, 100);
      expect(tx.type, 'Bonus');
      expect(tx.description, isNotEmpty);
    });

    test('LoyaltyTx.fromJson — شرح خالی سرور نباید کرش کند', () {
      final tx = LoyaltyTx.fromJson({'id': 'x', 'points': -100, 'type': 'Redeemed'});
      expect(tx.points, -100);
      expect(tx.description, '');
    });
  });

  // ============================================================
  // هاب خانه — قالب کنسول (بازتاب موبایلی قالب هاب سایت)
  // ============================================================
  group('هاب خانه — قالب کنسول سایت', () {
    testWidgets('ارب مرکزی جارویس و پنج دکمهٔ مداری بخش‌ها رندر می‌شوند', (tester) async {
      SharedPreferences.setMockInitialValues({'bazino_intro_seen_v1': true});

      await tester.pumpWidget(_wrapApp());
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.byType(HubScreen), findsOneWidget);
      // پنج دکمهٔ مداری شیشه‌ای — همان پنج بخش قالب هاب سایت
      expect(find.byType(HubOrbButton), findsNWidgets(5));
      // برچسب هر بخش فقط روی دکمهٔ مداری خودش («فروشگاه» در نوار پایین هم هست)
      for (final label in ['رزرو', 'کافه', 'فروشگاه', 'مسابقات', 'باشگاه']) {
        expect(
          find.descendant(of: find.byType(HubOrbButton), matching: find.text(label)),
          findsOneWidget,
          reason: 'برچسب بخش $label باید روی دکمهٔ مداری هاب دیده شود',
        );
      }
      // ارب مرکزی = دروازهٔ جارویس
      expect(find.text('JARVIS'), findsOneWidget);
      expect(find.byIcon(Icons.smart_toy_rounded), findsOneWidget);
      // ذرات نئونی پس‌زمینه
      expect(find.byType(CustomPaint), findsWidgets);
    });

    testWidgets('تب پروفایل نوار پایین صفحهٔ باشگاه/پروفایل را باز می‌کند نه مسابقات', (tester) async {
      SharedPreferences.setMockInitialValues({'bazino_intro_seen_v1': true});

      await tester.pumpWidget(_wrapApp());
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // تب آخر نوار پایین (کلوپ/پروفایل)
      await tester.tap(find.byIcon(Icons.person_outline));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // باگ قبلی: این تب اشتباهاً صفحهٔ تورنمنت (اندیس ۴) را باز می‌کرد
      expect(find.byType(LoyaltyScreen), findsOneWidget);
      expect(find.byType(TournamentScreen), findsNothing);
    });
  });

  // ============================================================
  // جارویس — رابط گفتگومحور (سبک ChatGPT)
  // ============================================================
  group('جارویس — رابط گفتگومحور', () {
    setUpAll(() {
      // JarvisStateProvider موقع ساخت، پلاگین‌های speech_to_text و flutter_tts را
      // صدا می‌زند؛ در محیط تست باید کانال‌شان mock شوند وگرنه استثنای
      // MissingPluginException بی‌پدرپرورده، تست را می‌اندازد.
      TestWidgetsFlutterBinding.ensureInitialized();
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(const MethodChannel('flutter_tts'), (call) async => true);
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(const MethodChannel('speech_to_text'), (call) async {
        if (call.method == 'initialize') return true;
        return null;
      });
    });

    Widget wrapJarvis(JarvisStateProvider jarvis) {
      return MultiProvider(
        providers: [
          ChangeNotifierProvider<AppState>.value(value: AppState()),
          ChangeNotifierProvider<JarvisStateProvider>.value(value: jarvis),
        ],
        child: const MaterialApp(home: Scaffold(body: JarvisAssistantModal())),
      );
    }

    testWidgets('پیام خوش‌آمد، نوار ورودی و پیشنهادهای شروع نمایش داده می‌شوند', (tester) async {
      final jarvis = JarvisStateProvider();
      addTearDown(jarvis.dispose);

      await tester.pumpWidget(wrapJarvis(jarvis));
      // آواتار جارویس انیمیشن بی‌نهایت دارد — به هیچ وجه pumpAndSettle نکن
      await tester.pump(const Duration(milliseconds: 150));

      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(Icons.send_rounded), findsOneWidget);
      expect(find.byIcon(Icons.mic_none), findsOneWidget);
      expect(find.text('JARVIS'), findsOneWidget);
      // پیام خوش‌آمد provider در حباب گفتگو
      expect(find.textContaining('جارویس سالن بازینو'), findsOneWidget);
      // پیشنهادهای شروع — فقط وقتی گفتگو تازه است
      expect(find.textContaining('پیتزا'), findsOneWidget);
      expect(find.textContaining('رزرو کن'), findsOneWidget);
    });

    testWidgets('پس از رشد گفتگو، پیشنهادهای شروع پنهان می‌شوند', (tester) async {
      final jarvis = JarvisStateProvider();
      addTearDown(jarvis.dispose);

      await tester.pumpWidget(wrapJarvis(jarvis));
      await tester.pump(const Duration(milliseconds: 150));

      jarvis.debugAppendMessage(JarvisMessage(content: 'سلام', isUser: true, timestamp: '12:00'));
      jarvis.debugAppendMessage(JarvisMessage(content: 'سلام! چه کاری می‌تونم برات انجام بدم؟', isUser: false, timestamp: '12:00'));
      await tester.pump();

      expect(find.textContaining('پیتزا'), findsNothing);
      expect(find.text('سلام'), findsOneWidget);
    });

    testWidgets('نشانگر «در حال تایپ» سه نقطهٔ متحرک دارد', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: Center(child: TypingDots()))),
      );
      await tester.pump(const Duration(milliseconds: 100));

      for (var i = 0; i < 3; i++) {
        expect(find.byKey(ValueKey('jarvis_typing_dot_$i')), findsOneWidget);
      }
    });

    testWidgets('پیام جارویس با اکشن، نشان «عملیات انجام شد» می‌گیرد', (tester) async {
      final jarvis = JarvisStateProvider();
      addTearDown(jarvis.dispose);

      await tester.pumpWidget(wrapJarvis(jarvis));
      await tester.pump(const Duration(milliseconds: 150));

      jarvis.debugAppendMessage(
        JarvisMessage(
          content: 'سفارش پیتزا ثبت شد.',
          isUser: false,
          timestamp: '12:01',
          action: 'order_cafe_item',
        ),
      );
      await tester.pump();

      expect(find.textContaining('سفارش کافه ثبت شد'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });
  });
}
