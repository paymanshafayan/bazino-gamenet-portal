import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// دیتابیس: منبع داده + دادهٔ نمونه + اسکریپت‌های C#
class MigrationsSection extends StatelessWidget {
  const MigrationsSection({super.key});

  Future<Map<String, dynamic>> _load() async {
    final ds = await ApiClient.get('/api/data-source');
    if (ds is Map) return Map<String, dynamic>.from(ds);
    return <String, dynamic>{};
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return FutureView<Map<String, dynamic>>(
      loader: _load,
      builder: (context, ds) {
        final mode = ds['mode']?.toString() ?? 'sample';
        final isSample = mode == 'sample';
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Panel(
              title: lang.t('dataSourceMode'),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(isSample ? Icons.science_outlined : Icons.storage_outlined, color: const Color(0xFFFFB800)),
                      const SizedBox(width: 10),
                      StatusChip(
                        text: isSample ? lang.t('sampleMode') : lang.t('databaseMode'),
                        color: isSample ? const Color(0xFFFBBF24) : const Color(0xFF34D399),
                      ),
                      const Spacer(),
                      OpChip(
                        label: '${lang.t('switchTo')} ${isSample ? lang.t('databaseMode') : lang.t('sampleMode')}',
                        icon: Icons.swap_horiz,
                        onTap: () => _switch(context, isSample ? 'database' : 'sample'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Panel(
              title: lang.t('dangerZone'),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(lang.t('loadSampleData'),
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70)),
                      ),
                      OpChip(
                        label: lang.t('confirm'),
                        icon: Icons.download_outlined,
                        danger: true,
                        onTap: () => _danger(context, 'reset', lang.t('resetConfirmBody')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(lang.t('clearSampleData'),
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70)),
                      ),
                      OpChip(
                        label: lang.t('delete'),
                        icon: Icons.delete_sweep_outlined,
                        danger: true,
                        onTap: () => _danger(context, 'clear', lang.t('clearConfirmBody')),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            _CsharpMigrationsPanel(),
          ],
        );
      },
    );
  }

  Future<void> _switch(BuildContext context, String target) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/admin/data-source', body: {'mode': target});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _danger(BuildContext context, String op, String confirmBody) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirm(context,
        title: lang.t('dangerZone'), body: confirmBody, danger: true, confirmLabel: lang.t('confirm'));
    if (!ok) return;
    try {
      await ApiClient.post(op == 'reset' ? '/api/admin/reset-database' : '/api/admin/clear-database', body: {});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

class _CsharpMigrationsPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return Panel(
      title: lang.t('csharpMigrations'),
      child: FutureBuilder<dynamic>(
        future: ApiClient.get('/api/csharp/migrations'),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const SizedBox(height: 60, child: Center(child: CircularProgressIndicator()));
          }
          final text = snap.data?.toString() ?? '';
          if (text.isEmpty) return Text(lang.t('empty'), style: TextStyle(color: Colors.grey.shade600, fontSize: 12));
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${text.split('\n').where((l) => l.trim().isNotEmpty).length} SQL',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 260),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: SingleChildScrollView(
                  child: SelectionArea(
                    child: Text(
                      text,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 10.5, height: 1.55, color: Color(0xFF9CDCFE)),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// پیام‌ها: ارسال پیام به کاربر/همه + پیام‌های اخیر
class MessagesSection extends StatefulWidget {
  const MessagesSection({super.key});

  @override
  State<MessagesSection> createState() => _MessagesSectionState();
}

class _MessagesSectionState extends State<MessagesSection> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _recipient = 'All';
  bool _notification = true;
  bool _sending = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<List<Map<String, dynamic>>> _users() async {
    final res = await ApiClient.get('/api/admin/users');
    if (res is Map && res['users'] is List) {
      return (res['users'] as List).whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  Future<void> _send() async {
    final lang = context.read<AppLang>();
    if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
      toast(context, lang.t('fillAllFields'), error: true);
      return;
    }
    setState(() => _sending = true);
    try {
      await ApiClient.post('/api/admin/messages', body: {
        'recipient': _recipient,
        'title': _title.text.trim(),
        'body': _body.text.trim(),
        'sendAsNotification': _notification,
      });
      if (!mounted) return;
      toast(context, lang.t('messageSent'));
      setState(() {
        _title.clear();
        _body.clear();
      });
    } on ApiError catch (e) {
      if (!mounted) return;
      toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Panel(
          title: lang.t('sendMessage'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FutureBuilder<List<Map<String, dynamic>>>(
                future: _users(),
                builder: (context, snap) {
                  final users = snap.data ?? [];
                  return DropdownButtonFormField<String>(
                    initialValue: _recipient,
                    decoration: InputDecoration(labelText: lang.t('recipient')),
                    items: [
                      DropdownMenuItem(value: 'All', child: Text(lang.t('allUsers'))),
                      for (final u in users)
                        DropdownMenuItem(value: u['username'].toString(), child: Text('${u['username']}')),
                    ],
                    onChanged: (v) => setState(() => _recipient = v ?? 'All'),
                  );
                },
              ),
              const SizedBox(height: 12),
              TextField(controller: _title, decoration: InputDecoration(labelText: lang.t('subject'))),
              const SizedBox(height: 12),
              TextField(
                controller: _body,
                minLines: 4,
                maxLines: 8,
                decoration: InputDecoration(labelText: lang.t('messageBody')),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(lang.t('sendAsNotification'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                value: _notification,
                onChanged: (v) => setState(() => _notification = v),
              ),
              const SizedBox(height: 6),
              FilledButton(
                onPressed: _sending ? null : _send,
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13)),
                child: _sending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(lang.t('send')),
              ),
            ],
          ),
        ),
        _RecentMessages(),
      ],
    );
  }
}

class _RecentMessages extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return Panel(
      title: lang.t('messages'),
      child: FutureBuilder<dynamic>(
        future: ApiClient.get('/api/messages'),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const SizedBox(height: 40, child: Center(child: CircularProgressIndicator()));
          }
          final list = snap.data is List ? (snap.data! as List).whereType<Map<String, dynamic>>().toList() : <Map<String, dynamic>>[];
          if (list.isEmpty) {
            return Text(lang.t('empty'), style: TextStyle(color: Colors.grey.shade600, fontSize: 12));
          }
          return Column(
            children: [
              for (final m in list.take(10))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      Icon(m['type'] == 'notification' ? Icons.notifications_active_outlined : Icons.mail_outline,
                          size: 15, color: const Color(0xFF22D3EE)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text('${m['title'] ?? ''} → ${m['recipient'] ?? ''}',
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70)),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

/// لاگ دیتابیس
class DbLogsSection extends StatelessWidget {
  const DbLogsSection({super.key});

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/admin/db-logs');
    if (res is Map && res['logs'] is List) {
      return (res['logs'] as List).whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, logs) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: logs.length,
          itemBuilder: (context, i) {
            final log = logs[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF111726),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      StatusChip(text: '${log['type'] ?? '—'}'),
                      const SizedBox(width: 8),
                      Text('${log['provider'] ?? ''}',
                          style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600, fontWeight: FontWeight.w800)),
                      const Spacer(),
                      Text('${log['timestamp'] ?? ''}',
                          style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600, fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SelectionArea(
                    child: Text(
                      '${log['command'] ?? ''}',
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 11.5, color: Colors.grey.shade400, fontWeight: FontWeight.w600, height: 1.5),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// پرزنتیشن: لینک‌های PDF/HTML (نسخهٔ دسکتاپ و موبایل)
class PresentationSection extends StatelessWidget {
  const PresentationSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    final base = ApiClient.baseUrl;
    Widget link(String label, IconData icon, String path, {bool pdf = true}) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: FilledButton.icon(
          onPressed: () => _open('$base$path'),
          icon: Icon(icon, size: 18),
          label: Text('$label — ${pdf ? 'PDF' : 'HTML'}', style: const TextStyle(fontSize: 12.5)),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 13),
            backgroundColor: pdf ? const Color(0xFFFFB800) : const Color(0xFF1E293B),
            foregroundColor: pdf ? Colors.black : Colors.white,
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Panel(
          title: lang.t('presentation'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(lang.t('presentationIntro'),
                  style: TextStyle(fontSize: 12.5, color: Colors.grey.shade400, height: 1.7, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              link('${lang.t('desktopVersion')} — ${lang.t('downloadPdf')}', Icons.picture_as_pdf, '/Bazino_Pro_Presentation.pdf'),
              link('${lang.t('desktopVersion')} — ${lang.t('openHtml')}', Icons.slideshow_outlined, '/Bazino_Pro_Presentation.html', pdf: false),
              link('${lang.t('mobileVersion')} — ${lang.t('downloadPdf')}', Icons.picture_as_pdf, '/Bazino_Pro_Mobile_Presentation.pdf'),
              link('${lang.t('mobileVersion')} — ${lang.t('openHtml')}', Icons.smartphone, '/Bazino_Pro_Mobile_Presentation.html', pdf: false),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _open(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
