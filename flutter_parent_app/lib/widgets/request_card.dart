import 'package:flutter/material.dart';
import '../theme.dart';
import '../models/parent_models.dart';
import 'glass_card.dart';

class RequestCard extends StatelessWidget {
  final ApprovalRequest request;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback? onTap;

  const RequestCard({
    super.key,
    required this.request,
    required this.onApprove,
    required this.onReject,
    this.onTap,
  });

  IconData get typeIcon {
    switch (request.type) {
      case RequestType.stationReservation:
        return Icons.computer_rounded;
      case RequestType.tournamentJoin:
        return Icons.emoji_events_rounded;
      case RequestType.gameSelection:
        return Icons.sports_esports_rounded;
      case RequestType.cafeOrder:
        return Icons.fastfood_rounded;
    }
  }

  Color get typeColor {
    switch (request.type) {
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

  @override
  Widget build(BuildContext context) {
    final ageMinutes = DateTime.now().difference(request.createdAt).inMinutes;
    final timeAgo = ageMinutes < 1
        ? 'همین الان'
        : ageMinutes < 60
            ? '$ageMinutes دقیقه پیش'
            : '${(ageMinutes / 60).floor()} ساعت پیش';

    return ParentCard(
      onTap: onTap,
      borderColor: typeColor.withValues(alpha: 0.25),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: typeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(typeIcon, size: 18, color: typeColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(request.typeLabelFa, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: typeColor)),
                    const SizedBox(height: 2),
                    Text(request.summaryFa, style: const TextStyle(fontSize: 12, color: ParentTheme.textDark)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: ParentTheme.warning.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 6, height: 6, decoration: const BoxDecoration(color: ParentTheme.warning, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    const Text('در انتظار تایید', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ParentTheme.warning)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Payload details
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: ParentTheme.bgSecondary, borderRadius: BorderRadius.circular(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _buildPayloadDetails(),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.person_outline, size: 12, color: ParentTheme.textMuted),
              const SizedBox(width: 4),
              Text(request.childName, style: const TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
              const Spacer(),
              Icon(Icons.access_time, size: 12, color: ParentTheme.textMuted),
              const SizedBox(width: 4),
              Text(timeAgo, style: const TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onReject,
                  icon: const Icon(Icons.close_rounded, size: 16),
                  label: const Text('رد کردن'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: ParentTheme.danger,
                    side: BorderSide(color: ParentTheme.danger.withValues(alpha: 0.3)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onApprove,
                  icon: const Icon(Icons.check_rounded, size: 16),
                  label: const Text('تایید'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ParentTheme.success,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _buildPayloadDetails() {
    final List<Widget> widgets = [];
    request.payload.forEach((key, value) {
      String label;
      switch (key) {
        case 'stationName':
          label = 'ایستگاه';
          break;
        case 'duration':
          label = 'مدت';
          widgets.add(_detailRow(label, '$value دقیقه'));
          return;
        case 'hourlyRate':
          label = 'نرخ ساعتی';
          widgets.add(_detailRow(label, '${value.toString()} تومان'));
          return;
        case 'total':
          label = 'مبلغ کل';
          widgets.add(_detailRow(label, '${value.toString()} تومان', isBold: true));
          return;
        case 'tournamentTitle':
          label = 'تورنمنت';
          break;
        case 'fee':
          label = 'ورودی';
          widgets.add(_detailRow(label, '${value.toString()} تومان'));
          return;
        case 'prize':
          label = 'جایزه';
          break;
        case 'gameName':
          label = 'بازی';
          break;
        case 'ageRating':
          label = 'رده سنی';
          break;
        case 'items':
          if (value is List) {
            label = 'آیتم‌ها';
            widgets.add(_detailRow(label, (value as List).join('، ')));
            return;
          }
          label = key;
          break;
        case 'note':
          label = 'یادداشت فرزند';
          break;
        default:
          label = key;
      }
      widgets.add(_detailRow(label, value.toString()));
    });
    return widgets;
  }

  Widget _detailRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 80, child: Text('$label:', style: const TextStyle(fontSize: 11, color: ParentTheme.textMuted))),
          Expanded(child: Text(value, style: TextStyle(fontSize: 11, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: ParentTheme.textDark))),
        ],
      ),
    );
  }
}
