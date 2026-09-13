import 'dart:async';

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

  // ---- ورود با پیامک (OTP) — POST /api/auth/otp/{request,verify} ----
  bool _isOtpMode = false;
  bool _otpSent = false;
  int _otpCooldown = 0;
  Timer? _cooldownTimer;
  final TextEditingController _otpPhoneController = TextEditingController();
  final TextEditingController _otpCodeController = TextEditingController();

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _usernameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _otpPhoneController.dispose();
    _otpCodeController.dispose();
    super.dispose();
  }

  void _startOtpCooldown() {
    _otpCooldown = 60;
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _otpCooldown = _otpCooldown - 1);
      if (_otpCooldown <= 0) t.cancel();
    });
  }

  Future<void> _requestOtp(AppState appState, bool isFa) async {
    final phone = _otpPhoneController.text.trim();
    if (phone.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isFa ? 'شمارهٔ موبایل معتبر نیست.' : 'Invalid phone number.'), backgroundColor: Colors.redAccent),
      );
      return;
    }
    setState(() => _isSubmitting = true);
    final error = await appState.requestOtp(phone);
    if (!mounted) return;
    setState(() => _isSubmitting = false);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
      return;
    }
    setState(() => _otpSent = true);
    _startOtpCooldown();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(isFa ? 'کد تأیید پیامک شد (کد واردشده را بنویسید).' : 'Verification code sent via SMS.'), backgroundColor: GamingTheme.accentGreen),
    );
  }

  Future<void> _verifyOtp(AppState appState, bool isFa) async {
    final code = _otpCodeController.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isFa ? 'کد ۶ رقمی را وارد کنید.' : 'Enter the 6-digit code.'), backgroundColor: Colors.redAccent),
      );
      return;
    }
    setState(() => _isSubmitting = true);
    final error = await appState.verifyOtp(_otpPhoneController.text.trim(), code);
    if (!mounted) return;
    setState(() => _isSubmitting = false);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isFa ? 'خوش آمدید @${appState.user.username}! با موفقیت وارد شدید.' : 'Welcome @${appState.user.username}!'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.pop(context);
  }

  Widget _buildOtpCard(AppState appState, bool isFa) {
    return GlassCard(
      radius: 24,
      glow: GamingTheme.goldAccent,
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            isFa ? '📱 ورود با پیامک' : '📱 Phone login',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.goldAccent),
          ),
          const SizedBox(height: 6),
          Text(
            isFa ? 'شمارهٔ خود را وارد کنید؛ کد ۶ رقمی برایتان پیامک می‌شود. اگر حساب نداشته باشید، خودکار ساخته می‌شود.' : 'Enter your phone; we will SMS a 6-digit code. An account is created automatically if you are new.',
            style: const TextStyle(fontSize: 10.5, color: Colors.white54, height: 1.7),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _otpPhoneController,
            keyboardType: TextInputType.phone,
            enabled: !_otpSent,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: _decoration(isFa ? 'شمارهٔ موبایل (مثلاً +90 5xx…)' : 'Phone (e.g. +90 5xx…)', Icons.phone_iphone, isFa),
          ),
          if (!_otpSent) ...[
            const SizedBox(height: 18),
            NeonGradientButton(
              label: isFa ? 'دریافت کد تأیید' : 'Send verification code',
              icon: Icons.sms_rounded,
              loading: _isSubmitting,
              onPressed: () => _requestOtp(appState, isFa),
            ),
          ] else ...[
            const SizedBox(height: 16),
            TextField(
              controller: _otpCodeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(color: GamingTheme.goldAccent, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: 8),
              decoration: _decoration(isFa ? 'کد ۶ رقمی' : '6-digit code', Icons.password, isFa),
            ),
            const SizedBox(height: 14),
            NeonGradientButton(
              label: isFa ? 'تأیید و ورود' : 'Verify & login',
              icon: Icons.login_rounded,
              loading: _isSubmitting,
              onPressed: () => _verifyOtp(appState, isFa),
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: (_otpCooldown > 0 || _isSubmitting)
                    ? null
                    : () {
                        setState(() {
                          _otpSent = false;
                          _otpCodeController.clear();
                        });
                      },
                child: Text(
                  _otpCooldown > 0
                      ? (isFa ? 'ارسال مجدد کد تا $_otpCooldown ثانیه' : 'Resend code in $_otpCooldown s')
                      : (isFa ? 'ویرایش شماره / ارسال مجدد' : 'Change number / resend'),
                  style: const TextStyle(color: GamingTheme.textMuted, fontSize: 11),
                ),
              ),
            ),
          ],
        ],
      ),
    );
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
      fillColor: Colors.white.withValues(alpha: 0.04),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.18)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.18)),
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
          _isOtpMode
              ? (isFa ? 'ورود با پیامک' : 'SMS Login')
              : (_isLoginMode ? (isFa ? 'ورود گیمرها' : 'Gamer Login') : (isFa ? 'عضویت در کلوپ' : 'Club Registration')),
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
                      const Center(
                        child: HexagonBadge(
                          size: 84,
                          child: Icon(Icons.sports_esports_rounded, size: 34, color: Colors.white),
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

                      // انتخاب روش ورود: رمز/ثبت‌نام یا پیامک
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ChoiceChip(
                            label: Text(isFa ? 'ورود با رمز / ثبت‌نام' : 'Password / Sign-up', style: const TextStyle(fontSize: 10.5)),
                            selected: !_isOtpMode,
                            selectedColor: GamingTheme.primary,
                            backgroundColor: Colors.white.withValues(alpha: 0.05),
                            labelStyle: TextStyle(color: !_isOtpMode ? Colors.black : Colors.white70, fontSize: 10.5),
                            onSelected: _isSubmitting ? null : (v) => setState(() => _isOtpMode = false),
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: Text(isFa ? 'ورود با پیامک' : 'SMS login', style: const TextStyle(fontSize: 10.5)),
                            selected: _isOtpMode,
                            selectedColor: GamingTheme.goldAccent,
                            backgroundColor: Colors.white.withValues(alpha: 0.05),
                            labelStyle: TextStyle(color: _isOtpMode ? Colors.black : Colors.white70, fontSize: 10.5),
                            onSelected: _isSubmitting ? null : (v) => setState(() => _isOtpMode = true),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      if (_isOtpMode)
                        _buildOtpCard(appState, isFa)
                      else
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
                                  icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: GamingTheme.primary.withValues(alpha: 0.6)),
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

                      if (!_isOtpMode)
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
