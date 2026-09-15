import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Accessory? _selected;
  final Map<Accessory, int> _cart = {};

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

    num cartTotal = 0;
    _cart.forEach((item, qty) => cartTotal += item.price * qty);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(isFa ? '🛍️ فروشگاه تجهیزات بازینو' : '🛍️ Bazino Gear Shop', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
              const SizedBox(height: 8),
              Text(isFa ? 'تب‌های فروشگاه / جزئیات / سبد — هم‌ارز پرتال shop, shop.detail, shop.cart' : 'Shop / Detail / Cart tabs — parity with portal shop, shop.detail, shop.cart', style: const TextStyle(fontSize: 11, height: 1.5, color: Colors.white70)),
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
              Tab(text: isFa ? 'فروشگاه' : 'Shop'),
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
              _buildShopTab(appState, isFa),
              _buildDetailTab(appState, isFa),
              _buildCartTab(appState, isFa, cartTotal),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildShopTab(AppState appState, bool isFa) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: appState.accessories.length,
      itemBuilder: (context, index) {
        final item = appState.accessories[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            padding: const EdgeInsets.all(12),
            onTap: () {
              setState(() {
                _selected = item;
                _tabController.animateTo(1);
              });
            },
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 90, height: 90, decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), image: DecorationImage(image: NetworkImage(item.imageUrl), fit: BoxFit.cover))),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(item.nameFor(appState.language), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text(item.descriptionFor(appState.language), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted, height: 1.4)),
                  const SizedBox(height: 8),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('${item.price.toLocaleString()} ${isFa ? 'تومان' : 'T'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
                    Text('${isFa ? 'موجودی:' : 'Stock:'} ${item.stock}', style: const TextStyle(fontSize: 9, color: GamingTheme.textMuted)),
                  ]),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: NeonGradientButton(
                      label: isFa ? 'افزودن به سبد' : 'Add to cart',
                      icon: Icons.shopping_cart,
                      onPressed: item.stock > 0 ? () => setState(() => _cart[item] = (_cart[item] ?? 0) + 1) : null,
                    ),
                  ),
                ]),
              ),
            ]),
          ),
        );
      },
    );
  }

  Widget _buildDetailTab(AppState appState, bool isFa) {
    if (_selected == null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: GlassCard(padding: const EdgeInsets.all(20), child: Text(isFa ? 'محصولی انتخاب نشده.' : 'No product selected.', style: const TextStyle(color: Colors.white54, fontSize: 12)))));
    }
    final item = _selected!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.network(item.imageUrl, height: 220, width: double.infinity, fit: BoxFit.cover)),
        const SizedBox(height: 16),
        Text(item.nameFor(appState.language), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 8),
        Text(item.descriptionFor(appState.language), style: const TextStyle(fontSize: 11, color: Colors.white70, height: 1.6)),
        const SizedBox(height: 12),
        Text('${item.price.toLocaleString()} ${isFa ? 'تومان' : 'T'} • ${item.category}', style: const TextStyle(color: GamingTheme.primary, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: NeonGradientButton(
            label: isFa ? 'افزودن به سبد' : 'Add to cart',
            icon: Icons.shopping_cart,
            onPressed: () => setState(() {
              _cart[item] = (_cart[item] ?? 0) + 1;
              _tabController.animateTo(2);
            }),
          ),
        ),
      ]),
    );
  }

  Widget _buildCartTab(AppState appState, bool isFa, num cartTotal) {
    if (_cart.isEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: GlassCard(padding: const EdgeInsets.all(20), child: Text(isFa ? 'سبد خالی است.' : 'Cart empty.', style: const TextStyle(color: Colors.white54, fontSize: 12)))));
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
                  child: Row(children: [
                    ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(item.imageUrl, width: 60, height: 60, fit: BoxFit.cover)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item.nameFor(appState.language), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      Text('${item.price.toLocaleString()} × $qty = ${(item.price * qty).toLocaleString()}', style: const TextStyle(color: GamingTheme.primary, fontSize: 11)),
                    ])),
                    IconButton(icon: const Icon(Icons.delete_outline, color: Colors.white38, size: 18), onPressed: () => setState(() => _cart.remove(item))),
                  ]),
                ),
              );
            }).toList(),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: GamingTheme.darkCardSolid.withValues(alpha: 0.7), border: Border(top: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.18)))),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(isFa ? 'مجموع:' : 'Total:', style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
              Text('${cartTotal.toLocaleString()} ${isFa ? 'تومان' : 'T'}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
            ]),
            SizedBox(
              width: 180,
              child: NeonGradientButton(
                label: isFa ? 'ثبت سفارش' : 'Place Order',
                icon: Icons.check_circle_outline,
                onPressed: () async {
                  final cartPayload = _cart.entries.map((en) => {'item': {'id': en.key.id}, 'quantity': en.value}).toList();
                  final error = await appState.checkoutOrder(kind: 'shop', method: 'onsite', params: {'cart': cartPayload});
                  if (!context.mounted) return;
                  if (error != null) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
                    return;
                  }
                  final oid = appState.lastCheckout?.orderId ?? '';
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(isFa ? 'خرید ثبت شد ($oid)' : 'Purchase placed ($oid)'), backgroundColor: Colors.green));
                  setState(() => _cart.clear());
                },
              ),
            ),
          ]),
        ),
      ],
    );
  }
}
