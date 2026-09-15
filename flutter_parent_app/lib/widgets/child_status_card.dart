import 'package:flutter/material.dart';
import '../theme.dart';
import '../models/parent_models.dart';
import 'glass_card.dart';

class ChildStatusCard extends StatelessWidget {
  final Child child;

  const ChildStatusCard({super.key, required this.child});

  Color get presenceColor {
    switch (child.presence) {
      case ChildPresence.online:
        return ParentTheme.success;
      case ChildPresence.playing:
        return ParentTheme.primary;
      case ChildPresence.inTournament:
        return ParentTheme.secondary;
      case ChildPresence.offline:
        return ParentTheme.presenceOffline;
    }
  }

  IconData get presenceIcon {
    switch (child.presence) {
      case ChildPresence.online:
        return Icons.meeting_room_outlined;
      case ChildPresence.playing:
        return Icons.videogame_asset_rounded;
      case ChildPresence.inTournament:
        return Icons.emoji_events_rounded;
      case ChildPresence.offline:
        return Icons.home_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final minutesInSession = child.sessionStart != null
        ? DateTime.now().difference(child.sessionStart!).inMinutes
        : 0;

    return ParentCard(
      padding: const EdgeInsets.all(16),
      borderColor: child.isInside ? presenceColor.withValues(alpha: 0.3) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: ParentTheme.bgSecondary,
                    child: Text(
                      child.displayName.isNotEmpty ? child.displayName[0] : 'C',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ParentTheme.textDark),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: presenceColor,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(child.displayName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                    const SizedBox(height: 2),
                    Text('${child.age} ساله • @${child.username}', style: const TextStyle(fontSize: 12, color: ParentTheme.textMuted)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: presenceColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: presenceColor.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(presenceIcon, size: 14, color: presenceColor),
                    const SizedBox(width: 4),
                    Text(child.presenceLabelFa, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: presenceColor)),
                  ],
                ),
              ),
            ],
          ),
          if (child.isInside) ...[
            const SizedBox(height: 14),
            const Divider(height: 1, color: ParentTheme.border),
            const SizedBox(height: 12),
            Row(
              children: [
                _infoChip(Icons.computer, child.currentStation ?? 'نامشخص', ParentTheme.textDark),
                const SizedBox(width: 8),
                if (child.currentGame != null) _infoChip(Icons.sports_esports, child.currentGame!, ParentTheme.primary),
                const Spacer(),
                if (minutesInSession > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: ParentTheme.bgSecondary, borderRadius: BorderRadius.circular(8)),
                    child: Text('$minutesInSession دقیقه', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: ParentTheme.textMuted)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _metric('امروز', '${child.todaySpentMinutes.toInt()} دقیقه', Icons.access_time)),
                const SizedBox(width: 12),
                Expanded(child: _metric('هزینه امروز', '${(child.todaySpentAmount / 1000).toStringAsFixed(0)}K', Icons.payments_outlined)),
                const SizedBox(width: 12),
                Expanded(child: _metric('امتیاز', '${child.loyaltyPoints}', Icons.stars_rounded)),
              ],
            ),
          ] else ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: ParentTheme.bgSecondary, borderRadius: BorderRadius.circular(12)),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_outline, size: 16, color: ParentTheme.textMuted),
                  SizedBox(width: 6),
                  Text('فرزند شما در حال حاضر خارج از مجموعه است', style: TextStyle(fontSize: 12, color: ParentTheme.textMuted)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _metric(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: ParentTheme.bgSecondary, borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 12, color: ParentTheme.textMuted),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(fontSize: 10, color: ParentTheme.textMuted)),
            ],
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
        ],
      ),
    );
  }
}
