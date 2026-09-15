import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class TournamentScreen extends StatefulWidget {
  final int initialTab;
  const TournamentScreen({super.key, this.initialTab = 0});

  @override
  State<TournamentScreen> createState() => _TournamentScreenState();
}

class _TournamentScreenState extends State<TournamentScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _tourneyPayMethod = 'onsite';
  final _teamNameController = TextEditingController();
  final _leaderController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this, initialIndex: widget.initialTab.clamp(0, 4));
  }

  @override
  void didUpdateWidget(covariant TournamentScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) {
      _tabController.animateTo(widget.initialTab.clamp(0, 4));
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _teamNameController.dispose();
    _leaderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return Column(
      children: [
        // Intro header (portal parity: games.detail, tournaments, etc)
        Padding(
          padding: const EdgeInsets.all(16),
          child: GlassCard(
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
                      ? 'تورنمنت‌های هفتگی، ویژه، جدول فصل و براکت زنده — مثل نسخه پرتال وب (hub.weekly / hub.special / hub.season / hub.brackets / hub.register).'
                      : 'Weekly, Special, Season leaderboard and live brackets — parity with portal EventsTab.',
                  style: const TextStyle(fontSize: 11, height: 1.5, color: Colors.white70),
                ),
              ],
            ),
          ),
        ),
        // Tabs
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: GamingTheme.darkCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.15)),
          ),
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: GamingTheme.primary,
            unselectedLabelColor: Colors.white54,
            indicatorColor: GamingTheme.primary,
            labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            tabs: [
              Tab(text: isFa ? 'هفتگی' : 'Weekly'),
              Tab(text: isFa ? 'ویژه' : 'Special'),
              Tab(text: isFa ? 'فصل' : 'Season'),
              Tab(text: isFa ? 'براکت' : 'Brackets'),
              Tab(text: isFa ? 'ثبت‌نام' : 'Register'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildWeeklyTab(appState, isFa),
              _buildSpecialTab(appState, isFa),
              _buildSeasonTab(appState, isFa),
              _buildBracketsTab(appState, isFa),
              _buildRegisterTab(appState, isFa),
            ],
          ),
        ),
      ],
    );
  }

  // ---- Weekly ----
  Widget _buildWeeklyTab(AppState appState, bool isFa) {
    final weekly = appState.weeklyTournaments.isNotEmpty ? appState.weeklyTournaments : appState.tournaments.where((t) => t.kind == 'weekly').toList();
    if (weekly.isEmpty) {
      return _emptyState(isFa ? 'تورنمنت هفتگی فعالی یافت نشد.' : 'No weekly tournaments found.', isFa);
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: weekly.length,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _tournamentCard(weekly[index], appState, isFa),
      ),
    );
  }

  // ---- Special ----
  Widget _buildSpecialTab(AppState appState, bool isFa) {
    final special = appState.specialTournaments.isNotEmpty ? appState.specialTournaments : appState.tournaments.where((t) => t.kind == 'special').toList();
    if (special.isEmpty) {
      return _emptyState(isFa ? 'تورنمنت ویژه‌ای یافت نشد.' : 'No special tournaments.', isFa);
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: special.length,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _tournamentCard(special[index], appState, isFa),
      ),
    );
  }

  // ---- Season ----
  Widget _buildSeasonTab(AppState appState, bool isFa) {
    final season = appState.seasonInfo;
    if (season == null) {
      return _emptyState(isFa ? 'فصل جاری هنوز تعریف نشده.' : 'No active season.', isFa);
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GlassCard(
            padding: const EdgeInsets.all(16),
            glow: GamingTheme.secondary,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(season.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: GamingTheme.goldAccent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6)),
                      child: Text(isFa ? '${season.daysLeft} روز مانده' : '${season.daysLeft} days left', style: const TextStyle(fontSize: 10, color: GamingTheme.goldAccent, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(isFa ? 'سال ${season.year} — از ${season.startsAt} تا ${season.endsAt}' : 'Year ${season.year} — ${season.startsAt} to ${season.endsAt}', style: const TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(isFa ? '🏆 سه نفر برتر فصل' : '🏆 Top 3 Season', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          ...season.top3.asMap().entries.map((e) {
            final s = e.value;
            final rank = e.key + 1;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                padding: const EdgeInsets.all(12),
                glow: rank == 1 ? GamingTheme.goldAccent : GamingTheme.primary,
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(color: rank == 1 ? GamingTheme.goldAccent : GamingTheme.primary, shape: BoxShape.circle),
                      child: Center(child: Text('$rank', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(s.name.isNotEmpty ? s.name : s.username, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      Text('${s.points} pts • ${s.wins}W ${s.seconds}S ${s.thirds}T • ${s.played} played', style: const TextStyle(color: Colors.white54, fontSize: 10)),
                    ])),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 16),
          Text(isFa ? '📋 جدول کامل فصل' : '📋 Full Season Standings', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 8),
          ...season.standings.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: GlassCard(
                  padding: const EdgeInsets.all(10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(s.name.isNotEmpty ? s.name : s.username, style: const TextStyle(color: Colors.white, fontSize: 11))),
                      Text('${s.points} pts', style: const TextStyle(color: GamingTheme.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  // ---- Brackets ----
  Widget _buildBracketsTab(AppState appState, bool isFa) {
    // Use liveTournament if available, else first tournament's bracket
    Tournament? t;
    if (appState.tournaments.isNotEmpty) t = appState.tournaments.first;
    if (appState.liveTournament != null && appState.liveTournament!['id'] != null) {
      // try to find matching tournament
      final liveId = appState.liveTournament!['id'].toString();
      t = appState.tournaments.where((e) => e.id == liveId).isNotEmpty ? appState.tournaments.firstWhere((e) => e.id == liveId) : t;
    }
    if (t == null) {
      return _emptyState(isFa ? 'براکتی برای نمایش وجود ندارد.' : 'No bracket available.', isFa);
    }
    final bracket = t.bracket;
    final hasBracket = bracket.round1.isNotEmpty || bracket.semis.isNotEmpty || bracket.finals.isNotEmpty;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GlassCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t.titleFor(appState.language), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                if (t.liveState == 'live')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.redAccent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6)),
                    child: Text(isFa ? '🔴 زنده' : '🔴 LIVE', style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (hasBracket) _buildBracketVisualReal(bracket, isFa) else _buildBracketVisual(isFa),
          const SizedBox(height: 16),
          if (t.bracketTotal > 0)
            Text(isFa ? 'پیشرفت: ${t.bracketDone}/${t.bracketTotal} بازی' : 'Progress: ${t.bracketDone}/${t.bracketTotal} matches', style: const TextStyle(color: Colors.white54, fontSize: 11)),
        ],
      ),
    );
  }

  // ---- Register (all tournaments with register action) ----
  Widget _buildRegisterTab(AppState appState, bool isFa) {
    final all = appState.tournaments.isNotEmpty ? appState.tournaments : [...appState.weeklyTournaments, ...appState.specialTournaments];
    if (all.isEmpty) {
      return _emptyState(isFa ? 'تورنمنتی برای ثبت‌نام وجود ندارد.' : 'No tournaments to register.', isFa);
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: all.length,
      itemBuilder: (context, index) {
        final t = all[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _tournamentCard(t, appState, isFa, showRegister: true),
        );
      },
    );
  }

  Widget _tournamentCard(Tournament t, AppState appState, bool isFa, {bool showRegister = true}) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(t.titleFor(appState.language), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white))),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: t.status == 'Active' || t.liveState == 'live' ? GamingTheme.primary.withValues(alpha: 0.15) : Colors.orangeAccent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  t.liveState == 'live' ? (isFa ? 'زنده' : 'LIVE') : t.status == 'Active' ? (isFa ? 'ثبت‌نام فعال' : 'ACTIVE') : (isFa ? 'به زودی' : 'UPCOMING'),
                  style: TextStyle(fontSize: 9, color: t.liveState == 'live' || t.status == 'Active' ? GamingTheme.primary : Colors.orangeAccent, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildRowMeta(isFa ? 'بازی:' : 'Game:', t.game),
          _buildRowMeta(isFa ? 'تاریخ شروع:' : 'Starts at:', t.startDate),
          _buildRowMeta(isFa ? 'نوع:' : 'Kind:', t.kind.isNotEmpty ? t.kind : (t.isWeekly ? 'weekly' : t.isSpecial ? 'special' : '-')),
          _buildRowMeta(isFa ? 'ورودی:' : 'Entry Fee:', '${t.registrationFee.toLocaleString()} ${isFa ? 'تومان' : 'T'}'),
          _buildRowMeta(isFa ? 'تیم‌ها:' : 'Teams:', '${t.teamCount > 0 ? t.teamCount : t.registeredTeamsCount} / ${t.maxTeams}'),
          if (t.prizes.first != null || t.prizes.second != null || t.prizes.third != null) ...[
            const SizedBox(height: 6),
            Text(isFa ? 'جوایز:' : 'Prizes:', style: const TextStyle(fontSize: 10, color: GamingTheme.goldAccent, fontWeight: FontWeight.bold)),
            if (t.prizes.first != null) Text('🥇 ${t.prizes.first}', style: const TextStyle(fontSize: 10, color: Colors.white70)),
            if (t.prizes.second != null) Text('🥈 ${t.prizes.second}', style: const TextStyle(fontSize: 10, color: Colors.white70)),
            if (t.prizes.third != null) Text('🥉 ${t.prizes.third}', style: const TextStyle(fontSize: 10, color: Colors.white70)),
          ],
          if (showRegister) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 42,
              child: NeonGradientButton(
                label: isFa ? 'ثبت‌نام تیم' : 'Register squad',
                icon: Icons.add_box,
                onPressed: () => _showRegisterDialog(context, t, appState),
              ),
            ),
          ],
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
          Flexible(child: Text(val, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white), textAlign: TextAlign.end)),
        ],
      ),
    );
  }

  Widget _emptyState(String msg, bool isFa) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: GlassCard(
          padding: const EdgeInsets.all(20),
          child: Text(msg, style: const TextStyle(color: Colors.white54, fontSize: 12), textAlign: TextAlign.center),
        ),
      ),
    );
  }

  Widget _buildBracketVisual(bool isFa) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildBracketRound(isFa ? 'یک‌چهارم نهایی' : 'Round 1 (Quarter)', ['Persian Hawks vs Overlords', 'VIP Gladiators vs Cyber Storm'], ['Hawks (16-12)', 'Gladiators (16-8)']),
          const Icon(Icons.chevron_right, color: GamingTheme.primary, size: 20),
          _buildBracketRound(isFa ? 'نیمه نهایی' : 'Semifinals', ['Persian Hawks vs VIP Gladiators'], ['VIP Gladiators (16-14)']),
          const Icon(Icons.chevron_right, color: GamingTheme.primary, size: 20),
          _buildBracketRound(isFa ? 'فینال' : 'Grand Finals', ['VIP Gladiators vs Zero Ping'], ['VIP Gladiators (16-14)🏆']),
        ],
      ),
    );
  }

  Widget _buildBracketVisualReal(TournamentBracket bracket, bool isFa) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (bracket.round1.isNotEmpty) _buildBracketRoundReal(isFa ? 'یک‌چهارم' : 'Round 1', bracket.round1),
          if (bracket.round1.isNotEmpty) const Icon(Icons.chevron_right, color: GamingTheme.primary, size: 20),
          if (bracket.semis.isNotEmpty) _buildBracketRoundReal(isFa ? 'نیمه نهایی' : 'Semis', bracket.semis),
          if (bracket.semis.isNotEmpty) const Icon(Icons.chevron_right, color: GamingTheme.primary, size: 20),
          if (bracket.finals.isNotEmpty) _buildBracketRoundReal(isFa ? 'فینال' : 'Finals', bracket.finals),
        ],
      ),
    );
  }

  Widget _buildBracketRound(String roundTitle, List<String> matchNames, List<String> results) {
    return Container(
      width: 170,
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: Colors.black38, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF22242D))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(roundTitle, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
          const SizedBox(height: 6),
          for (int i = 0; i < matchNames.length; i++) ...[
            Text(matchNames[i], style: const TextStyle(fontSize: 9, color: Colors.white70)),
            if (i < results.length) Text(results[i], style: const TextStyle(fontSize: 8, color: Colors.green, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
          ],
        ],
      ),
    );
  }

  Widget _buildBracketRoundReal(String roundTitle, List<BracketMatch> matches) {
    return Container(
      width: 190,
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: Colors.black38, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF22242D))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(roundTitle, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
          const SizedBox(height: 6),
          for (final m in matches) ...[
            Text('${m.teamA} vs ${m.teamB}', style: const TextStyle(fontSize: 9, color: Colors.white70)),
            if (m.winner != null) Text('Winner: ${m.winner} ${m.scoreA != null ? '(${m.scoreA}-${m.scoreB})' : ''}', style: const TextStyle(fontSize: 8, color: Colors.green, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
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
        return StatefulBuilder(
          builder: (context, setDialog) => AlertDialog(
            backgroundColor: GamingTheme.darkCardSolid,
            title: Text(isFa ? 'ثبت‌نام در ${t.game}' : 'Register squad for ${t.game}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: _teamNameController, decoration: InputDecoration(hintText: isFa ? 'نام رسمی تیم' : 'Squad Name')),
                const SizedBox(height: 8),
                TextField(controller: _leaderController, decoration: InputDecoration(hintText: isFa ? 'گیمرتگ سرپرست تیم' : 'Leader Gamertag')),
                if (t.registrationFee > 0) ...[
                  const SizedBox(height: 14),
                  Text(isFa ? 'هزینهٔ ثبت‌نام: ${t.registrationFee.toStringAsFixed(0)} لیر — روش پرداخت:' : 'Entry fee: ${t.registrationFee.toStringAsFixed(0)} TL — pay with:', style: const TextStyle(color: GamingTheme.goldAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: Text(isFa ? 'کیف پول (${appState.walletBalance.toStringAsFixed(0)} TL)' : 'Wallet', style: TextStyle(fontSize: 10, color: _tourneyPayMethod == 'wallet' ? Colors.black : Colors.white70)),
                          selected: _tourneyPayMethod == 'wallet',
                          selectedColor: GamingTheme.primary,
                          backgroundColor: Colors.white.withValues(alpha: 0.05),
                          onSelected: (v) => setDialog(() => _tourneyPayMethod = 'wallet'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: Text(isFa ? 'پرداخت در محل' : 'On-site', style: TextStyle(fontSize: 10, color: _tourneyPayMethod == 'onsite' ? Colors.black : Colors.white70)),
                          selected: _tourneyPayMethod == 'onsite',
                          selectedColor: GamingTheme.goldAccent,
                          backgroundColor: Colors.white.withValues(alpha: 0.05),
                          onSelected: (v) => setDialog(() => _tourneyPayMethod = 'onsite'),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: Text(isFa ? 'انصراف' : 'Cancel', style: const TextStyle(color: Colors.white70))),
              Container(
                decoration: BoxDecoration(gradient: GamingTheme.ctaGradient, borderRadius: BorderRadius.circular(10)),
                child: TextButton(
                  onPressed: () async {
                    if (_teamNameController.text.isNotEmpty && _leaderController.text.isNotEmpty) {
                      final navigator = Navigator.of(context);
                      final messenger = ScaffoldMessenger.of(context);
                      String? error;
                      if (t.registrationFee > 0) {
                        error = await appState.checkoutOrder(kind: 'tournament', method: _tourneyPayMethod, params: {
                          'tournamentId': t.id,
                          'team': {'name': _teamNameController.text, 'leader': _leaderController.text, 'members': [_leaderController.text]},
                        });
                      } else {
                        error = await appState.registerTeam(t.id, _teamNameController.text, _leaderController.text, [_leaderController.text]);
                      }
                      navigator.pop();
                      if (error != null) {
                        messenger.showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
                        return;
                      }
                      final oid = appState.lastCheckout?.orderId ?? '';
                      messenger.showSnackBar(SnackBar(content: Text(t.registrationFee > 0 ? (isFa ? 'ثبت‌نام و پرداخت انجام شد! $oid' : 'Registered & paid! $oid') : (isFa ? 'تیم شما با موفقیت ثبت‌نام شد!' : 'Squad registered successfully!')), backgroundColor: Colors.green));
                    }
                  },
                  style: TextButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
                  child: Text(isFa ? 'ثبت‌نام نهایی' : 'Confirm Registration', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
