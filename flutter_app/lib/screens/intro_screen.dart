import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class BazinoIntroScreen extends StatefulWidget {
  const BazinoIntroScreen({super.key, required this.onFinish});

  final Future<void> Function() onFinish;

  @override
  State<BazinoIntroScreen> createState() => _BazinoIntroScreenState();
}

class _BazinoIntroScreenState extends State<BazinoIntroScreen> {
  late final VideoPlayerController _controller;
  bool _isReady = false;
  bool _isFinishing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('assets/videos/bazino.mp4')
      ..setLooping(false)
      ..initialize().then((_) async {
        if (!mounted) return;
        setState(() => _isReady = true);
        await _controller.play();
      }).catchError((error) {
        if (!mounted) return;
        setState(() => _error = error.toString());
      });
    _controller.addListener(_videoListener);
  }

  void _videoListener() {
    if (!_controller.value.isInitialized || _isFinishing) return;
    final duration = _controller.value.duration;
    final position = _controller.value.position;
    if (duration != Duration.zero && position >= duration - const Duration(milliseconds: 250)) {
      _finishIntro();
    }
  }

  Future<void> _finishIntro() async {
    if (_isFinishing) return;
    _isFinishing = true;
    try {
      await _controller.pause();
    } catch (_) {
      // Ignore video state errors while leaving the intro.
    }
    await widget.onFinish();
  }

  @override
  void dispose() {
    _controller.removeListener(_videoListener);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            top: 64,
            child: _buildVideoArea(),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Container(
                height: 64,
                padding: const EdgeInsets.symmetric(horizontal: 18),
                decoration: const BoxDecoration(
                  color: Color(0xFF111827),
                  boxShadow: [
                    BoxShadow(color: Color(0x99000000), blurRadius: 18, offset: Offset(0, 8)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF00E5FF), Color(0xFFFFB800)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: const Icon(Icons.sports_esports_rounded, color: Colors.black, size: 22),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'بازی نو',
                        textDirection: TextDirection.rtl,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _finishIntro,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFFFFD166),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.skip_next_rounded, size: 20),
                      label: const Text(
                        'Skip',
                        style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.4),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoArea() {
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.movie_filter_rounded, color: Color(0xFFFFD166), size: 54),
              const SizedBox(height: 16),
              const Text(
                'Intro video could not be loaded.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _finishIntro,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFD166),
                  foregroundColor: Colors.black,
                ),
                child: const Text('Continue'),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isReady) {
      return const Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF00E5FF)),
        ),
      );
    }

    return Center(
      child: AspectRatio(
        aspectRatio: _controller.value.aspectRatio,
        child: VideoPlayer(_controller),
      ),
    );
  }
}
