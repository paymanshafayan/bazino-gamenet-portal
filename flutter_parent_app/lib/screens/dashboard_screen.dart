import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../providers/parent_state.dart';
import '../models/parent_models.dart';
import '../widgets/child_status_card.dart';
import '../widgets/glass_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ParentState>();
    final child = state.selectedChild;
    final pendingCount = state.pendingRequests.length;

    return Scaffold(
      backgroundColor: ParentTheme.bg,
      appBar: AppBar(
        title: const Text('داشبورد والدین'),
        actions: [
          if (pendingCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    onPressed: () => DefaultTabController.of(context)?.animateTo(1),
                  ),
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(color: ParentTheme.danger, shape: BoxShape.circle),
                      child: Text('$pendingCount', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          IconButton(icon: const Icon(Icons.logout_rounded), onPressed: () => state.logout()),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => state.refreshAll(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Child selector
            if (state.children.length > 1) ...[
              SizedBox(
                height: 48,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: state.children.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final c = state.children[i];
                    final isSelected = child?.id == c.id;
                    return ChoiceChip(
                      label: Text(c.displayName),
                      selected: isSelected,
                      onSelected: (_) => state.selectChild(c),
                      selectedColor: ParentTheme.primary.withValues(alpha: 0.15),
                      labelStyle: TextStyle(
                        color: isSelected ? ParentTheme.primary : ParentTheme.textMuted,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],

            if (child != null) ChildStatusCard(child: child),

            const SizedBox(height: 16),

            // Quick stats
            Row(
              children: [
                Expanded(child: _quickStat(context, 'درخواست‌های منتظر', '$pendingCount', Icons.pending_actions_rounded, ParentTheme.warning)),
                const SizedBox(width: 12),
                Expanded(child: _quickStat(context, 'فعالیت امروز', '${state.activities.length}', Icons.history_rounded, ParentTheme.primary)),
              ],
            ),

            const SizedBox(height: 16),

            // Pending requests preview
            if (pendingCount > 0) ...[
              Row(
                children: [
                  const Text('درخواست‌های در انتظار تایید', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => DefaultTabController.of(context)?.animateTo(1),
                    child: const Text('مشاهده همه'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...state.pendingRequests.take(2).map((r) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _miniRequestTile(context, r, state),
                  )),
              const SizedBox(height: 8),
            ],

            // How it works
            ParentCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.lightbulb_outline, size: 18, color: ParentTheme.primary),
                      SizedBox(width: 8),
                      Text('چگونه کار می‌کند؟', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _howItWorksItem('1', 'فرزند درخواست می‌دهد', 'رزرو، بازی، مسابقه یا سفارش بوفه'),
                  _howItWorksItem('2', 'شما اعلان می‌گیرید', 'فورا در اپ و پیامک'),
                  _howItWorksItem('3', 'تایید یا رد می‌کنید', 'با یک لمس + دلیل اختیاری'),
                  _howItWorksItem('4', 'فرزند نتیجه را می‌بیند', 'در اپ خودش و در گیم‌نت'),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Link new child
            ParentCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('افزودن فرزند', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('کد لینک را از پذیرش گیم‌نت یا اپ فرزند بگیرید', style: TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: InputDecoration(
                            hintText: 'نام کاربری یا کد لینک فرزند',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            isDense: true,
                            filled: true,
                            fillColor: ParentTheme.bgSecondary,
                          ),
                          onSubmitted: (v) {
                            if (v.trim().isNotEmpty) {
                              context.read<ParentState>().linkChild(v.trim());
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () {},
                        child: const Text('لینک'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickStat(BuildContext context, String label, String value, IconData icon, Color color) {
    return ParentCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 18, color: color)),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
              Text(label, style: const TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniRequestTile(BuildContext context, ApprovalRequest r, ParentState state) {
    return ParentCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Icon(_iconForType(r.type), size: 16, color: ParentTheme.primary),
          const SizedBox(width: 8),
          Expanded(child: Text('${r.typeLabelFa}: ${r.summaryFa}', style: const TextStyle(fontSize: 12, color: ParentTheme.textDark), maxLines: 1, overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          SizedBox(
            height: 28,
            child: ElevatedButton(
              onPressed: () => state.approveRequest(r.id),
              style: ElevatedButton.styleFrom(backgroundColor: ParentTheme.success, padding: const EdgeInsets.symmetric(horizontal: 12)),
              child: const Text('تایید', style: TextStyle(fontSize: 11)),
            ),
          ),
        ],
      ),
    );
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

  Widget _howItWorksItem(String step, String title, String desc) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(color: ParentTheme.primary, borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(step, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                Text(desc, style: const TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
