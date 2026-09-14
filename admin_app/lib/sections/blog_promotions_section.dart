import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';
import '../widgets/crud.dart';

/// بلاگ: CRUD مقاله‌ها
class BlogSection extends StatelessWidget {
  const BlogSection({super.key});

  @override
  Widget build(BuildContext context) {
    return CrudScreen(
      config: CrudConfig(
        load: () async => _list('/api/articles'),
        create: (v) => ApiClient.post('/api/admin/articles', body: v),
        update: (id, v) => ApiClient.put('/api/admin/articles/$id', body: v),
        remove: (id) => ApiClient.delete('/api/admin/articles/$id'),
        fields: const [
          FieldSpec('title', 'title', required: true),
          FieldSpec('category', 'category', type: FieldType.dropdown, options: ['News', 'Guide', 'Review', 'Event', 'Update'], required: true),
          FieldSpec('author', 'author', required: true),
          FieldSpec('content', 'content', type: FieldType.multiline, required: true),
        ],
        titleOf: (lang, item) => '${item['title'] ?? ''}',
        subtitleOf: (lang, item) => '${item['category'] ?? ''} · ${item['author'] ?? ''} · ${fmtDate(item['createdAt'] ?? item['date'])}',
      ),
    );
  }
}

/// تخفیف‌ها: کوپن‌ها + ساعات ویژه (Management core)
class PromotionsSection extends StatelessWidget {
  const PromotionsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            tabs: [Tab(text: lang.t('coupons')), Tab(text: lang.t('specialHours'))],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(child: TabBarView(children: [_CouponsTab(), _SpecialHoursTab()])),
        ],
      ),
    );
  }
}

class _CouponsTab extends StatelessWidget {
  const _CouponsTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/coupons');
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
        onPressed: () => _openForm(context, null),
        icon: const Icon(Icons.add),
        label: Text(lang.t('addCoupon'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => (context as Element).markNeedsBuild(),
        child: FutureView<List<Map<String, dynamic>>>(
          loader: _load,
          isEmpty: (l) => l.isEmpty,
          builder: (context, list) {
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final c = list[i];
                final isActive = c['isActive'] != false && c['active'] != false;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111726),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${c['code'] ?? c['id']}',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFFFFB800), letterSpacing: 0.5)),
                            const SizedBox(height: 3),
                            Text(
                              '${c['kind'] ?? c['type'] ?? ''} · ${fmtMoney(c['value'] ?? c['percent'])}${(c['kind'] ?? c['type'] ?? '').toString().toLowerCase().contains('percent') || c['percent'] != null ? '%' : ' ₺'} · ${lang.t('usage')}: ${c['usageCount'] ?? c['used'] ?? 0}/${c['maxUsage'] ?? c['maxUsageCount'] ?? '—'}',
                              style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      StatusChip(text: isActive ? lang.t('active') : lang.t('inactive'), color: isActive ? const Color(0xFF34D399) : Colors.grey),
                      const SizedBox(width: 10),
                      OpChip(
                        label: lang.t('delete'),
                        icon: Icons.delete_outline,
                        danger: true,
                        onTap: () => _delete(context, c),
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

  Future<void> _delete(BuildContext context, Map<String, dynamic> c) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirm(context,
        title: lang.t('delete'), body: lang.t('deleteConfirmBody'), danger: true, confirmLabel: lang.t('delete'));
    if (!ok) return;
    try {
      await ApiClient.post('/api/management/coupons/${c['id'] ?? c['code']}/delete',
          body: {'idempotencyKey': idempotencyKey('cpdel')});
      if (context.mounted) {
        toast(context, lang.t('deleted'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _openForm(BuildContext context, Map<String, dynamic>? existing) async {
    final lang = context.read<AppLang>();
    final code = TextEditingController(text: existing?['code']?.toString() ?? '');
    final value = TextEditingController();
    final minOrder = TextEditingController(text: '0');
    final maxUsage = TextEditingController(text: '100');
    final kindNotifier = ValueNotifier<String>('percent');
    final scopes = <String>{'reservation', 'cafe', 'shop', 'tournament'};
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF151C2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(lang.t('addCoupon'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                const SizedBox(height: 16),
                TextField(
                  controller: code,
                  decoration: const InputDecoration(labelText: 'CODE', prefixIcon: Icon(Icons.local_offer_outlined)),
                  textCapitalization: TextCapitalization.characters,
                ),
                const SizedBox(height: 12),
                ValueListenableBuilder<String>(
                  valueListenable: kindNotifier,
                  builder: (ctx, kind, _) => SegmentedButton<String>(
                    segments: [
                      ButtonSegment(value: 'percent', label: Text(lang.t('percent'))),
                      ButtonSegment(value: 'fixed', label: Text(lang.t('fixed'))),
                    ],
                    selected: {kind},
                    onSelectionChanged: (s) => kindNotifier.value = s.first,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: value,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: lang.t('value'),
                    hintText: kindNotifier.value == 'percent' ? '0-100' : null,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(controller: minOrder, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: lang.t('minOrder'))),
                const SizedBox(height: 12),
                TextField(controller: maxUsage, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: lang.t('maxUsage'))),
                const SizedBox(height: 14),
                Text(lang.t('scopes'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.grey.shade400)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final s in const ['reservation', 'cafe', 'shop', 'tournament'])
                      FilterChip(
                        label: Text(lang.t(s == 'cafe' ? 'cafeScope' : s == 'shop' ? 'shopScope' : s == 'tournament' ? 'tournamentScope' : 'reservation')),
                        selected: scopes.contains(s),
                        onSelected: (v) => setSheet(() => v ? scopes.add(s) : scopes.remove(s)),
                        selectedColor: const Color(0xFFFFB800).withValues(alpha: 0.25),
                      ),
                  ],
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () async {
                    if (code.text.trim().isEmpty || scopes.isEmpty) {
                      Navigator.pop(ctx, false);
                      return;
                    }
                    try {
                      await ApiClient.post('/api/management/coupons', body: {
                        'code': code.text.trim().toUpperCase(),
                        'kind': kindNotifier.value,
                        'value': num.tryParse(value.text.trim()) ?? 0,
                        'scopes': scopes.toList(),
                        'minOrder': num.tryParse(minOrder.text.trim()) ?? 0,
                        'maxUsage': (num.tryParse(maxUsage.text.trim()) ?? 100).toInt(),
                        'idempotencyKey': idempotencyKey('coupon'),
                      });
                      if (ctx.mounted) Navigator.pop(ctx, true);
                    } on ApiError catch (e) {
                      if (ctx.mounted) {
                        Navigator.pop(ctx, false);
                        toast(ctx, e.message, error: true);
                      }
                    }
                  },
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: Text(lang.t('save')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (saved == true && context.mounted) {
      toast(context, lang.t('saved'));
      (context as Element).markNeedsBuild();
    }
  }
}

class _SpecialHoursTab extends StatelessWidget {
  const _SpecialHoursTab();

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/special-hours');
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
        onPressed: () => _add(context),
        icon: const Icon(Icons.add),
        label: Text(lang.t('addSpecialHour'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
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
              final h = list[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF111726),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${h['name'] ?? h['id']}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                          const SizedBox(height: 3),
                          Text(
                            '${h['startHour'] ?? '—'}:00 → ${h['endHour'] ?? '—'}:00 · ${h['mode'] ?? ''}${h['percent'] != null && h['mode'] == 'percent' ? ' ${h['percent']}%' : ''}',
                            style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    OpChip(
                      label: lang.t('delete'),
                      icon: Icons.delete_outline,
                      danger: true,
                      onTap: () async {
                        final ok = await showConfirm(context,
                            title: lang.t('delete'), body: lang.t('deleteConfirmBody'), danger: true);
                        if (!ok) return;
                        try {
                          await ApiClient.post('/api/management/special-hours/${h['id']}/delete',
                              body: {'idempotencyKey': idempotencyKey('shdel')});
                          if (context.mounted) {
                            toast(context, lang.t('deleted'));
                            (context as Element).markNeedsBuild();
                          }
                        } on ApiError catch (e) {
                          if (context.mounted) toast(context, e.message, error: true);
                        }
                      },
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

  Future<void> _add(BuildContext context) async {
    final lang = context.read<AppLang>();
    final name = TextEditingController();
    final percent = TextEditingController(text: '50');
    final start = TextEditingController(text: '10');
    final end = TextEditingController(text: '14');
    final modeNotifier = ValueNotifier<String>('half');
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF151C2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(lang.t('addSpecialHour'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
              const SizedBox(height: 16),
              TextField(controller: name, decoration: InputDecoration(labelText: lang.t('name'))),
              const SizedBox(height: 12),
              ValueListenableBuilder<String>(
                valueListenable: modeNotifier,
                builder: (ctx, mode, _) => Column(
                  children: [
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(value: 'free', label: Text(lang.t('free'))),
                        ButtonSegment(value: 'half', label: Text(lang.t('half'))),
                        ButtonSegment(value: 'percent', label: Text(lang.t('percentOff'))),
                      ],
                      selected: {mode},
                      onSelectionChanged: (s) => modeNotifier.value = s.first,
                    ),
                    if (mode == 'percent') ...[
                      const SizedBox(height: 12),
                      TextField(controller: percent, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: lang.t('percentOff'))),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: TextField(controller: start, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: lang.t('startHour')))),
                  const SizedBox(width: 10),
                  Expanded(child: TextField(controller: end, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: lang.t('endHour')))),
                ],
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () async {
                  try {
                    final mode = modeNotifier.value;
                    await ApiClient.post('/api/management/special-hours', body: {
                      'name': name.text.trim(),
                      'mode': mode,
                      'percent': mode == 'free' ? 100 : (mode == 'half' ? 50 : (num.tryParse(percent.text.trim()) ?? 50)),
                      'startHour': int.tryParse(start.text.trim()) ?? 0,
                      'startMinute': 0,
                      'endHour': int.tryParse(end.text.trim()) ?? 23,
                      'endMinute': 0,
                      'weekdays': const [0, 1, 2, 3, 4, 5, 6],
                      'stationTypes': const [],
                      'idempotencyKey': idempotencyKey('hour'),
                    });
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } on ApiError catch (e) {
                    if (ctx.mounted) {
                      Navigator.pop(ctx, false);
                      toast(ctx, e.message, error: true);
                    }
                  }
                },
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                child: Text(lang.t('save')),
              ),
            ],
          ),
        ),
      ),
    );
    if (saved == true && context.mounted) {
      toast(context, lang.t('saved'));
      (context as Element).markNeedsBuild();
    }
  }
}

Future<List<Map<String, dynamic>>> _list(String path) async {
  final res = await ApiClient.get(path);
  if (res is List) return res.whereType<Map<String, dynamic>>().toList();
  return [];
}
