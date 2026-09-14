import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';

/// داشبورد: آمار کل + ذخیره‌سازی + منبع داده + سفارش‌ها/رزروهای اخیر
class DashboardSection extends StatelessWidget {
  const DashboardSection({super.key});

  Future<Map<String, dynamic>> _load() async {
    final results = await Future.wait<Object?>([
      ApiClient.get('/api/admin/stats'),
      ApiClient.get('/api/admin/storage-status'),
      ApiClient.get('/api/data-source'),
    ]);
    return {
      'stats': results[0] as Map<String, dynamic>? ?? {},
      'storage': results[1] as Map<String, dynamic>? ?? {},
      'ds': results[2] as Map<String, dynamic>? ?? {},
    };
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<Map<String, dynamic>>(
        loader: _load,
        builder: (context, data) {
          final lang = context.read<AppLang>();
          final stats = data['stats'] as Map<String, dynamic>;
          final storage = data['storage'] as Map<String, dynamic>;
          final ds = data['ds'] as Map<String, dynamic>;
          final cafeOrders = _asList(stats['cafeOrders']);
          final shopOrders = _asList(stats['shopOrders']);
          final reservationLogs = _asList(stats['reservationLogs']);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              GridView.count(
                crossAxisCount: MediaQuery.of(context).size.width > 560 ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.75,
                children: [
                  StatCard(label: lang.t('totalSales'), value: fmtMoneyCurrency(stats['totalSales']), icon: Icons.payments_outlined),
                  StatCard(label: lang.t('totalReservations'), value: fmtMoney(stats['totalReservations']), icon: Icons.event_available_outlined, accent: const Color(0xFF22D3EE)),
                  StatCard(label: lang.t('cafeSales'), value: fmtMoneyCurrency(stats['cafeSales']), icon: Icons.coffee_outlined, accent: const Color(0xFF34D399)),
                  StatCard(label: lang.t('shopSales'), value: fmtMoneyCurrency(stats['shopSales']), icon: Icons.shopping_bag_outlined, accent: const Color(0xFF60A5FA)),
                  StatCard(label: lang.t('activeReservations'), value: fmtMoney(stats['activeReservations']), icon: Icons.schedule_outlined),
                  StatCard(label: lang.t('activeSystems'), value: fmtMoney(stats['activeSystems']), icon: Icons.computer_outlined, accent: const Color(0xFF22D3EE)),
                  StatCard(label: lang.t('cafeOrders'), value: fmtMoney(stats['cafeOrdersCount']), icon: Icons.receipt_long_outlined, accent: const Color(0xFF34D399)),
                  StatCard(label: lang.t('totalUsers'), value: fmtMoney(stats['totalUsers']), icon: Icons.group_outlined, accent: const Color(0xFF60A5FA)),
                ],
              ),
              const SizedBox(height: 14),
              _DataSourceCard(ds: ds),
              const SizedBox(height: 14),
              Panel(
                title: lang.t('storage'),
                child: Column(
                  children: [
                    KeyValue(label: lang.t('dbProvider'), value: _dbProvider(storage)),
                    KeyValue(label: lang.t('dataDir'), value: storage['dataDir']?.toString() ?? '—'),
                    KeyValue(label: lang.t('persistent'), value: storage['persistent'] == true ? lang.t('yes') : lang.t('no')),
                    KeyValue(label: lang.t('usedSpace'), value: fmtBytes(storage['usedBytes'])),
                    KeyValue(label: lang.t('installedThemesCount'), value: fmtMoney(_asList(storage['installedThemes']).length)),
                  ],
                ),
              ),
              if (cafeOrders.isNotEmpty) ...[
                Panel(
                  title: '${lang.t('cafeOrders')} (${cafeOrders.length})',
                  child: Column(children: [for (final o in cafeOrders.take(8)) _orderTile(context, o)]),
                ),
              ],
              if (shopOrders.isNotEmpty) ...[
                Panel(
                  title: '${lang.t('shopOrders')} (${shopOrders.length})',
                  child: Column(children: [for (final o in shopOrders.take(8)) _orderTile(context, o)]),
                ),
              ],
              if (reservationLogs.isNotEmpty) ...[
                Panel(
                  title: '${lang.t('recentReservations')} (${reservationLogs.length})',
                  child: Column(
                    children: [
                      for (final r in reservationLogs.take(8))
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
                          child: Row(
                            children: [
                              Icon(Icons.person_outline, size: 15, color: Colors.grey.shade500),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${r['username'] ?? '—'} → ${r['systemName'] ?? r['systemId'] ?? '—'}',
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70),
                                ),
                              ),
                              Text(
                                '${fmtDate(r['date'])} ${fmtTime(r['time'])}',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  String _dbProvider(Map<String, dynamic> storage) {
    final db = storage['db'];
    if (db is Map) return '${db['provider']} (${db['connected'] == true ? '✓' : '✗'})';
    return '—';
  }

  Widget _orderTile(BuildContext context, Map<String, dynamic> o) {
    final items = o['items'];
    var itemsLabel = '';
    if (items is List) {
      itemsLabel = items.map((i) => i is Map ? '${i['name']}×${i['quantity'] ?? 1}' : '$i').join('، ');
    } else if (items is String && items.isNotEmpty) {
      itemsLabel = items;
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '#${o['id']?.toString().replaceAll(RegExp(r'^order-'), '') ?? ''} · ${o['username'] ?? '—'}',
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                if (itemsLabel.isNotEmpty)
                  Text(itemsLabel, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(fmtMoneyCurrency(o['total'] ?? o['totalPrice']),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFFFB800))),
          const SizedBox(width: 8),
          StatusChip(text: '${o['status'] ?? '—'}'),
        ],
      ),
    );
  }
}

class _DataSourceCard extends StatelessWidget {
  const _DataSourceCard({required this.ds});
  final Map<String, dynamic> ds;

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    final mode = ds['mode']?.toString() ?? 'sample';
    final isSample = mode == 'sample';
    return Panel(
      title: lang.t('dataSource'),
      action: OpChip(
        label: '${lang.t('switchTo')} ${isSample ? lang.t('databaseMode') : lang.t('sampleMode')}',
        icon: Icons.swap_horiz,
        onTap: () => _switch(context, isSample ? 'database' : 'sample'),
      ),
      child: Row(
        children: [
          Icon(isSample ? Icons.science_outlined : Icons.storage_outlined, size: 20, color: const Color(0xFFFFB800)),
          const SizedBox(width: 10),
          StatusChip(
            text: isSample ? lang.t('sampleMode') : lang.t('databaseMode'),
            color: isSample ? const Color(0xFFFBBF24) : const Color(0xFF34D399),
          ),
        ],
      ),
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
}

List<Map<String, dynamic>> _asList(dynamic v) {
  if (v is List) return v.whereType<Map<String, dynamic>>().toList();
  return [];
}
