import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/l10n.dart';
import '../auth/auth_controller.dart';
import '../core/prefs.dart';

/// صفحهٔ ورود — تنها صفحه‌ای که بدون نشست دیده می‌شود.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late final TextEditingController _server = TextEditingController(text: Prefs.serverUrl);
  late final TextEditingController _username = TextEditingController();
  late final TextEditingController _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String? _errorKey;

  @override
  void dispose() {
    _server.dispose();
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final lang = context.read<AppLang>();
    final server = _server.text.trim();
    final user = _username.text.trim();
    final pass = _password.text;
    if (server.isEmpty || user.isEmpty || pass.isEmpty) {
      setState(() => _errorKey = 'fillAllFields');
      return;
    }
    setState(() {
      _busy = true;
      _errorKey = null;
    });
    final err = await AuthController.instance.login(server, user, pass);
    if (!mounted) return;
    if (err != null) {
      setState(() {
        _busy = false;
        _errorKey = err;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(lang.t(err)), backgroundColor: Colors.red.shade700),
      );
    }
    // موفق → AuthGate خودش صفحه را عوض می‌کند؛ _busy=true می‌ماند تا سوییچ
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppLang>();
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E17),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // برندینگ
                Container(
                  width: 84,
                  height: 84,
                  alignment: Alignment.center,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFB800),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFFB800).withValues(alpha: 0.35),
                        blurRadius: 40,
                      ),
                    ],
                  ),
                  child: const Text('B', style: TextStyle(fontSize: 44, fontWeight: FontWeight.w900, color: Colors.black)),
                ),
                Text(
                  lang.t('appName'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  lang.t('login'),
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade400, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 32),

                _field(
                  controller: _server,
                  label: lang.t('serverAddress'),
                  hint: lang.t('serverHint'),
                  icon: Icons.dns_outlined,
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 14),
                _field(
                  controller: _username,
                  label: lang.t('username'),
                  icon: Icons.person_outline,
                ),
                const SizedBox(height: 14),
                _field(
                  controller: _password,
                  label: lang.t('password'),
                  icon: Icons.lock_outline,
                  obscure: _obscure,
                  toggle: () => setState(() => _obscure = !_obscure),
                ),
                if (_errorKey != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    lang.t(_errorKey!),
                    style: TextStyle(color: Colors.red.shade300, fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFFFB800),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                        )
                      : Text(lang.t('loginBtn'), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                ),
                const SizedBox(height: 16),
                TextButton.icon(
                  onPressed: lang.toggle,
                  icon: const Icon(Icons.translate, size: 18),
                  label: Text(lang.isFa ? 'English' : 'فارسی'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hint,
    bool obscure = false,
    VoidCallback? toggle,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: TextStyle(color: Colors.grey.shade500, fontWeight: FontWeight.w700),
        hintStyle: TextStyle(color: Colors.grey.shade600, fontSize: 12),
        prefixIcon: Icon(icon, color: const Color(0xFFFFB800), size: 20),
        suffixIcon: toggle == null
            ? null
            : IconButton(
                onPressed: toggle,
                icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    color: Colors.grey.shade500, size: 20),
              ),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.05),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFFFB800), width: 1.4),
        ),
      ),
    );
  }
}
