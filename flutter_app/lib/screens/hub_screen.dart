import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models.dart';
import 'account_screen.dart';
import 'reservation_screen.dart';
import 'cafe_screen.dart';
import 'shop_screen.dart';
import 'tournament_screen.dart';
import 'chat_screen.dart';
import 'blog_screen.dart';
import 'messages_screen.dart';
import 'jarvis_assistant.dart';

class HubScreen extends StatefulWidget {
  const HubScreen({super.key});

  @override
  State<HubScreen> createState() => _HubScreenState();
}

class _HubScreenState extends State<HubScreen> {
  int _currentIndex = 0;
  late PageController _pageController;
  Timer? _sliderTimer;
  int _sliderCurrentPage = 0;

  // ---- اعلان‌های زندهٔ درون‌برنامه‌ای (فاز ۳) ----
  int _lastSeenNotifVersion = 0;
  AppState? _observedAppState;

  void _onAppStateChanged() {
    final appState = _observedAppState;
    if (appState == null || !mounted) return;
    if (appState.inAppNotifVersion > _lastSeenNotifVersion) {
      _lastSeenNotifVersion = appState.inAppNotifVersion;
      final latest = appState.unseenInAppNotifications.isNotEmpty ? appState.unseenInAppNotifications.first : '';
      if (latest.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(latest, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            backgroundColor: GamingTheme.darkCardSolid.withValues(alpha: 0.95),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
      }
      appState.markInAppNotificationsSeen();
    }
  }

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _startSliderTimer();

    // Fetch sliders on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final appState = Provider.of<AppState>(context, listen: false);
      appState.fetchSliders();
      _observedAppState = appState;
      _lastSeenNotifVersion = appState.inAppNotifVersion;
      appState.addListener(_onAppStateChanged);
    });
  }

  @override
  void deactivate() {
    _observedAppState?.removeListener(_onAppStateChanged);
    super.deactivate();
  }

  void _startSliderTimer() {
    _sliderTimer?.cancel();
    _sliderTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!mounted) return;
      final appState = Provider.of<AppState>(context, listen: false);
      final slideCount = appState.appSliders.length;
      if (slideCount > 0 && _currentIndex == 0) {
        _sliderCurrentPage = (_sliderCurrentPage + 1) % slideCount;
        if (_pageController.hasClients) {
          _pageController.animateToPage(
            _sliderCurrentPage,
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeInOutCubic,
          );
        }
      }
    });
  }

  @override
  void dispose() {
    _sliderTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _navigateToSection(String target) {
    setState(() {
      if (target == 'reserve') {
        _currentIndex = 1;
      } else if (target == 'cafe') {
        _currentIndex = 2;
      } else if (target == 'shop') {
        _currentIndex = 3;
      } else if (target == 'tournaments') {
        _currentIndex = 4;
      } else if (target == 'loyalty') {
        _currentIndex = 5;
      } else if (target == 'messages') {
        _currentIndex = 6;
      } else if (target == 'chat') {
        _currentIndex = 7;
      } else if (target == 'blog') {
        _currentIndex = 8;
      } else {
        _currentIndex = 0;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    // List of screens to show as body
    // Index 0: Home (Console Hub — بازتاب قالب هاب سایت)
    // Index 1: Reserves
    // Index 2: Cafe
    // Index 3: Shop
    // Index 4: Tournament/Arena
    // Index 5: Account (profile/wallet/orders/tickets + Loyalty); 6-8 utility.
    final List<Widget> screens = [
      _buildHomeHub(appState),
      const ReservationScreen(),
      const CafeScreen(),
      const ShopScreen(),
      const TournamentScreen(),
      const AccountScreen(),
      const MessagesScreen(),
      const ChatScreen(),
      const BlogScreen(),
    ];

    return Scaffold(
      backgroundColor: GamingTheme.darkBg,
      extendBodyBehindAppBar: false,
      appBar: _buildHeader(appState),
      body: Container(
        decoration: const BoxDecoration(gradient: GamingTheme.bgGradient),
        child: SafeArea(
          child: screens[_currentIndex],
        ),
      ),
      floatingActionButton: _buildJarvisFAB(context, appState),
      bottomNavigationBar: _buildBottomNavigationBar(isFa),
    );
  }

  /// تب هایلایت‌شدهٔ نوار پایین (برعکسِ نگاشت _onNavTap). تورنمنت و بخش‌های
  /// ابزاری که از هاب/جارویس باز می‌شوند تب نوار پایین را روشن نمی‌کنند
  /// مگر خانه؛ باشگاه (۵) همان تب پروفایل (۴) است.
  int get _navHighlight {
    switch (_currentIndex) {
      case 5:
        return 4; // باشگاه/پروفایل
      case 1:
      case 2:
      case 3:
        return _currentIndex;
      default:
        return 0; // خانه + تورنمنت + بخش‌های ابزاری
    }
  }

  /// نگاشت تب نوار پایین به اندیس صفحه. تب «کلوپ/پروفایل» صفحهٔ باشگاه
  /// (اندیس ۵) را باز می‌کند — قبلاً اشتباهاً تورنمنت (اندیس ۴) باز می‌شد.
  void _onNavTap(int navIndex) {
    const screenByNav = [0, 1, 2, 3, 5];
    setState(() {
      _currentIndex = screenByNav[navIndex];
    });
  }

  // Beautiful Header / App Bar
  PreferredSizeWidget _buildHeader(AppState appState) {
    final isFa = appState.language == 'fa';
    return AppBar(
      backgroundColor: GamingTheme.darkCardSolid.withValues(alpha: 0.55),
      elevation: 0,
      flexibleSpace: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(color: Colors.transparent),
        ),
      ),
      centerTitle: true,
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.gamepad, color: GamingTheme.primary, size: 24),
          const SizedBox(width: 8),
          Text(
            isFa ? 'بازینو' : 'BAZINO',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ),
      // منوی زبان چهارگانه (فاز ۵.۲ — سایت ۴ زبان دارد؛ جارویس و TTS هم ru/tr را پشتیبانی می‌کنند)
      leading: PopupMenuButton<String>(
        tooltip: isFa ? 'زبان' : 'Language',
        position: PopupMenuPosition.under,
        color: GamingTheme.darkCardSolid,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.3)),
        ),
        onSelected: (lang) => appState.setLanguage(lang),
        itemBuilder: (_) => [
          for (final l in [
            ('fa', 'فارسی'),
            ('en', 'English'),
            ('ru', 'Русский'),
            ('tr', 'Türkçe'),
          ])
            PopupMenuItem<String>(
              value: l.$1,
              child: Row(
                children: [
                  Icon(
                    appState.language == l.$1 ? Icons.check_circle : Icons.circle_outlined,
                    color: appState.language == l.$1 ? GamingTheme.primary : Colors.white24,
                    size: 15,
                  ),
                  const SizedBox(width: 8),
                  Text(l.$2, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
        ],
        child: Container(
          margin: const EdgeInsets.all(4),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          decoration: BoxDecoration(
            color: GamingTheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.3)),
          ),
          child: FittedBox(
            // FittedBox تضمین می‌کند برچسب زبان در عرض محدودِ AppBar.leading
            // هرگز RenderFlex overflow ندهد (باهم‌فشردگی به‌جای کرش در تست/نما).
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.language_rounded, color: GamingTheme.primary, size: 13),
                const SizedBox(width: 3),
                Text(
                  appState.language.toUpperCase(),
                  style: const TextStyle(
                    color: GamingTheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        // Star points badge
        Container(
          margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: GamingTheme.goldAccent.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: GamingTheme.goldAccent.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.stars, color: GamingTheme.goldAccent, size: 14),
              const SizedBox(width: 4),
              Text(
                '${appState.user.loyaltyPoints} ${isFa ? 'امتیاز' : 'PTS'}',
                style: const TextStyle(
                  color: GamingTheme.goldAccent,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        // Messages inbox button
        IconButton(
          icon: Stack(
            children: [
              const Icon(Icons.mail_outline, color: Colors.white, size: 22),
              if (appState.messages.any((m) => !m.isRead))
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: GamingTheme.accentRed,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => Scaffold(
                  appBar: AppBar(
                    title: Text(isFa ? 'صندوق پیام و اعلان‌ها' : 'Inbox & Notifications'),
                  ),
                  body: const MessagesScreen(),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  // ============================================================
  // HOME TAB — بازتاب موبایلی «قالب هاب» سایت بازینو
  // (مرجع: src/components/HubLayout.tsx + ConsoleHubView.tsx سایت —
  //  HUD گیمینگ شبیه لانچرهای Steam/Epic). مثل سایت، صفحهٔ خانه بدون
  // اسکرول است: اسلایدر داینامیک سرور (فشرده) + ردیف ابزار + هاب مداری
  // با ارب مرکزی جارویس و پنج دکمهٔ شیشه‌ای نئونی بخش‌ها.
  // ============================================================
  Widget _buildHomeHub(AppState appState) {
    final isFa = appState.language == 'fa';
    return Column(
      children: [
        // اسلایدر داینامیک سرور — فشرده تا جا برای هاب مداری باز بماند
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.26,
          child: _buildSliderCard(appState),
        ),
        const SizedBox(height: 10),
        // ردیف ابزار: چت / بلاگ / پیام‌ها
        _buildUtilityRow(isFa),
        const SizedBox(height: 4),
        // هاب مداری — ارب مرکزی جارویس + پنج دکمهٔ بخش
        Expanded(child: _buildRadialHub(isFa)),
      ],
    );
  }

  // کارت اسلایدر — تصاویر داینامیک از سرور (API_SLIDERS)، همان رفتار قبلی
  // با اندازهٔ فشرده‌تر. قاب جایگزین وقتی اسلایدری نیست تا چیدمان نپرد.
  Widget _buildSliderCard(AppState appState) {
    final sliders = appState.appSliders;

    if (appState.isLoadingSliders) {
      return const Center(
        child: CircularProgressIndicator(color: GamingTheme.primary),
      );
    }

    if (sliders.isEmpty) {
      return Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.2)),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.gamepad, color: GamingTheme.primary, size: 34),
              SizedBox(height: 8),
              Text(
                'BAZINO',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 4,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: GamingTheme.primary.withValues(alpha: 0.05),
            blurRadius: 30,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              onPageChanged: (page) {
                setState(() {
                  _sliderCurrentPage = page;
                });
              },
              itemCount: sliders.length,
              itemBuilder: (context, index) {
                final slide = sliders[index];
                return GestureDetector(
                  onTap: () => _navigateToSection(slide.target),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        slide.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.black54,
                            child: const Center(
                              child: Icon(Icons.image_not_supported, color: Colors.white24, size: 40),
                            ),
                          );
                        },
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return const Center(
                            child: CircularProgressIndicator(color: GamingTheme.primary),
                          );
                        },
                      ),
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.black,
                              Colors.transparent,
                              Colors.transparent,
                              Colors.black87,
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            stops: [0.0, 0.3, 0.6, 1.0],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 18,
                        left: 16,
                        right: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: GamingTheme.primary.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.5)),
                              ),
                              child: Text(
                                slide.target.toUpperCase(),
                                style: const TextStyle(
                                  color: GamingTheme.primary,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              slide.titleFor(appState.language),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                height: 1.35,
                                shadows: [
                                  Shadow(color: Colors.black, blurRadius: 10, offset: Offset(0, 2)),
                                ],
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
            Positioned(
              bottom: 8,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  sliders.length,
                  (index) => Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _sliderCurrentPage == index ? 14 : 5,
                    height: 5,
                    decoration: BoxDecoration(
                      color: _sliderCurrentPage == index
                          ? GamingTheme.primary
                          : Colors.white.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ردیف ابزار — جایگزین دکمه‌های حبابی قبلی؛ چت و بلاگ به‌صورت صفحهٔ
  // جدا باز می‌شوند (مثل قبل) و پیام‌ها به‌صورت بخش داخلی.
  Widget _buildUtilityRow(bool isFa) {
    Widget pill(String title, IconData icon, Color color, VoidCallback onTap) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 14),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          pill(
            isFa ? 'اتاق گفتگو' : 'CHAT',
            Icons.chat_bubble_outline,
            GamingTheme.primary,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => Scaffold(
                  appBar: AppBar(title: Text(isFa ? 'تالار گفتگو' : 'Lobby Chats')),
                  body: const ChatScreen(),
                ),
              ),
            ),
          ),
          pill(
            isFa ? 'بلاگ' : 'BLOG',
            Icons.newspaper_outlined,
            GamingTheme.secondary,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => Scaffold(
                  appBar: AppBar(title: Text(isFa ? 'بلاگ بازینو' : 'Bazino Blog')),
                  body: const BlogScreen(),
                ),
              ),
            ),
          ),
          pill(
            isFa ? 'پیام‌ها' : 'MSGS',
            Icons.mail_outline,
            GamingTheme.goldAccent,
            () => _navigateToSection('messages'),
          ),
        ],
      ),
    );
  }

  // هاب مداری — قلب قالب: ارب مرکزی جارویس (بنفش نئون، مثل HubLayout سایت)
  // و پنج دکمهٔ بخش روی دایره به فاصلهٔ مساوی، هرکدام با رنگ نئونی اختصاصی.
  Widget _buildRadialHub(bool isFa) {
    final sections = <({IconData icon, String fa, String en, Color color, String target})>[
      (icon: Icons.monitor, fa: 'رزرو', en: 'RESERVE', color: GamingTheme.primary, target: 'reserve'),
      (icon: Icons.local_cafe, fa: 'کافه', en: 'CAFE', color: GamingTheme.goldAccent, target: 'cafe'),
      (icon: Icons.shopping_bag, fa: 'فروشگاه', en: 'SHOP', color: GamingTheme.primary, target: 'shop'),
      (icon: Icons.emoji_events, fa: 'مسابقات', en: 'ARENA', color: GamingTheme.secondary, target: 'tournaments'),
      (icon: Icons.workspace_premium, fa: 'باشگاه', en: 'CLUB', color: GamingTheme.goldAccent, target: 'loyalty'),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final h = constraints.maxHeight;
        final center = Offset(w / 2, h / 2);
        final btnSize = (w * 0.185).clamp(52.0, 70.0);
        final btnTotal = btnSize + 24; // عرض کل HubOrbButton با برچسب
        final radius = math.max(math.min(w, h) / 2 - btnTotal / 2 - 6, btnTotal * 0.85);
        final orbSize = (w * 0.25).clamp(84.0, 110.0);
        return Stack(
          children: [
            // ذرات نئونی پس‌زمینه — همان حس particle قالب هاب سایت
            const Positioned.fill(
              child: CustomPaint(painter: HubParticlesPainter(seed: 7)),
            ),
            // ارب مرکزی: دروازهٔ جارویس
            Positioned(
              left: center.dx - orbSize / 2,
              top: center.dy - orbSize / 2,
              child: _buildCentralOrb(orbSize),
            ),
            // پنج دکمهٔ مداری
            for (var i = 0; i < sections.length; i++)
              Positioned(
                left: center.dx +
                    radius * math.cos(-math.pi / 2 + i * 2 * math.pi / sections.length) -
                    btnTotal / 2,
                top: center.dy +
                    radius * math.sin(-math.pi / 2 + i * 2 * math.pi / sections.length) -
                    btnTotal / 2,
                child: HubOrbButton(
                  size: btnSize,
                  color: sections[i].color,
                  icon: sections[i].icon,
                  label: isFa ? sections[i].fa : sections[i].en,
                  onTap: () => _navigateToSection(sections[i].target),
                ),
              ),
          ],
        );
      },
    );
  }

  // ارب مرکزی هاب — در قالب هاب سایت این ارب نماد برند است؛ اینجا دروازهٔ
  // گفتگو با جارویس است (لمس = باز شدن دستیار گفتگومحور).
  Widget _buildCentralOrb(double size) {
    return GestureDetector(
      onTap: _openJarvis,
      child: SizedBox(
        width: size,
        height: size + 20,
        child: Column(
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    GamingTheme.secondary.withValues(alpha: 0.35),
                    Colors.transparent,
                  ],
                  radius: 0.95,
                ),
                border: Border.all(color: GamingTheme.secondary.withValues(alpha: 0.55), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: GamingTheme.secondary.withValues(alpha: 0.35),
                    blurRadius: 40,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Center(
                child: Icon(Icons.smart_toy_rounded, color: GamingTheme.primary, size: size * 0.42),
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'JARVIS',
              style: TextStyle(
                color: GamingTheme.goldAccent,
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openJarvis() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => JarvisAssistantModal(onNavigate: _navigateToSection),
    );
  }

  // Instagram-style bottom menu footer bar
  Widget _buildBottomNavigationBar(bool isFa) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: GamingTheme.darkCardSolid.withValues(alpha: 0.72),
            border: Border(
              top: BorderSide(
                color: GamingTheme.primary.withValues(alpha: 0.22),
                width: 1,
              ),
            ),
            boxShadow: [
              BoxShadow(color: GamingTheme.primary.withValues(alpha: 0.08), blurRadius: 20, spreadRadius: -6),
            ],
          ),
          child: BottomNavigationBar(
        currentIndex: _navHighlight,
        onTap: _onNavTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: GamingTheme.primary,
        unselectedItemColor: Colors.white38,
        selectedFontSize: 11,
        unselectedFontSize: 10,
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.home_outlined),
            activeIcon: const Icon(Icons.home, color: GamingTheme.primary),
            label: isFa ? 'خانه' : 'Home',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.monitor_heart_outlined),
            activeIcon: const Icon(Icons.monitor, color: GamingTheme.primary),
            label: isFa ? 'رزرو سیستم' : 'Bookings',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.local_cafe_outlined),
            activeIcon: const Icon(Icons.local_cafe, color: GamingTheme.primary),
            label: isFa ? 'کافه بوفه' : 'Cafe',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.shopping_bag_outlined),
            activeIcon: const Icon(Icons.shopping_bag, color: GamingTheme.primary),
            label: isFa ? 'فروشگاه' : 'Shop',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.person_outline),
            activeIcon: const Icon(Icons.person, color: GamingTheme.primary),
            label: isFa ? 'کلوپ/پروفایل' : 'Profile',
          ),
        ],
          ),
        ),
      ),
    );
  }

  // Floating Hexagon Jarvis Assistant Trigger Button
  Widget _buildJarvisFAB(BuildContext context, AppState appState) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: _openJarvis,
        child: const HexagonBadge(
          size: 62,
          glowOpacity: 0.85,
          child: Icon(
            Icons.rocket_launch,
            color: Colors.white,
            size: 26,
          ),
        ),
      ),
    );
  }
}
