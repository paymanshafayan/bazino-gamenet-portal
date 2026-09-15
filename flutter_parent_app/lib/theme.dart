import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// تم اختصاصی والدین - متفاوت از تم نئون کاربر
/// پالت آرام، قابل اعتماد، والدپسند: آبی + سفید + سبز تایید
class ParentTheme {
  // Core
  static const Color bg = Color(0xFFF6F8FB);
  static const Color bgSecondary = Color(0xFFEEF2F7);
  static const Color cardBg = Colors.white;
  static const Color primary = Color(0xFF2563EB); // آبی قابل اعتماد
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color secondary = Color(0xFF0EA5E9);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFDC2626);
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);

  static const Color presenceOnline = Color(0xFF16A34A);
  static const Color presenceOffline = Color(0xFF94A3B8);
  static const Color presencePlaying = Color(0xFF2563EB);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: bg,
      primaryColor: primary,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: secondary,
        surface: cardBg,
        error: danger,
      ),
      textTheme: GoogleFonts.vazirmatnTextTheme(
        const TextTheme(
          titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textDark),
          bodyMedium: TextStyle(fontSize: 14, color: textDark),
          bodySmall: TextStyle(fontSize: 12, color: textMuted),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: cardBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.vazirmatn(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: textDark,
        ),
        iconTheme: const IconThemeData(color: textDark),
        shape: const Border(bottom: BorderSide(color: border, width: 1)),
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          textStyle: GoogleFonts.vazirmatn(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
    );
  }

  static BoxDecoration cardDecoration({bool hasShadow = true}) {
    return BoxDecoration(
      color: cardBg,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: border, width: 1),
      boxShadow: hasShadow
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ]
          : null,
    );
  }

  static BoxDecoration statusDecoration(String status) {
    Color c;
    switch (status) {
      case 'online':
      case 'approved':
        c = success;
        break;
      case 'playing':
      case 'pending':
        c = warning;
        break;
      case 'offline':
      case 'rejected':
        c = textMuted;
        break;
      default:
        c = primary;
    }
    return BoxDecoration(
      color: c.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: c.withValues(alpha: 0.3)),
    );
  }
}
