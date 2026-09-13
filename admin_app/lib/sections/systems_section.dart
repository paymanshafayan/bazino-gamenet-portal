import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';
import '../widgets/crud.dart';

/// سیستم‌ها: CRUD سیستم‌ها + نمای زندهٔ سالن (نشست‌ها/رزروها)
class SystemsSection extends StatelessWidget {
  const SystemsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.read<AppLang>();
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            tabs: [
              Tab(text: lang.t('systems')),
              Tab(text: lang.t('floor')),
            ],
            labelColor: const Color(0xFFFFB800),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFFFFB800),
            dividerColor: Colors.white.withValues(alpha: 0.05),
          ),
          const Expanded(
            child: TabBarView(children: [_SystemsCrud(), _FloorView()]),
          ),
        ],
      ),
    );
  }
}

class _SystemsCrud extends StatelessWidget {
  const _SystemsCrud();

  @override
  Widget build(BuildContext context) {
    return CrudScreen(
      config: CrudConfig(
        load: () async => _list(),
        create: (v) => ApiClient.post('/api/admin/systems', body: v),
        update: (id, v) => ApiClient.put('/api/admin/systems/$id', body: v),
        remove: (id) => ApiClient.delete('/api/admin/systems/$id'),
        fields: const [
          FieldSpec('name', 'systemName', required: true),
          FieldSpec('type', 'systemType', type: FieldType.dropdown, options: ['PC', 'PS5', 'XBOX', 'VR'], required: true),
          FieldSpec('hourlyRate', 'hourlyRate', type: FieldType.number, required: true),
          FieldSpec('status', 'status', type: FieldType.dropdown, options: ['available', 'maintenance']),
        ],
        titleOf: (lang, item) => '${item['name'] ?? ''}',
        subtitleOf: (lang, item) =>
            '${item['type'] ?? ''} · ${fmtMoneyCurrency(item['hourlyRate'])}/${lang.isFa ? 'ساعت' : 'hr'}',
        trailingOf: (context, item) => StatusChip(
          text: item['isActive'] == false
              ? (lang(context).t('inactive'))
              : (item['isReserved'] == true ? (lang(context).t('reservations')) : (lang(context).t('active'))),
          color: item['isActive'] == false
              ? Colors.grey
              : item['isReserved'] == true
                  ? const Color(0xFFFBBF24)
                  : const Color(0xFF34D399),
        ),
      ),
    );
  }

  Future<List<Map<String, dynamic>>> _list() async {
    // از مسیر عمومی می‌خوانیم (همان دادهٔ CRUD) — stats فهرست سیستم‌ها را ندارد
    final systems = await ApiClient.get('/api/systems');
    final merged = <Map<String, dynamic>>[];
    if (systems is List) merged.addAll(systems.whereType<Map<String, dynamic>>());
    return merged;
  }
}

AppLang lang(BuildContext context) => context.read<AppLang>();

class _FloorView extends StatelessWidget {
  const _FloorView();

  Future<Map<String, dynamic>> _load() async {
    final floor = await ApiClient.get('/api/management/floor');
    if (floor is Map) return Map<String, dynamic>.from(floor);
    return <String, dynamic>{};
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<Map<String, dynamic>>(
        loader: _load,
        builder: (context, floor) {
          final lang = context.read<AppLang>();
          final stations = _l(floor['stations']);
          final sessions = _l(floor['sessions']);
          final reservations = _l(floor['reservations']);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Panel(
                title: '${lang.t('stations')} (${stations.length})',
                child: stations.isEmpty
                    ? Text(lang.t('noFloorActivity'), style: TextStyle(fontSize: 12, color: Colors.grey.shade600))
                    : Column(
                        children: [
                          for (final s in stations)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text('${s['name'] ?? s['id']}',
                                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white70)),
                                  ),
                                  StatusChip(text: '${s['status'] ?? s['state'] ?? '—'}'),
                                ],
                              ),
                            ),
                        ],
                      ),
              ),
              Panel(
                title: '${lang.t('activeSessions')} (${sessions.length})',
                child: sessions.isEmpty
                    ? Text(lang.t('noFloorActivity'), style: TextStyle(fontSize: 12, color: Colors.grey.shade600))
                    : Column(
                        children: [
                          for (final s in sessions) _sessionTile(context, s),
                        ],
                      ),
              ),
              Panel(
                title: '${lang.t('reservations')} (${reservations.length})',
                child: reservations.isEmpty
                    ? Text(lang.t('noFloorActivity'), style: TextStyle(fontSize: 12, color: Colors.grey.shade600))
                    : Column(
                        children: [
                          for (final r in reservations)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 5),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${r['username'] ?? '—'} · ${r['stationName'] ?? r['stationId'] ?? r['systemId'] ?? '—'}',
                                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white)),
                                        Text('${fmtDate(r['start'] ?? r['date'])} → ${fmtTime(r['end'] ?? r['time'])}',
                                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                  ),
                                  if ((r['checkedIn'] ?? r['status']) != null) StatusChip(text: '${r['checkedIn'] ?? r['status']}'),
                                  const SizedBox(width: 8),
                                  OpChip(
                                    label: lang.t('checkin'),
                                    icon: Icons.login,
                                    onTap: () => _action(context, '/api/management/reservations/${r['id']}/checkin', {}),
                                  ),
                                ],
                              ),
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

  Widget _sessionTile(BuildContext context, Map<String, dynamic> s) {
    final lang = context.read<AppLang>();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${s['username'] ?? '—'} · ${s['stationName'] ?? s['stationId'] ?? '—'}',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white)),
                Text('از ${fmtTime(s['start'] ?? s['startedAt'])}',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          OpChip(
            label: lang.t('finishSession'),
            icon: Icons.stop_circle_outlined,
            danger: true,
            onTap: () => _action(
              context,
              '/api/management/sessions/${s['id']}/finish',
              {'idempotencyKey': idempotencyKey('finish')},
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _action(BuildContext context, String path, Map<String, dynamic> body) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post(path, body: body);
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}

List<Map<String, dynamic>> _l(dynamic v) =>
    v is List ? v.whereType<Map<String, dynamic>>().toList() : [];
