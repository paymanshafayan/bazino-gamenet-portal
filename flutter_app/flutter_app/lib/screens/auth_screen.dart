import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoginMode = true;
  bool _isSubmitting = false;

  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitForm(AppState appState, BuildContext context) async {
    if (!_formKey.currentState!.validate() || _isSubmitting) return;
    setState(() => _isSubmitting = true);

    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    final isFa = appState.language == 'fa';

    // Real login/register — the server checks the real (hashed) password and
    // returns a real per-user token, or a real error if something's wrong.
    final String? error = _isLoginMode
        ? await appState.login(username, password)
        : await appState.register(username, email, password, phone);

    if (!context.mounted) return;
    setState(() => _isSubmitting = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.redAccent,
          content: Text(error, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.green,
        content: Text(
          _isLoginMode
              ? (isFa ? 'خوش آمدید @${appState.user.username}! با موفقیت وارد شدید.' : 'Welcome back @${appState.user.username}!')
              : (isFa ? 'ثبت‌نام با موفقیت انجام شد! خوش آمدید @${appState.user.username}.' : 'Registration successful! Welcome @${appState.user.username}.'),
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
    );
    Navigator.pop(context);
  }

  InputDecoration _decoration(String label, IconData icon, bool isFa, {Widget? suffix}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: GamingTheme.primary, size: 20),
      suffixIcon: suffix,
      labelStyle: const TextStyle(color: GamingTheme.textMuted, fontSize: 13),
      filled: true,
      fillColor: Colors.white.withOpacity(0.04),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: GamingTheme.primary.withOpacity(0.18)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: GamingTheme.primary.withOpacity(0.18)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: GamingTheme.primary, width: 1.4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return Scaffold(
      backgroundColor: GamingTheme.darkBg,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(
          _isLoginMode ? (isFa ? 'ورود گیمرها' : 'Gamer Login') : (isFa ? 'عضویت در کلوپ' : 'Club Registration'),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: GamingTheme.primary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: GamingTheme.bgGradient),
        child: Stack(
          fit: StackFit.expand,
          children: [
            CustomPaint(painter: CircuitBackgroundPainter(color: GamingTheme.secondary), size: Size.infinite),
            Directionality(
              textDirection: appState.textDirection,
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 70, 20, 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: HexagonBadge(
                          size: 84,
                          child: const Icon(Icons.sports_esports_rounded, size: 34, color: Colors.white),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Center(
                        child: ShaderMask(
                          shaderCallback: (bounds) => GamingTheme.brandGradient.createShader(bounds),
                          child: Text(
                            isFa ? 'بازینو آرنا' : 'BAZINO ARENA',
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.5),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Center(
                        child: Text(
                          isFa ? 'به جمع گیمرهای وفادار ما بپیوندید' : 'Join our premium esports guild',
                          style: const TextStyle(fontSize: 12, color: GamingTheme.textMuted),
                        ),
                      ),
                      const SizedBox(height: 28),

                      GlassCard(
                        radius: 24,
                        glow: GamingTheme.secondary,
                        padding: const EdgeInsets.all(22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Username field (both modes)
                            TextFormField(
                              controller: _usernameController,
                              style: const TextStyle(color: Colors.white, fontSize: 14),
                              decoration: _decoration(isFa ? 'نام کاربری (گیمر تگ)' : 'Username (GamerTag)', Icons.person, isFa),
                              validator: (value) => (value == null || value.trim().isEmpty)
                                  ? (isFa ? 'لطفاً نام کاربری را وارد کنید' : 'Please enter your username')
                                  : null,
                            ),
                            const SizedBox(height: 16),

                            // Email + phone only shown for registration — a login only ever needs username+password
                            if (!_isLoginMode) ...[
                              TextFormField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                                decoration: _decoration(isFa ? 'آدرس ایمیل' : 'Email Address', Icons.email, isFa),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) return isFa ? 'لطفاً آدرس ایمیل را وارد کنید' : 'Please enter your email';
                                  if (!value.contains('@')) return isFa ? 'آدرس ایمیل نامعتبر است' : 'Invalid email address';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                style: const TextStyle(color: Colors.white, fontSize: 14),
                                decoration: _decoration(isFa ? 'شماره موبایل' : 'Phone Number', Icons.phone_iphone, isFa),
                                validator: (value) => (value == null || value.trim().isEmpty)
                                    ? (isFa ? 'لطفاً شماره تماس را وارد کنید' : 'Please enter your phone number')
                                    : null,
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Real password field — used for both real login and real registration
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(color: Colors.white, fontSize: 14),
                              decoration: _decoration(
                                isFa ? 'رمز عبور' : 'Password',
                                Icons.lock,
                                isFa,
                                suffix: IconButton(
                                  icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: GamingTheme.primary.withOpacity(0.6)),
                                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                ),
                              ),
                              validator: (value) => (value == null || value.length < 4)
                                  ? (isFa ? 'رمز عبور باید حداقل ۴ کاراکتر باشد' : 'Password must be at least 4 characters')
                                  : null,
                            ),
                            const SizedBox(height: 24),

                            NeonGradientButton(
                              label: _isLoginMode ? (isFa ? 'ورود به حساب کاربری' : 'Login to Account') : (isFa ? 'ثبت‌نام و عضویت' : 'Register & Create Account'),
                              icon: Icons.arrow_forward_rounded,
                              loading: _isSubmitting,
                              onPressed: () => _submitForm(appState, context),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      TextButton(
                        onPressed: _isSubmitting ? null : () => setState(() => _isLoginMode = !_isLoginMode),
                        child: Text(
                          _isLoginMode
                              ? (isFa ? 'حساب کاربری ندارید؟ اینجا ثبت‌نام کنید' : "Don't have an account? Register here")
                              : (isFa ? 'قبلاً ثبت‌نام کرده‌اید؟ وارد شوید' : 'Already have an account? Login'),
                          style: const TextStyle(color: GamingTheme.primary, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
