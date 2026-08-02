import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class TournamentScreen extends StatefulWidget {
  const TournamentScreen({super.key});

  @override
  State<TournamentScreen> createState() => _TournamentScreenState();
}

class _TournamentScreenState extends State<TournamentScreen> {
  final _teamNameController = TextEditingController();
  final _leaderController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tournament intro header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isFa ? '🏆 کلوپ و لیگ مسابقات بازینو' : '🏆 Bazino Tournaments & Leagues',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isFa
                        ? 'آخرین تورنمنت‌ها و مسابقات حذفی سالن را مشاهده کنید، تیم خود را ثبت‌نام کنید و جدول درختی مراحل حذفی را به صورت زنده دنبال کنید.'
                        : 'Review upcoming tournament events, register your official competitive squads, and trace match advancement on brackets.',
                    style: const TextStyle(fontSize: 11, height: 1.5, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Active Tournaments list
          Text(
            isFa ? '🔥 مسابقات در جریان و ثبت‌نام فعال' : '🔥 Active & Registering leagues',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: appState.tournaments.length,
            itemBuilder: (context, index) {
              final t = appState.tournaments[index];

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            t.title,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: t.status == 'Active'
                                  ? GamingTheme.primary.withOpacity(0.15)
                                  : Colors.orangeAccent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              t.status == 'Active' ? (isFa ? 'ثبت‌نام فعال' : 'ACTIVE') : (isFa ? 'به زودی' : 'UPCOMING'),
                              style: TextStyle(
                                fontSize: 9,
                                color: t.status == 'Active' ? GamingTheme.primary : Colors.orangeAccent,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildRowMeta(isFa ? 'بازی:' : 'Game:', t.game),
                      _buildRowMeta(isFa ? 'تاریخ شروع:' : 'Starts at:', t.startDate),
                      _buildRowMeta(isFa ? 'ورودی مسابقات:' : 'Entry Fee:', '${t.registrationFee.toLocaleString()} ${isFa ? 'تومان' : 'T'}'),
                      _buildRowMeta(isFa ? 'تیم‌های ثبت‌نام شده:' : 'Registered Teams:', '${t.registeredTeamsCount} / ${t.maxTeams}'),
                      const SizedBox(height: 16),

                      // Registration Trigger
                      SizedBox(
                        width: double.infinity,
                        height: 38,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            _showRegisterDialog(context, t, appState);
                          },
                          icon: const Icon(Icons.add_box, color: Colors.black, size: 16),
                          label: Text(
                            isFa ? 'ثبت‌نام سریع تیم در تورنمنت' : 'Register squad',
                            style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: GamingTheme.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),

                      // Custom Bracket visualizer for CS2
                      if (t.id == 't1') ...[
                        const Divider(color: Color(0xFF22242D), height: 32),
                        Text(
                          isFa ? '📊 جدول درختی مراحل حذفی (CS2)' : '📊 CS2 Playoff Elimination Bracket',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                        ),
                        const SizedBox(height: 12),
                        _buildBracketVisual(isFa),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildRowMeta(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted)),
          Text(val, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildBracketVisual(bool isFa) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Round 1
          _buildBracketRound(
            isFa ? 'یک‌چهارم نهایی' : 'Round 1 (Quarter)',
            ['Persian Hawks vs Overlords', 'VIP Gladiators vs Cyber Storm'],
            ['Hawks (16-12)', 'Gladiators (16-8)'],
          ),
          const Icon(Icons.chevron_right, color: GamingTheme.primary, size: 20),
          // Semis
          _buildBracketRound(
            isFa ? 'نیمه نهایی' : 'Semifinals',
            ['Persian Hawks vs VIP Gladiators'],
            ['VIP Gladiators (16-14)'],
          ),
          const Icon(Icons.chevron_right, color: GamingTheme.primary, size: 20),
          // Finals
          _buildBracketRound(
            isFa ? 'فینال مسابقات' : 'Grand Finals',
            ['VIP Gladiators vs Zero Ping'],
            ['VIP Gladiators (16-14)🏆'],
          ),
        ],
      ),
    );
  }

  Widget _buildBracketRound(String roundTitle, List<String> matchNames, List<String> results) {
    return Container(
      width: 170,
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black38,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF22242D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            roundTitle,
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: GamingTheme.primary),
          ),
          const SizedBox(height: 6),
          for (int i = 0; i < matchNames.length; i++) ...[
            Text(
              matchNames[i],
              style: const TextStyle(fontSize: 9, color: Colors.white70),
            ),
            if (i < results.length)
              Text(
                results[i],
                style: const TextStyle(fontSize: 8, color: Colors.green, fontWeight: FontWeight.bold),
              ),
            const SizedBox(height: 4),
          ],
        ],
      ),
    );
  }

  void _showRegisterDialog(BuildContext context, Tournament t, AppState appState) {
    final isFa = appState.language == 'fa';
    _teamNameController.clear();
    _leaderController.clear();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: GamingTheme.darkCard,
          title: Text(
            isFa ? 'ثبت‌نام در ${t.game}' : 'Register squad for ${t.game}',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _teamNameController,
                decoration: InputDecoration(hintText: isFa ? 'نام رسمی تیم' : 'Squad Name'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _leaderController,
                decoration: InputDecoration(hintText: isFa ? 'گیمرتگ سرپرست تیم' : 'Leader Gamertag'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(isFa ? 'انصراف' : 'Cancel', style: const TextStyle(color: Colors.white70)),
            ),
            ElevatedButton(
              onPressed: () async {
                if (_teamNameController.text.isNotEmpty && _leaderController.text.isNotEmpty) {
                  final navigator = Navigator.of(context);
                  final messenger = ScaffoldMessenger.of(context);
                  final error = await appState.registerTeam(
                    t.id,
                    _teamNameController.text,
                    _leaderController.text,
                    [_leaderController.text],
                  );
                  navigator.pop();
                  if (error != null) {
                    messenger.showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
                    return;
                  }
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        isFa ? 'تیم شما با موفقیت ثبت‌نام شد!' : 'Squad registered successfully!',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: GamingTheme.primary),
              child: Text(isFa ? 'ثبت‌نام نهایی' : 'Confirm Registration', style: const TextStyle(color: Colors.black)),
            ),
          ],
        );
      },
    );
  }
}
