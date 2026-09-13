import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/auth_controller.dart';
import '../core/api_client.dart';
import '../core/l10n.dart';
import '../sections/affiliates_messaging_section.dart';
import '../sections/app_mobile_section.dart';
import '../sections/blog_promotions_section.dart';
import '../sections/content_chat_section.dart';
import '../sections/customization_section.dart';
import '../sections/dashboard_section.dart';
import '../sections/jarvis_section.dart';
import '../sections/misc_sections.dart';
import '../sections/orders_section.dart';
import '../sections/systems_section.dart';
import '../sections/themes_section.dart';
import '../sections/tickets_section.dart';
import '../sections/tournaments_section.dart';
import '../sections/wallet_section.dart';

class AdminSection {
  const AdminSection(this.id, this.labelKey, this.icon, this.builder);
  final String id;
  final String labelKey;
  final IconData icon;
  final WidgetBuilder builder;
}

/// همهٔ بخش‌های پنل ادمین که در اپ موجودند (معادل پنل وب).
///
/// ⚠️ بخش‌های امنیتی عمداً حذف شده‌اند (دستور ۲۰۲۶-۰۹-۱۲):
///   - apiKeys (کلیدهای API/توکن‌های دسترسی baz_)
///   - پیکربندی کلیدهای AI جارویس (jarvis-ai-providers)
///   - سکرت‌های کانال‌های پیام‌رسانی (messaging/config)
///   - Web Sync shared secret (sync-settings)
/// این‌ها فقط از پنل وب مدیریت می‌شوند.
final List<AdminSection> kAdminSections = [
  AdminSection('dashboard', 'dashboard', Icons.dashboard_outlined, _b(DashboardSection())),
  AdminSection('jarvis', 'jarvis', Icons.smart_toy_outlined, _b(JarvisSection())),
  AdminSection('systems', 'systems', Icons.computer_outlined, _b(SystemsSection())),
  AdminSection('cafe', 'cafe', Icons.coffee_outlined, _b(CafeSection())),
  AdminSection('shop', 'shop', Icons.shopping_bag_outlined, _b(ShopSection())),
  AdminSection('tournaments', 'tournaments', Icons.emoji_events_outlined, _b(TournamentsSection())),
  AdminSection('tournamentOps', 'tournamentOps', Icons.military_tech_outlined, _b(TournamentOpsSection())),
  AdminSection('blog', 'blog', Icons.article_outlined, _b(BlogSection())),
  AdminSection('promotions', 'promotions', Icons.local_offer_outlined, _b(PromotionsSection())),
  AdminSection('content', 'contentOps', Icons.auto_awesome_outlined, _b(ContentSection())),
  AdminSection('chat', 'chatRooms', Icons.forum_outlined, _b(ChatSection())),
  AdminSection('migrations', 'database', Icons.storage_outlined, _b(MigrationsSection())),
  AdminSection('messages', 'messages', Icons.mail_outlined, _b(MessagesSection())),
  AdminSection('themes', 'themes', Icons.palette_outlined, _b(ThemesSection())),
  AdminSection('appSlider', 'appSlider', Icons.view_carousel_outlined, _b(AppSliderSection())),
  AdminSection('mobileApp', 'mobileApp', Icons.smartphone_outlined, _b(MobileAppSection())),
  AdminSection('customization', 'customization', Icons.tune_outlined, _b(CustomizationSection())),
  AdminSection('dbLogs', 'dbLogs', Icons.terminal_outlined, _b(DbLogsSection())),
  AdminSection('presentation', 'presentation', Icons.slideshow_outlined, _b(PresentationSection())),
  AdminSection('tickets', 'tickets', Icons.support_agent_outlined, _b(TicketsSection())),
  AdminSection('wallet', 'wallet', Icons.account_balance_wallet_outlined, _b(WalletSection())),
  AdminSection('affiliates', 'affiliates', Icons.handshake_outlined, _b(AffiliatesSection())),
  AdminSection('messaging', 'messaging', Icons.campaign_outlined, _b(MessagingSection())),
];

Widget Function(BuildContext) _b(Widget w) => (_) => w;

/// پوستهٔ اصلی بعد از ورود: کشوی بخش‌ها + محتوای جاری
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    final auth = context.watch<AuthController>();
    final section = kAdminSections[_index];
    final wide = MediaQuery.of(context).size.width > 840;

    final sectionList = ListView(
      children: [
        DrawerHeader(
          decoration: const BoxDecoration(color: Color(0xFF111726)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              const Text('B', style: TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Color(0xFFFFB800))),
              const SizedBox(height: 6),
              Text(lang.t('appName'), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 4),
              Text(
                '${lang.t('signedInAs')}: ${auth.username ?? ''}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w700),
              ),
              Text(
                auth.serverUrl.replaceFirst(RegExp(r'^https?://'), ''),
                style: TextStyle(fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        for (var i = 0; i < kAdminSections.length; i++)
          ListTile(
            leading: Icon(
              kAdminSections[i].icon,
              size: 20,
              color: i == _index ? const Color(0xFFFFB800) : Colors.grey.shade500,
            ),
            title: Text(
              lang.t(kAdminSections[i].labelKey),
              style: TextStyle(
                fontSize: 13,
                fontWeight: i == _index ? FontWeight.w900 : FontWeight.w700,
                color: i == _index ? const Color(0xFFFFB800) : Colors.grey.shade300,
              ),
            ),
            selected: i == _index,
            selectedTileColor: const Color(0xFFFFB800).withValues(alpha: 0.08),
            onTap: () {
              setState(() => _index = i);
              if (!wide) Navigator.pop(context);
            },
          ),
      ],
    );

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0E17),
        surfaceTintColor: Colors.transparent,
        title: Text(
          lang.t(section.labelKey),
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
        ),
        actions: [
          IconButton(
            tooltip: lang.t('language'),
            onPressed: lang.toggle,
            icon: Text(lang.isFa ? 'EN' : 'فا', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
          ),
          IconButton(
            tooltip: lang.t('logout'),
            onPressed: () => _logout(context),
            icon: const Icon(Icons.logout_outlined, size: 20),
          ),
        ],
      ),
      drawer: wide ? null : Drawer(backgroundColor: const Color(0xFF0A0E17), child: sectionList),
      body: Row(
        children: [
          if (wide)
            SizedBox(
              width: 250,
              child: Drawer(backgroundColor: const Color(0xFF0A0E17), child: sectionList),
            ),
          Expanded(child: section.builder(context)),
        ],
      ),
    );
  }

  Future<void> _logout(BuildContext context) async {
    final lang = context.read<AppLang>();
    final ok = await showConfirmDialog(context, lang);
    if (ok) {
      AuthController.instance.logout();
    }
  }
}

Future<bool> showConfirmDialog(BuildContext context, AppLang lang) async {
  final res = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF151C2E),
      title: Text(lang.t('logoutConfirm'), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(lang.t('cancel'))),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700, foregroundColor: Colors.white),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(lang.t('logout')),
        ),
      ],
    ),
  );
  return res ?? false;
}

/// آدرس سرور فعال (برای بخش پرزنتیشن)
String currentServerUrl() => ApiClient.baseUrl;
