import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/prefs.dart';

/// وضعیت نشست ادمین — تنها کلید ورود به اپ.
///
/// هیچ صفحه‌ای جز صفحهٔ ورود تا isLoggedIn=true نشود رندر نمی‌شود (AuthGate
/// در main.dart) و هر پاسخ 401 از هر API همین پرچم را برمی‌گرداند و کاربر
/// بلافاصله به صفحهٔ ورود برمی‌گردد.
class AuthController extends ChangeNotifier {
  AuthController._() {
    ApiClient.onUnauthorized = logout;
  }

  static final AuthController instance = AuthController._();

  bool isReady = false;
  bool isLoggedIn = false;
  String? username;
  String serverUrl = '';

  Future<void> _clearSession() async {
    await Prefs.clearSession();
    isLoggedIn = false;
    username = null;
  }

  /// هنگام بوت: اگر توکن ذخیره‌شده داریم، با سرور تأییدش می‌کنیم.
  /// 401 یا خطای شبکه → خروج به صفحهٔ ورود.
  Future<void> restore() async {
    serverUrl = Prefs.serverUrl;
    ApiClient.baseUrl = serverUrl;
    final token = Prefs.token;
    if (token.isNotEmpty && serverUrl.isNotEmpty) {
      try {
        // GET /api/auth/me → {success, user:{username, role, …}} — 401 اگر توکن نامعتبر
        final me = await ApiClient.get('/api/auth/me');
        final user = me is Map ? me['user'] : null;
        if (user is Map && user['role'] == 'admin') {
          username = user['username']?.toString() ?? Prefs.username;
          isLoggedIn = true;
        } else {
          await _clearSession();
        }
      } catch (_) {
        await _clearSession();
      }
    }
    isReady = true;
    notifyListeners();
  }

  /// ورود: null = موفق؛ رشته = کلید پیام خطا.
  Future<String?> login(String url, String user, String pass) async {
    final normalized = _normalizeUrl(url);
    ApiClient.baseUrl = normalized;
    try {
      final data = await ApiClient.post('/api/auth/login',
          body: {'username': user, 'password': pass}, auth: false);
      final u = data is Map ? data['user'] : null;
      final token = data is Map ? data['token']?.toString() : '';
      if (u is! Map || (u['role'] ?? 'gamer') != 'admin') {
        return 'adminOnlyError';
      }
      if (token == null || token.isEmpty) {
        return 'loginFailed';
      }
      Prefs.serverUrl = normalized;
      Prefs.token = token;
      Prefs.username = u['username']?.toString() ?? user;
      serverUrl = normalized;
      username = Prefs.username;
      isLoggedIn = true;
      notifyListeners();
      return null;
    } on ApiError catch (e) {
      return e.isAuth ? 'loginFailed' : 'loginFailed';
    } catch (_) {
      return 'connectionError';
    }
  }

  Future<void> logout() async {
    if (!isLoggedIn) return;
    await _clearSession();
    serverUrl = Prefs.serverUrl;
    notifyListeners();
  }

  static String _normalizeUrl(String raw) {
    var u = raw.trim();
    if (u.isEmpty) return u;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://$u';
    while (u.endsWith('/')) {
      u = u.substring(0, u.length - 1);
    }
    return u;
  }
}
