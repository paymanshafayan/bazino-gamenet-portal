import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  double _pointsToRedeem = 100;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    int couponValue = (_pointsToRedeem * 150).toInt(); // 1 Point = 150 Toman
    int minOrderValue = (couponValue * 1.5).toInt();
    String generatedCode = "NEXUS${_pointsToRedeem.toInt()}${DateTime.now().millisecond}";

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Points Summary Dashboard
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                isFa ? 'باشگاه مشتریان بازینو' : 'BAZINO Loyalty Hub',
                                style: const TextStyle(fontSize: 12, color: GamingTheme.primary, fontWeight: FontWeight.bold),
                              ),
                              if (appState.isLoggedIn) ...[
                                const SizedBox(width: 6),
                                Text('· @${appState.user.username}', style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isFa ? 'موجودی کل امتیازات شما' : 'Your Total Loyalty Points',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: GamingTheme.primary.withOpacity(0.1),
                              border: Border.all(color: GamingTheme.primary.withOpacity(0.4)),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.stars, color: GamingTheme.primary, size: 16),
                                const SizedBox(width: 4),
                                Text(
                                  '${appState.user.loyaltyPoints} ${isFa ? 'امتیاز' : 'PTS'}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: GamingTheme.primary, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                          if (appState.isLoggedIn) ...[
                            const SizedBox(width: 8),
                            IconButton(
                              tooltip: isFa ? 'خروج از حساب کاربری' : 'Log out',
                              icon: const Icon(Icons.logout, color: Colors.redAccent, size: 20),
                              onPressed: () async {
                                final confirmed = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    backgroundColor: GamingTheme.darkCard,
                                    title: Text(isFa ? 'خروج از حساب کاربری' : 'Log out', style: const TextStyle(color: Colors.white)),
                                    content: Text(
                                      isFa ? 'آیا مطمئن هستید که می‌خواهید خارج شوید؟' : 'Are you sure you want to log out?',
                                      style: const TextStyle(color: GamingTheme.textMuted),
                                    ),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(isFa ? 'انصراف' : 'Cancel')),
                                      TextButton(
                                        onPressed: () => Navigator.pop(ctx, true),
                                        child: Text(isFa ? 'خروج' : 'Log out', style: const TextStyle(color: Colors.redAccent)),
                                      ),
                                    ],
                                  ),
                                );
                                if (confirmed == true) {
                                  await appState.logout();
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(isFa ? 'با موفقیت خارج شدید.' : 'Logged out successfully.'),
                                      backgroundColor: GamingTheme.darkCard,
                                    ),
                                  );
                                }
                              },
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF22242D), height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildProfileStat(
                        isFa ? 'ارزش تخفیف تقریبی' : 'Approx Value',
                        '${(appState.user.loyaltyPoints * 150).toLocaleString()} ${isFa ? 'تومان' : 'T'}',
                        Icons.payments,
                      ),
                      _buildProfileStat(
                        isFa ? 'سطح وفاداری فعلی' : 'Current Level',
                        isFa ? 'برنزی (Bronze)' : 'Bronze Tier',
                        Icons.military_tech,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Points to Coupon Converter
          Text(
            isFa ? '💰 تبدیل مستقیم امتیاز به کد تخفیف' : '💰 Convert Points to Coupon',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isFa
                        ? 'شما می‌توانید با خرج کردن امتیازهای وفاداری خود، کدهای تخفیف اختصاصی صادر کرده و در بوفه، رزرو سیستم یا خرید لوازم جانبی استفاده کنید.'
                        : 'Exchange your accumulated loyalty points for valuable promo codes that apply on cafeteria items, system bookings, or physical products.',
                    style: const TextStyle(fontSize: 11, height: 1.6, color: Colors.white70),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isFa ? 'امتیاز مورد نظر برای کسر:' : 'Points to redeem:',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white70),
                      ),
                      Text(
                        '${_pointsToRedeem.toInt()} ${isFa ? 'امتیاز' : 'PTS'}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                      ),
                    ],
                  ),
                  Slider(
                    value: _pointsToRedeem,
                    min: 100,
                    max: 1000,
                    divisions: 9,
                    activeColor: GamingTheme.primary,
                    inactiveColor: Colors.white10,
                    onChanged: (val) {
                      setState(() {
                        _pointsToRedeem = val;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  _buildConversionMeta(isFa ? 'ارزش کد تخفیف:' : 'Coupon Value:', '${couponValue.toLocaleString()} ${isFa ? 'تومان' : 'Tomans'}'),
                  _buildConversionMeta(isFa ? 'حداقل سفارش خرید:' : 'Min Order Limit:', '${minOrderValue.toLocaleString()} ${isFa ? 'تومان' : 'Tomans'}'),
                  _buildConversionMeta(isFa ? 'مدت اعتبار کوپن:' : 'Coupon Validity:', isFa ? '۳۰ روز از زمان صدور' : '30 days from issuance'),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: appState.user.loyaltyPoints >= _pointsToRedeem
                          ? () async {
                              final error = await appState.redeemPoints(
                                _pointsToRedeem.toInt(),
                                couponValue,
                                generatedCode,
                              );
                              if (!context.mounted) return;
                              if (error == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      isFa
                                          ? 'کد تخفیف جدید صادر و فعال شد!'
                                          : 'Promo code generated successfully!',
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error), backgroundColor: Colors.redAccent),
                                );
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: GamingTheme.primary,
                        disabledBackgroundColor: Colors.white10,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text(
                        appState.user.loyaltyPoints >= _pointsToRedeem
                            ? (isFa ? 'تبدیل امتیاز و تولید کوپن' : 'Convert Points to Coupon')
                            : (isFa ? 'کسر امتیاز غیرمجاز (موجودی ناافی)' : 'Insufficient Points'),
                        style: TextStyle(
                          color: appState.user.loyaltyPoints >= _pointsToRedeem ? Colors.black : Colors.white24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Active Coupon List
          Text(
            isFa ? '🎟️ کدهای تخفیف فعال شما' : '🎟️ Active Promo Coupons',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          appState.activeCoupons.isEmpty
              ? Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: GamingTheme.darkCard,
                    border: Border.all(color: const Color(0xFF22242D)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      isFa ? 'کد تخفیف فعالی ندارید.' : 'No active coupon codes issued.',
                      style: const TextStyle(fontSize: 12, color: GamingTheme.textMuted),
                    ),
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.activeCoupons.length,
                  itemBuilder: (context, index) {
                    final coupon = appState.activeCoupons[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: const Icon(Icons.qr_code, color: GamingTheme.primary),
                        title: Text(
                          coupon.code,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'monospace'),
                        ),
                        subtitle: Text(
                          isFa
                              ? 'کاهش قیمت به ارزش ${coupon.value.toLocaleString()} تومان'
                              : '${coupon.value.toLocaleString()} Tomans reduction',
                          style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            isFa ? 'فعال' : 'ACTIVE',
                            style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    );
                  },
                ),
          const SizedBox(height: 24),

          // Transaction History Table
          Text(
            isFa ? '📝 تاریخچه امتیازات شما' : '📝 Score Ledger / Transactions',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: appState.transactions.length,
              separatorBuilder: (context, index) => const Divider(color: Color(0xFF22242D), height: 1),
              itemBuilder: (context, index) {
                final tx = appState.transactions[index];
                final isEarned = tx.type == 'Earned';
                return ListTile(
                  title: Text(
                    tx.description,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white),
                  ),
                  subtitle: Text(
                    tx.date,
                    style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted),
                  ),
                  trailing: Text(
                    isEarned ? '+${tx.points}' : '${tx.points}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isEarned ? Colors.green : GamingTheme.accentRed,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileStat(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: GamingTheme.primary, size: 20),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted)),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
      ],
    );
  }

  Widget _buildConversionMeta(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}
