import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// تیکت‌ها: لیست + جزئیات + پاسخ + تغییر وضعیت
class TicketsSection extends StatelessWidget {
  const TicketsSection({super.key});

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/admin/tickets');
    if (res is Map && res['tickets'] is List) {
      return (res['tickets'] as List).whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  String _statusKey(dynamic status) {
    switch (status?.toString()) {
      case 'open':
        return 'open';
      case 'customer_reply':
        return 'customerReply';
      case 'answered':
        return 'answered';
      case 'closed':
        return 'closed';
      default:
        return 'open';
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, tickets) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: tickets.length,
          itemBuilder: (context, i) {
            final t = tickets[i];
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
                        child: Text('${t['subject'] ?? t['title'] ?? t['id']}',
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                      StatusChip(text: lang.t(_statusKey(t['status']))),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${t['username'] ?? '—'} · ${t['createdAt'] ?? t['date'] ?? ''}',
                      style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  OpChip(
                    label: lang.t('details'),
                    icon: Icons.open_in_new_outlined,
                    onTap: () => _openTicket(context, t['id'].toString()),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _openTicket(BuildContext context, String id) async {
    final lang = context.read<AppLang>();
    try {
      final data = await ApiClient.get('/api/admin/tickets/$id');
      if (!context.mounted) return;
      if (data is! Map || data['success'] != true) {
        toast(context, lang.t('operationFailed'), error: true);
        return;
      }
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: const Color(0xFF151C2E),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        builder: (ctx) => _TicketSheet(ticket: data['ticket'] is Map ? data['ticket'] as Map<String, dynamic> : {}, messages: data['messages']),
      );
      if (context.mounted) (context as Element).markNeedsBuild();
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

class _TicketSheet extends StatefulWidget {
  const _TicketSheet({required this.ticket, this.messages});
  final Map<String, dynamic> ticket;
  final dynamic messages;

  @override
  State<_TicketSheet> createState() => _TicketSheetState();
}

class _TicketSheetState extends State<_TicketSheet> {
  final _replyCtrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _reply() async {
    final lang = context.read<AppLang>();
    final id = widget.ticket['id']?.toString();
    if (id == null || _replyCtrl.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ApiClient.post('/api/admin/tickets/$id/reply', body: {'message': _replyCtrl.text.trim()});
      if (!mounted) return;
      toast(context, lang.t('saved'));
      Navigator.pop(context);
    } on ApiError catch (e) {
      if (!mounted) return;
      toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _status(String status) async {
    final lang = context.read<AppLang>();
    final id = widget.ticket['id']?.toString();
    if (id == null) return;
    setState(() => _busy = true);
    try {
      await ApiClient.post('/api/admin/tickets/$id/status', body: {'status': status});
      if (!mounted) return;
      toast(context, lang.t('saved'));
      Navigator.pop(context);
    } on ApiError catch (e) {
      if (!mounted) return;
      toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    final t = widget.ticket;
    final msgs = widget.messages is List ? (widget.messages! as List).whereType<Map<String, dynamic>>().toList() : <Map<String, dynamic>>[];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('${t['subject'] ?? t['title'] ?? ''}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text('${t['username'] ?? '—'} · ${t['createdAt'] ?? ''}',
                style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (t['message'] != null || t['body'] != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('${t['message'] ?? t['body']}',
                    style: const TextStyle(fontSize: 12.5, height: 1.7, color: Colors.white70)),
              ),
            for (final m in msgs)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: m['from'] == 'admin' || m['isAdmin'] == true
                      ? const Color(0xFFFFB800).withValues(alpha: 0.08)
                      : Colors.white.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${m['from'] ?? m['author'] ?? ''}',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Color(0xFFFFB800))),
                    const SizedBox(height: 4),
                    Text('${m['message'] ?? m['body'] ?? ''}',
                        style: const TextStyle(fontSize: 12.5, height: 1.6, color: Colors.white70)),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            TextField(
              controller: _replyCtrl,
              minLines: 2,
              maxLines: 5,
              decoration: InputDecoration(labelText: lang.t('replyPlaceholder')),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: _busy ? null : _reply,
                    child: Text(lang.t('sendReply')),
                  ),
                ),
                const SizedBox(width: 10),
                OpChip(
                  label: lang.t('markAnswered'),
                  icon: Icons.check_outlined,
                  onTap: _busy ? null : () => _status('answered'),
                ),
                const SizedBox(width: 8),
                OpChip(
                  label: lang.t('closeTicket'),
                  icon: Icons.lock_outline,
                  danger: true,
                  onTap: _busy ? null : () => _status('closed'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
