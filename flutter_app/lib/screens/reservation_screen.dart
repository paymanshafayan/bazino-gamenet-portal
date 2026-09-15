import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class ReservationScreen extends StatefulWidget {
  const ReservationScreen({super.key});

  @override
  State<ReservationScreen> createState() => _ReservationScreenState();
}

class _ReservationScreenState extends State<ReservationScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  GameSystem? _selectedSystem;
  double _hours = 2;
  final TextEditingController _promoController = TextEditingController();
  String? _payMethod;
  bool _isPaying = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _promoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(isFa ? '🖥️ سیستم رزرو آنلاین' : '🖥️ Online Booking', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
              const SizedBox(height: 8),
              Text(isFa ? 'تب‌های سیستم‌ها / جزئیات — هم‌ارز پرتال games, games.detail' : 'Systems / Detail tabs — parity with portal games, games.detail', style: const TextStyle(fontSize: 11, height: 1.5, color: Colors.white70)),
            ]),
          ),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: GamingTheme.darkCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.15))),
          child: TabBar(
            controller: _tabController,
            labelColor: GamingTheme.primary,
            unselectedLabelColor: Colors.white54,
            indicatorColor: GamingTheme.primary,
            labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            tabs: [
              Tab(text: isFa ? 'سیستم‌ها' : 'Systems'),
              Tab(text: isFa ? 'جزئیات و رزرو' : 'Detail & Book'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildSystemsTab(appState, isFa),
              _buildDetailTab(appState, isFa),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSystemsTab(AppState appState, bool isFa) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: appState.systems.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.15),
      itemBuilder: (context, index) {
        final sys = appState.systems[index];
        final isSelected = _selectedSystem?.id == sys.id;
        return InkWell(
          onTap: sys.isReserved ? null : () => setState(() { _selectedSystem = sys; _tabController.animateTo(1); }),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: sys.isReserved ? Colors.black26 : isSelected ? GamingTheme.primary.withValues(alpha: 0.12) : GamingTheme.darkCard,
              border: Border.all(color: sys.isReserved ? Colors.white12 : isSelected ? GamingTheme.primary : const Color(0xFF22242D)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Icon(sys.type == 'PC' ? Icons.computer : Icons.sports_esports, color: sys.isReserved ? Colors.white24 : GamingTheme.primary, size: 20),
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: sys.isReserved ? GamingTheme.accentRed.withValues(alpha: 0.15) : Colors.green.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)), child: Text(sys.isReserved ? (isFa ? 'رزرو شده' : 'RESERVED') : (isFa ? 'آزاد' : 'FREE'), style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: sys.isReserved ? GamingTheme.accentRed : Colors.green))),
              ]),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(sys.name, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: sys.isReserved ? Colors.white30 : Colors.white)),
                const SizedBox(height: 2),
                Text('${sys.hourlyRate.toLocaleString()} ${isFa ? 'تومان/ساعت' : 'T/hr'}', style: TextStyle(fontSize: 10, color: sys.isReserved ? Colors.white24 : GamingTheme.textMuted)),
              ]),
            ]),
          ),
        );
      },
    );
  }

  Widget _buildDetailTab(AppState appState, bool isFa) {
    if (_selectedSystem == null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: GlassCard(padding: const EdgeInsets.all(20), child: Text(isFa ? 'سیستمی انتخاب نشده — از تب سیستم‌ها یکی را انتخاب کنید.' : 'No system selected — pick one from Systems tab.', style: const TextStyle(color: Colors.white54, fontSize: 12), textAlign: TextAlign.center))));
    }
    final sys = _selectedSystem!;
    final estimateTotal = sys.hourlyRate * _hours.toInt();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        GlassCard(
          glow: GamingTheme.secondary,
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(isFa ? 'سیستم انتخاب شده:' : 'Selected:', style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
              Text(sys.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
            ]),
            const Divider(color: Color(0xFF22242D), height: 24),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(isFa ? 'مدت زمان:' : 'Duration:', style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
              Text('${_hours.toInt()} ${isFa ? 'ساعت' : 'Hours'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
            ]),
            Slider(value: _hours, min: 1, max: 8, divisions: 7, activeColor: GamingTheme.primary, onChanged: (val) => setState(() => _hours = val)),
            const Divider(color: Color(0xFF22242D), height: 16),
            TextField(controller: _promoController, decoration: InputDecoration(hintText: isFa ? 'کد تخفیف (اختیاری)' : 'Coupon (optional)', contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10))),
            const SizedBox(height: 6),
            Text(isFa ? 'مبلغ نهایی توسط سرور محاسبه می‌شود.' : 'Final amount validated server-side.', style: const TextStyle(fontSize: 9.5, color: Colors.white38)),
            const Divider(color: Color(0xFF22242D), height: 24),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(isFa ? 'برآورد مبلغ (لیر):' : 'Estimated (TL):', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
              Text('${estimateTotal.toInt().toLocaleString()} TL', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
            ]),
            const SizedBox(height: 20),
            if (!appState.isLoggedIn) ...[
              GlassCard(glow: GamingTheme.goldAccent, child: Row(children: [const Icon(Icons.lock_outline, color: GamingTheme.goldAccent, size: 18), const SizedBox(width: 8), Expanded(child: Text(isFa ? 'برای رزرو وارد شوید.' : 'Log in to book.', style: const TextStyle(fontSize: 11, color: Colors.white70)))])),
            ] else ...[
              Text(isFa ? '💳 روش پرداخت' : '💳 Payment', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 8),
              ..._buildPaymentOptions(appState, isFa),
              const SizedBox(height: 16),
              SizedBox(width: double.infinity, child: NeonGradientButton(label: _checkoutButtonLabel(isFa), icon: Icons.check_circle_outline, loading: _isPaying, onPressed: _isPaying || _effectivePayMethod(appState) == null ? null : () => _doCheckout(appState, isFa))),
            ],
          ]),
        ),
      ]),
    );
  }

  String? _effectivePayMethod(AppState appState) {
    switch (_payMethod) {
      case 'wallet':
        return appState.walletBalance > 0 ? 'wallet' : null;
      case 'credits':
        return appState.user.credits > 0 ? 'credits' : null;
      default:
        return _payMethod;
    }
  }

  List<Widget> _buildPaymentOptions(AppState appState, bool isFa) {
    final methods = appState.paymentMethods?.methods['reservation'] ?? ['wallet', 'credits', 'onsite'];
    final effective = _effectivePayMethod(appState);
    return methods.where((m) => m != 'online').map((m) {
      final selected = effective == m;
      String title, subtitle;
      Color color;
      IconData icon;
      bool enabled = true;
      switch (m) {
        case 'wallet':
          title = isFa ? 'کیف پول' : 'Wallet';
          subtitle = '${appState.walletBalance.toStringAsFixed(0)} TL';
          color = GamingTheme.primary;
          icon = Icons.account_balance_wallet_rounded;
          enabled = appState.walletBalance > 0;
          break;
        case 'credits':
          title = isFa ? 'کردیت' : 'Credits';
          subtitle = '${appState.user.credits.toStringAsFixed(0)} BC';
          color = GamingTheme.secondary;
          icon = Icons.monetization_on_rounded;
          enabled = appState.user.credits > 0;
          break;
        default:
          title = isFa ? 'پرداخت در محل' : 'On-site';
          subtitle = isFa ? 'پرداخت در محل' : 'Pay at desk';
          color = GamingTheme.goldAccent;
          icon = Icons.storefront_rounded;
      }
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: enabled ? () => setState(() => _payMethod = m) : null,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(color: selected ? color.withValues(alpha: 0.12) : Colors.white.withValues(alpha: 0.03), borderRadius: BorderRadius.circular(12), border: Border.all(color: selected ? color : Colors.white12, width: selected ? 1.5 : 1)),
            child: Row(children: [
              Icon(icon, color: enabled ? color : Colors.white24, size: 20),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: enabled ? Colors.white : Colors.white38)), Text(subtitle, style: const TextStyle(fontSize: 9.5, color: Colors.white54))])),
              if (selected) Icon(Icons.check_circle, color: color, size: 18),
            ]),
          ),
        ),
      );
    }).toList();
  }

  String _checkoutButtonLabel(bool isFa) {
    if (_payMethod == 'onsite') return isFa ? 'ثبت رزرو — پرداخت در محل' : 'Book — pay on-site';
    if (_payMethod == 'credits') return isFa ? 'پرداخت با کردیت' : 'Pay with credits';
    return isFa ? 'پرداخت از کیف پول' : 'Pay from wallet';
  }

  Future<void> _doCheckout(AppState appState, bool isFa) async {
    final method = _effectivePayMethod(appState);
    if (_selectedSystem == null || method == null || _isPaying) return;
    setState(() => _isPaying = true);
    final now = DateTime.now().add(const Duration(minutes: 5));
    final roundedStart = DateTime(now.year, now.month, now.day, now.hour, (now.minute / 5).ceil() * 5);
    final end = roundedStart.add(Duration(hours: _hours.toInt()));
    String fmt(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    final error = await appState.checkoutOrder(kind: 'reservation', method: method, params: {'systemId': _selectedSystem!.id, 'startTime': fmt(roundedStart), 'endTime': fmt(end), 'date': 'امروز', if (_promoController.text.trim().isNotEmpty) 'couponCode': _promoController.text.trim()});
    if (!mounted) return;
    setState(() => _isPaying = false);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
      return;
    }
    final outcome = appState.lastCheckout;
    final msg = method == 'onsite' ? (isFa ? 'جا گرفته شد! ${outcome?.orderId ?? ''}' : 'Spot held! ${outcome?.orderId ?? ''}') : (isFa ? 'پرداخت انجام شد ${outcome?.orderId ?? ''}' : 'Paid ${outcome?.orderId ?? ''}');
    await showDialog<void>(context: context, builder: (ctx) => AlertDialog(backgroundColor: GamingTheme.darkCardSolid, title: Text(isFa ? 'رزرو ثبت شد' : 'Booked', style: const TextStyle(color: Colors.white, fontSize: 15)), content: Text(msg, style: const TextStyle(color: Colors.white70, fontSize: 12.5)), actions: [TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(isFa ? 'عالیه!' : 'Awesome!', style: const TextStyle(color: GamingTheme.primary)))]));
    if (!mounted) return;
    setState(() { _selectedSystem = null; _hours = 2; _promoController.clear(); _payMethod = null; _tabController.animateTo(0); });
  }
}
