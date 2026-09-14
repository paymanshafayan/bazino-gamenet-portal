import 'package:intl/intl.dart';

/// قالب‌بندی اعداد/پول — واحد پول پرتال: لیر (TRY).
String fmtMoney(dynamic v) {
  final n = num.tryParse(v?.toString() ?? '') ?? 0;
  return NumberFormat('#,##0', 'en_US').format(n);
}

String fmtMoneyCurrency(dynamic v) => '${fmtMoney(v)} ₺';

String fmtBytes(dynamic v) {
  final n = num.tryParse(v?.toString() ?? '') ?? 0;
  if (n >= 1024 * 1024 * 1024) return '${(n / 1024 / 1024 / 1024).toStringAsFixed(1)} GB';
  if (n >= 1024 * 1024) return '${(n / 1024 / 1024).toStringAsFixed(1)} MB';
  if (n >= 1024) return '${(n / 1024).toStringAsFixed(0)} KB';
  return '$n B';
}

/// تاریخ‌های سرور ترکیبی‌اند (ISO یا رشتهٔ شمسی) — بدون تبدیل، خوانا برمی‌گردند.
String fmtDate(dynamic v) {
  final s = v?.toString() ?? '';
  if (s.isEmpty) return '—';
  if (s.length >= 10 && s.contains('T')) return s.substring(0, 10);
  return s;
}

String fmtTime(dynamic v) {
  final s = v?.toString() ?? '';
  return s.isEmpty ? '—' : s;
}
