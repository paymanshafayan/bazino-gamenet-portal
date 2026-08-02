export const pubspecCode = `name: bazino_app
description: "A complete mobile and web client application for Bazino Esports Arena & Gamer Loyalty Club."
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.5
  provider: ^6.1.1
  intl: ^0.18.1
  google_fonts: ^5.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.1

flutter:
  uses-material-design: true
  assets:
    - assets/images/`;

export const themeCode = `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class GamingTheme {
  // Cyberpunk Gaming Hub Palette
  static const Color darkBg = Color(0xFF060913);
  static const Color darkCard = Color(0x66111326); // Translucent for glassmorphism
  static const Color primary = Color(0xFF00FFCC); // Neon Cyan
  static const Color primaryHover = Color(0xFF00D1A3);
  static const Color secondary = Color(0xFF9D00FF); // Neon Purple
  static const Color goldAccent = Color(0xFFFFD700); // Neon Gold
  static const Color accentRed = Color(0xFFFF2A2A); // Neon Red
  static const Color textLight = Color(0xFFE5E7EB);
  static const Color textMuted = Color(0xFF8B93A5);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: primary,
      cardColor: darkCard,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        background: darkBg,
        surface: darkCard,
        error: accentRed,
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.vazirmatn(
          fontSize: 36,
          fontWeight: FontWeight.w900,
          color: textLight,
          letterSpacing: 2,
        ),
        headlineMedium: GoogleFonts.vazirmatn(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: textLight,
        ),
        bodyLarge: GoogleFonts.vazirmatn(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: textLight,
        ),
        bodyMedium: GoogleFonts.vazirmatn(
          fontSize: 12,
          color: textMuted,
        ),
        labelLarge: GoogleFonts.vazirmatn(
          fontSize: 14,
          fontWeight: FontWeight.w900,
          color: primary,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}`;

export const modelsCode = `import 'package:flutter/material.dart';

// --- Domain Entities ---

class UserState {
  final String username;
  final String email;
  final String phone;
  int loyaltyPoints;

  UserState({
    required this.username,
    required this.email,
    required this.phone,
    required this.loyaltyPoints,
  });
}

class LoyaltyTx {
  final String id;
  final int points;
  final String description;
  final String type; // 'Earned' or 'Redeemed'
  final String date;

  LoyaltyTx({
    required this.id,
    required this.points,
    required this.description,
    required this.type,
    required this.date,
  });
}

// Global AppState with ChangeNotifier provides dynamic state sync
class AppState extends ChangeNotifier {
  String _language = 'fa'; // 'fa', 'en', 'ru', 'tr'
  
  String get language => _language;
  TextDirection get textDirection => _language == 'fa' ? TextDirection.rtl : TextDirection.ltr;

  void setLanguage(String lang) {
    _language = lang;
    notifyListeners();
  }

  // Active user profile
  final UserState user = UserState(
    username: 'Sina_ProGamer',
    email: 'sina.gamer@gmail.com',
    phone: '09123456789',
    loyaltyPoints: 320,
  );

  // Business state arrays, orders, systems, tournaments ...
}`;

export const homeScreenCode = `import 'dart:math';
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

class HubScreen extends StatefulWidget {
  const HubScreen({super.key});

  @override
  State<HubScreen> createState() => _HubScreenState();
}

class _HubScreenState extends State<HubScreen> with TickerProviderStateMixin {
  late AnimationController _bgController;
  late AnimationController _panelController;
  Widget? _activeOverlay;
  String _activeTitle = "";

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(vsync: this, duration: const Duration(seconds: 20))..repeat();
    _panelController = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
  }

  @override
  void dispose() {
    _bgController.dispose();
    _panelController.dispose();
    super.dispose();
  }

  void _openPanel(Widget screen, String title) {
    setState(() {
      _activeOverlay = screen;
      _activeTitle = title;
    });
    _panelController.forward(from: 0.0);
  }

  void _closePanel() {
    _panelController.reverse().then((_) {
      setState(() {
        _activeOverlay = null;
      });
    });
  }

  Widget _buildHubButton(String title, IconData icon, Color color, Widget screen, Offset position, double size) {
    return Positioned(
      left: position.dx,
      top: position.dy,
      child: GestureDetector(
        onTap: () => _openPanel(screen, title),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: GamingTheme.darkCard,
            border: Border.all(color: color.withOpacity(0.5), width: 2),
            boxShadow: [
              BoxShadow(color: color.withOpacity(0.6), blurRadius: 20, spreadRadius: -5),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: size * 0.4),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(color: Colors.white, fontSize: size * 0.12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final center = Offset(size.width / 2 - 50, size.height / 2 - 50);

    return Scaffold(
      backgroundColor: GamingTheme.darkBg,
      body: Stack(
        children: [
          // Cyberpunk Particle Background
          AnimatedBuilder(
            animation: _bgController,
            builder: (context, child) {
              return CustomPaint(
                painter: ParticlePainter(_bgController.value),
                size: Size.infinite,
              );
            },
          ),
          
          // Center Core Logo/Orb
          Positioned(
            left: center.dx,
            top: center.dy,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  colors: [GamingTheme.secondary, Colors.transparent],
                  stops: [0.2, 1.0],
                ),
                boxShadow: [
                  BoxShadow(color: GamingTheme.secondary.withOpacity(0.5), blurRadius: 50, spreadRadius: 10),
                ],
              ),
              child: const Center(
                child: Icon(Icons.gamepad, size: 50, color: GamingTheme.primary),
              ),
            ),
          ),

          // Orbiting Buttons
          _buildHubButton("RESERVE", Icons.monitor, GamingTheme.primary, const ReservationScreen(), Offset(center.dx - 120, center.dy - 120), 80),
          _buildHubButton("CAFE", Icons.local_cafe, GamingTheme.goldAccent, const CafeScreen(), Offset(center.dx + 120, center.dy - 100), 80),
          _buildHubButton("SHOP", Icons.shopping_cart, GamingTheme.primary, const ShopScreen(), Offset(center.dx - 120, center.dy + 120), 80),
          _buildHubButton("ARENA", Icons.emoji_events, GamingTheme.secondary, const TournamentScreen(), Offset(center.dx + 120, center.dy + 100), 80),
          _buildHubButton("LOYALTY", Icons.stars, GamingTheme.goldAccent, const LoyaltyScreen(), Offset(center.dx, center.dy + 150), 80),
          
          // Chat / Social Floating Action Button
          Positioned(
            right: 20,
            bottom: 20,
            child: FloatingActionButton(
              onPressed: () => _openPanel(const ChatScreen(), "NEXUS CHAT"),
              backgroundColor: GamingTheme.secondary.withOpacity(0.8),
              child: const Icon(Icons.chat, color: Colors.white),
            ),
          ),

          // Glassmorphism Overlay Panel
          if (_activeOverlay != null)
            FadeTransition(
              opacity: _panelController,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  color: Colors.black.withOpacity(0.4),
                  child: Center(
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.1),
                        end: Offset.zero,
                      ).animate(CurvedAnimation(parent: _panelController, curve: Curves.easeOutCubic)),
                      child: Container(
                        width: min(size.width * 0.9, 800),
                        height: min(size.height * 0.85, 900),
                        decoration: BoxDecoration(
                          color: GamingTheme.darkCard,
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(color: GamingTheme.primary.withOpacity(0.3), width: 1.5),
                          boxShadow: [
                            BoxShadow(color: GamingTheme.secondary.withOpacity(0.2), blurRadius: 40, spreadRadius: 5),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(30),
                          child: Column(
                            children: [
                              // Glass Panel Header
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                decoration: BoxDecoration(
                                  border: Border(bottom: BorderSide(color: GamingTheme.primary.withOpacity(0.3))),
                                  gradient: LinearGradient(
                                    colors: [GamingTheme.primary.withOpacity(0.2), Colors.transparent],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _activeTitle,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 2,
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.close, color: Colors.white),
                                      onPressed: _closePanel,
                                    ),
                                  ],
                                ),
                              ),
                              // Panel Content
                              Expanded(
                                child: Navigator(
                                  onGenerateRoute: (settings) => MaterialPageRoute(
                                    builder: (context) => _activeOverlay!,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ParticlePainter extends CustomPainter {
  final double progress;
  ParticlePainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = GamingTheme.primary.withOpacity(0.5);
    final random = Random(42); 
    
    for (int i = 0; i < 50; i++) {
      final x = random.nextDouble() * size.width;
      final yOffset = random.nextDouble() * size.height;
      final speed = random.nextDouble() * 0.5 + 0.1;
      
      final currentY = (yOffset - (progress * size.height * speed)) % size.height;
      final currentX = x + sin(progress * pi * 2 + i) * 20;
      
      canvas.drawCircle(Offset(currentX, currentY), random.nextDouble() * 3 + 1, paint);
    }
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) => true;
}
`;

export const mainCode = `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme.dart';
import 'models.dart';
import 'screens/hub_screen.dart';
import 'screens/jarvis_assistant.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => JarvisStateProvider()),
      ],
      child: const BazinoApp(),
    ),
  );
}

class BazinoApp extends StatelessWidget {
  const BazinoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bazino Esports Hub',
      debugShowCheckedModeBanner: false,
      theme: GamingTheme.darkTheme,
      home: const HubScreen(),
    );
  }
}`;

export const messagesScreenCode = `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.notifications_active, color: GamingTheme.primary),
              SizedBox(width: 8),
              Text(
                isFa ? 'نوتیفیکیشن‌های لایو اپلیکیشن' : 'Live Push Notifications',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          SizedBox(height: 12),
          // Notification messages and details lists ...
        ],
      ),
    );
  }
}`;

export const jarvisCode = `import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../models.dart';

enum JarvisCharacter { cyberRobot, neonNetrunner, mechGamer }
enum JarvisAvatarState { idle, talking, happy, error }

class JarvisMessage {
  final String content;
  final bool isUser;
  final String timestamp;
  JarvisMessage({required this.content, required this.isUser, required this.timestamp});
}

class JarvisStateProvider extends ChangeNotifier {
  JarvisCharacter _character = JarvisCharacter.cyberRobot;
  JarvisAvatarState _avatarState = JarvisAvatarState.idle;
  bool _isListening = false;
  final List<JarvisMessage> _chatHistory = [];

  JarvisCharacter get character => _character;
  JarvisAvatarState get avatarState => _avatarState;
  bool get isListening => _isListening;
  List<JarvisMessage> get chatHistory => _chatHistory;

  JarvisStateProvider() {
    _chatHistory.add(JarvisMessage(
      content: "سلام نوواکس عزیز! من جارویس سالن بازینو هستم. بگو چطوری میتونم کمکت کنم؟ 🎮",
      isUser: false,
      timestamp: "10:00",
    ));
  }

  void setCharacter(JarvisCharacter character) {
    _character = character;
    notifyListeners();
  }

  void startListening() {
    _isListening = true;
    _avatarState = JarvisAvatarState.talking;
    notifyListeners();
  }

  void sendTextCommand(String command, AppState appState) {
    if (command.trim().isEmpty) return;
    _chatHistory.add(JarvisMessage(content: command, isUser: true, timestamp: "10:01"));
    _avatarState = JarvisAvatarState.talking;
    notifyListeners();

    // Context-aware automatic processing based on system #4
    Timer(const Duration(milliseconds: 1500), () {
      String response = "سفارش شما روی سیستم VIP شماره ۴ ثبت شد! 🍕";
      _chatHistory.add(JarvisMessage(content: response, isUser: false, timestamp: "10:01"));
      _avatarState = JarvisAvatarState.happy;
      notifyListeners();
    });
  }
}

class JarvisAvatar extends StatelessWidget {
  final JarvisCharacter character;
  final JarvisAvatarState state;
  final double size;

  const JarvisAvatar({super.key, required this.character, required this.state, this.size = 140});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.blue.withOpacity(0.1)),
      child: Center(
        child: Icon(Icons.psychology, color: Colors.cyanAccent, size: size * 0.5),
      ),
    );
  }
}
`;
