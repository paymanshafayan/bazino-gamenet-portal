import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'prefs.dart';

/// خطای استاندارد API — پیام از خود سرور می‌آید (فارسی/انگلیسی بسته به Accept-Language).
class ApiError implements Exception {
  final int status;
  final String code;
  final String message;
  ApiError(this.status, this.code, this.message);

  bool get isAuth => status == 401;

  @override
  String toString() => message;
}

/// کلاینت HTTP واحد اپ ادمین.
///
/// قراردادها همه با سرور واقعی پرتال (dist/server.cjs) تأیید شده‌اند —
/// فایل admin_app/api_contract.json حاوی شکل واقعی پاسخ‌هاست.
class ApiClient {
  /// مثل https://bazino.pro (بدون اسلش آخر)
  static String baseUrl = '';

  /// با هر پاسخ 401 (انقضای توکن) صدا زده می‌شود → AuthController کاربر را خارج می‌کند.
  static void Function()? onUnauthorized;

  static const timeout = Duration(seconds: 40);

  static Map<String, String> _headers({String? contentType, String? token, bool auth = true}) => {
        if (contentType != null) 'Content-Type': contentType,
        if (auth && token != null) 'Authorization': 'Bearer $token',
        // سرور با این هدر پیام‌های خطا را به زبان درخواست برمی‌گرداند (apiMessages)
        'Accept-Language': Prefs.lang,
      };

  static Uri _u(String path, Map<String, String>? query) {
    var b = baseUrl;
    while (b.endsWith('/')) {
      b = b.substring(0, b.length - 1);
    }
    final uri = Uri.parse('$b$path');
    return query == null || query.isEmpty ? uri : uri.replace(queryParameters: query);
  }

  static String _token() => Prefs.token;

  static Future<dynamic> get(String path, {Map<String, String>? query, bool auth = true}) async {
    final res = await http
        .get(_u(path, query), headers: _headers(token: _token(), auth: auth))
        .timeout(timeout);
    return _decode(res);
  }

  static Future<dynamic> post(String path, {Object? body, Map<String, String>? query, bool auth = true}) async {
    final res = await http
        .post(_u(path, query),
            headers: _headers(contentType: 'application/json', token: _token(), auth: auth),
            body: jsonEncode(body ?? {}))
        .timeout(timeout);
    return _decode(res);
  }

  static Future<dynamic> put(String path, {Object? body, Map<String, String>? query, bool auth = true}) async {
    final res = await http
        .put(_u(path, query),
            headers: _headers(contentType: 'application/json', token: _token(), auth: auth),
            body: jsonEncode(body ?? {}))
        .timeout(timeout);
    return _decode(res);
  }

  static Future<dynamic> delete(String path, {Map<String, String>? query, bool auth = true}) async {
    final res = await http
        .delete(_u(path, query), headers: _headers(token: _token(), auth: auth))
        .timeout(timeout);
    return _decode(res);
  }

  /// آپلود باینری خام: نصب ZIP قالب (application/zip)، APK (octet-stream)، تصویر قالب.
  static Future<dynamic> postRaw(
    String path,
    Uint8List bytes,
    String contentType, {
    Map<String, String>? query,
  }) async {
    final req = http.Request('POST', _u(path, query))
      ..headers.addAll(_headers(contentType: contentType, token: _token()))
      ..bodyBytes = bytes;
    final streamed = await req.send().timeout(timeout);
    final res = await http.Response.fromStream(streamed).timeout(timeout);
    return _decode(res);
  }

  static dynamic _decode(http.Response res) {
    if (res.statusCode == 401) {
      onUnauthorized?.call();
      throw ApiError(401, 'SESSION_EXPIRED', _sessionExpiredText());
    }
    dynamic data;
    try {
      data = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      data = null;
    }
    if (res.statusCode >= 400) {
      String msg = 'HTTP ${res.statusCode}';
      String code = '';
      if (data is Map) {
        code = data['code']?.toString() ?? '';
        msg = data['error']?.toString() ??
            data['message']?.toString() ??
            msg;
      }
      throw ApiError(res.statusCode, code, msg);
    }
    return data;
  }

  static String _sessionExpiredText() =>
      Prefs.lang == 'fa' ? 'نشست شما منقضی شده است — دوباره وارد شوید' : 'Your session expired — please sign in again';
}

/// کلید idempotency برای عملیات مالی (الزام قرارداد سرور: topup/cashout/settle)
String idempotencyKey([String prefix = 'op']) {
  final ts = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
  final rnd = DateTime.now().microsecond.toString() +
      (identical.hashCode & 0xffff).toRadixString(36);
  return '$prefix-$ts-$rnd';
}
