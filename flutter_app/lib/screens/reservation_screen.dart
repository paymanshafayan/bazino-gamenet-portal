import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class ReservationScreen extends StatefulWidget {
  const ReservationScreen({super.key});

  @override
  State<ReservationScreen> createState() => _ReservationScreenState();
}

class _ReservationScreenState extends State<ReservationScreen> {
  GameSystem? _selectedSystem;
  double _hours = 2;
  final TextEditingController _promoController = TextEditingController();
  String? _payMethod; // wallet | credits | onsite
  bool _isPaying = false;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    final estimateTotal = _selectedSystem != null ? _selectedSystem!.hourlyRate * _hours.toInt() : 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Screen intro description
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isFa ? '🖥️ سیستم رزرو آنلاین کلوپ بازینو' : '🖥️ Bazino Online System Booking',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                ),
                const SizedBox(height: 8),
                Text(
                  isFa
                      ? 'سیستم‌های PC گیمینگ فوق پیشرفته یا کنسول‌های نسل نهم (PS5 & Xbox Series X) را در ساعت‌های مشخص رزرو کرده و فاکتور خود را با تخفیف پرداخت کنید.'
                      : 'Book high-end PC gaming systems or ninth-generation consoles (PS5 & Xbox Series X) online for specific hours and pay your invoice.',
                  style: const TextStyle(fontSize: 11, height: 1.5, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Grid list of PC and Console Systems
          Text(
            isFa ? '🎮 انتخاب سیستم یا کنسول بازی' : '🎮 Select Gaming PC or Console',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.systems.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.15,
            ),
            itemBuilder: (context, index) {
              final sys = appState.systems[index];
              final isSelected = _selectedSystem?.id == sys.id;

              return InkWell(
                onTap: sys.isReserved
                    ? null
                    : () {
                        setState(() {
                          _selectedSystem = sys;
                        });
                      },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: sys.isReserved
                        ? Colors.black26
                        : isSelected
                            ? GamingTheme.primary.withValues(alpha: 0.12)
                            : GamingTheme.darkCard,
                    border: Border.all(
                      color: sys.isReserved
                          ? Colors.white12
                          : isSelected
                              ? GamingTheme.primary
                              : const Color(0xFF22242D),
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(
                            sys.type == 'PC' ? Icons.computer : Icons.sports_esports,
                            color: sys.isReserved ? Colors.white24 : GamingTheme.primary,
                            size: 20,
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: sys.isReserved
                                  ? GamingTheme.accentRed.withValues(alpha: 0.15)
                                  : Colors.green.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              sys.isReserved ? (isFa ? 'رزرو شده' : 'RESERVED') : (isFa ? 'آزاد' : 'FREE'),
                              style: TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.bold,
                                color: sys.isReserved ? GamingTheme.accentRed : Colors.green,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            sys.name,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: sys.isReserved ? Colors.white30 : Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${sys.hourlyRate.toLocaleString()} ${isFa ? 'تومان/ساعت' : 'T/hr'}',
                            style: TextStyle(
                              fontSize: 10,
                              color: sys.isReserved ? Colors.white24 : GamingTheme.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),

          // Reservation Checkout panel — اقتصاد جدید سرور (بیعانه/کیف پول/کردیت/حضوری)
          if (_selectedSystem != null) ...[
            Text(
              isFa ? '📑 فاکتور و انتخاب روش پرداخت' : '📑 Invoice & Payment Method',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),
            GlassCard(
              glow: GamingTheme.secondary,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isFa ? 'سیستم انتخاب شده:' : 'Selected Hardware:',
                        style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                      ),
                      Flexible(
                        child: Text(
                          _selectedSystem!.name,
                          textAlign: TextAlign.end,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF22242D), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isFa ? 'مدت زمان رزرو:' : 'Duration (Hours):',
                        style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                      ),
                      Text(
                        '${_hours.toInt()} ${isFa ? 'ساعت' : 'Hours'}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                      ),
                    ],
                  ),
                  Slider(
                    value: _hours,
                    min: 1,
                    max: 8,
                    divisions: 7,
                    activeColor: GamingTheme.primary,
                    onChanged: (val) {
                      setState(() {
                        _hours = val;
                      });
                    },
                  ),
                  const Divider(color: Color(0xFF22242D), height: 16),

                  // کد تخفیف واقعی — سمت سرور اعتبارسنجی و اعمال می‌شود (کد جعلی سمت کلاینت حذف شد)
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _promoController,
                          decoration: InputDecoration(
                            hintText: isFa ? 'کد تخفیف (اگر دارید)' : 'Coupon code (optional)',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    isFa ? 'مبلغ نهایی و تخفیف دقیق هنگام تأیید توسط سرور محاسبه می‌شود.' : 'Final amount & discount are validated server-side at checkout.',
                    style: const TextStyle(fontSize: 9.5, color: Colors.white38),
                  ),

                  const Divider(color: Color(0xFF22242D), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isFa ? 'برآورد مبلغ (لیر):' : 'Estimated total (TL):',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      Text(
                        '${(estimateTotal).toInt().toLocaleString()} ${isFa ? 'لیر' : 'TL'}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ---- انتخاب روش پرداخت (از /api/payments/methods سرور) ----
                  if (!appState.isLoggedIn) ...[
                    GlassCard(
                      glow: GamingTheme.goldAccent,
                      child: Row(
                        children: [
                          const Icon(Icons.lock_outline, color: GamingTheme.goldAccent, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isFa ? 'برای رزرو و پرداخت، وارد حساب کاربری شوید.' : 'Please log in to book & pay.',
                              style: const TextStyle(fontSize: 11, color: Colors.white70),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    Text(
                      isFa ? '💳 روش پرداخت' : '💳 Payment method',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    ..._buildPaymentOptions(appState, isFa),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: NeonGradientButton(
                        label: _checkoutButtonLabel(isFa),
                        icon: Icons.check_circle_outline,
                        loading: _isPaying,
                        onPressed: _isPaying || _effectivePayMethod(appState) == null
                            ? null
                            : () async {
                                await _doCheckout(appState, isFa);
                              },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// روش پرداختِ انتخاب‌شده فقط وقتی معتبر است که موجودی‌اش هم باشد.
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
    final widgets = <Widget>[];
    for (final m in methods) {
      if (m == 'online') continue; // درگاه آنلاین در حال حاضر غیرفعال است
      final selected = effective == m;
      String title;
      String subtitle;
      Color color;
      IconData icon;
      bool enabled = true;
      switch (m) {
        case 'wallet':
          title = isFa ? 'کیف پول بازینو' : 'BAZINO Wallet';
          subtitle = isFa ? 'موجودی: ${appState.walletBalance.toStringAsFixed(0)} لیر — تأیید فوری' : 'Balance: ${appState.walletBalance.toStringAsFixed(0)} TL — instant';
          color = GamingTheme.primary;
          icon = Icons.account_balance_wallet_rounded;
          enabled = appState.walletBalance > 0;
        case 'credits':
          title = isFa ? 'کردیت بازینو (BC)' : 'Bazino Credits (BC)';
          subtitle = isFa ? 'موجودی: ${appState.user.credits.toStringAsFixed(0)} BC — نرخ زمانی' : 'Balance: ${appState.user.credits.toStringAsFixed(0)} BC';
          color = GamingTheme.secondary;
          icon = Icons.monetization_on_rounded;
          enabled = appState.user.credits > 0;
        default:
          title = isFa ? 'پرداخت در محل' : 'Pay on-site';
          subtitle = isFa ? 'جا همین حالا رزرو می‌شود؛ پرداخت حداکثر ۱۰ دقیقه قبل از شروع' : 'Spot held; pay at desk up to 10 min before start';
          color = GamingTheme.goldAccent;
          icon = Icons.storefront_rounded;
      }
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: enabled
                ? () {
                    setState(() => _payMethod = m);
                  }
                : null,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: selected ? color.withValues(alpha: 0.12) : Colors.white.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: selected ? color : Colors.white12, width: selected ? 1.5 : 1),
              ),
              child: Row(
                children: [
                  Icon(icon, color: enabled ? color : Colors.white24, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: enabled ? Colors.white : Colors.white38),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: const TextStyle(fontSize: 9.5, color: Colors.white54),
                        ),
                      ],
                    ),
                  ),
                  if (selected) Icon(Icons.check_circle, color: color, size: 18),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return widgets;
  }

  String _checkoutButtonLabel(bool isFa) {
    if (_payMethod == 'onsite') return isFa ? 'ثبت رزرو — پرداخت در محل' : 'Book — pay on-site';
    if (_payMethod == 'credits') return isFa ? 'پرداخت با کردیت و تأیید رزرو' : 'Pay with credits & confirm';
    return isFa ? 'پرداخت از کیف پول و تأیید رزرو' : 'Pay from wallet & confirm';
  }

  Future<void> _doCheckout(AppState appState, bool isFa) async {
    final method = _effectivePayMethod(appState);
    if (_selectedSystem == null || method == null || _isPaying) return;
    setState(() => _isPaying = true);

    final now = DateTime.now().add(const Duration(minutes: 5));
    final roundedStart = DateTime(now.year, now.month, now.day, now.hour, (now.minute / 5).ceil() * 5);
    final end = roundedStart.add(Duration(hours: _hours.toInt()));
    String fmt(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

    final error = await appState.checkoutOrder(
      kind: 'reservation',
      method: method,
      params: {
        'systemId': _selectedSystem!.id,
        'startTime': fmt(roundedStart),
        'endTime': fmt(end),
        'date': 'امروز',
        if (_promoController.text.trim().isNotEmpty) 'couponCode': _promoController.text.trim(),
      },
    );

    if (!mounted) return;
    setState(() => _isPaying = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: Colors.redAccent),
      );
      return;
    }

    final outcome = appState.lastCheckout;
    final isOnsite = method == 'onsite';
    String message;
    if (isOnsite) {
      message = isFa
          ? 'جا برای شما گرفته شد! سفارش ${outcome?.orderId ?? ''} — پرداخت حضوری حداکثر ۱۰ دقیقه قبل از شروع سانس.'
          : 'Spot held! Order ${outcome?.orderId ?? ''} — pay at the desk up to 10 min before your session.';
    } else if (method == 'credits') {
      message = isFa
          ? 'پرداخت با کردیت انجام شد (${outcome?.creditsCost ?? 0} BC). شناسه: ${outcome?.orderId ?? ''}'
          : 'Paid with credits (${outcome?.creditsCost ?? 0} BC). ID: ${outcome?.orderId ?? ''}';
    } else {
      message = isFa
          ? 'پرداخت از کیف پول انجام شد (${(outcome?.amount ?? 0).toStringAsFixed(0)} لیر). موجودی جدید: ${(outcome?.balanceAfter ?? appState.walletBalance).toStringAsFixed(0)} لیر'
          : 'Paid from wallet (${(outcome?.amount ?? 0).toStringAsFixed(0)} TL). New balance: ${(outcome?.balanceAfter ?? appState.walletBalance).toStringAsFixed(0)} TL';
    }

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: GamingTheme.darkCardSolid,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: GamingTheme.accentGreen.withValues(alpha: 0.4)),
        ),
        title: Row(
          children: [
            const Icon(Icons.verified_rounded, color: GamingTheme.accentGreen, size: 22),
            const SizedBox(width: 8),
            Text(isFa ? 'رزرو ثبت شد' : 'Reservation booked', style: const TextStyle(color: Colors.white, fontSize: 15)),
          ],
        ),
        content: Text(message, style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.6)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(isFa ? 'عالیه!' : 'Awesome!', style: const TextStyle(color: GamingTheme.primary)),
          ),
        ],
      ),
    );

    if (!mounted) return;
    setState(() {
      _selectedSystem = null;
      _hours = 2;
      _promoController.clear();
      _payMethod = null;
    });
  }
}
