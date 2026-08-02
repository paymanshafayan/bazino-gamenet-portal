import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class CafeScreen extends StatefulWidget {
  const CafeScreen({super.key});

  @override
  State<CafeScreen> createState() => _CafeScreenState();
}

class _CafeScreenState extends State<CafeScreen> {
  String _activeCategory = 'All'; // 'All', 'Foods', 'Drinks', 'Snacks'
  final Map<CafeItem, int> _cart = {};

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    // Filter items based on active category
    final filteredItems = appState.cafeItems.where((item) {
      if (_activeCategory == 'All') return true;
      return item.category == _activeCategory;
    }).toList();

    num cartTotal = 0;
    _cart.forEach((item, qty) {
      cartTotal += item.price * qty;
    });

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Introductory banner
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isFa ? '🍔 منوی آنلاین بوفه و کافه سالن' : '🍔 Online Buffet & Cafeteria',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: GamingTheme.primary, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isFa
                          ? 'تنها با چند کلیک، بدون نیاز به ترک سیستم خود، سفارشات بوفه را ثبت کنید تا پرسنل آن را مستقیماً به میز شما بیاورند.'
                          : 'Order hot food, energy drinks, or snacks without stopping your gaming session. Our staff will serve it directly to your desk.',
                      style: const TextStyle(fontSize: 10, height: 1.5, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Horizontal Category Switcher
          Container(
            height: 40,
            margin: const EdgeInsets.symmetric(vertical: 8),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _buildCategoryTab('All', isFa ? 'همه خوراکی‌ها' : 'All Items'),
                _buildCategoryTab('Foods', isFa ? 'غذاهای گرم' : 'Hot Foods'),
                _buildCategoryTab('Drinks', isFa ? 'نوشیدنی‌ها' : 'Drinks'),
                _buildCategoryTab('Snacks', isFa ? 'تنقلات' : 'Snacks'),
              ],
            ),
          ),

          // Items Grid View
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filteredItems.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.8,
              ),
              itemBuilder: (context, index) {
                final item = filteredItems[index];
                final inCart = _cart[item] ?? 0;

                return Card(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Item Image Mock
                      Expanded(
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: Colors.black26,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(12),
                            ),
                            image: DecorationImage(
                              image: NetworkImage(item.imageUrl),
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${item.price.toLocaleString()} ${isFa ? 'تومان' : 'T'}',
                              style: const TextStyle(fontSize: 10, color: GamingTheme.primary, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${isFa ? 'موجودی بوفه:' : 'Stock:'} ${item.inventory}',
                              style: const TextStyle(fontSize: 9, color: GamingTheme.textMuted),
                            ),
                            const SizedBox(height: 8),

                            // Cart Add/Minus Buttons
                            item.inventory == 0
                                ? Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.white10,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Center(
                                      child: Text(
                                        isFa ? 'اتمام موجودی' : 'OUT OF STOCK',
                                        style: const TextStyle(fontSize: 9, color: Colors.white24, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  )
                                : inCart > 0
                                    ? Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.remove, size: 14, color: GamingTheme.primary),
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            onPressed: () {
                                              setState(() {
                                                if (_cart[item] == 1) {
                                                  _cart.remove(item);
                                                } else {
                                                  _cart[item] = _cart[item]! - 1;
                                                }
                                              });
                                            },
                                          ),
                                          Text(
                                            '$inCart',
                                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.add, size: 14, color: GamingTheme.primary),
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            onPressed: () {
                                              if (inCart < item.inventory) {
                                                setState(() {
                                                  _cart[item] = inCart + 1;
                                                });
                                              }
                                            },
                                          ),
                                        ],
                                      )
                                    : SizedBox(
                                        width: double.infinity,
                                        height: 26,
                                        child: ElevatedButton(
                                          onPressed: () {
                                            setState(() {
                                              _cart[item] = 1;
                                            });
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: GamingTheme.primary,
                                            padding: EdgeInsets.zero,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                          ),
                                          child: Text(
                                            isFa ? 'افزودن به سبد' : 'Add to Cart',
                                            style: const TextStyle(fontSize: 9, color: Colors.black, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Floating Cart Bottom Checkout Summary
          if (_cart.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: GamingTheme.darkCard,
                border: Border(top: BorderSide(color: Color(0xFF22242D))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isFa ? 'مجموع سبد خرید:' : 'Cart Total:',
                        style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                      ),
                      Text(
                        '${cartTotal.toLocaleString()} ${isFa ? 'تومان' : 'T'}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: () async {
                      final error = await appState.placeCafeOrder(_cart, null);
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
                                ? 'سفارش بوفه شما با موفقیت ثبت شد! در حال آماده‌سازی...'
                                : 'Buffet order placed successfully! Deliver in progress...',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );
                      setState(() {
                        _cart.clear();
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      isFa ? 'ثبت نهایی سفارش' : 'Place Order Now',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryTab(String categoryId, String label) {
    final isSelected = _activeCategory == categoryId;
    return GestureDetector(
      onTap: () {
        setState(() {
          _activeCategory = categoryId;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? GamingTheme.primary : GamingTheme.darkCard,
          border: Border.all(
            color: isSelected ? GamingTheme.primary : const Color(0xFF22242D),
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.black : Colors.white70,
            ),
          ),
        ),
      ),
    );
  }
}
