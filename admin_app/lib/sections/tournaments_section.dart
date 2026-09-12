import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/format.dart';
import '../core/l10n.dart';
import '../widgets/common.dart';
import '../widgets/crud.dart';

/// بارگذاری فهرست مسابقات (GET /api/management/tournaments → List)
Future<List<Map<String, dynamic>>> _list() async {
  final res = await ApiClient.get('/api/management/tournaments');
  if (res is List) return res.whereType<Map<String, dynamic>>().toList();
  if (res is Map && res['tournaments'] is List) {
    return (res['tournaments'] as List).whereType<Map<String, dynamic>>().toList();
  }
  return [];
}

/// مسابقات: CRUD (قرارداد فیلدها = تست E2E سرور: title/game/registrationFee/startDate/maxTeams/status)
class TournamentsSection extends StatelessWidget {
  const TournamentsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return CrudScreen(
      config: CrudConfig(
        load: () async => _list(),
        create: (v) => ApiClient.post('/api/admin/tournaments', body: v),
        update: (id, v) => ApiClient.put('/api/admin/tournaments/$id', body: v),
        remove: (id) => ApiClient.delete('/api/admin/tournaments/$id'),
        fields: const [
          FieldSpec('title', 'title', required: true),
          FieldSpec('game', 'game', required: true),
          FieldSpec('startDate', 'startDate', required: true, hint: '۱۴۰۵/۰۵/۰۱'),
          FieldSpec('registrationFee', 'registrationFee', type: FieldType.number),
          FieldSpec('maxTeams', 'maxTeams', type: FieldType.number),
          FieldSpec('status', 'status', type: FieldType.dropdown, options: ['Open', 'Registration Closed', 'Completed']),
        ],
        titleOf: (lang, item) => '${item['title'] ?? ''}',
        subtitleOf: (lang, item) =>
            '${item['game'] ?? ''} · ${fmtDate(item['startDate'])} · ${lang.t('registrationFee')}: ${fmtMoneyCurrency(item['registrationFee'])}',
        trailingOf: (context, item) => StatusChip(text: '${item['status'] ?? '—'}'),
      ),
    );
  }
}

/// عملیات مسابقات (Management App core): چک‌این و اختتام
class TournamentOpsSection extends StatelessWidget {
  const TournamentOpsSection({super.key});

  Future<List<Map<String, dynamic>>> _load() async {
    final res = await ApiClient.get('/api/management/tournaments');
    if (res is List) return res.whereType<Map<String, dynamic>>().toList();
    return [];
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => (context as Element).markNeedsBuild(),
      child: FutureView<List<Map<String, dynamic>>>(
        loader: _load,
        isEmpty: (l) => l.isEmpty,
        builder: (context, list) {
          final lang = context.read<AppLang>();
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final t = list[i];
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
                          child: Text('${t['title'] ?? t['id']}',
                              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white)),
                        ),
                        if (t['status'] != null) StatusChip(text: '${t['status']}'),
                      ],
                    ),
                    if (t['game'] != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Text('${t['game']}',
                            style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                      ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        OpChip(
                          label: lang.t('checkinTeam'),
                          icon: Icons.how_to_reg_outlined,
                          onTap: () => _act(context, '${t['id']}/checkin'),
                        ),
                        const SizedBox(width: 8),
                        OpChip(
                          label: lang.t('finalizeTournament'),
                          icon: Icons.emoji_events_outlined,
                          danger: true,
                          onTap: () => _act(context, '${t['id']}/finalize'),
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

  Future<void> _act(BuildContext context, String sub) async {
    final lang = context.read<AppLang>();
    try {
      await ApiClient.post('/api/management/tournaments/$sub', body: {'idempotencyKey': idempotencyKey('tour')});
      if (context.mounted) {
        toast(context, lang.t('saved'));
        (context as Element).markNeedsBuild();
      }
    } on ApiError catch (e) {
      if (context.mounted) toast(context, e.message, error: true);
    }
  }
}
