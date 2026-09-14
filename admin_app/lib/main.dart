import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'auth/auth_controller.dart';
import 'auth/login_screen.dart';
import 'core/l10n.dart';
import 'core/prefs.dart';
import 'shell/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Prefs.init();
  final lang = AppLang(Prefs.lang);
  // restore پس از اولین فریم شروع می‌شود تا اسپلش فوری نمایش داده شود.
  runApp(BazinoAdminApp(lang: lang));
}

class BazinoAdminApp extends StatelessWidget {
  const BazinoAdminApp({super.key, required this.lang});

  final AppLang lang;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AppLang>.value(value: lang),
        ChangeNotifierProvider<AuthController>.value(value: AuthController.instance),
      ],
      child: Consumer<AppLang>(
        builder: (context, l, _) {
          return MaterialApp(
            title: 'Bazino Admin',
            debugShowCheckedModeBanner: false,
            locale: l.locale,
            supportedLocales: const [Locale('fa'), Locale('en')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            theme: _theme(),
            home: const _AuthGate(),
          );
        },
      ),
    );
  }

  ThemeData _theme() {
    const primary = Color(0xFFFFB800);
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: const Color(0xFF0A0E17),
      colorScheme: base.colorScheme.copyWith(
        primary: primary,
        secondary: primary,
        surface: const Color(0xFF111726),
        error: Colors.red.shade400,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.black,
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      // کارت‌های اپ همه Container هستند؛ CardTheme لازم نیست.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.04),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          borderSide: BorderSide(color: primary, width: 1.3),
        ),
        labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

/// ═══════════════════════════════════════════════════════════════════
///  دروازهٔ ورود — الزام اصلی اپ:
///  «بدون لاگین هیچ صفحه‌ای جز صفحهٔ لاگین نمایش داده نمی‌شود»
///
///  هیچ route نام‌گذاری‌شده‌ای وجود ندارد؛ تنها نقطهٔ ورود همین ویجت است
///  که بسته به وضعیت نشست دقیقاً یکی از سه حالت را رندر می‌کند:
///    آماده‌سازی → اسپلش | بدون نشست → LoginScreen | نشست معتبر → HomeShell
/// ═══════════════════════════════════════════════════════════════════
class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  @override
  void initState() {
    super.initState();
    // restore فقط یک‌بار در عمر اپ اجرا شود
    AuthController.instance.restore();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (!auth.isReady) {
      return const _Splash();
    }
    if (!auth.isLoggedIn) {
      return const LoginScreen();
    }
    return const HomeShell();
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF0A0E17),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('B', style: TextStyle(fontSize: 56, fontWeight: FontWeight.w900, color: Color(0xFFFFB800))),
            SizedBox(height: 18),
            SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.5)),
          ],
        ),
      ),
    );
  }
}
