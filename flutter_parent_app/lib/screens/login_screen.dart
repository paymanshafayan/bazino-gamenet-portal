import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../providers/parent_state.dart';
import '../widgets/glass_card.dart';

class ParentLoginScreen extends StatefulWidget {
  const ParentLoginScreen({super.key});

  @override
  State<ParentLoginScreen> createState() => _ParentLoginScreenState();
}

class _ParentLoginScreenState extends State<ParentLoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    final parentState = Provider.of<ParentState>(context, listen: false);
    final ok = await parentState.login(_phoneController.text.trim(), _passwordController.text.trim());
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(parentState.error ?? 'خطا در ورود'), backgroundColor: ParentTheme.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = context.watch<ParentState>().isLoading;

    return Scaffold(
      backgroundColor: ParentTheme.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              // Logo
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: ParentTheme.primary,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: ParentTheme.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8)),
                    ],
                  ),
                  child: const Icon(Icons.family_restroom_rounded, color: Colors.white, size: 40),
                ),
              ),
              const SizedBox(height: 20),
              const Center(
                child: Text('بازینو والدین', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text('نظارت بر حضور و فعالیت فرزند در گیم‌نت',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: ParentTheme.textMuted)),
              ),
              const SizedBox(height: 40),
              ParentCard(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('ورود والدین', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ParentTheme.textDark)),
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          labelText: 'شماره موبایل',
                          hintText: '0912...',
                          prefixIcon: const Icon(Icons.phone_outlined),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: ParentTheme.bgSecondary,
                        ),
                        validator: (v) => (v == null || v.isEmpty) ? 'الزامی' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscure,
                        decoration: InputDecoration(
                          labelText: 'رمز عبور',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setState(() => _obscure = !_obscure),
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: ParentTheme.bgSecondary,
                        ),
                        validator: (v) => (v == null || v.isEmpty) ? 'الزامی' : null,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: isLoading ? null : _login,
                          child: isLoading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('ورود به پنل والدین'),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: ParentTheme.primary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(12)),
                        child: const Row(
                          children: [
                            Icon(Icons.info_outline, size: 16, color: ParentTheme.primary),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text('حساب والدین توسط پذیرش گیم‌نت ساخته می‌شود و به فرزند لینک می‌گردد.',
                                  style: TextStyle(fontSize: 11, color: ParentTheme.textMuted)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Mock hint
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.amber.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.amber.withValues(alpha: 0.2))),
                child: const Row(
                  children: [
                    Icon(Icons.bug_report_outlined, size: 16, color: Colors.amber),
                    SizedBox(width: 8),
                    Expanded(child: Text('حالت آزمایشی: هر شماره/رمزی را وارد کنید تا وارد شوید (mock data)', style: TextStyle(fontSize: 11, color: Color(0xFF92400E)))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
