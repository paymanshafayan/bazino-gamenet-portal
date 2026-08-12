import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'theme.dart';
import 'models.dart';
import 'screens/hub_screen.dart';
import 'screens/intro_screen.dart';
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

class BazinoApp extends StatefulWidget {
  const BazinoApp({super.key});

  @override
  State<BazinoApp> createState() => _BazinoAppState();
}

class _BazinoAppState extends State<BazinoApp> {
  static const _introSeenKey = 'bazino_intro_seen_v1';

  bool _isCheckingIntro = true;
  bool _showIntro = false;

  @override
  void initState() {
    super.initState();
    _loadIntroPreference();
  }

  Future<void> _loadIntroPreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final hasSeenIntro = prefs.getBool(_introSeenKey) ?? false;
      if (!mounted) return;
      setState(() {
        _showIntro = !hasSeenIntro;
        _isCheckingIntro = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _showIntro = true;
        _isCheckingIntro = false;
      });
    }
  }

  Future<void> _finishIntro() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_introSeenKey, true);
    if (!mounted) return;
    setState(() => _showIntro = false);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bazino Esports Hub',
      debugShowCheckedModeBanner: false,
      theme: GamingTheme.darkTheme,
      home: _buildHome(),
    );
  }

  Widget _buildHome() {
    if (_isCheckingIntro) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: SizedBox(
            height: 24,
            width: 24,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: GamingTheme.primary),
          ),
        ),
      );
    }

    if (_showIntro) {
      return BazinoIntroScreen(onFinish: _finishIntro);
    }

    return Consumer<AppState>(
      builder: (context, appState, _) {
        if (appState.isBootstrapping) {
          return Scaffold(
            backgroundColor: GamingTheme.darkBg,
            body: Container(
              decoration: const BoxDecoration(gradient: GamingTheme.bgGradient),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Faint circuit/heartbeat line pattern, echoing the reference splash background.
                  CustomPaint(
                    painter: CircuitBackgroundPainter(color: GamingTheme.primary),
                    size: Size.infinite,
                  ),
                  Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const HexagonBadge(
                          size: 96,
                          child: Icon(Icons.bolt_rounded, color: Colors.white, size: 40),
                        ),
                        const SizedBox(height: 24),
                        ShaderMask(
                          shaderCallback: (bounds) => GamingTheme.brandGradient.createShader(bounds),
                          child: const Text(
                            'BAZINO PRO',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 30,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 4,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          appState.language == 'fa' ? 'مرکز فرمان گیم‌نت شما' : 'YOUR GAMENET COMMAND CENTER',
                          style: const TextStyle(
                            color: GamingTheme.textMuted,
                            fontSize: 11,
                            letterSpacing: 3,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 40),
                        const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.4, color: GamingTheme.primary),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          appState.language == 'fa' ? 'در حال اتصال به سرور بازینو...' : 'Connecting to Bazino server...',
                          style: const TextStyle(color: GamingTheme.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }
        return const HubScreen();
      },
    );
  }
}
