import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';
import '../theme.dart';
import '../models.dart';
import '../api_config.dart';

/// Characters available for Jarvis
enum JarvisCharacter { 
  cyberRobot,     // High-tech robot visor style
  neonNetrunner,  // Cyberpunk hacking matrix style
  mechGamer       // Dynamic mechanical gaming crosshair style
}

/// Dynamic active state of the Jarvis assistant
enum JarvisAvatarState { 
  idle, 
  talking, 
  happy, 
  error 
}

/// Message model for the Jarvis interface
class JarvisMessage {
  final String content;
  final bool isUser;
  final String timestamp;

  /// نام اکشن سرور (مثلاً order_cafe_item) برای پیام‌های جارویس — برای نمایش
  /// نشان «عملیات انجام شد» زیر حباب. برای chitchat و پیام‌های کاربر null است.
  final String? action;

  JarvisMessage({
    required this.content,
    required this.isUser,
    required this.timestamp,
    this.action,
  });
}

/// State Provider for Jarvis Voice & Action engine.
///
/// This talks to the REAL backend (`POST /api/assistant/command`) for every
/// action — ordering food, extending a reservation, contacting staff, or
/// posting in chat all really happen server-side. Nothing here fabricates
/// an outcome locally. Voice input uses real on-device speech recognition
/// via the `speech_to_text` package (no network/API key required for that
/// part — it runs through the OS's built-in speech recognizer).
class JarvisStateProvider extends ChangeNotifier {
  JarvisCharacter _character = JarvisCharacter.cyberRobot;
  JarvisAvatarState _avatarState = JarvisAvatarState.idle;
  bool _isListening = false;
  bool _isMuted = false;
  bool _isProcessing = false;
  bool _isSpeaking = false;
  bool _handsFreeMode = false;
  bool _isHandlingFinalSpeech = false;
  double _voiceLevel = 0.0;
  String? _pendingNavigationSection;
  Timer? _speakingPulseTimer;
  final String _currentResponseText = "";
  String _liveTranscript = "";
  final List<JarvisMessage> _chatHistory = [];

  final stt.SpeechToText _speech = stt.SpeechToText();
  final FlutterTts _tts = FlutterTts();
  bool _speechAvailable = false;

  JarvisCharacter get character => _character;
  JarvisAvatarState get avatarState => _avatarState;
  bool get isListening => _isListening;
  bool get isMuted => _isMuted;
  bool get isProcessing => _isProcessing;
  bool get isSpeaking => _isSpeaking;
  bool get handsFreeMode => _handsFreeMode;
  double get voiceLevel => _voiceLevel;
  String get currentResponseText => _currentResponseText;

  String? consumePendingNavigationSection() {
    final section = _pendingNavigationSection;
    _pendingNavigationSection = null;
    return section;
  }
  String get liveTranscript => _liveTranscript;
  List<JarvisMessage> get chatHistory => _chatHistory;
  bool get speechAvailable => _speechAvailable;

  JarvisStateProvider() {
    _chatHistory.add(JarvisMessage(
      content: "سلام نوواکس عزیز! من جارویس سالن بازینو هستم. بگو چطوری میتونم کمکت کنم؟ می‌تونم از بوفه برات سفارش بدم، سیستمت رو تمدید کنم، به ادمین خبر بدم یا توی چت‌روم پیام بفرستم. 🎮",
      isUser: false,
      timestamp: _now(),
    ));
    _initSpeech();
    _initTts();
  }

  Future<void> _initTts() async {
    await _tts.awaitSpeakCompletion(true);
    await _tts.setSpeechRate(0.48);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.02);
    _tts.setStartHandler(() {
      _isSpeaking = true;
      _avatarState = JarvisAvatarState.talking;
      _startSpeakingPulse();
      notifyListeners();
    });
    _tts.setCompletionHandler(() {
      _isSpeaking = false;
      _voiceLevel = 0.0;
      _speakingPulseTimer?.cancel();
      _avatarState = JarvisAvatarState.idle;
      notifyListeners();
      if (_handsFreeMode && _lastAppState != null) {
        Future.delayed(const Duration(milliseconds: 450), () => startListening(_lastAppState!, continuous: true));
      }
    });
    _tts.setErrorHandler((_) {
      _isSpeaking = false;
      _voiceLevel = 0.0;
      _speakingPulseTimer?.cancel();
      notifyListeners();
    });
  }

  AppState? _lastAppState;

  String _now() {
    final now = DateTime.now();
    return "${now.hour}:${now.minute.toString().padLeft(2, '0')}";
  }

  /// One-time initialization of the on-device speech recognizer.
  Future<void> _initSpeech() async {
    try {
      _speechAvailable = await _speech.initialize(
        onError: (err) => debugPrint('[Jarvis] Speech error: $err'),
        onStatus: (status) => debugPrint('[Jarvis] Speech status: $status'),
      );
    } catch (e) {
      _speechAvailable = false;
      debugPrint('[Jarvis] Speech init failed: $e');
    }
    notifyListeners();
  }

  void setCharacter(JarvisCharacter character) {
    _character = character;
    notifyListeners();
  }

  void setAvatarState(JarvisAvatarState state) {
    _avatarState = state;
    notifyListeners();
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    if (_isMuted) _tts.stop();
    notifyListeners();
  }

  void _startSpeakingPulse() {
    _speakingPulseTimer?.cancel();
    var tick = 0;
    _speakingPulseTimer = Timer.periodic(const Duration(milliseconds: 90), (_) {
      tick++;
      _voiceLevel = 0.35 + (math.sin(tick * 0.9).abs() * 0.55) + (math.Random().nextDouble() * 0.1);
      notifyListeners();
    });
  }

  Future<void> toggleHandsFreeConversation(AppState appState) async {
    _lastAppState = appState;
    _handsFreeMode = !_handsFreeMode;
    if (_handsFreeMode) {
      await startListening(appState, continuous: true);
    } else {
      await _speech.stop();
      await _tts.stop();
      _isListening = false;
      _isSpeaking = false;
      _voiceLevel = 0.0;
      _avatarState = JarvisAvatarState.idle;
      notifyListeners();
    }
  }

  /// Starts REAL on-device speech recognition (microphone + OS speech engine).
  /// Requires RECORD_AUDIO permission, already declared in AndroidManifest.xml / Info.plist.
  Future<void> startListening(AppState appState, {bool continuous = false}) async {
    _lastAppState = appState;
    if (_isSpeaking) await _tts.stop();
    if (!_speechAvailable) {
      await _initSpeech();
      if (!_speechAvailable) {
        _chatHistory.add(JarvisMessage(
          content: "متاسفانه دسترسی به میکروفون یا موتور تشخیص گفتار در این دستگاه در دسترس نیست. لطفاً از حالت تایپ استفاده کن.",
          isUser: false,
          timestamp: _now(),
        ));
        _avatarState = JarvisAvatarState.error;
        notifyListeners();
        return;
      }
    }

    _isListening = true;
    _isHandlingFinalSpeech = false;
    _liveTranscript = "";
    _voiceLevel = 0.2;
    _avatarState = JarvisAvatarState.talking;
    notifyListeners();

    final localeId = appState.language == 'fa'
        ? 'fa_IR'
        : appState.language == 'ru'
            ? 'ru_RU'
            : appState.language == 'tr'
                ? 'tr_TR'
                : 'en_US';
    // این چهار مقدار قبلاً مستقیم به listen() پاس داده می‌شدند. در speech_to_text 7.x
    // همه‌شان @Deprecated شده‌اند و باید داخل SpeechListenOptions بروند — چون
    // `flutter analyze` حتی یک info را هم شکست حساب می‌کند، همین‌ها کل CI را قرمز می‌کردند.
    // رفتار عوض نمی‌شود: همان locale، همان مدت‌ها، همان partial results.
    await _speech.listen(
      listenOptions: stt.SpeechListenOptions(
        localeId: localeId,
        listenFor: const Duration(minutes: 2),
        pauseFor: const Duration(seconds: 2),
        partialResults: true,
      ),
      onSoundLevelChange: (level) {
        _voiceLevel = ((level + 2) / 12).clamp(0.0, 1.0);
        notifyListeners();
      },
      onResult: (result) {
        _liveTranscript = result.recognizedWords;
        notifyListeners();
        if (continuous && result.finalResult && !_isHandlingFinalSpeech) {
          _isHandlingFinalSpeech = true;
          Future.delayed(const Duration(milliseconds: 250), () => stopListeningAndProcess(appState));
        }
      },
    );
  }

  /// Stops the microphone and processes whatever was really transcribed.
  Future<void> stopListeningAndProcess(AppState appState) async {
    await _speech.stop();
    _isListening = false;
    _voiceLevel = 0.0;
    final spokenText = _liveTranscript.trim();
    _liveTranscript = "";

    if (spokenText.isEmpty) {
      _avatarState = JarvisAvatarState.idle;
      notifyListeners();
      return;
    }

    _chatHistory.add(JarvisMessage(
      content: spokenText,
      isUser: true,
      timestamp: _now(),
    ));
    notifyListeners();

    await _sendCommandToServer(spokenText, appState);
  }

  /// Send manual text command
  Future<void> sendTextCommand(String command, AppState appState) async {
    if (command.trim().isEmpty) return;

    _chatHistory.add(JarvisMessage(
      content: command,
      isUser: true,
      timestamp: _now(),
    ));
    _avatarState = JarvisAvatarState.talking;
    notifyListeners();

    await _sendCommandToServer(command, appState);
  }

  /// آخرین نوبت‌های گفتگو برای ارسال به سرور — تا جارویس بتواند پیام‌های پیگیری
  /// («همونو دوباره»، «یک ساعت دیگه») را بفهمد. پیام کاربرِ همان لحظه داخل
  /// `command` می‌رود و از تاریخچه حذف می‌شود تا دوباره ارسال نشود.
  List<Map<String, String>> _recentHistoryPayload() {
    final source = (_chatHistory.isNotEmpty && _chatHistory.last.isUser)
        ? _chatHistory.sublist(0, _chatHistory.length - 1)
        : _chatHistory;
    final turns = source.length <= 12 ? source : source.sublist(source.length - 12);
    return turns.map((m) => {'role': m.isUser ? 'user' : 'assistant', 'content': m.content}).toList();
  }

  /// فقط برای تست‌های ویجت — افزودن پیام بدون رفت‌وبرگشت شبکه.
  void debugAppendMessage(JarvisMessage message) {
    _chatHistory.add(message);
    notifyListeners();
  }

  /// Sends the command to the REAL backend brain (`/api/assistant/command`),
  /// which decides the intent (via Gemini function-calling, or a keyword
  /// fallback if no API key is configured) and performs the REAL action —
  /// a real cafe order, a real reservation extension, a real support
  /// ticket, or a real chat message. The reply shown here is exactly what
  /// the server says actually happened, not a scripted guess.
  Future<void> _sendCommandToServer(String command, AppState appState) async {
    _isProcessing = true;
    _avatarState = JarvisAvatarState.talking;
    notifyListeners();

    try {
      final response = await http
          .post(
            Uri.parse('$kApiBaseUrl/api/assistant/command'),
            headers: {
              'Content-Type': 'application/json',
              if (appState.authToken != null) 'Authorization': 'Bearer ${appState.authToken}',
            },
            body: jsonEncode({
              'command': command,
              'language': appState.language,
              'history': _recentHistoryPayload(),
            }),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        final reply = data['reply'] as String? ?? '...';
        final action = data['action'] as String?;
        _chatHistory.add(JarvisMessage(
          content: reply,
          isUser: false,
          timestamp: _now(),
          action: action,
        ));
        await _speak(reply, appState.language);

        final clientCommand = data['clientCommand'];
        if (clientCommand is Map) {
          if (clientCommand['type'] == 'change_language') {
            appState.setLanguage((clientCommand['language'] ?? 'fa').toString());
          } else if (clientCommand['type'] == 'open_section') {
            _pendingNavigationSection = (clientCommand['section'] ?? 'home').toString();
          }
        }

        _avatarState = (action == 'chitchat' || action == null)
            ? JarvisAvatarState.idle
            : JarvisAvatarState.happy;

        // Reflect the real, server-confirmed loyalty point balance locally
        if (data['user'] != null && data['user']['loyaltyPoints'] != null) {
          appState.syncLoyaltyPoints(data['user']['loyaltyPoints'] as int);
        }
      } else {
        final err = jsonDecode(utf8.decode(response.bodyBytes));
        _chatHistory.add(JarvisMessage(
          content: err['error']?.toString() ?? "متاسفم، در انجام این کار مشکلی پیش اومد.",
          isUser: false,
          timestamp: _now(),
        ));
        _avatarState = JarvisAvatarState.error;
      }
    } catch (e) {
      _chatHistory.add(JarvisMessage(
        content: "نتونستم به سرور بازینو وصل بشم. لطفاً اتصال اینترنت یا آدرس سرور رو چک کن. (${e.toString()})",
        isUser: false,
        timestamp: _now(),
      ));
      _avatarState = JarvisAvatarState.error;
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }

  Future<void> _speak(String text, String language) async {
    if (_isMuted || text.trim().isEmpty) return;
    final locale = language == 'fa'
        ? 'fa-IR'
        : language == 'ru'
            ? 'ru-RU'
            : language == 'tr'
                ? 'tr-TR'
                : 'en-US';
    try {
      await _tts.setLanguage(locale);
      await _tts.speak(text.replaceAll(RegExp(r'[🎮🍕⚡🚨🔫✨😉]'), ''));
    } catch (e) {
      debugPrint('[Jarvis] TTS failed: $e');
    }
  }

  @override
  void dispose() {
    _speakingPulseTimer?.cancel();
    _speech.stop();
    _tts.stop();
    super.dispose();
  }

  void clearHistory() {
    _chatHistory.clear();
    _chatHistory.add(JarvisMessage(
      content: "تاریخچه پاک شد. جارویس آماده به کاره! 🖥️",
      isUser: false,
      timestamp: _now(),
    ));
    notifyListeners();
  }
}

/// A highly-styled, futuristic, responsive Cyberpunk custom painter-based avatar
/// with neon pulse rings, digital scanline overlays and dynamic glitch indicators.
class JarvisAvatar extends StatefulWidget {
  final JarvisCharacter character;
  final JarvisAvatarState state;
  final double size;
  final double voiceLevel;

  const JarvisAvatar({
    super.key,
    required this.character,
    required this.state,
    this.size = 140.0,
    this.voiceLevel = 0.0,
  });

  @override
  State<JarvisAvatar> createState() => _JarvisAvatarState();
}

class _JarvisAvatarState extends State<JarvisAvatar> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late double _glitchFactor;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
    _glitchFactor = 0.0;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.state == JarvisAvatarState.error) {
      _glitchFactor = math.Random().nextDouble();
    } else {
      _glitchFactor = 0.0;
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: _getThemeColor(widget.state).withValues(alpha: 0.15),
                blurRadius: 30,
                spreadRadius: 2,
              )
            ],
          ),
          child: CustomPaint(
            painter: _JarvisCorePainter(
              animationValue: _controller.value,
              character: widget.character,
              state: widget.state,
              glitch: _glitchFactor,
              voiceLevel: widget.voiceLevel,
            ),
          ),
        );
      },
    );
  }

  Color _getThemeColor(JarvisAvatarState state) {
    switch (state) {
      case JarvisAvatarState.idle:
        return GamingTheme.primary;
      case JarvisAvatarState.talking:
        return GamingTheme.secondary;
      case JarvisAvatarState.happy:
        return GamingTheme.goldAccent;
      case JarvisAvatarState.error:
        return GamingTheme.accentRed;
    }
  }
}

/// Custom Painter that renders the neon cybernetic layout of the chosen character
class _JarvisCorePainter extends CustomPainter {
  final double animationValue;
  final JarvisCharacter character;
  final JarvisAvatarState state;
  final double glitch;
  final double voiceLevel;

  _JarvisCorePainter({
    required this.animationValue,
    required this.character,
    required this.state,
    required this.glitch,
    required this.voiceLevel,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    final primaryColor = _getStateColor();
    final glowPaint = Paint()
      ..color = primaryColor.withValues(alpha: 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    final solidPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final fillPaint = Paint()
      ..color = primaryColor.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;

    // Apply digital glitch offsets if error state
    var shiftX = 0.0;
    var shiftY = 0.0;
    if (glitch > 0.6) {
      shiftX = (math.Random().nextDouble() - 0.5) * 8;
      shiftY = (math.Random().nextDouble() - 0.5) * 4;
    }

    canvas.save();
    canvas.translate(shiftX, shiftY);

    // 1. BACKGROUND DISK OVERLAY
    canvas.drawCircle(center, radius - 10, fillPaint);

    // 2. ORBITAL TECH RINGS (ROTATING)
    final rotationAngle = animationValue * 2 * math.pi;
    _drawRotatingRings(canvas, center, radius, rotationAngle, glowPaint, solidPaint);

    // 3. DRAW INNER CHARACTER VISUALS
    _drawCharacterFace(canvas, center, radius, rotationAngle, glowPaint, solidPaint);

    // 4. GRAPHIC SOUND EQUALIZER FOR "TALKING" STATE
    if (state == JarvisAvatarState.talking) {
      _drawTalkingEqualizer(canvas, center, radius, glowPaint, solidPaint);
    }

    canvas.restore();
  }

  void _drawRotatingRings(Canvas canvas, Offset center, double radius, double angle, Paint glow, Paint solid) {
    // Outer dashed ring (clockwise)
    final outerRadius = radius - 8;
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(angle);
    _drawDashedArc(canvas, Offset.zero, outerRadius, 0.0, 1.2, solid, dashCount: 6);
    _drawDashedArc(canvas, Offset.zero, outerRadius, math.pi, 1.2, solid, dashCount: 6);
    canvas.restore();

    // Inner ring with tech notches (counter-clockwise)
    final innerRadius = radius - 20;
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(-angle * 1.5);
    _drawDashedArc(canvas, Offset.zero, innerRadius, 0.5, 0.8, glow, dashCount: 4);
    _drawDashedArc(canvas, Offset.zero, innerRadius, math.pi + 0.5, 0.8, glow, dashCount: 4);
    canvas.restore();
  }

  void _drawDashedArc(Canvas canvas, Offset center, double r, double start, double sweep, Paint paint, {required int dashCount}) {
    final rect = Rect.fromCircle(center: center, radius: r);
    canvas.drawArc(rect, start, sweep, false, paint);
  }

  void _drawCharacterFace(Canvas canvas, Offset center, double radius, double rotation, Paint glow, Paint solid) {
    final innerR = radius - 35;
    final pulseScale = 1.0 + 0.06 * math.sin(animationValue * 2 * math.pi * 2);

    switch (character) {
      case JarvisCharacter.cyberRobot:
        // Draw robotic cyber visor / horizontal tech bar
        final visorHeight = 12.0 * pulseScale;
        final visorWidth = innerR * 1.3;
        final visorRect = Rect.fromCenter(center: center, width: visorWidth, height: visorHeight);
        
        final visorFill = Paint()
          ..color = _getStateColor().withValues(alpha: 0.1)
          ..style = PaintingStyle.fill;
        canvas.drawRect(visorRect, visorFill);
        canvas.drawRect(visorRect, solid);
        
        // VISOR GLOW CORE
        final corePaint = Paint()
          ..color = _getStateColor()
          ..style = PaintingStyle.fill;
        canvas.drawCircle(center, 4.0, corePaint);
        canvas.drawCircle(center, 8.0, Paint()..color = _getStateColor().withValues(alpha: 0.3)..style = PaintingStyle.fill);

        // Tech lines exiting
        canvas.drawLine(Offset(center.dx - visorWidth/2, center.dy), Offset(center.dx - visorWidth/2 - 12, center.dy), solid);
        canvas.drawLine(Offset(center.dx + visorWidth/2, center.dy), Offset(center.dx + visorWidth/2 + 12, center.dy), solid);
        break;

      case JarvisCharacter.neonNetrunner:
        // Glowing matrix cyber-orb style
        canvas.drawCircle(center, innerR * 0.7 * pulseScale, solid);
        canvas.drawCircle(center, innerR * 0.7 * pulseScale, glow);
        
        // Dynamic crosshair lines in center
        canvas.drawLine(Offset(center.dx - 18, center.dy - 18), Offset(center.dx - 6, center.dy - 6), solid);
        canvas.drawLine(Offset(center.dx + 18, center.dy + 18), Offset(center.dx + 6, center.dy + 6), solid);
        canvas.drawLine(Offset(center.dx - 18, center.dy + 18), Offset(center.dx - 6, center.dy + 6), solid);
        canvas.drawLine(Offset(center.dx + 18, center.dy - 18), Offset(center.dx + 6, center.dy - 6), solid);
        break;

      case JarvisCharacter.mechGamer:
        // Aggressive mechanical blade crosshair style
        final trianglePath = Path();
        final side = innerR * 0.8 * pulseScale;
        
        // Triangular holographic shield core
        trianglePath.moveTo(center.dx, center.dy - side);
        trianglePath.lineTo(center.dx + side * 0.86, center.dy + side * 0.5);
        trianglePath.lineTo(center.dx - side * 0.86, center.dy + side * 0.5);
        trianglePath.close();
        
        canvas.drawPath(trianglePath, Paint()..color = _getStateColor().withValues(alpha: 0.05)..style = PaintingStyle.fill);
        canvas.drawPath(trianglePath, solid);
        canvas.drawPath(trianglePath, glow);
        
        // Outer mechanical teeth pointers
        for (int i = 0; i < 3; i++) {
          final angle = rotation + (i * 2 * math.pi / 3);
          final pointerTip = Offset(center.dx + (innerR + 5) * math.cos(angle), center.dy + (innerR + 5) * math.sin(angle));
          canvas.drawCircle(pointerTip, 3.0, Paint()..color = _getStateColor().withValues(alpha: 0.8)..style = PaintingStyle.fill);
        }
        break;
    }
  }

  void _drawTalkingEqualizer(Canvas canvas, Offset center, double radius, Paint glow, Paint solid) {
    // Render voice amplitude graph lines at bottom
    const barCount = 12;
    final totalWidth = radius * 1.2;
    final barSpacing = totalWidth / barCount;
    final startX = center.dx - totalWidth / 2;

    final eqPaint = Paint()
      ..color = _getStateColor()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;

    for (int i = 0; i < barCount; i++) {
      // Create random/animated bouncing bar heights
      final offsetValue = math.sin(animationValue * 2 * math.pi * 4 + i) * 0.5 + 0.5;
      final reactiveBoost = voiceLevel.clamp(0.0, 1.0);
      final amplitude = (10.0 + 18.0 * offsetValue + 42.0 * reactiveBoost * (0.55 + offsetValue * 0.45));
      final x = startX + i * barSpacing;
      
      canvas.drawLine(
        Offset(x, center.dy + radius * 0.45 - amplitude / 2),
        Offset(x, center.dy + radius * 0.45 + amplitude / 2),
        eqPaint,
      );
    }
  }

  Color _getStateColor() {
    switch (state) {
      case JarvisAvatarState.idle:
        return GamingTheme.primary;
      case JarvisAvatarState.talking:
        return GamingTheme.secondary;
      case JarvisAvatarState.happy:
        return GamingTheme.goldAccent;
      case JarvisAvatarState.error:
        return GamingTheme.accentRed;
    }
  }

  @override
  bool shouldRepaint(covariant _JarvisCorePainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
           oldDelegate.state != state ||
           oldDelegate.character != character ||
           oldDelegate.glitch != glitch ||
           oldDelegate.voiceLevel != voiceLevel;
  }
}

// ============================================================
// JarvisAssistantModal — رابط گفتگومحور (سبک ChatGPT)
//
// بازطراحی‌شده به دستور کارفرما: جارویس باید مثل یک دستیار گفتگویی
// واقعی باشد — صفحهٔ گفتگو قهرمانِ رابط است، نه آواتار بزرگ وسط صفحه.
// آواتار فقط به‌صورت فشرده در هدر می‌ماند، حباب‌های پیام تمام‌عرض،
// نشانگر «در حال تایپ»، پیشنهادهای شروع فقط وقتی گفتگو تازه است،
// نوار ورودی pill شکل با میکروفن و دکمهٔ ارسال گرادیانی. صدا و حالت
// دست‌آزاد (مکالمهٔ پیوسته) دقیقاً مثل قبل کار می‌کنند.
// ============================================================
class JarvisAssistantModal extends StatefulWidget {
  const JarvisAssistantModal({super.key, this.onNavigate});

  final void Function(String section)? onNavigate;

  @override
  State<JarvisAssistantModal> createState() => _JarvisAssistantModalState();
}

class _JarvisAssistantModalState extends State<JarvisAssistantModal> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  // پیشنهادهای شروع گفتگو — دقیقاً منطبق با اکشن‌های واقعی سرور
  // (/api/assistant/command). فقط وقتی نمایش داده می‌شوند که گفتگو تازه است.
  static const List<String> _suggestedCommands = [
    "یک پیتزا پپرونی برام سفارش بده",
    "یک سیستم برای یک ساعت رزرو کن",
    "بهترین سیستم رو پیشنهاد بده",
    "ادمین فنی سالن رو صدا بزن",
  ];

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 200), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _send(JarvisStateProvider jarvis, AppState appState) {
    final text = _textController.text.trim();
    if (text.isEmpty || jarvis.isProcessing) return;
    jarvis.sendTextCommand(text, appState);
    _textController.clear();
    _scrollToBottom();
  }

  Future<void> _onMicTap(JarvisStateProvider jarvis, AppState appState) async {
    if (jarvis.handsFreeMode) {
      await jarvis.toggleHandsFreeConversation(appState);
    } else if (jarvis.isListening) {
      await jarvis.stopListeningAndProcess(appState);
      _scrollToBottom();
    } else {
      await jarvis.startListening(appState);
    }
  }

  @override
  Widget build(BuildContext context) {
    final jarvisState = Provider.of<JarvisStateProvider>(context);
    final appState = Provider.of<AppState>(context, listen: false);
    final pendingSection = jarvisState.consumePendingNavigationSection();
    if (pendingSection != null && widget.onNavigate != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
        widget.onNavigate!(pendingSection);
      });
    }
    final isFa = appState.language == 'fa';
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF10142B), Color(0xFF07040F)],
        ),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
        border: Border(
          top: BorderSide(color: GamingTheme.primary, width: 1.5),
        ),
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            // با باز شدن کیبورد، نوار ورودی بالای کیبورد بماند
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            child: Column(
              children: [
                // دستگیرهٔ کشیدن
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  width: 50,
                  height: 4,
                  decoration: BoxDecoration(
                    color: GamingTheme.primary.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // هدر فشرده: آواتار کوچک + وضعیت + کنترل‌ها
                _buildHeader(jarvisState, isFa),
                const Divider(height: 1, color: Colors.white10),

                // بخش گفتگو — قهرمان صفحه
                Expanded(
                  child: _buildChatArea(jarvisState, appState, isFa, isRtl),
                ),

                // نوار ورودی pill شکل
                _buildInputBar(jarvisState, appState, isFa),

                // خط وضعیت صدا
                _buildStatusLine(jarvisState, isFa),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---------- هدر ----------
  Widget _buildHeader(JarvisStateProvider jarvis, bool isFa) {
    final stateColor = _getStateColor(jarvis.avatarState);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          // آواتار زندهٔ فشرده — همان انیمیشن سایبری، در اندازهٔ کوچک
          JarvisAvatar(
            character: jarvis.character,
            state: jarvis.avatarState,
            voiceLevel: jarvis.voiceLevel,
            size: 44,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'JARVIS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2.5,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: stateColor,
                        boxShadow: [
                          BoxShadow(color: stateColor.withValues(alpha: 0.7), blurRadius: 6),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _getStateSubtitle(jarvis.avatarState, jarvis.isListening, isFa),
                  style: TextStyle(
                    color: stateColor.withValues(alpha: 0.9),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
          // قطع/وصل صدای پاسخ
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: Icon(
              jarvis.isMuted ? Icons.volume_off : Icons.volume_up,
              color: jarvis.isMuted ? GamingTheme.accentRed : GamingTheme.primary,
              size: 20,
            ),
            onPressed: jarvis.toggleMute,
          ),
          // منوی تنظیمات: پوستهٔ دستیار + پاک کردن گفتگو
          PopupMenuButton<String>(
            icon: const Icon(Icons.tune, color: Colors.white70, size: 20),
            color: GamingTheme.darkCardSolid,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.3)),
            ),
            onSelected: (value) {
              if (value == 'clear') {
                jarvis.clearHistory();
              } else if (value.startsWith('skin:')) {
                final name = value.substring(5);
                for (final skin in JarvisCharacter.values) {
                  if (skin.name == name) {
                    jarvis.setCharacter(skin);
                    break;
                  }
                }
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem<String>(
                enabled: false,
                height: 32,
                child: Text(
                  isFa ? 'پوستهٔ دستیار' : 'Assistant skin',
                  style: const TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
              ...JarvisCharacter.values.map((skin) {
                final selected = jarvis.character == skin;
                return PopupMenuItem<String>(
                  value: 'skin:${skin.name}',
                  child: Row(
                    children: [
                      Icon(
                        selected ? Icons.check_circle : Icons.circle_outlined,
                        color: selected ? GamingTheme.primary : Colors.white24,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _getSkinName(skin, isFa),
                        style: TextStyle(
                          color: selected ? GamingTheme.primary : Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'clear',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline, color: GamingTheme.accentRed, size: 16),
                    SizedBox(width: 8),
                    Text('پاک کردن گفتگو', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          // بستن
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.close, color: Colors.white70, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  // ---------- بخش گفتگو ----------
  Widget _buildChatArea(JarvisStateProvider jarvis, AppState appState, bool isFa, bool isRtl) {
    final items = <Widget>[
      for (final msg in jarvis.chatHistory) _buildMessageBubble(msg, isFa, isRtl),
      if (jarvis.isProcessing) _buildTypingRow(isRtl),
    ];
    // پیشنهادهای شروع فقط وقتی گفتگو تازه است — مثل صفحهٔ اول ChatGPT
    if (jarvis.chatHistory.length <= 1) {
      items.add(_buildSuggestions(jarvis, appState, isFa));
    }
    return ListView(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      children: items,
    );
  }

  Widget _buildMessageBubble(JarvisMessage msg, bool isFa, bool isRtl) {
    // در رابط راست‌به‌چپ، پیام‌های کاربر سمت چپ می‌نشینند (آینهٔ ChatGPT فارسی)
    final userAlign = isRtl ? Alignment.centerLeft : Alignment.centerRight;
    final botAlign = isRtl ? Alignment.centerRight : Alignment.centerLeft;
    final isUserSide = msg.isUser;

    return Align(
      alignment: isUserSide ? userAlign : botAlign,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUserSide
              ? GamingTheme.secondary.withValues(alpha: 0.28)
              : Colors.white.withValues(alpha: 0.045),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUserSide && isRtl ? 4 : 16),
            bottomRight: Radius.circular(isUserSide && !isRtl ? 4 : 16),
          ),
          border: Border.all(
            color: isUserSide
                ? GamingTheme.secondary.withValues(alpha: 0.45)
                : GamingTheme.primary.withValues(alpha: 0.25),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              msg.content,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13.5,
                height: 1.55,
                fontWeight: FontWeight.w600,
              ),
              textDirection: isFa ? TextDirection.rtl : TextDirection.ltr,
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (msg.action != null && msg.action != 'chitchat')
                  _buildActionBadge(msg.action!, isFa),
                const Spacer(),
                Text(
                  msg.timestamp,
                  style: const TextStyle(color: Colors.white24, fontSize: 9, fontFamily: 'monospace'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// نشان «عملیات واقعی انجام شد» زیر پیام جارویس — مثل رسید سفارش.
  Widget _buildActionBadge(String action, bool isFa) {
    final label = _actionLabel(action, isFa);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: GamingTheme.goldAccent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: GamingTheme.goldAccent.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, color: GamingTheme.goldAccent, size: 10),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: GamingTheme.goldAccent,
              fontSize: 9,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingRow(bool isRtl) {
    return Align(
      alignment: isRtl ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.045),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.25)),
        ),
        child: const TypingDots(color: GamingTheme.primary),
      ),
    );
  }

  Widget _buildSuggestions(JarvisStateProvider jarvis, AppState appState, bool isFa) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isFa ? 'می‌تونی از این‌ها شروع کنی:' : 'Try asking:',
            style: const TextStyle(color: Colors.white30, fontSize: 10, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final cmd in _suggestedCommands)
                ActionChip(
                  label: Text(
                    cmd,
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  backgroundColor: Colors.white.withValues(alpha: 0.05),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.2)),
                  ),
                  onPressed: () {
                    jarvis.sendTextCommand(cmd, appState);
                    _scrollToBottom();
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ---------- نوار ورودی ----------
  Widget _buildInputBar(JarvisStateProvider jarvis, AppState appState, bool isFa) {
    final micColor = jarvis.handsFreeMode
        ? GamingTheme.goldAccent
        : jarvis.isListening
            ? GamingTheme.secondary
            : GamingTheme.primary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 4),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 4, 4, 4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(26),
          border: Border.all(
            color: jarvis.isListening
                ? GamingTheme.primary.withValues(alpha: 0.6)
                : Colors.white.withValues(alpha: 0.12),
          ),
          boxShadow: [
            BoxShadow(color: GamingTheme.primary.withValues(alpha: 0.10), blurRadius: 18, spreadRadius: -4),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _textController,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                style: const TextStyle(color: Colors.white, fontSize: 13.5),
                decoration: InputDecoration(
                  hintText: jarvis.isListening && jarvis.liveTranscript.isNotEmpty
                      ? jarvis.liveTranscript
                      : (isFa ? 'از جارویس بپرس یا دستور بده…' : 'Ask or command Jarvis…'),
                  hintStyle: TextStyle(
                    color: jarvis.isListening ? GamingTheme.primary : Colors.white30,
                    fontSize: 12.5,
                  ),
                  border: InputBorder.none,
                ),
                onSubmitted: (_) => _send(jarvis, appState),
              ),
            ),
            // میکروفن: لمس = ضبط/ارسال، نگه‌داشتن = مکالمهٔ پیوسته (دست‌آزاد)
            GestureDetector(
              onTap: () => _onMicTap(jarvis, appState),
              onLongPress: () => jarvis.toggleHandsFreeConversation(appState),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: micColor.withValues(alpha: 0.16),
                  border: Border.all(color: micColor.withValues(alpha: 0.6)),
                ),
                child: Icon(
                  jarvis.handsFreeMode
                      ? Icons.record_voice_over_rounded
                      : jarvis.isListening
                          ? Icons.stop_rounded
                          : Icons.mic_none,
                  color: micColor,
                  size: 20,
                ),
              ),
            ),
            const SizedBox(width: 6),
            // دکمهٔ ارسال گرادیانی
            GestureDetector(
              onTap: () => _send(jarvis, appState),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: GamingTheme.ctaGradient,
                  boxShadow: [
                    BoxShadow(
                      color: GamingTheme.secondary.withValues(alpha: 0.4),
                      blurRadius: 14,
                      spreadRadius: -2,
                    ),
                  ],
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 19),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- خط وضعیت ----------
  Widget _buildStatusLine(JarvisStateProvider jarvis, bool isFa) {
    final String status;
    if (jarvis.isListening) {
      status = jarvis.liveTranscript.isNotEmpty
          ? jarvis.liveTranscript
          : (isFa ? 'در حال گوش دادن… صحبت کن' : 'Listening… speak now');
    } else if (jarvis.isSpeaking) {
      status = isFa ? 'جارویس در حال پاسخ صوتی است…' : 'Jarvis is speaking…';
    } else if (!jarvis.speechAvailable) {
      status = isFa
          ? 'تشخیص گفتار روی این دستگاه در دسترس نیست؛ با تایپ گفتگو کن'
          : 'Speech recognition unavailable; chat by typing';
    } else if (jarvis.handsFreeMode) {
      status = isFa ? 'حالت مکالمهٔ پیوسته فعال است؛ طبیعی صحبت کن' : 'Hands-free mode is on; speak naturally';
    } else {
      status = isFa
          ? 'لمس میکروفن = صحبت با جارویس • نگه‌داشتن = مکالمهٔ پیوسته'
          : 'Tap mic to talk • long-press for hands-free';
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 2),
      child: Text(
        status,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: jarvis.isListening ? GamingTheme.primary : Colors.white24,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  // ---------- برچسب‌ها ----------
  String _getSkinName(JarvisCharacter skin, bool isFa) {
    switch (skin) {
      case JarvisCharacter.cyberRobot:
        return isFa ? "ربات هوشمند" : "Cyber Robot";
      case JarvisCharacter.neonNetrunner:
        return isFa ? "هکر نئونی" : "Netrunner";
      case JarvisCharacter.mechGamer:
        return isFa ? "شاسی مبارز" : "Mech Gamer";
    }
  }

  String _getStateSubtitle(JarvisAvatarState state, bool listening, bool isFa) {
    if (listening) {
      return isFa ? "درحال ضبط صدا… صحبت کنید" : "LISTENING… SPEAK NOW";
    }
    switch (state) {
      case JarvisAvatarState.idle:
        return isFa ? "آنلاین — آمادهٔ گفتگو" : "ONLINE — READY TO CHAT";
      case JarvisAvatarState.talking:
        return isFa ? "در حال پردازش…" : "THINKING…";
      case JarvisAvatarState.happy:
        return isFa ? "عملیات با موفقیت انجام شد" : "OPERATION SUCCESSFUL";
      case JarvisAvatarState.error:
        return isFa ? "خطا در برقراری ارتباط" : "CONNECTION ERROR";
    }
  }

  Color _getStateColor(JarvisAvatarState state) {
    switch (state) {
      case JarvisAvatarState.idle:
        return GamingTheme.primary;
      case JarvisAvatarState.talking:
        return GamingTheme.secondary;
      case JarvisAvatarState.happy:
        return GamingTheme.goldAccent;
      case JarvisAvatarState.error:
        return GamingTheme.accentRed;
    }
  }

  String _actionLabel(String action, bool isFa) {
    const labels = <String, (String, String)>{
      'order_cafe_item': ('سفارش کافه ثبت شد', 'CAFE ORDER'),
      'extend_reservation': ('رزرو تمدید شد', 'RESERVATION EXTENDED'),
      'reserve_system': ('سیستم رزرو شد', 'SYSTEM RESERVED'),
      'cancel_reservation': ('رزرو لغو شد', 'RESERVATION CANCELLED'),
      'contact_admin': ('به ادمین اعلام شد', 'ADMIN NOTIFIED'),
      'send_chat_message': ('در چت ارسال شد', 'CHAT SENT'),
      'purchase_shop_item': ('خرید ثبت شد', 'PURCHASE DONE'),
      'search_shop': ('نتایج فروشگاه', 'SHOP RESULTS'),
      'list_tournaments': ('مسابقات', 'TOURNAMENTS'),
      'register_tournament': ('ثبت‌نام مسابقه', 'TOURNAMENT ENTRY'),
      'read_messages': ('پیام‌ها خوانده شد', 'MESSAGES READ'),
      'change_language': ('زبان تغییر کرد', 'LANGUAGE CHANGED'),
      'open_app_section': ('بخش باز شد', 'SECTION OPENED'),
      'show_wallet': ('کیف پول', 'WALLET'),
      'suggest_best_system': ('پیشنهاد سیستم', 'SYSTEM PICK'),
    };
    final l = labels[action];
    if (l == null) return action;
    return isFa ? l.$1 : l.$2;
  }
}

/// سه نقطهٔ «در حال تایپ» — همان حس ChatGPT وقتی دستیار داره فکر می‌کنه.
class TypingDots extends StatefulWidget {
  final Color color;
  const TypingDots({super.key, this.color = GamingTheme.primary});

  @override
  State<TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) const SizedBox(width: 5),
              Opacity(
                opacity: 0.25 + 0.75 * math.max(0.0, math.sin(_controller.value * 2 * math.pi - i * 0.9)),
                child: Container(
                  key: ValueKey('jarvis_typing_dot_$i'),
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.color,
                    boxShadow: [
                      BoxShadow(color: widget.color.withValues(alpha: 0.6), blurRadius: 6),
                    ],
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}
