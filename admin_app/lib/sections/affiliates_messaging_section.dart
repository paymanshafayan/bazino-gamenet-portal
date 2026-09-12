import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// همکاران (افیلیت): لیست + گزارش + تنظیمات کمیسیون + کمپین اینستاگرام.
///
/// توجه: مدیریت توکن‌های دسترسی (baz_/api-tokens) — بخش امنیتی —
/// طبق دستور ۲۰۲۶-۰۹-۱۲ عمداً از اپ ادمین حذف شده و فقط از پنل وب
/// قابل مدیریت است.
class AffiliatesSection extends StatelessWidget {
  const AffiliatesSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: lang.t('affiliates')),
              Tab(text: lang.t('affiliatesReport')),
              Tab(text: lang.t('affiliateSettings')),
            ],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(
            child: TabBarView(children: [_AffiliatesTab(), _ReportTab(), _SettingsTabs()]),
          ),
        ],
      ),
    );
  }
}

class _AffiliatesTab extends StatelessWidget {
  const _AffiliatesTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/admin/affiliates');
    if (res is List) return res.whereType<Map<String, dynamic>>().toList();
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
        onPressed: () => _add(context),
        icon: const Icon(Icons.person_add_alt_outlined),
        label: Text(lang.t('addAffiliate'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => (context as Element).markNeedsBuild(),
        child: FutureView<List<Map<String, dynamic>>>(
          loader: _load,
          isEmpty: (l) => l.isEmpty,
          builder: (context, list) => ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final a = list[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: const Color(0xFF111726),
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${a['username'] ?? a['displayName'] ?? '—'}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                          Text('${a['code'] ?? ''}',
                              style: const TextStyle(
                                  fontSize: 11.5, color: Color(0xFFFFB800), fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                        ],
                      ),
                    ),
                    Text('${a['clicks'] ?? a['stats']?['clicks'] ?? 0}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade400, fontWeight: FontWeight.w800)),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Future<void> _add(BuildContext context) async {
    final lang = context.read<AppLang>();
    final username = TextEditingController();
    final code = TextEditingController();
    final saved = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: const Color(0xFF151C2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(lang.t('addAffiliate'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 16),
            TextField(controller: username, decoration: InputDecoration(labelText: lang.t('username'))),
            const SizedBox(height: 12),
            TextField(controller: code, decoration: InputDecoration(labelText: '${lang.t('affiliateCode')} (خودکار)' , hintMaxLines: 1)),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () async {
                try {
                  await ApiClient.post('/api/admin/affiliates', body: {
                    if (username.text.trim().isNotEmpty) 'username': username.text.trim(),
                    if (code.text.trim().isNotEmpty) 'code': code.text.trim().toUpperCase(),
                  });
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } on ApiError catch (e) {
                  if (ctx.mounted) {
                    Navigator.pop(ctx, false);
                    toast(ctx, e.message, error: true);
                  }
                }
              },
              child: Text(lang.t('save')),
            ),
          ],
        ),
      ),
    );
    if (saved == true && context.mounted) {
      toast(context, lang.t('saved'));
      (context as Element).markNeedsBuild();
    }
  }
}

class _ReportTab extends StatelessWidget {
  const _ReportTab();

  Future<Map<String, dynamic>> _load() async {
    final res = await ApiClient.get('/api/admin/affiliates/report');
    return res is Map ? res : <String, dynamic>{};
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return FutureView<Map<String, dynamic>>(
      loader: _load,
      builder: (context, report) {
        final totals = report['totals'] is Map ? report['totals'] as Map<String, dynamic> : <String, dynamic>{};
        final affiliates = report['affiliates'] is List
            ? (report['affiliates'] as List).whereType<Map<String, dynamic>>().toList()
            : <Map<String, dynamic>>[];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Panel(
              title: lang.t('affiliatesReport'),
              child: Column(
                children: [
                  KeyValue(label: lang.t('clicks'), value: fmtMoney(totals['clicks'])),
                  KeyValue(label: lang.t('leads'), value: fmtMoney(totals['leads'])),
                  KeyValue(label: lang.t('netSales'), value: fmtMoneyCurrency(totals['netSales'])),
                  KeyValue(label: lang.t('commission'), value: fmtMoneyCurrency(totals['commissionCost'])),
                  KeyValue(label: lang.t('pending'), value: fmtMoney(totals['pending'])),
                  KeyValue(label: lang.t('approve'), value: fmtMoney(totals['approved'])),
                ],
              ),
            ),
            if (affiliates.isNotEmpty)
              Panel(
                title: lang.t('affiliates'),
                child: Column(
                  children: [
                    for (final a in affiliates)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text('${a['username'] ?? a['code'] ?? '—'}',
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70)),
                            ),
                            Text('${a['clicks'] ?? 0}', style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

/// تنظیمات کمیسیون + کمپین اینستاگرام (ویرایشگر عمومی کلید/مقدار)
class _SettingsTabs extends StatelessWidget {
  const _SettingsTabs();

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            tabs: [Tab(text: lang.t('affiliateSettings')), Tab(text: lang.t('igCampaign'))],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _KeyValuesEditor(
                  titleKey: 'affiliateSettings',
                  loadPath: '/api/admin/affiliate-settings',
                  savePath: '/api/admin/affiliate-settings',
                  saveMethod: 'PUT',
                ),
                _KeyValuesEditor(
                  titleKey: 'igCampaign',
                  loadPath: '/api/admin/ig-campaign',
                  savePath: '/api/admin/ig-campaign',
                  saveMethod: 'PUT',
                  dataKey: 'settings',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KeyValuesEditor extends StatefulWidget {
  const _KeyValuesEditor({
    required this.titleKey,
    required this.loadPath,
    required this.savePath,
    required this.saveMethod,
    this.dataKey,
  });

  final String titleKey;
  final String loadPath;
  final String savePath;
  final String saveMethod;
  final String? dataKey;

  @override
  State<_KeyValuesEditor> createState() => _KeyValuesEditorState();
}

class _KeyValuesEditorState extends State<_KeyValuesEditor> {
  Map<String, dynamic> _original = {};
  final Map<String, TextEditingController> _controllers = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get(widget.loadPath);
      Map<String, dynamic> data;
      if (widget.dataKey != null) {
        data = res is Map && res[widget.dataKey] is Map ? Map<String, dynamic>.from(res[widget.dataKey] as Map) : {};
      } else {
        data = res is Map ? Map<String, dynamic>.from(res)..remove('success') : {};
      }
      _original = data;
      for (final e in data.entries) {
        _controllers[e.key]?.dispose();
        _controllers[e.key] = TextEditingController(text: '${e.value ?? ''}');
      }
      if (mounted) setState(() => _loading = false);
    } on ApiError catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.message;
        });
      }
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final lang = context.read<AppLang>();
    final changed = <String, String>{};
    for (final e in _controllers.entries) {
      final v = e.value.text;
      if ('${_original[e.key] ?? ''}' != v) changed[e.key] = v;
    }
    if (changed.isEmpty) {
      toast(context, lang.t('saved'));
      return;
    }
    try {
      if (widget.saveMethod == 'PUT') {
        await ApiClient.put(widget.savePath, body: changed);
      } else {
        await ApiClient.post(widget.savePath, body: changed);
      }
      if (mounted) {
        toast(context, lang.t('saved'));
        await _load();
      }
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    final keys = _controllers.keys.toList()..sort();
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final k in keys)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: TextField(
                    controller: _controllers[k],
                    decoration: InputDecoration(
                      labelText: k,
                      isDense: true,
                      labelStyle: const TextStyle(fontSize: 11.5, fontFamily: 'monospace'),
                    ),
                    style: const TextStyle(fontSize: 12.5),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _save,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13)),
            child: Text(lang.t('save')),
          ),
        ),
      ],
    );
  }
}

/// پیام‌رسانی (کمپین SMS/Viber): مخاطبان + ارسال.
///
/// توجه: پیکربندی سکرت کانال‌ها — بخش امنیتی — از اپ حذف شده و فقط
/// از پنل وب انجام می‌شود.
class MessagingSection extends StatefulWidget {
  const MessagingSection({super.key});

  @override
  State<MessagingSection> createState() => _MessagingSectionState();
}

class _MessagingSectionState extends State<MessagingSection> {
  final _smsText = TextEditingController();
  final _viberText = TextEditingController();
  final _phones = TextEditingController();
  final Set<String> _channels = {'sms'};
  bool _useAudience = false;
  bool _sending = false;

  @override
  void dispose() {
    _smsText.dispose();
    _viberText.dispose();
    _phones.dispose();
    super.dispose();
  }

  Future<Map<String, dynamic>> _audience() async {
    final res = await ApiClient.get('/api/management/messaging/audience');
    return res is Map ? res : <String, dynamic>{};
  }

  Future<List<Map<String, dynamic>>> _campaigns() async {
    final res = await ApiClient.get('/api/management/messaging/campaigns');
    if (res is List) return res.whereType<Map<String, dynamic>>().toList();
    return [];
  }

  Future<void> _send() async {
    final lang = context.read<AppLang>();
    if (_channels.isEmpty) {
      toast(context, lang.t('fillAllFields'), error: true);
      return;
    }
    if (_channels.contains('sms') && _smsText.text.trim().isEmpty) {
      toast(context, lang.t('fillAllFields'), error: true);
      return;
    }
    if (!_useAudience && _phones.text.trim().isEmpty) {
      toast(context, lang.t('fillAllFields'), error: true);
      return;
    }
    setState(() => _sending = true);
    try {
      await ApiClient.post('/api/management/messaging/send', body: {
        'channels': _channels.toList(),
        'useAudience': _useAudience,
        'phones': _phones.text.split(',').map((p) => p.trim()).where((p) => p.isNotEmpty).toList(),
        'smsText': _smsText.text.trim(),
        'viberText': _viberText.text.trim(),
        'idempotencyKey': idempotencyKey('msg'),
      });
      if (!mounted) return;
      toast(context, lang.t('campaignSent'));
      setState(() {
        _smsText.clear();
        _viberText.clear();
        _phones.clear();
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
        FutureBuilder<Map<String, dynamic>>(
          future: _audience(),
          builder: (context, snap) => Panel(
            title: lang.t('audience'),
            child: snap.connectionState != ConnectionState.done
                ? const SizedBox(height: 30, child: Center(child: CircularProgressIndicator()))
                : Row(
                    children: [
                      Icon(Icons.groups_2_outlined, color: const Color(0xFF22D3EE)),
                      const SizedBox(width: 10),
                      Text(
                        '${lang.t('audienceCount')}: ${fmtMoney(snap.data?['count'] ?? 0)}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ],
                  ),
          ),
        ),
        Panel(
          title: lang.t('sendMessageCampaign'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(lang.t('configFromWebPanel'),
                  style: TextStyle(fontSize: 11, color: Colors.amber.shade200, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  for (final ch in const ['sms', 'viber'])
                    FilterChip(
                      label: Text(ch.toUpperCase()),
                      selected: _channels.contains(ch),
                      onSelected: (v) => setState(() => v ? _channels.add(ch) : _channels.remove(ch)),
                      selectedColor: const Color(0xFFFFB800).withValues(alpha: 0.25),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              if (_channels.contains('sms'))
                TextField(controller: _smsText, minLines: 3, maxLines: 6, decoration: InputDecoration(labelText: lang.t('smsText'))),
              if (_channels.contains('sms') && _channels.contains('viber')) const SizedBox(height: 12),
              if (_channels.contains('viber'))
                TextField(controller: _viberText, minLines: 3, maxLines: 6, decoration: InputDecoration(labelText: lang.t('viberText'))),
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(lang.t('useAudience'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                value: _useAudience,
                onChanged: (v) => setState(() => _useAudience = v),
              ),
              if (!_useAudience)
                TextField(controller: _phones, decoration: InputDecoration(labelText: lang.t('manualPhones'))),
              const SizedBox(height: 14),
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
        FutureBuilder<List<Map<String, dynamic>>>(
          future: _campaigns(),
          builder: (context, snap) {
            final campaigns = snap.data ?? [];
            return Panel(
              title: '${lang.t('campaigns')} (${campaigns.length})',
              child: campaigns.isEmpty
                  ? Text(lang.t('noCampaigns'), style: TextStyle(fontSize: 12, color: Colors.grey.shade600))
                  : Column(
                      children: [
                        for (final c in campaigns)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text('${c['createdAt'] ?? c['id'] ?? '—'} · ${c['channels'] ?? ''}',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white70)),
                                ),
                                Text('${c['sent'] ?? c['count'] ?? 0}',
                                    style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500)),
                              ],
                            ),
                          ),
                      ],
                    ),
            );
          },
        ),
      ],
    );
  }
}
