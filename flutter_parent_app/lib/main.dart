import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme.dart';
import 'providers/parent_state.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/requests_screen.dart';
import 'screens/activity_screen.dart';
import 'screens/settings_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ParentState()),
      ],
      child: const BazinoParentApp(),
    ),
  );
}

class BazinoParentApp extends StatelessWidget {
  const BazinoParentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bazino Parent',
      debugShowCheckedModeBanner: false,
      theme: ParentTheme.lightTheme,
      home: const ParentRoot(),
    );
  }
}

class ParentRoot extends StatelessWidget {
  const ParentRoot({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ParentState>();

    if (state.authToken == null) {
      return const ParentLoginScreen();
    }

    return const ParentHome();
  }
}

class ParentHome extends StatefulWidget {
  const ParentHome({super.key});

  @override
  State<ParentHome> createState() => _ParentHomeState();
}

class _ParentHomeState extends State<ParentHome> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ParentState>();
    final pendingCount = state.pendingRequests.length;

    final screens = [
      const DashboardScreen(),
      const RequestsScreen(),
      const ActivityScreen(),
      SettingsScreen(child: state.selectedChild, limits: state.currentLimits),
    ];

    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: ParentTheme.primary.withValues(alpha: 0.15),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard_rounded), label: 'داشبورد'),
          NavigationDestination(
            icon: Badge.count(count: pendingCount, isLabelVisible: pendingCount > 0, child: const Icon(Icons.pending_actions_outlined)),
            selectedIcon: Badge.count(count: pendingCount, isLabelVisible: pendingCount > 0, child: const Icon(Icons.pending_actions_rounded)),
            label: 'درخواست‌ها',
          ),
          const NavigationDestination(icon: Icon(Icons.history_outlined), selectedIcon: Icon(Icons.history_rounded), label: 'فعالیت'),
          const NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings_rounded), label: 'محدودیت‌ها'),
        ],
      ),
    );
  }
}
