import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// ذخیره‌سازی محلی اپ ادمین: آدرس سرور، توکن نشست، نام کاربری و زبان.
/// توکن فقط برای «ورود مجدد سریع» این‌جا می‌ماند و با هر 401 از سرور پاک می‌شود.
class Prefs {
  Prefs._();

  static SharedPreferences? _sp;

  /// یک‌بار در main (یا در تست‌ها با setForTest) مقدار می‌گیرد.
  static Future<void> init() async {
    _sp ??= await SharedPreferences.getInstance();
  }

  /// فقط برای تست‌های ویجت — نمونهٔ mock را مستقیماً تزریق می‌کند.
  @visibleForTesting
  static void setForTest(SharedPreferences sp) {
    _sp = sp;
  }

  static SharedPreferences get _p {
    final sp = _sp;
    if (sp == null) {
      throw StateError('Prefs not initialized — call Prefs.init() first');
    }
    return sp;
  }

  static const _kServer = 'admin.serverUrl';
  static const _kToken = 'admin.token';
  static const _kUsername = 'admin.username';
  static const _kLang = 'admin.lang';

  static String get serverUrl => _p.getString(_kServer) ?? '';
  static set serverUrl(String v) => _p.setString(_kServer, v);

  static String get token => _p.getString(_kToken) ?? '';
  static set token(String v) => _p.setString(_kToken, v);

  static String get username => _p.getString(_kUsername) ?? '';
  static set username(String v) => _p.setString(_kUsername, v);

  static String get lang => _p.getString(_kLang) ?? 'fa';
  static set lang(String v) => _p.setString(_kLang, v);

  static Future<void> clearSession() async {
    await _p.remove(_kToken);
    await _p.remove(_kUsername);
  }
}
