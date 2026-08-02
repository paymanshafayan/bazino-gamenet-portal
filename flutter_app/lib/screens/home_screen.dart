import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Banner Section
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E1400), Color(0xFF12141C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.2), width: 1.5),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(24),
                bottomRight: Radius.circular(24),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.flash_on, color: GamingTheme.primary, size: 24),
                    const SizedBox(width: 8),
                    Text(
                      isFa ? 'خوش آمدید به دنیای بازینو' : 'Welcome to Bazino Arena',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: GamingTheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  isFa
                      ? 'تجربه‌ای استثنایی با گرافیک نسل جدید، صندلی‌های ارگونومیک، مانیتورهای ۳۶۰ هرتز و محیطی رقابتی برای گیمرهای حرفه‌ای.'
                      : 'An outstanding experience with high-end RTX 4090 gaming rigs, custom ergonomic setups, ultra-fast 360Hz monitors, and premium service.',
                  style: TextStyle(fontSize: 13, height: 1.6, color: Colors.white.withValues(alpha: 0.8)),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    // Quick navigation tip
                  },
                  icon: const Icon(Icons.bolt, color: Colors.black),
                  label: Text(
                    isFa ? 'مشاهده کلوپ وفاداری' : 'Explore Loyalty Club',
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: GamingTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Live Match Board Section
          Text(
            isFa ? '⚽ تابلوی زنده بازی‌ها و امتیازها' : '⚽ Live Esports Matches',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildTeamBadge('Persian Hawks', true),
                      Column(
                        children: [
                          const Text(
                            '16 - 14',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: GamingTheme.primary,
                              fontFamily: 'monospace',
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: GamingTheme.accentRed.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              isFa ? 'پایان یافته' : 'FINISHED',
                              style: const TextStyle(fontSize: 9, color: GamingTheme.accentRed, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      _buildTeamBadge('Zero Ping', false),
                    ],
                  ),
                  const Divider(color: Color(0xFF22242D), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isFa ? 'مسابقات کانتر استرایک حذفی' : 'CS2 Elimination Cup',
                        style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                      ),
                      const Text(
                        'Map: Dust II (Grand Finals)',
                        style: TextStyle(fontSize: 11, color: GamingTheme.primary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Core Features Section
          Text(
            isFa ? '🎮 خدمات متمایز سالن' : '🎮 Premium Arena Highlights',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.3,
            children: [
              _buildFeatureCard(
                Icons.sports_esports,
                isFa ? 'کلوپ رقابتی' : 'Competitive Club',
                isFa ? 'سیستم‌های VIP' : 'RTX 4090 Rig',
                GamingTheme.primary,
              ),
              _buildFeatureCard(
                Icons.local_pizza,
                isFa ? 'کافه بوفه آنلاین' : 'Online Buffet',
                isFa ? 'تحویل روی میز' : 'Deliver to Desk',
                Colors.orangeAccent,
              ),
              _buildFeatureCard(
                Icons.workspace_premium,
                isFa ? 'مربیان مجرب' : 'Expert Coaches',
                isFa ? 'بهبود عملکرد بازی' : 'Rank Boost & Coaching',
                Colors.cyanAccent,
              ),
              _buildFeatureCard(
                Icons.military_tech,
                isFa ? 'باشگاه مشتریان' : 'Loyalty Hub',
                isFa ? 'تبدیل امتیاز به پول' : 'Cashback & Coupons',
                Colors.pinkAccent,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Meet the Expert Coaches
          Text(
            isFa ? '🏆 کادر مربیان ارشد سالن' : '🏆 Professional Esports Coaches',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 110,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildCoachCard('سیاوش طاهری (Sia_CS2)', 'مربی ارشد CS2 و آنالیزور حذفی', 'CS2 Master Coach'),
                _buildCoachCard('امیر کریمی (A_Karimi)', 'مربی تخصصی فیفا و دفاع فشرده', 'FIFA Pro Trainer'),
                _buildCoachCard('مهراد راد (Rampage)', 'مربی بازی‌های شوتر اول شخص', 'FPS Specialist'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamBadge(String name, bool isFirst) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: isFirst ? GamingTheme.primary.withValues(alpha: 0.1) : GamingTheme.accentRed.withValues(alpha: 0.1),
          radius: 20,
          child: Icon(
            isFirst ? Icons.military_tech : Icons.shield,
            color: isFirst ? GamingTheme.primary : GamingTheme.accentRed,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          name,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ],
    );
  }

  Widget _buildFeatureCard(IconData icon, String title, String subtitle, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 24),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoachCard(String name, String role, String enRole) {
    return Container(
      width: 220,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: GamingTheme.darkCard,
        border: Border.all(color: const Color(0xFF22242D)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            name,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: GamingTheme.primary),
          ),
          const SizedBox(height: 4),
          Text(
            role,
            style: const TextStyle(fontSize: 10, color: Colors.white70),
          ),
          Text(
            enRole,
            style: const TextStyle(fontSize: 9, color: GamingTheme.textMuted, fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }
}
