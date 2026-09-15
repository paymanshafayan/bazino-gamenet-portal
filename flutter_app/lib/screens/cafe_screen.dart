import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class CafeScreen extends StatefulWidget {
  const CafeScreen({super.key});

  @override
  State<CafeScreen> createState() => _CafeScreenState();
}

class _CafeScreenState extends State<CafeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _activeCategory = 'All';
  final Map<CafeItem, int> _cart = {};
  CafeItem? _selectedItem;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    final filteredItems = appState.cafeItems.where((item) {
      if (_activeCategory == 'All') return true;
      return item.category == _activeCategory;
    }).toList();

    num cartTotal = 0;
    _cart.forEach((item, qty) {
      cartTotal += item.price * qty;
    });

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
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
                      ? 'نسخه فلاتر حالا با تب‌های منو / جزئیات / سبد — هم‌ارز پرتال (cafe, cafe.detail, cafe.cart).'
                      : 'Flutter now has Menu / Detail / Cart tabs — parity with portal cafe, cafe.detail, cafe.cart.',
                  style: const TextStyle(fontSize: 10, height: 1.5, color: Colors.white70),
                ),
              ],
            ),
          ),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: GamingTheme.darkCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.15)),
          ),
          child: TabBar(
            controller: _tabController,
            labelColor: GamingTheme.primary,
            unselectedLabelColor: Colors.white54,
            indicatorColor: GamingTheme.primary,
            labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            tabs: [
              Tab(text: isFa ? 'منو' : 'Menu'),
              Tab(text: isFa ? 'جزئیات' : 'Detail'),
              Tab(text: isFa ? 'سبد (${_cart.length})' : 'Cart (${_cart.length})'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildMenuTab(filteredItems, appState, isFa),
              _buildDetailTab(appState, isFa),
              _buildCartTab(appState, isFa, cartTotal),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMenuTab(List<CafeItem> filteredItems, AppState appState, bool isFa) {
    return Column(
      children: [
        Container(
          height: 40,
          margin: const EdgeInsets.symmetric(vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              _buildCategoryTab('All', isFa ? 'همه' : 'All'),
              _buildCategoryTab('Foods', isFa ? 'غذاها' : 'Foods'),
              _buildCategoryTab('Drinks', isFa ? 'نوشیدنی' : 'Drinks'),
              _buildCategoryTab('Snacks', isFa ? 'تنقلات' : 'Snacks'),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: filteredItems.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 0.8),
            itemBuilder: (context, index) {
              final item = filteredItems[index];
              final inCart = _cart[item] ?? 0;
              return GlassCard(
                radius: 16,
                padding: EdgeInsets.zero,
                onTap: () {
                  setState(() {
                    _selectedItem = item;
                    _tabController.animateTo(1);
                  });
                },
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16)),
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: Colors.black26,
                            image: DecorationImage(image: NetworkImage(item.imageUrl), fit: BoxFit.cover),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.nameFor(appState.language), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text('${item.price.toLocaleString()} ${isFa ? 'تومان' : 'T'}', style: const TextStyle(fontSize: 10, color: GamingTheme.primary, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text('${isFa ? 'موجودی:' : 'Stock:'} ${item.inventory}', style: const TextStyle(fontSize: 9, color: GamingTheme.textMuted)),
                          const SizedBox(height: 8),
                          item.inventory == 0
                              ? Container(width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 4), decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(6)), child: Center(child: Text(isFa ? 'اتمام موجودی' : 'OUT OF STOCK', style: const TextStyle(fontSize: 9, color: Colors.white24, fontWeight: FontWeight.bold))))
                              : inCart > 0
                                  ? Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                      IconButton(icon: const Icon(Icons.remove, size: 14, color: GamingTheme.primary), padding: EdgeInsets.zero, constraints: const BoxConstraints(), onPressed: () => setState(() { if (_cart[item] == 1) { _cart.remove(item); } else { _cart[item] = _cart[item]! - 1; } })),
                                      Text('$inCart', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                                      IconButton(icon: const Icon(Icons.add, size: 14, color: GamingTheme.primary), padding: EdgeInsets.zero, constraints: const BoxConstraints(), onPressed: () { if (inCart < item.inventory) setState(() => _cart[item] = inCart + 1); }),
                                    ])
                                  : SizedBox(
                                      width: double.infinity,
                                      height: 26,
                                      child: DecoratedBox(
                                        decoration: BoxDecoration(gradient: GamingTheme.ctaGradient, borderRadius: BorderRadius.circular(8)),
                                        child: Material(color: Colors.transparent, child: InkWell(borderRadius: BorderRadius.circular(8), onTap: () => setState(() => _cart[item] = 1), child: Center(child: Text(isFa ? 'افزودن' : 'Add', style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold))))),
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
      ],
    );
  }

  Widget _buildDetailTab(AppState appState, bool isFa) {
    if (_selectedItem == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: GlassCard(padding: const EdgeInsets.all(20), child: Text(isFa ? 'آیتمی انتخاب نشده — از تب منو یک محصول را لمس کنید.' : 'No item selected — tap a product from Menu tab.', style: const TextStyle(color: Colors.white54, fontSize: 12), textAlign: TextAlign.center)),
        ),
      );
    }
    final item = _selectedItem!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.network(item.imageUrl, height: 200, width: double.infinity, fit: BoxFit.cover)),
          const SizedBox(height: 16),
          Text(item.nameFor(appState.language), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          Text('${item.price.toLocaleString()} ${isFa ? 'تومان' : 'T'} • ${item.category}', style: const TextStyle(color: GamingTheme.primary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(isFa ? 'توضیحات' : 'Description', style: const TextStyle(color: GamingTheme.goldAccent, fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 6),
              Text(isFa ? 'موجودی بوفه: ${item.inventory} • دسته: ${item.category}' : 'Stock: ${item.inventory} • Category: ${item.category}', style: const TextStyle(color: Colors.white70, fontSize: 11)),
            ]),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: NeonGradientButton(
              label: isFa ? 'افزودن به سبد و رفتن به تب سبد' : 'Add to cart & go to Cart tab',
              icon: Icons.shopping_cart,
              onPressed: () => setState(() {
                _cart[item] = (_cart[item] ?? 0) + 1;
                _tabController.animateTo(2);
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartTab(AppState appState, bool isFa, num cartTotal) {
    if (_cart.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: GlassCard(padding: const EdgeInsets.all(20), child: Text(isFa ? 'سبد خالی است.' : 'Cart is empty.', style: const TextStyle(color: Colors.white54, fontSize: 12))),
        ),
      );
    }
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: _cart.entries.map((e) {
              final item = e.key;
              final qty = e.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: GlassCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(item.imageUrl, width: 60, height: 60, fit: BoxFit.cover)),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item.nameFor(appState.language), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        Text('${item.price.toLocaleString()} × $qty = ${(item.price * qty).toLocaleString()}', style: const TextStyle(color: GamingTheme.primary, fontSize: 11)),
                      ])),
                      IconButton(icon: const Icon(Icons.delete_outline, color: Colors.white38, size: 18), onPressed: () => setState(() => _cart.remove(item))),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: GamingTheme.darkCardSolid.withValues(alpha: 0.7), border: Border(top: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.18)))),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(isFa ? 'مجموع سبد:' : 'Cart Total:', style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
                    Text('${cartTotal.toLocaleString()} ${isFa ? 'تومان' : 'T'}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
                  ]),
                  SizedBox(
                    width: 180,
                    child: NeonGradientButton(
                      label: isFa ? 'ثبت سفارش' : 'Place Order',
                      icon: Icons.check_circle_outline,
                      onPressed: () async {
                        final items = _cart.entries.map((en) => {'item': {'id': en.key.id}, 'quantity': en.value}).toList();
                        final error = await appState.checkoutOrder(kind: 'cafe', method: 'onsite', params: {'items': items});
                        if (!context.mounted) return;
                        if (error != null) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
                          return;
                        }
                        final oid = appState.lastCheckout?.orderId ?? '';
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(isFa ? 'سفارش ثبت شد ($oid)' : 'Order placed ($oid)'), backgroundColor: Colors.green));
                        setState(() => _cart.clear());
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryTab(String value, String label) {
    final isSelected = _activeCategory == value;
    return GestureDetector(
      onTap: () => setState(() => _activeCategory = value),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? GamingTheme.primary.withValues(alpha: 0.15) : Colors.white.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? GamingTheme.primary : Colors.white12),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? GamingTheme.primary : Colors.white54)),
      ),
    );
  }
}
