// تست‌های اپ ادمین — تمرکز روی الزام اصلی:
// «بدون لاگین هیچ صفحه‌ای جز صفحهٔ لاگین نمایش داده نمی‌شود»
// + حذف بخش‌های امنیتی از اپ.
//
// تست‌های کامل (analyze/test/build) در CI گیت‌هاب اجرا می‌شوند (admin-app.yml).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bazino_admin_app/auth/auth_controller.dart';
import 'package:bazino_admin_app/auth/login_screen.dart';
import 'package:bazino_admin_app/core/api_client.dart';
import 'package:bazino_admin_app/core/l10n.dart';
import 'package:bazino_admin_app/core/prefs.dart';
import 'package:bazino_admin_app/main.dart';
import 'package:bazino_admin_app/shell/home_shell.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues(const {});
    final sp = await SharedPreferences.getInstance();
    Prefs.setForTest(sp);
    ApiClient.baseUrl = '';
    // ریست وضعیت singleton نشست برای هر تست
    final auth = AuthController.instance;
    auth.isReady = false;
    auth.isLoggedIn = false;
    auth.username = null;
  });

  testWidgets('بدون لاگین: فقط صفحهٔ لاگین رندر می‌شود و هیچ بخشی دیده نمی‌شود', (tester) async {
    await tester.pumpWidget(BazinoAdminApp(lang: AppLang('fa')));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget, reason: 'نشست معتبر نیست → فقط صفحهٔ ورود');
    expect(find.byType(HomeShell), findsNothing, reason: 'پوستهٔ مدیریت نباید بدون لاگین ساخته شود');
    expect(find.text('داشبورد'), findsNothing);
    expect(find.text('قالب‌ها'), findsNothing);
    expect(find.text('کیف پول'), findsNothing);
  });

  testWidgets('با نشست معتبر: پوستهٔ مدیریت با داشبورد ساخته می‌شود', (tester) async {
    final auth = AuthController.instance;
    auth.isReady = true;
    auth.isLoggedIn = true;
    auth.username = 'admin';
    await tester.pumpWidget(BazinoAdminApp(lang: AppLang('fa')));
    await tester.pumpAndSettle();

    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.text('داشبورد'), findsWidgets, reason: 'بخش پیش‌فرض = داشبورد');
  });

  testWidgets('401 از API (انقضای توکن) → خروج خودکار به صفحهٔ لاگین', (tester) async {
    final auth = AuthController.instance;
    auth.isReady = true;
    auth.isLoggedIn = true;
    auth.username = 'admin';
    await tester.pumpWidget(BazinoAdminApp(lang: AppLang('fa')));
    await tester.pumpAndSettle();
    expect(find.byType(HomeShell), findsOneWidget);

    // سرور 401 برگرداند → ApiClient.onUnauthorized صدا زده می‌شود
    ApiClient.onUnauthorized?.call();
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget, reason: 'بعد از انقضای نشست فقط صفحهٔ ورود');
    expect(find.byType(HomeShell), findsNothing);
  });

  testWidgets('خروج دستی → برگشت به صفحهٔ لاگین', (tester) async {
    final auth = AuthController.instance;
    auth.isReady = true;
    auth.isLoggedIn = true;
    auth.username = 'admin';
    await tester.pumpWidget(BazinoAdminApp(lang: AppLang('fa')));
    await tester.pumpAndSettle();

    auth.logout();
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('فرم ورود خالی → پیام خطا بدون ارسال', (tester) async {
    await tester.pumpWidget(BazinoAdminApp(lang: AppLang('fa')));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(find.text('همهٔ فیلدها را پر کنید'), findsOneWidget);
    expect(find.byType(LoginScreen), findsOneWidget, reason: 'هنوز وارد نشده');
  });

  testWidgets('بخش‌های امنیتی (کلیدهای API/توکن‌ها) در اپ وجود ندارند', (tester) async {
    // کشوی ناوبری ListView تنبل است؛ با ارتفاع پیش‌فرضِ تست (۶۰۰) آیتم‌های
    // پایینی کشو رندر نمی‌شوند → سطح تست را بلند می‌کنیم تا همه دیده شوند.
    await tester.binding.setSurfaceSize(const Size(480, 2600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final auth = AuthController.instance;
    auth.isReady = true;
    auth.isLoggedIn = true;
    auth.username = 'admin';
    await tester.pumpWidget(BazinoAdminApp(lang: AppLang('en')));
    await tester.pumpAndSettle();

    // کشو را باز کنیم و فهرست بخش‌ها را ببینیم
    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();

    // بخش‌های معمولی موجودند (کشو + نوار عنوان)
    expect(find.text('Dashboard'), findsWidgets);
    expect(find.text('Themes'), findsWidgets);
    expect(find.text('Affiliates'), findsWidgets);
    expect(find.text('Wallet'), findsWidgets);

    // بخش امنیتی حذف‌شده: نه در کشو، نه در رجیستری
    expect(find.text('API Keys'), findsNothing);
    expect(
      kAdminSectionIds().contains('apiKeys'),
      isFalse,
      reason: 'بخش apiKeys باید طبق دستور از اپ حذف شده باشد',
    );
  });

  test('فهرست بخش‌ها: هر ۲۳ بخش عملیاتی موجودند و apiKeys نیست', () {
    final ids = kAdminSectionIds();
    expect(ids.length, 23, reason: 'پنل وب ۲۴ بخش دارد؛ یکی (apiKeys) امنیتی و حذف‌شده');
    for (final expected in [
      'dashboard', 'jarvis', 'systems', 'cafe', 'shop', 'tournaments', 'tournamentOps',
      'blog', 'promotions', 'content', 'chat', 'migrations', 'messages', 'themes',
      'appSlider', 'mobileApp', 'customization', 'dbLogs', 'presentation', 'tickets',
      'wallet', 'affiliates', 'messaging',
    ]) {
      expect(ids, contains(expected), reason: 'بخش $expected باید در اپ باشد');
    }
  });

  test('AuthController: خروج، توکن و نام کاربری ذخیره‌شده را پاک می‌کند', () async {
    Prefs.token = 'test-token';
    Prefs.username = 'admin';
    final auth = AuthController.instance;
    auth.isReady = true;
    auth.isLoggedIn = true;
    auth.username = 'admin';

    auth.logout();

    expect(auth.isLoggedIn, isFalse);
    expect(Prefs.token, isEmpty);
    expect(Prefs.username, isEmpty);
  });

  test('AppLang: فارسی پیش‌فرض، تغییر زبان ذخیره می‌شود', () {
    final lang = AppLang('fa');
    expect(lang.isFa, isTrue);
    expect(lang.t('dashboard'), 'داشبورد');
    lang.toggle();
    expect(lang.isFa, isFalse);
    expect(lang.t('dashboard'), 'Dashboard');
    expect(Prefs.lang, 'en');
  });
}

List<String> kAdminSectionIds() => kAdminSections.map((s) => s.id).toList();
