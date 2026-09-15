import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../providers/parent_state.dart';
import '../models/parent_models.dart';
import '../widgets/glass_card.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ParentState>();
    final activities = state.activities;
    final child = state.selectedChild;

    return Scaffold(
      backgroundColor: ParentTheme.bg,
      appBar: AppBar(
        title: Text(child != null ? 'فعالیت‌های ${child.displayName}' : 'فعالیت‌ها'),
      ),
      body: activities.isEmpty
          ? const Center(child: Text('فعالیتی ثبت نشده', style: TextStyle(color: ParentTheme.textMuted)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Weekly summary
                ParentCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('خلاصه این هفته', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _summaryItem('زمان بازی', '${child?.todaySpentMinutes.toInt() ?? 0} دقیقه', Icons.access_time)),
                          Expanded(child: _summaryItem('هزینه', '${(child?.todaySpentAmount ?? 0).toInt()} تومان', Icons.payments)),
                          Expanded(child: _summaryItem('امتیاز', '${child?.loyaltyPoints ?? 0}', Icons.stars)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('تاریخچه', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                const SizedBox(height: 12),
                ...activities.map((a) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ParentCard(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: _colorForType(a.type).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                              child: Icon(_iconForType(a.type), size: 16, color: _colorForType(a.type)),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(a.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  Text(a.detail, style: const TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(_formatDate(a.at), style: const TextStyle(fontSize: 10, color: ParentTheme.textMuted)),
                                if (a.amount != null) Text('${a.amount!.toInt()} ت', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )),
              ],
            ),
    );
  }

  Widget _summaryItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 18, color: ParentTheme.primary),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 10, color: ParentTheme.textMuted)),
      ],
    );
  }

  Color _colorForType(RequestType t) {
    switch (t) {
      case RequestType.stationReservation:
        return ParentTheme.primary;
      case RequestType.tournamentJoin:
        return ParentTheme.secondary;
      case RequestType.gameSelection:
        return ParentTheme.warning;
      case RequestType.cafeOrder:
        return ParentTheme.success;
    }
  }

  IconData _iconForType(RequestType t) {
    switch (t) {
      case RequestType.stationReservation:
        return Icons.computer;
      case RequestType.tournamentJoin:
        return Icons.emoji_events;
      case RequestType.gameSelection:
        return Icons.sports_esports;
      case RequestType.cafeOrder:
        return Icons.fastfood;
    }
  }

  String _formatDate(DateTime d) {
    final now = DateTime.now();
    final diff = now.difference(d);
    if (diff.inMinutes < 60) return '${diff.inMinutes} دقیقه پیش';
    if (diff.inHours < 24) return '${diff.inHours} ساعت پیش';
    return '${d.month}/${d.day}';
  }
}
