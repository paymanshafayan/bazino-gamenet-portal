import 'package:flutter/material.dart';
import '../theme.dart';
import '../models/parent_models.dart';
import '../widgets/glass_card.dart';
import '../widgets/child_status_card.dart';

class ChildProfileScreen extends StatelessWidget {
  final Child child;

  const ChildProfileScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ParentTheme.bg,
      appBar: AppBar(title: Text('پروفایل ${child.displayName}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ChildStatusCard(child: child),
          const SizedBox(height: 16),
          ParentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('اطلاعات', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 12),
                _row('نام کاربری', '@${child.username}'),
                _row('نام', child.displayName),
                _row('سن', '${child.age} سال'),
                _row('امتیاز وفاداری', '${child.loyaltyPoints} امتیاز'),
                _row('وضعیت', child.presenceLabelFa),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ParentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('گزارش ماهانه', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _statBox('کل زمان', '24 ساعت', Icons.access_time)),
                    const SizedBox(width: 8),
                    Expanded(child: _statBox('کل هزینه', '1.2M تومان', Icons.payments)),
                    const SizedBox(width: 8),
                    Expanded(child: _statBox('مسابقات', '3 شرکت', Icons.emoji_events)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ParentCard(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.block_rounded, color: ParentTheme.danger),
                  title: const Text('مسدود کردن موقت', style: TextStyle(fontSize: 13)),
                  subtitle: const Text('فرزند نتواند درخواست جدید بدهد', style: TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
                  trailing: Switch(value: false, onChanged: (_) {}),
                  dense: true,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.link_off_rounded, color: ParentTheme.textMuted),
                  title: const Text('قطع ارتباط', style: TextStyle(fontSize: 13)),
                  subtitle: const Text('لینک والد-فرزند حذف شود', style: TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
                  dense: true,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontSize: 12, color: ParentTheme.textMuted))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ParentTheme.textDark))),
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: ParentTheme.bgSecondary, borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Icon(icon, size: 18, color: ParentTheme.primary),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(fontSize: 10, color: ParentTheme.textMuted)),
        ],
      ),
    );
  }
}
