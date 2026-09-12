import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../api_config.dart';
import '../models.dart';
import '../theme.dart';
import 'auth_screen.dart';
import 'loyalty_screen.dart';

/// حساب کاربری کامل (تسک فاز ۲) — پروفایل/آواتار/رمز، کیف پول (TL)، کردیت (BC)،
/// سفارش‌های در انتظار پرداخت حضوری (با مهلت و لغو)، رزروها و سفارش‌های من،
/// تیکت پشتیبانی کامل، کارت عضویت QR — همه روی APIهای واقعی /api/me/*.
class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final appState = Provider.of<AppState>(context, listen: false);
      if (appState.isLoggedIn) appState.fetchAccountData();
    });
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

    if (!appState.isLoggedIn) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: GlassCard(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.person_outline_rounded, color: GamingTheme.primary, size: 44),
                const SizedBox(height: 12),
                Text(
                  isFa ? 'حساب کاربری بازینو' : 'BAZINO Account',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  isFa
                      ? 'وارد شوید تا کیف پول، رزروها، سفارش‌ها، تیکت‌ها و کارت عضویت شما فعال شود.'
                      : 'Log in to unlock your wallet, bookings, orders, tickets and membership card.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11.5, color: Colors.white54, height: 1.7),
                ),
                const SizedBox(height: 18),
                NeonGradientButton(
                  label: isFa ? 'ورود / ثبت‌نام' : 'Login / Sign up',
                  icon: Icons.login_rounded,
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AuthScreen()),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.25)),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                gradient: GamingTheme.ctaGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white54,
              labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              dividerColor: Colors.transparent,
              tabs: [
                Tab(text: isFa ? 'نمای کلی' : 'OVERVIEW'),
                Tab(text: isFa ? 'سفارش‌ها' : 'ORDERS'),
                Tab(text: isFa ? 'تیکت‌ها' : 'TICKETS'),
                Tab(text: isFa ? 'باشگاه' : 'CLUB'),
              ],
            ),
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [
              _OverviewTab(),
              _OrdersTab(),
              _TicketsTab(),
              LoyaltyScreen(),
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================
// تب نمای کلی — پروفایل، کیف پول، QR، سفارش‌های در انتظار
// ============================================================
class _OverviewTab extends StatelessWidget {
  const _OverviewTab();

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';
    final user = appState.user;

    return RefreshIndicator(
      color: GamingTheme.primary,
      onRefresh: () => appState.fetchAccountData(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ---- هدر پروفایل + آواتار ----
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    _buildAvatar(context, appState, isFa),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  user.displayName.isNotEmpty ? user.displayName : '@${user.username}',
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                                ),
                              ),
                              if (user.phoneVerified) ...[
                                const SizedBox(width: 5),
                                const Icon(Icons.verified_rounded, color: GamingTheme.accentGreen, size: 15),
                              ],
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '@${user.username}${user.gamerTag.isNotEmpty ? ' · ${user.gamerTag}' : ''}',
                            style: const TextStyle(fontSize: 10.5, color: GamingTheme.textMuted),
                          ),
                          if (user.city.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              '${user.city}${user.createdAt.isNotEmpty ? ' · ${isFa ? 'عضو از' : 'member since'} ${user.createdAt.substring(0, 10)}' : ''}',
                              style: const TextStyle(fontSize: 9.5, color: Colors.white38),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                if (user.bio.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    user.bio,
                    style: const TextStyle(fontSize: 11, color: Colors.white60, height: 1.6),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _statChip(isFa ? 'امتیاز' : 'Points', '${user.loyaltyPoints}', Icons.stars_rounded, GamingTheme.goldAccent)),
                    const SizedBox(width: 8),
                    Expanded(child: _statChip(isFa ? 'کردیت BC' : 'Credits BC', user.credits.toStringAsFixed(0), Icons.tokens_rounded, GamingTheme.secondary)),
                    const SizedBox(width: 8),
                    Expanded(child: _statChip(isFa ? 'کیف پول' : 'Wallet', '${appState.walletBalance.toStringAsFixed(0)} TL', Icons.account_balance_wallet_rounded, GamingTheme.primary)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: GamingTheme.primary,
                          side: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => _openEditProfile(context, appState, isFa),
                        icon: const Icon(Icons.edit_rounded, size: 15),
                        label: Text(isFa ? 'ویرایش پروفایل' : 'Edit profile', style: const TextStyle(fontSize: 11)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: GamingTheme.secondary,
                          side: BorderSide(color: GamingTheme.secondary.withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => _openChangePassword(context, appState, isFa),
                        icon: const Icon(Icons.key_rounded, size: 15),
                        label: Text(isFa ? 'تغییر رمز' : 'Password', style: const TextStyle(fontSize: 11)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ---- کارت عضویت QR ----
          GlassCard(
            glow: GamingTheme.goldAccent,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isFa ? '🪪 کارت عضویت بازینو' : '🪪 BAZINO Member Card',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.goldAccent),
                    ),
                    const Icon(Icons.qr_code_2_rounded, color: GamingTheme.goldAccent, size: 20),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: QrImageView(
                    data: 'BAZINO|MEMBER|${user.username}',
                    version: QrVersions.auto,
                    size: 140,
                    gapless: true,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isFa ? 'این کارت را در سالن نشان دهید تا سریع شناخته شوید.' : 'Show this card at the venue for fast check-in.',
                  style: const TextStyle(fontSize: 9.5, color: Colors.white38),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ---- کیف پول ----
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isFa ? '💰 کیف پول (لیر)' : '💰 Wallet (TL)',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                    ),
                    Text(
                      '${appState.walletBalance.toStringAsFixed(2)} TL',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  isFa
                      ? 'شارژ کیف پول حضوری انجام می‌شود؛ موجودی برای رزرو فوری و پرداخت‌های آنی استفاده می‌شود.'
                      : 'Top up at the venue; balance pays for instant bookings.',
                  style: const TextStyle(fontSize: 9.5, color: Colors.white38, height: 1.6),
                ),
                const Divider(color: Colors.white10, height: 22),
                if (appState.walletTransactions.isEmpty)
                  Text(isFa ? 'هنوز تراکنشی ثبت نشده است.' : 'No transactions yet.', style: const TextStyle(fontSize: 11, color: Colors.white30))
                else
                  ...appState.walletTransactions.take(6).map(
                        (tx) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Icon(
                                tx.isTopup ? Icons.south_west_rounded : Icons.north_east_rounded,
                                color: tx.isTopup ? GamingTheme.accentGreen : GamingTheme.accentRed,
                                size: 16,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      tx.note.isNotEmpty ? tx.note : tx.type,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 11, color: Colors.white70),
                                    ),
                                    Text(
                                      '${tx.createdAt.isNotEmpty ? tx.createdAt.substring(0, tx.createdAt.length > 16 ? 16 : tx.createdAt.length) : ''}',
                                      style: const TextStyle(fontSize: 8.5, color: Colors.white30),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '${tx.amount > 0 ? '+' : ''}${tx.amount.toStringAsFixed(1)}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: tx.isTopup ? GamingTheme.accentGreen : GamingTheme.accentRed,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ---- سفارش‌های در انتظار پرداخت حضوری ----
          if (appState.onsiteOrders.any((o) => o.isPending)) ...[
            Text(
              isFa ? '⏳ در انتظار پرداخت حضوری' : '⏳ Pending on-site payment',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.goldAccent),
            ),
            const SizedBox(height: 8),
            ...appState.onsiteOrders.where((o) => o.isPending).map((o) => _pendingOrderCard(context, appState, o, isFa)),
            const SizedBox(height: 14),
          ],

          // ---- خروج ----
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: GamingTheme.accentRed,
                side: BorderSide(color: GamingTheme.accentRed.withValues(alpha: 0.5)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: GamingTheme.darkCardSolid,
                    title: Text(isFa ? 'خروج از حساب؟' : 'Log out?', style: const TextStyle(color: Colors.white, fontSize: 15)),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(isFa ? 'نه' : 'No')),
                      TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(isFa ? 'خروج' : 'Log out', style: const TextStyle(color: GamingTheme.accentRed))),
                    ],
                  ),
                );
                if (confirmed == true && context.mounted) {
                  await appState.logout();
                }
              },
              icon: const Icon(Icons.logout_rounded, size: 16),
              label: Text(isFa ? 'خروج از حساب کاربری' : 'Log out', style: const TextStyle(fontSize: 12)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _statChip(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 17),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 8.5, color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _buildAvatar(BuildContext context, AppState appState, bool isFa) {
    final user = appState.user;
    final avatarUrl = user.avatarUrl.isNotEmpty ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : '$kApiBaseUrl${user.avatarUrl}') : '';
    return GestureDetector(
      onTap: () => _pickAvatar(context, appState, isFa),
      child: Stack(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: GamingTheme.primary.withValues(alpha: 0.15),
            backgroundImage: avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
            child: avatarUrl.isNotEmpty
                ? null
                : Text(
                    (user.displayName.isNotEmpty ? user.displayName : user.username).substring(0, 1).toUpperCase(),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: GamingTheme.primary),
                  ),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: GamingTheme.secondary, shape: BoxShape.circle),
              child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 11),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickAvatar(BuildContext context, AppState appState, bool isFa) async {
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      if (bytes.length > 4.5 * 1024 * 1024) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(isFa ? 'تصویر خیلی بزرگ است (حداکثر ۵ مگابایت).' : 'Image too large (max 5 MB).'), backgroundColor: Colors.redAccent),
          );
        }
        return;
      }
      final error = await appState.uploadAvatar(bytes, picked.mimeType ?? 'image/jpeg');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? (isFa ? 'آواتار به‌روزرسانی شد ✨' : 'Avatar updated ✨')),
            backgroundColor: error == null ? GamingTheme.accentGreen : Colors.redAccent,
          ),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isFa ? 'انتخاب تصویر ناموفق بود.' : 'Could not pick an image.'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Widget _pendingOrderCard(BuildContext context, AppState appState, OnsiteOrder o, bool isFa) {
    final dueText = (o.dueAt ?? '').isNotEmpty ? o.dueAt!.substring(0, o.dueAt!.length > 16 ? 16 : o.dueAt!.length) : '—';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassCard(
        glow: GamingTheme.goldAccent,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('#${o.id}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: GamingTheme.goldAccent)),
                Text('${o.amount.toStringAsFixed(0)} TL', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              o.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10.5, color: Colors.white60),
            ),
            const SizedBox(height: 4),
            Text(
              isFa ? 'مهلت پرداخت: $dueText' : 'Pay by: $dueText',
              style: const TextStyle(fontSize: 9.5, color: GamingTheme.accentRed),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: GamingTheme.accentRed,
                  side: BorderSide(color: GamingTheme.accentRed.withValues(alpha: 0.4)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () async {
                  final error = await appState.cancelOnsiteOrder(o.id);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(error ?? (isFa ? 'سفارش لغو شد.' : 'Order cancelled.')),
                        backgroundColor: error == null ? GamingTheme.accentGreen : Colors.redAccent,
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.close_rounded, size: 14),
                label: Text(isFa ? 'لغو سفارش' : 'Cancel', style: const TextStyle(fontSize: 10.5)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openEditProfile(BuildContext context, AppState appState, bool isFa) {
    final nameC = TextEditingController(text: appState.user.displayName);
    final tagC = TextEditingController(text: appState.user.gamerTag);
    final cityC = TextEditingController(text: appState.user.city);
    final bioC = TextEditingController(text: appState.user.bio);
    final emailC = TextEditingController(text: appState.user.email);
    final birthC = TextEditingController(text: appState.user.birthDate);

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: GamingTheme.darkCardSolid,
        title: Text(isFa ? 'ویرایش پروفایل' : 'Edit profile', style: const TextStyle(color: Colors.white, fontSize: 15)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _profileField(nameC, isFa ? 'نام نمایشی' : 'Display name'),
              _profileField(tagC, isFa ? 'گیمرتگ' : 'Gamer tag'),
              _profileField(cityC, isFa ? 'شهر' : 'City'),
              _profileField(emailC, isFa ? 'ایمیل' : 'Email'),
              _profileField(birthC, isFa ? 'تاریخ تولد (YYYY-MM-DD)' : 'Birth date (YYYY-MM-DD)'),
              _profileField(bioC, isFa ? 'دربارهٔ من' : 'Bio', maxLines: 3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(isFa ? 'انصراف' : 'Cancel')),
          TextButton(
            onPressed: () async {
              final error = await appState.updateProfile({
                'displayName': nameC.text.trim(),
                'gamerTag': tagC.text.trim(),
                'city': cityC.text.trim(),
                'bio': bioC.text.trim(),
                'email': emailC.text.trim(),
                'birthDate': birthC.text.trim(),
              });
              if (ctx.mounted) {
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(error ?? (isFa ? 'پروفایل ذخیره شد ✨' : 'Profile saved ✨')),
                    backgroundColor: error == null ? GamingTheme.accentGreen : Colors.redAccent,
                  ),
                );
              }
            },
            child: Text(isFa ? 'ذخیره' : 'Save', style: const TextStyle(color: GamingTheme.primary)),
          ),
        ],
      ),
    );
  }

  Widget _profileField(TextEditingController controller, String label, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        style: const TextStyle(color: Colors.white, fontSize: 12.5),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: Colors.white54, fontSize: 11),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.white12),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.6)),
          ),
        ),
      ),
    );
  }

  void _openChangePassword(BuildContext context, AppState appState, bool isFa) {
    final oldC = TextEditingController();
    final newC = TextEditingController();
    final confirmC = TextEditingController();
    final needsOld = appState.user.hasPassword;

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: GamingTheme.darkCardSolid,
        title: Text(isFa ? 'تغییر رمز عبور' : 'Change password', style: const TextStyle(color: Colors.white, fontSize: 15)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (needsOld) _profileField(oldC, isFa ? 'رمز فعلی' : 'Current password'),
            _profileField(newC, isFa ? 'رمز جدید (حداقل ۶ کاراکتر)' : 'New password (min 6 chars)'),
            _profileField(confirmC, isFa ? 'تکرار رمز جدید' : 'Repeat new password'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(isFa ? 'انصراف' : 'Cancel')),
          TextButton(
            onPressed: () async {
              if (newC.text.length < 6 || newC.text != confirmC.text) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  SnackBar(
                    content: Text(isFa ? 'رمزها یکسان و حداقل ۶ کاراکتر باشند.' : 'Passwords must match (min 6 chars).'),
                    backgroundColor: Colors.redAccent,
                  ),
                );
                return;
              }
              final error = await appState.changePassword(newPassword: newC.text, oldPassword: needsOld ? oldC.text : null);
              if (ctx.mounted) {
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(error ?? (isFa ? 'رمز عبور تغییر کرد ✨' : 'Password changed ✨')),
                    backgroundColor: error == null ? GamingTheme.accentGreen : Colors.redAccent,
                  ),
                );
              }
            },
            child: Text(isFa ? 'ذخیره' : 'Save', style: const TextStyle(color: GamingTheme.primary)),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// تب سفارش‌ها — رزروها، سفارش‌های کافه/فروشگاه، وضعیت حضوری
// ============================================================
class _OrdersTab extends StatelessWidget {
  const _OrdersTab();

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    Widget empty(String msg) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 30),
          child: Center(child: Text(msg, style: const TextStyle(color: Colors.white30, fontSize: 11.5))),
        );

    return RefreshIndicator(
      color: GamingTheme.primary,
      onRefresh: () => appState.fetchAccountData(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(isFa ? '🖥️ رزروهای من' : '🖥️ My bookings', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
          const SizedBox(height: 8),
          if (appState.myReservations.isEmpty)
            empty(isFa ? 'هنوز رزروی ندارید.' : 'No bookings yet.')
          else
            ...appState.myReservations.map(
              (r) => GlassCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(r.checkedIn ? Icons.play_circle_fill : Icons.schedule_rounded, color: r.checkedIn ? GamingTheme.accentGreen : GamingTheme.goldAccent, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r.systemName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text(
                            '${r.date} · ${r.startTime}–${r.endTime}',
                            style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    Text('${r.totalPrice.toStringAsFixed(0)} TL', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: GamingTheme.primary)),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          Text(isFa ? '🧾 سفارش‌های کافه و فروشگاه' : '🧾 Cafe & shop orders', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.secondary)),
          const SizedBox(height: 8),
          if (appState.myOrders.isEmpty)
            empty(isFa ? 'هنوز سفارشی ندارید.' : 'No orders yet.')
          else
            ...appState.myOrders.map(
              (o) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassCard(
                  glow: o.kind == 'cafe' ? GamingTheme.goldAccent : GamingTheme.secondary,
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(o.kind == 'cafe' ? Icons.local_cafe_rounded : Icons.shopping_bag_rounded, color: o.kind == 'cafe' ? GamingTheme.goldAccent : GamingTheme.secondary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              o.itemsSummary.isNotEmpty ? o.itemsSummary : '#${o.id}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, color: Colors.white70),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '#${o.id} · ${o.status}',
                              style: const TextStyle(fontSize: 9, color: Colors.white38),
                            ),
                          ],
                        ),
                      ),
                      Text('${o.finalAmount.toStringAsFixed(0)} TL', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 16),
          if (appState.onsiteOrders.isNotEmpty) ...[
            Text(isFa ? '📋 وضعیت پرداخت سفارش‌ها' : '📋 Payment status', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.goldAccent)),
            const SizedBox(height: 8),
            ...appState.onsiteOrders.map(
              (o) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Icon(
                      o.isPending
                          ? Icons.hourglass_top_rounded
                          : o.status == 'settled'
                              ? Icons.check_circle_rounded
                              : Icons.cancel_rounded,
                      color: o.isPending
                          ? GamingTheme.goldAccent
                          : o.status == 'settled'
                              ? GamingTheme.accentGreen
                              : Colors.white30,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '#${o.id} · ${o.description}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10.5, color: Colors.white60),
                      ),
                    ),
                    Text(
                      '${o.amount.toStringAsFixed(0)} TL',
                      style: const TextStyle(fontSize: 10.5, color: Colors.white54),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ============================================================
// تب تیکت‌ها — پشتیبانی کامل
// ============================================================
class _TicketsTab extends StatelessWidget {
  const _TicketsTab();

  String _statusLabel(String status, bool isFa) {
    switch (status) {
      case 'open':
        return isFa ? 'باز' : 'Open';
      case 'answered':
        return isFa ? 'پاسخ داده شده' : 'Answered';
      case 'customer_reply':
        return isFa ? 'در انتظار پشتیبانی' : 'Awaiting staff';
      default:
        return isFa ? 'بسته' : 'Closed';
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'open':
        return GamingTheme.goldAccent;
      case 'answered':
        return GamingTheme.accentGreen;
      case 'customer_reply':
        return GamingTheme.primary;
      default:
        return Colors.white38;
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: GamingTheme.secondary,
        foregroundColor: Colors.white,
        onPressed: () => _openNewTicket(context, appState, isFa),
        icon: const Icon(Icons.add_rounded, size: 18),
        label: Text(isFa ? 'تیکت جدید' : 'New ticket', style: const TextStyle(fontSize: 11.5)),
      ),
      body: RefreshIndicator(
        color: GamingTheme.primary,
        onRefresh: () => appState.fetchTickets(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (appState.tickets.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 30),
                child: Center(
                  child: Text(
                    isFa ? 'تیکتی ندارید. برای هر مشکل یا پیشنهادی، تیکت جدید بسازید.' : 'No tickets yet. Create one for any issue or idea.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white30, fontSize: 11.5),
                  ),
                ),
              )
            else
              ...appState.tickets.map(
                (t) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: GlassCard(
                    glow: t.hasNewReply ? GamingTheme.accentGreen : GamingTheme.primary,
                    padding: const EdgeInsets.all(12),
                    onTap: () => _openTicketDetail(context, appState, t.id, isFa),
                    child: Row(
                      children: [
                        Icon(
                          t.status == 'closed' ? Icons.lock_outline_rounded : Icons.support_agent_rounded,
                          color: _statusColor(t.status),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  if (t.hasNewReply) ...[
                                    const Icon(Icons.mark_chat_unread_rounded, color: GamingTheme.accentGreen, size: 13),
                                    const SizedBox(width: 4),
                                  ],
                                  Flexible(
                                    child: Text(
                                      t.subject,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '#${t.id} · ${_statusLabel(t.status, isFa)} · ${t.createdAt.isNotEmpty ? t.createdAt.substring(0, 10) : ''}',
                                style: const TextStyle(fontSize: 9, color: Colors.white38),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_left_rounded, color: Colors.white30, size: 18),
                      ],
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  void _openNewTicket(BuildContext context, AppState appState, bool isFa) {
    final subjectC = TextEditingController();
    final messageC = TextEditingController();
    String category = 'general';
    String priority = 'normal';

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialog) => AlertDialog(
          backgroundColor: GamingTheme.darkCardSolid,
          title: Text(isFa ? 'تیکت جدید' : 'New ticket', style: const TextStyle(color: Colors.white, fontSize: 15)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: subjectC,
                  style: const TextStyle(color: Colors.white, fontSize: 12.5),
                  decoration: InputDecoration(
                    labelText: isFa ? 'موضوع' : 'Subject',
                    labelStyle: const TextStyle(color: Colors.white54, fontSize: 11),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white12)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.6))),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: messageC,
                  maxLines: 4,
                  style: const TextStyle(color: Colors.white, fontSize: 12.5),
                  decoration: InputDecoration(
                    labelText: isFa ? 'توضیحات' : 'Message',
                    labelStyle: const TextStyle(color: Colors.white54, fontSize: 11),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white12)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.6))),
                  ),
                ),
                const SizedBox(height: 12),
                Text(isFa ? 'دسته:' : 'Category:', style: const TextStyle(color: Colors.white54, fontSize: 10.5)),
                Wrap(
                  spacing: 6,
                  children: [
                    for (final c in [
                      ('general', isFa ? 'عمومی' : 'General'),
                      ('technical', isFa ? 'فنی' : 'Technical'),
                      ('billing', isFa ? 'مالی' : 'Billing'),
                      ('suggestion', isFa ? 'پیشنهاد' : 'Idea'),
                    ])
                      ChoiceChip(
                        label: Text(c.$2, style: const TextStyle(fontSize: 10)),
                        selected: category == c.$1,
                        selectedColor: GamingTheme.primary,
                        backgroundColor: Colors.white.withValues(alpha: 0.05),
                        labelStyle: TextStyle(color: category == c.$1 ? Colors.black : Colors.white70, fontSize: 10),
                        onSelected: (v) {
                          if (v) setDialog(() => category = c.$1);
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(isFa ? 'اولویت:' : 'Priority:', style: const TextStyle(color: Colors.white54, fontSize: 10.5)),
                Wrap(
                  spacing: 6,
                  children: [
                    for (final p in [
                      ('low', isFa ? 'کم' : 'Low'),
                      ('normal', isFa ? 'معمولی' : 'Normal'),
                      ('high', isFa ? 'فوری' : 'High'),
                    ])
                      ChoiceChip(
                        label: Text(p.$2, style: const TextStyle(fontSize: 10)),
                        selected: priority == p.$1,
                        selectedColor: GamingTheme.secondary,
                        backgroundColor: Colors.white.withValues(alpha: 0.05),
                        labelStyle: TextStyle(color: priority == p.$1 ? Colors.black : Colors.white70, fontSize: 10),
                        onSelected: (v) {
                          if (v) setDialog(() => priority = p.$1);
                        },
                      ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(isFa ? 'انصراف' : 'Cancel')),
            TextButton(
              onPressed: () async {
                final error = await appState.createTicket(
                  subject: subjectC.text.trim(),
                  message: messageC.text.trim(),
                  category: category,
                  priority: priority,
                );
                if (ctx.mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(error ?? (isFa ? 'تیکت ثبت شد؛ پشتیبانی به‌زودی پاسخ می‌دهد.' : 'Ticket created; support will reply soon.')),
                      backgroundColor: error == null ? GamingTheme.accentGreen : Colors.redAccent,
                    ),
                  );
                }
              },
              child: Text(isFa ? 'ارسال' : 'Send', style: const TextStyle(color: GamingTheme.primary)),
            ),
          ],
        ),
      ),
    );
  }

  void _openTicketDetail(BuildContext context, AppState appState, String ticketId, bool isFa) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _TicketDetailScreen(ticketId: ticketId, isFa: isFa),
      ),
    );
  }
}

class _TicketDetailScreen extends StatefulWidget {
  final String ticketId;
  final bool isFa;
  const _TicketDetailScreen({required this.ticketId, required this.isFa});

  @override
  State<_TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<_TicketDetailScreen> {
  List<TicketMessage> _messages = [];
  bool _loading = true;
  final TextEditingController _replyC = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _replyC.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final appState = Provider.of<AppState>(context, listen: false);
    final msgs = await appState.fetchTicketMessages(widget.ticketId);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final ticket = appState.tickets.where((t) => t.id == widget.ticketId).toList();
    final isClosed = ticket.isNotEmpty && ticket.first.status == 'closed';

    return Scaffold(
      backgroundColor: GamingTheme.darkBg,
      appBar: AppBar(
        backgroundColor: GamingTheme.darkCardSolid.withValues(alpha: 0.6),
        title: Text(
          '${widget.isFa ? 'تیکت' : 'Ticket'} #${widget.ticketId}',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
        actions: [
          if (!isClosed)
            IconButton(
              icon: const Icon(Icons.check_circle_outline, size: 20),
              tooltip: widget.isFa ? 'بستن تیکت' : 'Close ticket',
              onPressed: () async {
                final error = await appState.closeTicket(widget.ticketId);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(error ?? (widget.isFa ? 'تیکت بسته شد.' : 'Ticket closed.')),
                      backgroundColor: error == null ? GamingTheme.accentGreen : Colors.redAccent,
                    ),
                  );
                }
              },
            ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: GamingTheme.bgGradient),
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: GamingTheme.primary))
            : Column(
                children: [
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final m = _messages[index];
                        final isStaff = m.isStaff;
                        return Align(
                          alignment: isStaff ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                            margin: const EdgeInsets.symmetric(vertical: 5),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isStaff ? GamingTheme.primary.withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.04),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: isStaff ? GamingTheme.primary.withValues(alpha: 0.4) : Colors.white12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isStaff ? (widget.isFa ? 'پشتیبانی بازینو' : 'BAZINO Support') : (widget.isFa ? 'شما' : 'You'),
                                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: isStaff ? GamingTheme.primary : GamingTheme.secondary),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  m.body,
                                  style: const TextStyle(fontSize: 12.5, color: Colors.white, height: 1.6),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  if (!isClosed)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _replyC,
                              style: const TextStyle(color: Colors.white, fontSize: 12.5),
                              decoration: InputDecoration(
                                hintText: widget.isFa ? 'پاسخ خود را بنویسید…' : 'Write your reply…',
                                hintStyle: const TextStyle(color: Colors.white30, fontSize: 11),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white12)),
                                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.6)))),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () async {
                              final text = _replyC.text.trim();
                              if (text.isEmpty) return;
                              final error = await appState.replyTicket(widget.ticketId, text);
                              if (error == null) {
                                _replyC.clear();
                                await _load();
                              } else if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error), backgroundColor: Colors.redAccent),
                                );
                              }
                            },
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: GamingTheme.ctaGradient,
                              ),
                              child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}
