import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// محتوا (اتوماسیون مانوس): صف محتوا + تأیید/لغو/انتشار موارد سرآمده
class ContentSection extends StatelessWidget {
  const ContentSection({super.key});

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/content');
    if (res is List) return res.whereType<Map<String, dynamic>>().toList();
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFFFB800),
        foregroundColor: Colors.black,
        onPressed: () => _publishDue(context),
        icon: const Icon(Icons.publish_outlined),
        label: Text(lang.t('publishDue'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
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
              final c = list[i];
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
                          child: Text('${c['title'] ?? c['id'] ?? '—'}',
                              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white)),
                        ),
                        if (c['status'] != null) StatusChip(text: '${c['status']}'),
                      ],
                    ),
                    if (c['summary'] != null || c['body'] != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '${c['summary'] ?? c['body']}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                        ),
                      ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        OpChip(label: lang.t('approveContent'), icon: Icons.check_circle_outline,
                            onTap: () => _act(context, '${c['id']}/approve')),
                        const SizedBox(width: 8),
                        OpChip(label: lang.t('cancelContent'), icon: Icons.cancel_outlined, danger: true,
                            onTap: () => _act(context, '${c['id']}/cancel')),
                        const SizedBox(width: 8),
                        OpChip(label: lang.t('scheduleContent'), icon: Icons.schedule_outlined, accent: const Color(0xFF22D3EE),
                            onTap: () => _act(context, '${c['id']}/schedule')),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Future<void> _act(BuildContext context, String sub) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/management/content/$sub', body: {'idempotencyKey': idempotencyKey('content')});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _publishDue(BuildContext context) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/management/content/publish-due', body: {'idempotencyKey': idempotencyKey('pubdue')});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

/// چت: لیست اتاق‌ها + حذف اتاق
class ChatSection extends StatelessWidget {
  const ChatSection({super.key});

  Future<List<String>> _load() async {
    final res = await ApiClient.get('/api/chat/rooms');
    if (res is List) return res.map((e) => e.toString()).toList();
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<String>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, rooms) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: rooms.length,
          itemBuilder: (context, i) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            decoration: BoxDecoration(
              color: const Color(0xFF111726),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
            ),
            child: Row(
              children: [
                Icon(Icons.forum_outlined, size: 18, color: const Color(0xFF22D3EE)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(rooms[i], style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white)),
                ),
                OpChip(
                  label: lang.t('delete'),
                  icon: Icons.delete_outline,
                  danger: true,
                  onTap: () => _delete(context, rooms[i]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, String name) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirm(context,
        title: lang.t('deleteRoomConfirm'), body: name, danger: true, confirmLabel: lang.t('delete'));
    if (!ok) return;
    try {
      await ApiClient.delete('/api/admin/chat-rooms/${Uri.encodeComponent(name)}');
      if (context.mounted) {
        toast(context, lang.t('deleted'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}
