import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class ShopScreen extends StatelessWidget {
  const ShopScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header info
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isFa ? '🛍️ فروشگاه تجهیزات گیمینگ حرفه‌ای بازینو' : '🛍️ Bazino Professional Gaming Gear',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                ),
                const SizedBox(height: 8),
                Text(
                  isFa
                      ? 'محصولات جانبی اورجینال از معتبرترین برندها (ریزر، لاجیتک، ردراگون) را با گارانتی طلایی به صورت نقد یا با تخفیف کلوپ وفاداری خریداری کنید.'
                      : 'Explore authentic high-tier gaming components. Use points to unlock exclusive discounts or purchase immediately with secure guarantees.',
                  style: const TextStyle(fontSize: 11, height: 1.5, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Items grid list
          Text(
            isFa ? '🎮 محصولات و تجهیزات جانبی موجود' : '🎮 Available Products & Gears',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.accessories.length,
            itemBuilder: (context, index) {
              final item = appState.accessories[index];

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Product image
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: Colors.black26,
                          borderRadius: BorderRadius.circular(8),
                          image: DecorationImage(
                            image: NetworkImage(item.imageUrl),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Product Details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted, height: 1.4),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${item.price.toLocaleString()} ${isFa ? 'تومان' : 'T'}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                                ),
                                Text(
                                  '${isFa ? 'موجودی انبار:' : 'Stock:'} ${item.stock}',
                                  style: const TextStyle(fontSize: 9, color: GamingTheme.textMuted),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Purchase action
                            SizedBox(
                              width: double.infinity,
                              height: 36,
                              child: NeonGradientButton(
                                label: isFa ? 'خرید فوری و ثبت سفارش' : 'Buy & Checkout',
                                icon: Icons.shopping_cart,
                                onPressed: item.stock > 0
                                    ? () async {
                                        final error = await appState.purchaseAccessory(item.id, null);
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
                                                  ? 'خرید با موفقیت انجام شد! فاکتور به ایمیل شما ارسال گردید.'
                                                  : 'Purchase successful! Invoice has been mailed.',
                                            ),
                                            backgroundColor: Colors.green,
                                          ),
                                        );
                                      }
                                    : null,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
