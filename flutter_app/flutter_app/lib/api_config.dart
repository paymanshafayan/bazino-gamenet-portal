/// Central place for the backend base URL.
///
/// IMPORTANT: `http://localhost:3000` only works when the app runs on the
/// SAME machine as the server (e.g. a desktop/web build during development).
/// On a real phone (emulator or physical device) "localhost" means the
/// phone itself, not your server, so none of the network calls will work.
///
/// Before building a real APK/IPA, replace this with your actual deployed
/// domain, e.g. "https://bazino.runasp.net".
///
/// You can also override it at build time without editing this file:
///   flutter run --dart-define=API_BASE_URL=https://bazino.runasp.net
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

/// The same server, as a WebSocket URL, for the real-time chat/notification
/// stream (`ws://.../api/chat/ws` — the exact same endpoint the website uses).
String get kApiWebSocketUrl {
  final wsBase = kApiBaseUrl.startsWith('https://')
      ? kApiBaseUrl.replaceFirst('https://', 'wss://')
      : kApiBaseUrl.replaceFirst('http://', 'ws://');
  return '$wsBase/api/chat/ws';
}
