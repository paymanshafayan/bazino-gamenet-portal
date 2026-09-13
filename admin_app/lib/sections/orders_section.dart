import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';
import '../widgets/crud.dart';

/// کافه: CRUD آیتم‌ها + مدیریت سفارش‌های کافه
class CafeSection extends StatelessWidget {
  const CafeSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            tabs: [Tab(text: lang.t('items')), Tab(text: lang.t('cafeOrders'))],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(child: TabBarView(children: [_CafeCrud(), _OrdersView(kind: 'cafe')])),
        ],
      ),
    );
  }
}

/// فروشگاه: CRUD کالاها + مدیریت سفارش‌های فروشگاه
class ShopSection extends StatelessWidget {
  const ShopSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            tabs: [Tab(text: lang.t('items')), Tab(text: lang.t('shopOrders'))],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(child: TabBarView(children: [_ShopCrud(), _OrdersView(kind: 'shop')])),
        ],
      ),
    );
  }
}

class _CafeCrud extends StatelessWidget {
  const _CafeCrud();

  @override
  Widget build(BuildContext context) {
    return CrudScreen(
      config: CrudConfig(
        load: () async => _publicList('/api/cafe'),
        create: (v) => ApiClient.post('/api/admin/cafe', body: v),
        update: (id, v) => ApiClient.put('/api/admin/cafe/$id', body: v),
        remove: (id) => ApiClient.delete('/api/admin/cafe/$id'),
        fields: const [
          FieldSpec('name', 'itemName', required: true),
          FieldSpec('category', 'category', type: FieldType.dropdown, options: ['Foods', 'Drinks', 'Snacks', 'Desserts'], required: true),
          FieldSpec('price', 'price', type: FieldType.number, required: true),
          FieldSpec('inventory', 'inventory', type: FieldType.number),
        ],
        titleOf: (lang, item) => '${item['name'] ?? ''}',
        subtitleOf: (lang, item) =>
            '${item['category'] ?? ''} · ${fmtMoneyCurrency(item['price'])} · ${lang.t('inventory')}: ${item['inventory'] ?? 0}',
      ),
    );
  }
}

class _ShopCrud extends StatelessWidget {
  const _ShopCrud();

  @override
  Widget build(BuildContext context) {
    return CrudScreen(
      config: CrudConfig(
        load: () async => _publicList('/api/accessories'),
        create: (v) => ApiClient.post('/api/admin/accessories', body: v),
        update: (id, v) => ApiClient.put('/api/admin/accessories/$id', body: v),
        remove: (id) => ApiClient.delete('/api/admin/accessories/$id'),
        fields: const [
          FieldSpec('name', 'itemName', required: true),
          FieldSpec('category', 'category', type: FieldType.dropdown, options: ['Mouse', 'Keyboard', 'Headset', 'Mousepad', 'Monitor', 'Other'], required: true),
          FieldSpec('price', 'price', type: FieldType.number, required: true),
          FieldSpec('stock', 'stock', type: FieldType.number),
          FieldSpec('description', 'description', type: FieldType.multiline, minLines: 2),
        ],
        titleOf: (lang, item) => '${item['name'] ?? ''}',
        subtitleOf: (lang, item) =>
            '${item['category'] ?? ''} · ${fmtMoneyCurrency(item['price'])} · ${lang.t('stock')}: ${item['stock'] ?? 0}',
      ),
    );
  }
}

Future<List<Map<String, dynamic>>> _publicList(String path) async {
  final res = await ApiClient.get(path);
  if (res is List) return res.whereType<Map<String, dynamic>>().toList();
  return [];
}

/// سفارش‌های کافه/فروشگاه از داشبورد سرور + تغییر وضعیت
class _OrdersView extends StatelessWidget {
  const _OrdersView({required this.kind});
  final String kind;

  Future<List<Map<String, dynamic>>> _load() async {
    final stats = await ApiClient.get('/api/admin/stats');
    if (stats is! Map) return [];
    final raw = stats[kind == 'cafe' ? 'cafeOrders' : 'shopOrders'];
    if (raw is! List) return [];
    return raw.whereType<Map<String, dynamic>>().toList();
  }

  List<String> get _statuses => kind == 'cafe'
      ? const ['Pending', 'Preparing', 'Delivered']
      : const ['Processing', 'Shipped', 'Delivered'];

  String get _updatePath => kind == 'cafe' ? '/api/admin/cafe-orders' : '/api/admin/shop-orders';

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (list) => list.isEmpty,
        builder: (context, orders) {
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: orders.length,
            itemBuilder: (context, i) {
              final o = orders[i];
              final items = o['items'];
              var itemsLabel = '';
              if (items is List) {
                itemsLabel = items.map((x) => x is Map ? '${x['name']}×${x['quantity'] ?? 1}' : '$x').join('، ');
              } else if (items is String && items.isNotEmpty) {
                itemsLabel = items;
              }
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
                            '${o['username'] ?? o['user'] ?? '—'} · ${fmtDate(o['createdAt'] ?? o['date'])}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        Text(fmtMoneyCurrency(o['total'] ?? o['totalPrice']),
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFFFFB800))),
                      ],
                    ),
                    if (itemsLabel.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(itemsLabel, style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Text(lang.t('orderStatus'),
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w700)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButton<String>(
                            value: _statuses.contains(o['status']) ? o['status'] as String : _statuses.first,
                            isDense: true,
                            underline: const SizedBox.shrink(),
                            items: [
                              for (final s in _statuses)
                                DropdownMenuItem(
                                  value: s,
                                  child: Text(lang.t(s), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                                )
                            ],
                            onChanged: (v) => _update(context, o['id'].toString(), v!),
                          ),
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
    );
  }

  Future<void> _update(BuildContext context, String id, String status) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.put('$_updatePath/$id', body: {'status': status});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}
