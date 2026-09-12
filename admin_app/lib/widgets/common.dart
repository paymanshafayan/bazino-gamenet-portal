import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/l10n.dart';

/* ── کارت پس‌زمینهٔ استاندارد ── */
class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.title, this.action});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final String? title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: padding,
      decoration: BoxDecoration(
        color: const Color(0xFF111726),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title!,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: Colors.grey.shade300,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  if (action != null) action!,
                ],
              ),
            ),
          child,
        ],
      ),
    );
  }
}

/* ── کارت آمار داشبورد ── */
class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value, required this.icon, this.accent = const Color(0xFFFFB800)});

  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111726),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: accent),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Colors.grey.shade500),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

/* ── وضعیت‌های بارگذاری/خطا/خالی + retry ── */
class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) =>
      const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off, size: 40, color: Colors.red.shade300),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w700)),
            if (onRetry != null) ...[
              const SizedBox(height: 14),
              OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh, size: 16), label: Text(lang.t('retry'))),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inbox_outlined, size: 38, color: Colors.grey.shade600),
            const SizedBox(height: 10),
            Text(text, style: TextStyle(color: Colors.grey.shade500, fontSize: 13, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

/* ── FutureBuilder با retry خودکار ── */
class FutureView<T> extends StatefulWidget {
  const FutureView({super.key, required this.loader, required this.builder, this.isEmpty});

  final Future<T> Function() loader;
  final Widget Function(BuildContext, T) builder;
  final bool Function(T)? isEmpty;

  @override
  State<FutureView<T>> createState() => _FutureViewState<T>();
}

class _FutureViewState<T> extends State<FutureView<T>> {
  int _attempt = 0;

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return FutureBuilder<T>(
      key: ValueKey(_attempt),
      future: widget.loader(),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const LoadingView();
        }
        if (snap.hasError) {
          return ErrorView(
            message: snap.error.toString(),
            onRetry: () => setState(() => _attempt++),
          );
        }
        final data = snap.data as T;
        if (widget.isEmpty?.call(data) ?? false) {
          return EmptyView(text: lang.t('empty'));
        }
        return widget.builder(context, data);
      },
    );
  }
}

/* ── چیپ وضعیت ── */
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.text, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? _auto(text);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: c)),
    );
  }

  static Color _auto(String s) {
    final l = s.toLowerCase();
    if (l.contains('open') || l.contains('فعال') || l.contains('باز')) return const Color(0xFF34D399);
    if (l.contains('pending') || l.contains('wait') || l.contains('انتظار')) return const Color(0xFFFBBF24);
    if (l.contains('cancel') || l.contains('reject') || l.contains('closed') || l.contains('لغو') || l.contains('بسته')) return Colors.red.shade300;
    if (l.contains('deliver') || l.contains('ship') || l.contains('تحویل') || l.contains('ارسال')) return const Color(0xFF60A5FA);
    if (l.contains('prepar') || l.contains('process') || l.contains('آماده') || l.contains('بررسی')) return const Color(0xFF22D3EE);
    return Colors.grey.shade400;
  }
}

/* ── دیالوگ تأیید ── */
Future<bool> showConfirm(
  BuildContext context, {
  required String title,
  String? body,
  String? confirmLabel,
  bool danger = false,
}) async {
  final lang = context.read<AppLang>();
  final res = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF151C2E),
      title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
      content: body == null
          ? null
          : Text(body, style: const TextStyle(fontSize: 13, color: Colors.white70, height: 1.6)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(lang.t('cancel'))),
        FilledButton(
          style: danger
              ? FilledButton.styleFrom(backgroundColor: Colors.red.shade700, foregroundColor: Colors.white)
              : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirmLabel ?? lang.t('confirm')),
        ),
      ],
    ),
  );
  return res ?? false;
}

/* ── اسنک‌بار ── */
void toast(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message, style: const TextStyle(fontWeight: FontWeight.w700)),
      backgroundColor: error ? Colors.red.shade700 : const Color(0xFF1E293B),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

/* ── سطر «کلید: مقدار» ── */
class KeyValue extends StatelessWidget {
  const KeyValue({super.key, required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70)),
          ),
        ],
      ),
    );
  }
}

/* ── دکمهٔ عملیات کوچک ── */
class OpChip extends StatelessWidget {
  const OpChip({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.danger = false,
    this.accent,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final bool danger;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final c = danger ? Colors.red.shade300 : (accent ?? const Color(0xFFFFB800));
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: c.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: c.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: c),
            const SizedBox(width: 5),
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: c)),
          ],
        ),
      ),
    );
  }
}
