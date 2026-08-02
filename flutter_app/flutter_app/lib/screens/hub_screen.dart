import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models.dart';
import 'loyalty_screen.dart';
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

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _startSliderTimer();
    
    // Fetch sliders on load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AppState>(context, listen: false).fetchSliders();
    });
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
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    // List of screens to show as body
    // Index 0: Home (Fullscreen Slider)
    // Index 1: Reserves
    // Index 2: Cafe
    // Index 3: Shop
    // Index 4: Tournament/Arena
    // Index 5: Loyalty/Profile
    final List<Widget> screens = [
      _buildHomeSlider(appState),
      const ReservationScreen(),
      const CafeScreen(),
      const ShopScreen(),
      const TournamentScreen(),
      const LoyaltyScreen(),
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

  // Beautiful Header / App Bar
  PreferredSizeWidget _buildHeader(AppState appState) {
    final isFa = appState.language == 'fa';
    return AppBar(
      backgroundColor: GamingTheme.darkCardSolid.withOpacity(0.55),
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
      leading: Container(
        margin: const EdgeInsets.all(8),
        child: TextButton(
          onPressed: () {
            appState.setLanguage(appState.language == 'fa' ? 'en' : 'fa');
          },
          style: TextButton.styleFrom(
            padding: EdgeInsets.zero,
            backgroundColor: GamingTheme.primary.withOpacity(0.1),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: GamingTheme.primary.withOpacity(0.3)),
            ),
          ),
          child: Text(
            appState.language == 'fa' ? 'EN' : 'FA',
            style: const TextStyle(
              color: GamingTheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.bold,
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
            color: GamingTheme.goldAccent.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: GamingTheme.goldAccent.withOpacity(0.3)),
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

  // Fullscreen/Main image slider centered in the home tab
  Widget _buildHomeSlider(AppState appState) {
    final isFa = appState.language == 'fa';
    final sliders = appState.appSliders;

    if (appState.isLoadingSliders) {
      return const Center(
        child: CircularProgressIndicator(color: GamingTheme.primary),
      );
    }

    if (sliders.isEmpty) {
      return Center(
        child: Text(
          isFa ? 'هیچ اسلایدی یافت نشد.' : 'No sliders found.',
          style: const TextStyle(color: Colors.white54),
        ),
      );
    }

    return Column(
      children: [
        // Minimalist quick access bubble buttons on Home for Chat/Blog
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildHomeActionButton(
                isFa ? 'اتاق‌های گفتگو' : 'Chat Rooms',
                Icons.chat_bubble_outline,
                GamingTheme.primary,
                () => Navigator.push(context, MaterialPageRoute(builder: (context) => Scaffold(appBar: AppBar(title: Text(isFa ? 'تالار گفتگو' : 'Lobby Chats')), body: const ChatScreen()))),
              ),
              _buildHomeActionButton(
                isFa ? 'اخبار و بلاگ' : 'News & Blog',
                Icons.newspaper_outlined,
                GamingTheme.secondary,
                () => Navigator.push(context, MaterialPageRoute(builder: (context) => Scaffold(appBar: AppBar(title: Text(isFa ? 'بلاگ بازینو' : 'Bazino Blog')), body: const BlogScreen()))),
              ),
            ],
          ),
        ),
        
        // Centered Full-screen image slider
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: GamingTheme.primary.withOpacity(0.2)),
              boxShadow: [
                BoxShadow(
                  color: GamingTheme.primary.withOpacity(0.05),
                  blurRadius: 30,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Stack(
                children: [
                  // PageView Slider
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
                            // Cover Image with loader
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
                            // Vignette / Gradient Overlay
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
                                  stops: [0.0, 0.3, 0.7, 1.0],
                                ),
                              ),
                            ),
                            // Slide Title and info at bottom
                            Positioned(
                              bottom: 30,
                              left: 20,
                              right: 20,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: GamingTheme.primary.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: GamingTheme.primary.withOpacity(0.5)),
                                    ),
                                    child: Text(
                                      slide.target.toUpperCase(),
                                      style: const TextStyle(
                                        color: GamingTheme.primary,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1.5,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    isFa ? slide.titleFa : slide.titleEn,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      height: 1.4,
                                      shadows: [
                                        Shadow(color: Colors.black, blurRadius: 10, offset: Offset(0, 2)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    isFa ? '👆 لمس جهت رزرو یا خرید فوری' : '👆 Tap to open immediately',
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.7),
                                      fontSize: 11,
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
                  
                  // Dot indicators
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        sliders.length,
                        (index) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _sliderCurrentPage == index ? 16 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: _sliderCurrentPage == index
                                ? GamingTheme.primary
                                : Colors.white.withOpacity(0.4),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  // Home Quick Action Buttons helper
  Widget _buildHomeActionButton(String title, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Instagram-style bottom menu footer bar
  Widget _buildBottomNavigationBar(bool isFa) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: GamingTheme.darkCardSolid.withOpacity(0.72),
            border: Border(
              top: BorderSide(
                color: GamingTheme.primary.withOpacity(0.22),
                width: 1,
              ),
            ),
            boxShadow: [
              BoxShadow(color: GamingTheme.primary.withOpacity(0.08), blurRadius: 20, spreadRadius: -6),
            ],
          ),
          child: BottomNavigationBar(
        currentIndex: _currentIndex > 4 ? 4 : _currentIndex, // Cap active tab highlights to profile tab
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
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
        onTap: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => const JarvisAssistantModal(),
          );
        },
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
