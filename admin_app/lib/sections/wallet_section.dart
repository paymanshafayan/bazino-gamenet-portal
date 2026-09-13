import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// کیف پول: مشتریان + عملیات مالی + تسویه‌ها + سفارش‌های حضوری + رسیدها
class WalletSection extends StatelessWidget {
  const WalletSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: lang.t('customers')),
              Tab(text: lang.t('walletOps')),
              Tab(text: lang.t('cashouts')),
              Tab(text: lang.t('onsiteOrders')),
            ],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(
            child: TabBarView(
              children: [_CustomersTab(), _WalletOpsTab(), _CashoutsTab(), _OnsiteOrdersTab()],
            ),
          ),
        ],
      ),
    );
  }
}

List<Map<String, dynamic>> _listOf(dynamic v) =>
    v is List ? v.whereType<Map<String, dynamic>>().toList() : [];

class _CustomersTab extends StatelessWidget {
  const _CustomersTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/customers');
    return _listOf(res);
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, customers) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: customers.length,
          itemBuilder: (context, i) {
            final c = customers[i];
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
                  CircleAvatar(
                    radius: 15,
                    backgroundColor: const Color(0xFFFFB800).withValues(alpha: 0.15),
                    child: Text(
                      (c['username']?.toString().isNotEmpty ?? false) ? c['username'].toString()[0].toUpperCase() : '?',
                      style: const TextStyle(color: Color(0xFFFFB800), fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${c['displayName'] ?? c['username']}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                        Text('${c['phone'] ?? '—'}',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  Text(fmtMoneyCurrency(c['balance']),
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF34D399))),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _WalletOpsTab extends StatefulWidget {
  const _WalletOpsTab();

  @override
  State<_WalletOpsTab> createState() => _WalletOpsTabState();
}

class _WalletOpsTabState extends State<_WalletOpsTab> {
  final _username = TextEditingController();
  final _amount = TextEditingController();
  final _note = TextEditingController();
  String _op = 'topup';
  bool _busy = false;

  @override
  void dispose() {
    _username.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    final lang = context.read<AppLang>();
    final user = _username.text.trim();
    final amount = num.tryParse(_amount.text.trim());
    if (user.isEmpty || amount == null || amount <= 0) {
      toast(context, lang.t('fillAllFields'), error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      if (_op == 'topup') {
        await ApiClient.post('/api/management/wallet/topup', body: {
          'username': user,
          'amount': amount,
          'method': 'cash',
          'confirmed': true,
          'idempotencyKey': idempotencyKey('topup'),
        });
      } else if (_op == 'cashout') {
        await ApiClient.post('/api/management/wallet/cashout', body: {
          'username': user,
          'amount': amount,
          'idempotencyKey': idempotencyKey('cout'),
        });
      } else {
        final delta = int.tryParse(_amount.text.trim());
        if (delta == null || delta == 0) {
          toast(context, lang.t('invalidNumber'), error: true);
          return;
        }
        await ApiClient.post('/api/admin/credits/adjust', body: {
          'username': user,
          'delta': delta,
          'note': _note.text.trim(),
        });
      }
      if (!mounted) return;
      toast(context, lang.t('done'));
      setState(() {
        _amount.clear();
        _note.clear();
      });
    } on ApiError catch (e) {
      if (!mounted) return;
      toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Panel(
          title: lang.t('walletOps'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SegmentedButton<String>(
                segments: [
                  ButtonSegment(value: 'topup', label: Text(lang.t('topup'))),
                  ButtonSegment(value: 'cashout', label: Text(lang.t('requestCashout'))),
                  ButtonSegment(value: 'credits', label: Text(lang.t('adjustCredits'))),
                ],
                selected: {_op},
                onSelectionChanged: (s) => setState(() => _op = s.first),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _username,
                decoration: InputDecoration(labelText: lang.t('username'), prefixIcon: const Icon(Icons.person_search_outlined)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _amount,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: _op == 'credits' ? lang.t('creditsDelta') : lang.t('amount'),
                  prefixIcon: const Icon(Icons.payments_outlined),
                ),
              ),
              if (_op == 'credits') ...[
                const SizedBox(height: 12),
                TextField(controller: _note, decoration: InputDecoration(labelText: lang.t('note'))),
              ],
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _busy ? null : _run,
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13)),
                child: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(lang.t('confirm')),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CashoutsTab extends StatelessWidget {
  const _CashoutsTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/cashouts');
    return _listOf(res);
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, list) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: list.length,
          itemBuilder: (context, i) {
            final c = list[i];
            final status = c['status']?.toString() ?? 'pending';
            final pending = status == 'pending';
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
                        child: Text('${c['username'] ?? '—'}',
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                      Text(fmtMoneyCurrency(c['amount']),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFFFFB800))),
                      const SizedBox(width: 8),
                      StatusChip(text: status),
                    ],
                  ),
                  if (pending) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        OpChip(
                          label: lang.t('confirmCashout'),
                          icon: Icons.paid_outlined,
                          onTap: () => _act(context, c['id'].toString(), 'confirm'),
                        ),
                        const SizedBox(width: 8),
                        OpChip(
                          label: lang.t('cancelCashout'),
                          icon: Icons.block_outlined,
                          danger: true,
                          onTap: () => _act(context, c['id'].toString(), 'cancel'),
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

  Future<void> _act(BuildContext context, String id, String action) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/management/cashouts/$id/$action',
          body: {'confirmed': true, 'idempotencyKey': idempotencyKey('cout$action')});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

class _OnsiteOrdersTab extends StatelessWidget {
  const _OnsiteOrdersTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/onsite-orders');
    return _listOf(res);
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, orders) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: orders.length,
          itemBuilder: (context, i) {
            final o = orders[i];
            final status = o['status']?.toString() ?? '';
            final pending = status == 'pending';
            final payload = o['payload'] is Map ? o['payload'] as Map<String, dynamic> : null;
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
                        child: Text(
                          '${o['username'] ?? payload?['username'] ?? '—'} · ${o['kind'] ?? payload?['kind'] ?? ''}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                      Text(fmtMoneyCurrency(o['amount'] ?? payload?['amount']),
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFFFFB800))),
                      const SizedBox(width: 8),
                      StatusChip(text: status),
                    ],
                  ),
                  if (pending) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        OpChip(
                          label: lang.t('settle'),
                          icon: Icons.point_of_sale_outlined,
                          onTap: () => _act(context, o['id'].toString(), 'settle'),
                        ),
                        const SizedBox(width: 8),
                        OpChip(
                          label: lang.t('cancelOrder'),
                          icon: Icons.block_outlined,
                          danger: true,
                          onTap: () => _act(context, o['id'].toString(), 'cancel'),
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

  Future<void> _act(BuildContext context, String id, String action) async {
    final lang = context.read<AppLang>();
    if (action == 'settle') {
      final ok = await showConfirm(context, title: lang.t('settle'), body: lang.t('confirmSettleBody'));
      if (!ok) return;
    }
    try {
      await ApiClient.post('/api/management/onsite-orders/$id/$action', body: {
        'method': 'cash',
        'confirmed': true,
        'idempotencyKey': idempotencyKey('ons$action'),
      });
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}
