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
  bool _isPromoApplied = false;
  double _discountPercent = 0;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    num totalRate = _selectedSystem != null ? _selectedSystem!.hourlyRate * _hours.toInt() : 0;
    int finalPrice = (totalRate * (1 - _discountPercent / 100)).toInt();
    int loyaltyPtsToEarn = (finalPrice / 10000).round();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Screen intro description
          Card(
            child: Padding(
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
                            ? GamingTheme.primary.withOpacity(0.12)
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
                                  ? GamingTheme.accentRed.withOpacity(0.15)
                                  : Colors.green.withOpacity(0.15),
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

          // Reservation Checkout panel
          if (_selectedSystem != null) ...[
            Text(
              isFa ? '📑 فاکتور و تایید نهایی رزرو' : '📑 Billing & Checkout invoice',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
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
                        Text(
                          _selectedSystem!.name,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
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

                    // Promo Code Input
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _promoController,
                            decoration: InputDecoration(
                              hintText: isFa ? 'کد تخفیف (مثال: GAMER2026)' : 'Coupon Code',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () {
                            if (_promoController.text.toUpperCase() == 'GAMER2026') {
                              setState(() {
                                _isPromoApplied = true;
                                _discountPercent = 15;
                              });
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: GamingTheme.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: Text(
                            isFa ? 'اعمال' : 'Apply',
                            style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    if (_isPromoApplied) ...[
                      const SizedBox(height: 8),
                      const Text(
                        '✓ Code Applied! 15% discount has been applied.',
                        style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],

                    const Divider(color: Color(0xFF22242D), height: 32),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isFa ? 'مبلغ کل فاکتور:' : 'Total invoice:',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          '${finalPrice.toLocaleString()} ${isFa ? 'تومان' : 'Tomans'}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isFa ? 'امتیاز وفاداری دریافتی:' : 'Loyalty points to gain:',
                          style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                        ),
                        Text(
                          '+$loyaltyPtsToEarn ${isFa ? 'امتیاز' : 'Points'}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          final now = DateTime.now();
                          final end = now.add(Duration(minutes: (_hours * 60).round()));
                          String fmt(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

                          final error = await appState.reserveSystem(
                            _selectedSystem!.id,
                            fmt(now),
                            fmt(end),
                            couponCode: _isPromoApplied ? 'GAMER2026' : null,
                          );
                          if (!context.mounted) return;
                          if (error != null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(error), backgroundColor: Colors.redAccent),
                            );
                            return;
                          }
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                isFa
                                    ? 'رزرو سیستم با موفقیت ثبت و تایید شد!'
                                    : 'Reservation successfully confirmed!',
                              ),
                              backgroundColor: Colors.green,
                            ),
                          );
                          setState(() {
                            _selectedSystem = null;
                            _hours = 2;
                            _promoController.clear();
                            _isPromoApplied = false;
                            _discountPercent = 0;
                          });
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: GamingTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          isFa ? 'پرداخت نهایی و تایید رزرو' : 'Pay & Confirm Reservation',
                          style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
