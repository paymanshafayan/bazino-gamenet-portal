import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// جارویس: چت + گفتگوها + درخواست‌های تأیید.
///
/// توجه: پیکربندی کلیدهای سرویس‌های AI — بخش امنیتی — از اپ حذف شده
/// و فقط از پنل وب انجام می‌شود.
class JarvisSection extends StatelessWidget {
  const JarvisSection({super.key});

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
              Tab(text: lang.t('jarvis')),
              Tab(text: lang.t('sessions')),
              Tab(text: lang.t('approvals')),
            ],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(
            child: TabBarView(children: [_JarvisChat(), _SessionsTab(), _ApprovalsTab()]),
          ),
        ],
      ),
    );
  }
}

class _JarvisChat extends StatefulWidget {
  const _JarvisChat();

  @override
  State<_JarvisChat> createState() => _JarvisChatState();
}

class _JarvisChatState extends State<_JarvisChat> {
  final _input = TextEditingController();
  final _messages = <_ChatMsg>[];
  final _scroll = ScrollController();
  String? _sessionId;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final lang = context.read<AppLang>();
    _messages.add(_ChatMsg(
      text: lang.isFa
          ? 'سلام! من جارویس دستیار مدیریت بازینو هستم. چه کاری برایتان انجام دهم؟'
          : 'Hi! I am Jarvis, the Bazino admin assistant. How can I help?',
      fromAdmin: false,
    ));
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final lang = context.read<AppLang>();
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    setState(() {
      _messages.add(_ChatMsg(text: text, fromAdmin: true));
      _busy = true;
    });
    _input.clear();
    _scrollDown();

    try {
      // قرارداد: POST /api/management/jarvis/chat {message, language} → {sessionId, reply, ...}
      final res = await ApiClient.post('/api/management/jarvis/chat', body: {
        'message': text,
        if (_sessionId != null) 'sessionId': _sessionId,
        'language': lang.code,
      });
      if (res is Map) {
        _sessionId = res['sessionId']?.toString() ?? _sessionId;
        final reply = res['reply']?.toString() ?? '…';
        setState(() => _messages.add(_ChatMsg(text: reply, fromAdmin: false)));
      }
    } on ApiError catch (e) {
      setState(() => _messages.add(_ChatMsg(text: e.message, fromAdmin: false, error: true)));
    } finally {
      setState(() => _busy = false);
      _scrollDown();
    }
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scroll,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, i) {
              final m = _messages[i];
              return Align(
                alignment: m.fromAdmin ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                  decoration: BoxDecoration(
                    color: m.error
                        ? Colors.red.shade900.withValues(alpha: 0.35)
                        : m.fromAdmin
                            ? const Color(0xFFFFB800).withValues(alpha: 0.15)
                            : Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadiusDirectional.only(
                      topStart: const Radius.circular(14),
                      topEnd: const Radius.circular(14),
                      bottomStart: m.fromAdmin ? const Radius.circular(14) : Radius.zero,
                      bottomEnd: m.fromAdmin ? Radius.zero : const Radius.circular(14),
                    ),
                  ),
                  child: Text(
                    m.text,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.6,
                      fontWeight: FontWeight.w600,
                      color: m.error ? Colors.red.shade100 : Colors.white,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (_busy)
          const Padding(padding: EdgeInsets.only(bottom: 6), child: SizedBox(
            width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    onSubmitted: (_) => _send(),
                    textInputAction: TextInputAction.send,
                    decoration: InputDecoration(labelText: lang.t('askJarvis')),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filled(
                  onPressed: _busy ? null : _send,
                  icon: const Icon(Icons.send_outlined, size: 20),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ChatMsg {
  _ChatMsg({required this.text, required this.fromAdmin, this.error = false});
  final String text;
  final bool fromAdmin;
  final bool error;
}

class _SessionsTab extends StatelessWidget {
  const _SessionsTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/jarvis/sessions');
    if (res is Map && res['sessions'] is List) {
      return (res['sessions'] as List).whereType<Map<String, dynamic>>().toList();
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
        builder: (context, list) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: list.length,
          itemBuilder: (context, i) {
            final s = list[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: const Color(0xFF111726),
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${s['title'] ?? s['id'] ?? '—'}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                  if (s['updatedAt'] != null || s['createdAt'] != null)
                    Text('${s['updatedAt'] ?? s['createdAt']}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ApprovalsTab extends StatelessWidget {
  const _ApprovalsTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/jarvis/approvals');
    if (res is Map && res['items'] is List) {
      return (res['items'] as List).whereType<Map<String, dynamic>>().toList();
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
        builder: (context, items) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          itemBuilder: (context, i) {
            final a = items[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF111726),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text('${a['title'] ?? a['skill'] ?? a['id']}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                      StatusChip(text: '${a['status'] ?? 'pending'}'),
                    ],
                  ),
                  if (a['summary'] != null || a['detail'] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 5),
                      child: Text('${a['summary'] ?? a['detail']}',
                          style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, height: 1.6, fontWeight: FontWeight.w600)),
                    ),
                  if (a['status']?.toString() == 'pending') ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        OpChip(
                          label: lang.t('approve'),
                          icon: Icons.check_circle_outline,
                          onTap: () => _act(context, '${a['id']}/approve'),
                        ),
                        const SizedBox(width: 8),
                        OpChip(
                          label: lang.t('reject'),
                          icon: Icons.cancel_outlined,
                          danger: true,
                          onTap: () => _act(context, '${a['id']}/reject'),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _act(BuildContext context, String sub) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/management/jarvis/approvals/$sub', body: {});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}
