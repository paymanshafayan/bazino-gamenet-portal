import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// قالب‌ها: لیست/فعال‌سازی/حذف + نصب ZIP با خط‌لولهٔ async سرور
/// (POST → 202 + jobId → poll وضعیت تا completed/failed — قرارداد ۲۰۲۶-۰۹-۱۲)
class ThemesSection extends StatelessWidget {
  const ThemesSection({super.key});

  Future<Map<String, dynamic>> _load() async {
    final res = await ApiClient.get('/api/themes');
    if (res is Map) return Map<String, dynamic>.from(res);
    return <String, dynamic>{};
  }

  static List<Map<String, dynamic>> _serverThemes(Map<String, dynamic> data) {
    final raw = data['serverThemes'];
    if (raw is List) return raw.whereType<Map<String, dynamic>>().toList();
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFFFB800),
        foregroundColor: Colors.black,
        onPressed: () => _installZip(context),
        icon: const Icon(Icons.upload_file_outlined),
        label: Text(lang.t('installTheme'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => (context as Element).markNeedsBuild(),
        child: FutureView<Map<String, dynamic>>(
          loader: _load,
          builder: (context, data) {
            final active = data['activeThemeId']?.toString() ?? '';
            final themes = _serverThemes(data);
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: themes.length,
              itemBuilder: (context, i) {
                final t = themes[i];
                final isActive = t['id']?.toString() == active;
                final assets = t['assetFiles'];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111726),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isActive ? const Color(0xFFFFB800).withValues(alpha: 0.6) : Colors.white.withValues(alpha: 0.07),
                      width: isActive ? 1.4 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: _parseColor(t['primaryColor'] ?? t['colors']?['primary']),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text('${t['name'] ?? t['id']}',
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Colors.white)),
                          ),
                          if (isActive)
                            StatusChip(text: lang.t('activeTheme'), color: const Color(0xFF34D399)),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        '${t['id'] ?? ''} · v${t['version'] ?? '?'} · ${lang.t('assets')}: ${assets is List ? assets.length : 0} · ${t['hasComponentJs'] == true ? lang.t('hasComponentJs') : lang.t('cssOnly')}',
                        style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          if (!isActive)
                            OpChip(
                              label: lang.t('activateTheme'),
                              icon: Icons.bolt_outlined,
                              onTap: () => _activate(context, t['id'].toString()),
                            ),
                          if (!isActive) const SizedBox(width: 8),
                          OpChip(
                            label: lang.t('delete'),
                            icon: Icons.delete_outline,
                            danger: true,
                            onTap: () => _delete(context, t),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Color _parseColor(dynamic c) {
    final s = c?.toString() ?? '';
    if (s.startsWith('#') && (s.length == 7 || s.length == 4)) {
      try {
        return Color(int.parse('FF${s.substring(1).padRight(6, '0').substring(0, 6)}', radix: 16));
      } catch (_) {}
    }
    return const Color(0xFFFFB800);
  }

  Future<void> _activate(BuildContext context, String id) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirm(context, title: lang.t('activateThemeConfirm'), body: id);
    if (!ok) return;
    try {
      await ApiClient.post('/api/admin/themes/activate', body: {'themeId': id});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _delete(BuildContext context, Map<String, dynamic> t) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirm(context,
        title: lang.t('deleteThemeConfirm'), body: '${t['name'] ?? t['id']}', danger: true, confirmLabel: lang.t('delete'));
    if (!ok) return;
    try {
      await ApiClient.delete('/api/admin/themes/${t['id']}');
      if (context.mounted) {
        toast(context, lang.t('deleted'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  /* ── نصب ZIP: انتخاب فایل → POST → 202 → پولینگ تا نتیجه ── */
  Future<void> _installZip(BuildContext context) async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['zip'],
      withData: true,
    );
    final file = picked?.files.single;
    if (file == null) return;
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) {
      if (context.mounted) {
        toast(context, context.read<AppLang>().t('operationFailed'), error: true);
      }
      return;
    }
    if (context.mounted) {
      await _runInstall(context, file.name, bytes);
    }
  }

  Future<void> _runInstall(BuildContext context, String fileName, Uint8List bytes) async {
    final lang = context.read<AppLang>();
    // دیالوگ پیشرفت — تا پایان job باز می‌ماند
    final progress = ValueNotifier<({String status, int done, int total, String? error})>(
      (status: 'queued', done: 0, total: 0, error: null),
    );

    final installer = () async {
      try {
        final res = await ApiClient.postRaw(
          '/api/admin/themes/install',
          bytes,
          'application/zip',
          query: {'name': fileName, 'replace': '1'},
        );
        if (res is! Map || res['jobId'] == null) {
          progress.value = (status: 'failed', done: 0, total: 0, error: lang.t('operationFailed'));
          return;
        }
        final jobId = res['jobId'].toString();
        progress.value = (status: 'queued', done: 0, total: (res['progress']?['filesTotal'] ?? 0) as int, error: null);

        // پولینگ کنترل‌شده — همان قرارداد پنل وب
        const pollMs = Duration(milliseconds: 1300);
        final deadline = DateTime.now().add(const Duration(minutes: 10));
        while (DateTime.now().isBefore(deadline)) {
          await Future<void>.delayed(pollMs);
          final job = await ApiClient.get('/api/admin/themes/install-jobs/$jobId');
          if (job is! Map) continue;
          final st = job['status']?.toString() ?? 'queued';
          final p = job['progress'];
          progress.value = (
            status: st,
            done: (p is Map ? p['filesDone'] ?? 0 : 0) as int,
            total: (p is Map ? p['filesTotal'] ?? 0 : 0) as int,
            error: job['status'] == 'failed' ? job['error']?.toString() : null,
          );
          if (st == 'completed' || st == 'failed') return;
        }
        progress.value = (status: 'failed', done: 0, total: 0, error: lang.t('operationFailed'));
      } on ApiError catch (e) {
        progress.value = (status: 'failed', done: 0, total: 0, error: e.message);
      } catch (e) {
        progress.value = (status: 'failed', done: 0, total: 0, error: e.toString());
      }
    }();

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => ValueListenableBuilder<({String status, int done, int total, String? error})>(
        valueListenable: progress,
        builder: (ctx, p, _) => AlertDialog(
          backgroundColor: const Color(0xFF151C2E),
          title: Text(p.status == 'completed'
              ? lang.t('installCompleted')
              : p.status == 'failed'
                  ? lang.t('installFailed')
                  : lang.t('installing')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$fileName · ${bytes.length ~/ 1024} KB',
                  style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
              const SizedBox(height: 14),
              if (p.status == 'completed')
                const Icon(Icons.check_circle_outline, color: Color(0xFF34D399), size: 42)
              else if (p.status == 'failed')
                Icon(Icons.error_outline, color: Colors.red.shade300, size: 42)
              else ...[
                const SizedBox(
                  width: 34,
                  height: 34,
                  child: CircularProgressIndicator(strokeWidth: 3),
                ),
                const SizedBox(height: 14),
                Text(_phaseLabel(lang, p.status),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                if (p.total > 0) ...[
                  const SizedBox(height: 10),
                  LinearProgressIndicator(
                    value: p.done / p.total,
                    backgroundColor: Colors.white.withValues(alpha: 0.08),
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  const SizedBox(height: 6),
                  Text('${p.done}/${p.total}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w800)),
                ],
              ],
              if (p.error != null) ...[
                const SizedBox(height: 12),
                Text(p.error!,
                    style: TextStyle(fontSize: 12, color: Colors.red.shade300, fontWeight: FontWeight.w700, height: 1.6)),
              ],
            ],
          ),
          actions: [
            if (p.status == 'completed' || p.status == 'failed')
              FilledButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('confirm')))
            else
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('cancel'))),
          ],
        ),
      ),
    );

    await installer;
    if (context.mounted) (context as Element).markNeedsBuild();
  }

  static String _phaseLabel(AppLang lang, String status) {
    switch (status) {
      case 'queued':
        return lang.t('phaseQueued');
      case 'validating':
        return lang.t('phaseValidating');
      case 'extracting':
        return lang.t('phaseExtracting');
      case 'installing':
        return lang.t('phaseInstalling');
      default:
        return lang.t('loading');
    }
  }
}
