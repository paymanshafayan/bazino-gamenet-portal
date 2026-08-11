/// Central place for the backend base URL.
///
/// IMPORTANT: `http://localhost:3000` only works when the app runs on the
/// SAME machine as the server (e.g. a desktop/web build during development).
/// On a real phone (emulator or physical device) "localhost" means the
/// phone itself, not your server, so none of the network calls will work.
///
/// Defaults to the real production domain (confirmed live — serves the
/// Bazino Game Center site). Override for local development with:
///   flutter run --dart-define=API_BASE_URL=http://localhost:3000
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://bazino.pro',
);

/// The same server, as a WebSocket URL, for the real-time chat/notification
/// stream (`ws://.../api/chat/ws` — the exact same endpoint the website uses).
String get kApiWebSocketUrl {
  final wsBase = kApiBaseUrl.startsWith('https://')
      ? kApiBaseUrl.replaceFirst('https://', 'wss://')
      : kApiBaseUrl.replaceFirst('http://', 'ws://');
  return '$wsBase/api/chat/ws';
}
