import 'package:flutter/material.dart';
import '../theme.dart';
import '../models/parent_models.dart';
import '../widgets/glass_card.dart';

class SettingsScreen extends StatefulWidget {
  final Child? child;
  final ChildLimits? limits;

  const SettingsScreen({super.key, this.child, this.limits});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late ChildLimits _limits;

  @override
  void initState() {
    super.initState();
    _limits = widget.limits ?? ChildLimits();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ParentTheme.bg,
      appBar: AppBar(title: Text(widget.child != null ? 'محدودیت‌های ${widget.child!.displayName}' : 'تنظیمات والدین')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ParentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('محدودیت زمانی روزانه', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 12),
                Slider(
                  value: _limits.dailyMinutesLimit.toDouble(),
                  min: 30,
                  max: 480,
                  divisions: 15,
                  label: '${_limits.dailyMinutesLimit} دقیقه',
                  onChanged: (v) => setState(() => _limits = ChildLimits(
                        dailyMinutesLimit: v.toInt(),
                        dailySpendingLimit: _limits.dailySpendingLimit,
                        allowedFrom: _limits.allowedFrom,
                        allowedTo: _limits.allowedTo,
                        requireApprovalForCafe: _limits.requireApprovalForCafe,
                        requireApprovalForTournaments: _limits.requireApprovalForTournaments,
                        requireApprovalForGameSelection: _limits.requireApprovalForGameSelection,
                      )),
                ),
                Text('${_limits.dailyMinutesLimit} دقیقه در روز (${(_limits.dailyMinutesLimit / 60).toStringAsFixed(1)} ساعت)', style: const TextStyle(fontSize: 12, color: ParentTheme.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ParentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('سقف هزینه روزانه', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 12),
                Slider(
                  value: _limits.dailySpendingLimit,
                  min: 50000,
                  max: 1000000,
                  divisions: 19,
                  label: '${(_limits.dailySpendingLimit / 1000).toInt()}K',
                  onChanged: (v) => setState(() => _limits = ChildLimits(
                        dailyMinutesLimit: _limits.dailyMinutesLimit,
                        dailySpendingLimit: v,
                        allowedFrom: _limits.allowedFrom,
                        allowedTo: _limits.allowedTo,
                        requireApprovalForCafe: _limits.requireApprovalForCafe,
                        requireApprovalForTournaments: _limits.requireApprovalForTournaments,
                        requireApprovalForGameSelection: _limits.requireApprovalForGameSelection,
                      )),
                ),
                Text('${_limits.dailySpendingLimit.toInt()} تومان در روز', style: const TextStyle(fontSize: 12, color: ParentTheme.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ParentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ساعات مجاز حضور', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _timeField('از', _limits.allowedFrom, (v) => setState(() => _limits = ChildLimits(dailyMinutesLimit: _limits.dailyMinutesLimit, dailySpendingLimit: _limits.dailySpendingLimit, allowedFrom: v, allowedTo: _limits.allowedTo, requireApprovalForCafe: _limits.requireApprovalForCafe, requireApprovalForTournaments: _limits.requireApprovalForTournaments, requireApprovalForGameSelection: _limits.requireApprovalForGameSelection)))),
                    const SizedBox(width: 12),
                    Expanded(child: _timeField('تا', _limits.allowedTo, (v) => setState(() => _limits = ChildLimits(dailyMinutesLimit: _limits.dailyMinutesLimit, dailySpendingLimit: _limits.dailySpendingLimit, allowedFrom: _limits.allowedFrom, allowedTo: v, requireApprovalForCafe: _limits.requireApprovalForCafe, requireApprovalForTournaments: _limits.requireApprovalForTournaments, requireApprovalForGameSelection: _limits.requireApprovalForGameSelection)))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ParentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('نیاز به تایید والد', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                SwitchListTile(
                  title: const Text('سفارش بوفه', style: TextStyle(fontSize: 12)),
                  value: _limits.requireApprovalForCafe,
                  onChanged: (v) => setState(() => _limits = ChildLimits(dailyMinutesLimit: _limits.dailyMinutesLimit, dailySpendingLimit: _limits.dailySpendingLimit, allowedFrom: _limits.allowedFrom, allowedTo: _limits.allowedTo, requireApprovalForCafe: v, requireApprovalForTournaments: _limits.requireApprovalForTournaments, requireApprovalForGameSelection: _limits.requireApprovalForGameSelection)),
                  dense: true,
                ),
                SwitchListTile(
                  title: const Text('شرکت در مسابقات', style: TextStyle(fontSize: 12)),
                  value: _limits.requireApprovalForTournaments,
                  onChanged: (v) => setState(() => _limits = ChildLimits(dailyMinutesLimit: _limits.dailyMinutesLimit, dailySpendingLimit: _limits.dailySpendingLimit, allowedFrom: _limits.allowedFrom, allowedTo: _limits.allowedTo, requireApprovalForCafe: _limits.requireApprovalForCafe, requireApprovalForTournaments: v, requireApprovalForGameSelection: _limits.requireApprovalForGameSelection)),
                  dense: true,
                ),
                SwitchListTile(
                  title: const Text('انتخاب بازی', style: TextStyle(fontSize: 12)),
                  value: _limits.requireApprovalForGameSelection,
                  onChanged: (v) => setState(() => _limits = ChildLimits(dailyMinutesLimit: _limits.dailyMinutesLimit, dailySpendingLimit: _limits.dailySpendingLimit, allowedFrom: _limits.allowedFrom, allowedTo: _limits.allowedTo, requireApprovalForCafe: _limits.requireApprovalForCafe, requireApprovalForTournaments: _limits.requireApprovalForTournaments, requireApprovalForGameSelection: v)),
                  dense: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 48,
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('محدودیت‌ها ذخیره شد ✅'), backgroundColor: ParentTheme.success));
              },
              icon: const Icon(Icons.save_rounded),
              label: const Text('ذخیره تنظیمات'),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: ParentTheme.primary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(12)),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.shield_outlined, size: 16, color: ParentTheme.primary),
                SizedBox(width: 8),
                Expanded(child: Text('این محدودیت‌ها در سرور اعمال می‌شود و حتی اگر فرزند از داخل گیم‌نت درخواست دهد، بدون تایید شما نهایی نخواهد شد.', style: TextStyle(fontSize: 11, color: ParentTheme.textMuted))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _timeField(String label, String value, Function(String) onChanged) {
    return TextFormField(
      initialValue: value,
      decoration: InputDecoration(labelText: label, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), isDense: true, filled: true, fillColor: ParentTheme.bgSecondary),
      onChanged: onChanged,
    );
  }
}
