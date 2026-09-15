import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../providers/parent_state.dart';
import '../models/parent_models.dart';
import '../widgets/request_card.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  RequestType? _filter;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ParentState>();
    final all = state.pendingRequests;
    final filtered = _filter == null ? all : all.where((r) => r.type == _filter).toList();

    return Scaffold(
      backgroundColor: ParentTheme.bg,
      appBar: AppBar(
        title: const Text('درخواست‌های فرزند'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _filterChip('همه', null, all.length),
                  const SizedBox(width: 8),
                  _filterChip('رزرو', RequestType.stationReservation, all.where((r) => r.type == RequestType.stationReservation).length),
                  const SizedBox(width: 8),
                  _filterChip('مسابقه', RequestType.tournamentJoin, all.where((r) => r.type == RequestType.tournamentJoin).length),
                  const SizedBox(width: 8),
                  _filterChip('بازی', RequestType.gameSelection, all.where((r) => r.type == RequestType.gameSelection).length),
                  const SizedBox(width: 8),
                  _filterChip('بوفه', RequestType.cafeOrder, all.where((r) => r.type == RequestType.cafeOrder).length),
                ],
              ),
            ),
          ),
        ),
      ),
      body: filtered.isEmpty
          ? _emptyState()
          : RefreshIndicator(
              onRefresh: () => state.fetchPendingRequests(),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  final req = filtered[i];
                  return RequestCard(
                    request: req,
                    onApprove: () => _approve(context, req),
                    onReject: () => _rejectDialog(context, req),
                    onTap: () => _showDetail(context, req),
                  );
                },
              ),
            ),
    );
  }

  Widget _filterChip(String label, RequestType? type, int count) {
    final isSelected = _filter == type;
    return FilterChip(
      label: Text('$label ($count)', style: TextStyle(fontSize: 12, color: isSelected ? ParentTheme.primary : ParentTheme.textMuted)),
      selected: isSelected,
      onSelected: (_) => setState(() => _filter = type),
      selectedColor: ParentTheme.primary.withValues(alpha: 0.15),
      backgroundColor: Colors.white,
      side: BorderSide(color: isSelected ? ParentTheme.primary : ParentTheme.border),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: ParentTheme.bgSecondary, shape: BoxShape.circle),
              child: const Icon(Icons.check_circle_outline_rounded, size: 48, color: ParentTheme.textMuted),
            ),
            const SizedBox(height: 16),
            const Text('درخواستی برای تایید وجود ندارد', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
            const SizedBox(height: 8),
            const Text('وقتی فرزند شما درخواست رزرو، بازی، مسابقه یا سفارش بوفه بدهد، اینجا نمایش داده می‌شود',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: ParentTheme.textMuted)),
          ],
        ),
      ),
    );
  }

  Future<void> _approve(BuildContext context, ApprovalRequest req) async {
    final state = context.read<ParentState>();
    // Optional note dialog
    String? note;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تایید درخواست', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${req.typeLabelFa} - ${req.childName}', style: const TextStyle(fontSize: 12, color: ParentTheme.textMuted)),
            const SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(hintText: 'یادداشت برای فرزند (اختیاری)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), isDense: true),
              onChanged: (v) => note = v,
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('انصراف')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
            },
            child: const Text('تایید نهایی'),
          ),
        ],
      ),
    );

    final ok = await state.approveRequest(req.id, note: note);
    if (ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('درخواست تایید شد ✅'), backgroundColor: ParentTheme.success));
    }
  }

  Future<void> _rejectDialog(BuildContext context, ApprovalRequest req) async {
    String reason = '';
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('رد درخواست', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('آیا از رد کردن "${req.typeLabelFa}" مطمئن هستید؟', style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(hintText: 'دلیل رد (برای فرزند نمایش داده می‌شود)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), isDense: true),
              onChanged: (v) => reason = v,
              maxLines: 2,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              children: [
                _quickReasonChip('زمان مناسب نیست', (v) => reason = v),
                _quickReasonChip('هزینه زیاد', (v) => reason = v),
                _quickReasonChip('بازی مناسب سن نیست', (v) => reason = v),
                _quickReasonChip('بعدا', (v) => reason = v),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('انصراف')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              if (reason.trim().isEmpty) reason = 'توسط والد رد شد';
              context.read<ParentState>().rejectRequest(req.id, reason: reason).then((ok) {
                if (ok && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('درخواست رد شد'), backgroundColor: ParentTheme.danger));
                }
              });
            },
            style: ElevatedButton.styleFrom(backgroundColor: ParentTheme.danger),
            child: const Text('رد کردن'),
          ),
        ],
      ),
    );
  }

  Widget _quickReasonChip(String text, Function(String) onPick) {
    return ActionChip(
      label: Text(text, style: const TextStyle(fontSize: 10)),
      onPressed: () => onPick(text),
      backgroundColor: ParentTheme.bgSecondary,
    );
  }

  void _showDetail(BuildContext context, ApprovalRequest req) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: ParentTheme.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text(req.typeLabelFa, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(req.summaryFa, style: const TextStyle(fontSize: 13, color: ParentTheme.textMuted)),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            ...req.payload.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(width: 100, child: Text(e.key, style: const TextStyle(fontSize: 12, color: ParentTheme.textMuted))),
                      Expanded(child: Text(e.value.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                    ],
                  ),
                )),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
