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
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bazino_app/main.dart';
import 'package:bazino_app/models.dart';
import 'package:bazino_app/screens/intro_screen.dart';
import 'package:bazino_app/screens/jarvis_assistant.dart';

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

  // ─────────────────────────────────────────────────────────────────────
  // TEMPORARY — تست عمداً خراب، فقط برای اثبات اینکه گارد CI واقعاً جاب را
  // قرمز می‌کند. بلافاصله پس از دیدن اجرای قرمز حذف می‌شود.
  // ─────────────────────────────────────────────────────────────────────
  test('DELIBERATE FAILURE — proving the CI guard turns the job red', () {
    expect(2 + 2, 5, reason: 'این تست عمداً خراب است و باید حذف شود');
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
  group('parse کردن پاسخ سرور', () {
    test('UserState.fromJson — پاسخ واقعی /api/auth/me', () {
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
}
