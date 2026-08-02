import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// BAZINO PRO — Neon Glass Gaming Design System.
///
/// Redesigned to match the reference mood ("PathMD"-style): deep purple/black gradient
/// backgrounds, glassmorphic cards with a soft glow border, a hexagon brand mark, and
/// gradient CTA buttons. Built entirely with Flutter SDK primitives (BackdropFilter +
/// ImageFilter.blur for the glass effect) — no new package dependency was needed.
///
/// NOTE: written in a sandbox with no Flutter SDK/emulator available, so none of this was
/// actually run or visually verified — see flutter_app/REDESIGN_NOTES.md before shipping.
class GamingTheme {
  // ---- Core palette -------------------------------------------------------
  static const Color darkBg = Color(0xFF07040F); // near-black with a purple tint
  static const Color darkBgSecondary = Color(0xFF120A24); // gradient partner for backgrounds
  static const Color darkCard = Color(0x66161029); // translucent glass card base
  static const Color darkCardSolid = Color(0xFF161029); // opaque variant (e.g. bottom sheets)

  static const Color primary = Color(0xFF00E5FF); // neon cyan
  static const Color primaryHover = Color(0xFF00B8CC);
  static const Color secondary = Color(0xFFA855F7); // neon purple (already the app's accent)
  static const Color secondaryDeep = Color(0xFF6D28D9);
  static const Color goldAccent = Color(0xFFFFD700);
  static const Color accentRed = Color(0xFFFF3B5C);
  static const Color accentGreen = Color(0xFF00FFA3);

  static const Color textLight = Color(0xFFF1F0FA);
  static const Color textMuted = Color(0xFF9C93B8);

  /// Kept as an alias so existing call sites using the old (misspelled/renamed) name still
  /// compile — `darkBackground` was referenced in main.dart/auth_screen.dart but was never
  /// actually defined anywhere, which meant the app could not have compiled as-is.
  static const Color darkBackground = darkBg;

  // ---- Shared gradients -----------------------------------------------------
  static const LinearGradient bgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [darkBgSecondary, darkBg],
  );

  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, secondary],
  );

  static const LinearGradient ctaGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [secondary, primary],
  );

  // ---- Reusable glow/border decorations -------------------------------------
  static BoxDecoration glassDecoration({
    double radius = 20,
    Color glow = primary,
    double glowOpacity = 0.35,
    double borderOpacity = 0.28,
  }) {
    return BoxDecoration(
      color: darkCard,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: glow.withOpacity(borderOpacity), width: 1.2),
      boxShadow: [
        BoxShadow(color: glow.withOpacity(glowOpacity * 0.35), blurRadius: 24, spreadRadius: -4),
      ],
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: primary,
      cardColor: darkCard,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        background: darkBg,
        surface: darkCard,
        error: accentRed,
      ),
      cardTheme: CardThemeData(
        color: darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: primary.withOpacity(0.16), width: 1),
        ),
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.vazirmatn(
          fontSize: 36,
          fontWeight: FontWeight.w900,
          color: textLight,
          letterSpacing: 2,
        ),
        headlineMedium: GoogleFonts.vazirmatn(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: textLight,
        ),
        bodyLarge: GoogleFonts.vazirmatn(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: textLight,
        ),
        bodyMedium: GoogleFonts.vazirmatn(
          fontSize: 12,
          color: textMuted,
        ),
        labelLarge: GoogleFonts.vazirmatn(
          fontSize: 14,
          fontWeight: FontWeight.w900,
          color: primary,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}

/// A frosted-glass card: BackdropFilter blur + translucent fill + soft glow border.
/// The core reusable building block for the new look — used across the redesigned screens.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color glow;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 20,
    this.glow = GamingTheme.primary,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: GamingTheme.glassDecoration(radius: radius, glow: glow),
          child: child,
        ),
      ),
    );
    if (onTap == null) return content;
    return InkWell(borderRadius: BorderRadius.circular(radius), onTap: onTap, child: content);
  }
}

/// A full-width gradient call-to-action button (cyan → purple), matching the reference
/// "Get Started" style button.
class NeonGradientButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool loading;

  const NeonGradientButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: GamingTheme.ctaGradient,
        boxShadow: [
          BoxShadow(color: GamingTheme.secondary.withOpacity(0.4), blurRadius: 20, spreadRadius: -4, offset: const Offset(0, 8)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: loading ? null : onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[Icon(icon, color: Colors.white, size: 18), const SizedBox(width: 8)],
                        Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Hexagon brand mark with an outer glow — the "P" badge from the reference splash,
/// adapted here as a generic hex container (used for the BAZINO logo + the floating
/// Jarvis nav button).
class HexagonBadge extends StatelessWidget {
  final double size;
  final Widget child;
  final Gradient gradient;
  final double glowOpacity;

  const HexagonBadge({
    super.key,
    required this.child,
    this.size = 72,
    this.gradient = GamingTheme.brandGradient,
    this.glowOpacity = 0.55,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(color: GamingTheme.primary.withOpacity(glowOpacity * 0.4), blurRadius: size * 0.5, spreadRadius: -2),
        ],
      ),
      child: CustomPaint(
        painter: _HexagonPainter(gradient: gradient),
        child: Center(child: child),
      ),
    );
  }
}

class _HexagonPainter extends CustomPainter {
  final Gradient gradient;
  _HexagonPainter({required this.gradient});

  @override
  void paint(Canvas canvas, Size size) {
    final path = _hexPath(size);
    final rect = Offset.zero & size;

    final fillPaint = Paint()..shader = gradient.createShader(rect);
    canvas.drawPath(path, fillPaint..style = PaintingStyle.fill..color = Colors.white.withOpacity(0.06));

    final borderPaint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    canvas.drawPath(path, borderPaint);
  }

  Path _hexPath(Size size) {
    final w = size.width, h = size.height;
    final path = Path();
    final points = <Offset>[
      Offset(w * 0.5, 0),
      Offset(w, h * 0.25),
      Offset(w, h * 0.75),
      Offset(w * 0.5, h),
      Offset(0, h * 0.75),
      Offset(0, h * 0.25),
    ];
    path.addPolygon(points, true);
    return path;
  }

  @override
  bool shouldRepaint(covariant _HexagonPainter oldDelegate) => false;
}

/// Faint animated-looking "circuit/heartbeat" line pattern for splash/background accents
/// (a static approximation of the reference splash background — kept lightweight since we
/// can't preview animation timing/perf without a real device).
class CircuitBackgroundPainter extends CustomPainter {
  final Color color;
  CircuitBackgroundPainter({this.color = GamingTheme.primary});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withOpacity(0.10)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    final path = Path();
    final midY = size.height * 0.42;
    path.moveTo(0, midY);
    path.lineTo(size.width * 0.30, midY);
    path.lineTo(size.width * 0.36, midY - 40);
    path.lineTo(size.width * 0.42, midY + 50);
    path.lineTo(size.width * 0.48, midY - 20);
    path.lineTo(size.width * 0.55, midY);
    path.lineTo(size.width, midY);
    canvas.drawPath(path, paint);

    final dotPaint = Paint()..color = color.withOpacity(0.5);
    for (final dx in [0.30, 0.42, 0.55]) {
      canvas.drawCircle(Offset(size.width * dx, midY), 2.4, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CircuitBackgroundPainter oldDelegate) => false;
}
