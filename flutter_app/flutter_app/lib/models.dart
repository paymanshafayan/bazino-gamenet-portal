import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';

// -----------------------------------------------------------------------------
// Domain Entities — each has a fromJson() that matches the REAL backend's
// response shape (server.ts / server/dataProviders.ts), so nothing here is
// invented client-side.
// -----------------------------------------------------------------------------

class AppSlider {
  final String id;
  final String imageUrl;
  final String target;
  final String titleFa;
  final String titleEn;

  AppSlider({
    required this.id,
    required this.imageUrl,
    required this.target,
    required this.titleFa,
    required this.titleEn,
  });

  factory AppSlider.fromJson(Map<String, dynamic> json) {
    return AppSlider(
      id: json['id'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      target: json['target'] ?? '',
      titleFa: json['titleFa'] ?? '',
      titleEn: json['titleEn'] ?? '',
    );
  }
}

class UserState {
  String username;
  String email;
  String phone;
  int loyaltyPoints;
  String role;

  UserState({
    required this.username,
    required this.email,
    required this.phone,
    required this.loyaltyPoints,
    this.role = 'gamer',
  });

  factory UserState.fromJson(Map<String, dynamic> json) {
    return UserState(
      username: json['username'] ?? 'Guest',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      loyaltyPoints: (json['loyaltyPoints'] ?? 0) as int,
      role: json['role'] ?? 'gamer',
    );
  }

  static UserState guest() => UserState(username: 'Guest', email: '', phone: '', loyaltyPoints: 0);
}

/// A live chat room. The backend only stores room names as plain strings, so
/// icon/description are derived locally purely for display — the room
/// itself (its existence, and every message in it) is real.
class ChatRoom {
  final String id; // the real room name, used as-is when talking to the API
  final String gameName;
  final String description;
  final String icon;

  ChatRoom({required this.id, required this.gameName, required this.description, required this.icon});

  factory ChatRoom.fromName(String name) {
    final lower = name.toLowerCase();
    String icon = '💬';
    if (lower.contains('cs') || lower.contains('کانتر')) icon = '🔫';
    else if (lower.contains('dota') || lower.contains('دوتا')) icon = '⚔️';
    else if (lower.contains('fifa') || lower.contains('fc') || lower.contains('فیفا')) icon = '⚽';
    else if (lower.contains('valorant')) icon = '🎯';
    else if (lower.contains('عمومی') || lower.contains('general')) icon = '🌐';
    return ChatRoom(id: name, gameName: name, description: '', icon: icon);
  }
}

class ChatMessage {
  final String id;
  final String roomId;
  final String username;
  final String content;
  final String timestamp;

  ChatMessage({
    required this.id,
    required this.roomId,
    required this.username,
    required this.content,
    required this.timestamp,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      roomId: json['room'] ?? '',
      username: json['username'] ?? '',
      content: json['message'] ?? '',
      timestamp: json['timestamp'] ?? '',
    );
  }
}

class LoyaltyTx {
  final String id;
  final int points;
  final String description;
  final String type; // 'Earned' or 'Redeemed'
  final String date;

  LoyaltyTx({required this.id, required this.points, required this.description, required this.type, required this.date});

  factory LoyaltyTx.fromJson(Map<String, dynamic> json) {
    return LoyaltyTx(
      id: json['id'] ?? '',
      points: (json['points'] ?? 0) as int,
      description: json['description'] ?? '',
      type: json['type'] ?? 'Earned',
      date: json['date'] ?? '',
    );
  }
}

class DiscountCode {
  final String code;
  final String type; // 'Percent' or 'Fixed'
  final num value;
  final num minOrder;
  final String expiry;
  bool isActive;

  DiscountCode({
    required this.code,
    required this.type,
    required this.value,
    required this.minOrder,
    required this.expiry,
    this.isActive = true,
  });

  factory DiscountCode.fromJson(Map<String, dynamic> json) {
    return DiscountCode(
      code: json['code'] ?? '',
      type: json['type'] ?? 'Fixed',
      value: json['value'] ?? 0,
      minOrder: json['minOrder'] ?? 0,
      expiry: json['expiry'] ?? '',
      isActive: json['isActive'] ?? true,
    );
  }
}

class GameSystem {
  final String id;
  final String name;
  final String type; // 'PC' or 'PS5' or 'Xbox'
  final num hourlyRate;
  final bool isActive;
  bool isReserved;

  GameSystem({
    required this.id,
    required this.name,
    required this.type,
    required this.hourlyRate,
    this.isActive = true,
    this.isReserved = false,
  });

  factory GameSystem.fromJson(Map<String, dynamic> json) {
    return GameSystem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? 'PC',
      hourlyRate: json['hourlyRate'] ?? 0,
      isActive: json['isActive'] ?? true,
      isReserved: json['isReserved'] ?? false,
    );
  }
}

class CafeItem {
  final String id;
  final String name;
  final String category; // 'Foods', 'Drinks', 'Snacks'
  final num price;
  final String imageUrl;
  int inventory;
  final bool isAvailable;

  CafeItem({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.imageUrl,
    required this.inventory,
    this.isAvailable = true,
  });

  factory CafeItem.fromJson(Map<String, dynamic> json) {
    return CafeItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? 'Foods',
      price: json['price'] ?? 0,
      imageUrl: json['imageUrl'] ?? '',
      inventory: (json['inventory'] ?? 0) as int,
      isAvailable: json['isAvailable'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'category': category, 'price': price, 'imageUrl': imageUrl};
}

class Accessory {
  final String id;
  final String name;
  final String description;
  final num price;
  final String imageUrl;
  int stock;
  final String category;

  Accessory({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.stock,
    required this.category,
  });

  factory Accessory.fromJson(Map<String, dynamic> json) {
    return Accessory(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: json['price'] ?? 0,
      imageUrl: json['imageUrl'] ?? '',
      stock: (json['stock'] ?? 0) as int,
      category: json['category'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'description': description, 'price': price, 'imageUrl': imageUrl};
}

class TournamentTeam {
  final String name;
  final String leader;
  final List<String> members;

  TournamentTeam({required this.name, required this.leader, required this.members});

  factory TournamentTeam.fromJson(Map<String, dynamic> json) {
    return TournamentTeam(
      name: json['name'] ?? '',
      leader: json['leader'] ?? '',
      members: (json['members'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {'name': name, 'leader': leader, 'members': members};
}

class BracketMatch {
  final String id;
  final String teamA;
  final String teamB;
  final int? scoreA;
  final int? scoreB;
  final String? winner;

  BracketMatch({required this.id, required this.teamA, required this.teamB, this.scoreA, this.scoreB, this.winner});

  factory BracketMatch.fromJson(Map<String, dynamic> json) {
    return BracketMatch(
      id: json['id'] ?? '',
      teamA: json['teamA'] ?? '',
      teamB: json['teamB'] ?? '',
      scoreA: json['scoreA'],
      scoreB: json['scoreB'],
      winner: json['winner'],
    );
  }
}

class TournamentBracket {
  final List<BracketMatch> round1;
  final List<BracketMatch> semis;
  final List<BracketMatch> finals;

  TournamentBracket({required this.round1, required this.semis, required this.finals});

  factory TournamentBracket.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return TournamentBracket(round1: [], semis: [], finals: []);
    List<BracketMatch> parseList(dynamic v) =>
        (v as List?)?.map((e) => BracketMatch.fromJson(e as Map<String, dynamic>)).toList() ?? [];
    return TournamentBracket(
      round1: parseList(json['round1']),
      semis: parseList(json['semis']),
      finals: parseList(json['finals']),
    );
  }
}

class Tournament {
  final String id;
  final String title;
  final String game;
  final num registrationFee;
  final String startDate;
  final int maxTeams;
  final String status; // 'Active', 'Upcoming', 'Completed'
  int registeredTeamsCount;
  final List<TournamentTeam> teams;
  final TournamentBracket bracket;

  Tournament({
    required this.id,
    required this.title,
    required this.game,
    required this.registrationFee,
    required this.startDate,
    required this.maxTeams,
    required this.status,
    required this.registeredTeamsCount,
    required this.teams,
    required this.bracket,
  });

  factory Tournament.fromJson(Map<String, dynamic> json) {
    return Tournament(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      game: json['game'] ?? '',
      registrationFee: json['registrationFee'] ?? 0,
      startDate: json['startDate'] ?? '',
      maxTeams: (json['maxTeams'] ?? 0) as int,
      status: json['status'] ?? 'Upcoming',
      registeredTeamsCount: (json['registeredTeamsCount'] ?? 0) as int,
      teams: (json['teams'] as List?)?.map((e) => TournamentTeam.fromJson(e as Map<String, dynamic>)).toList() ?? [],
      bracket: TournamentBracket.fromJson(json['bracket']),
    );
  }
}

class BlogComment {
  final String id;
  final String gamerTag;
  final String content;
  final String date;

  BlogComment({required this.id, required this.gamerTag, required this.content, required this.date});

  factory BlogComment.fromJson(Map<String, dynamic> json) {
    return BlogComment(id: json['id'] ?? '', gamerTag: json['gamerTag'] ?? '', content: json['content'] ?? '', date: json['date'] ?? '');
  }
}

class Article {
  final String id;
  final String title;
  final String content;
  final String category;
  final String imageUrl;
  final String author;
  final String date;
  final List<BlogComment> comments;

  Article({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.imageUrl,
    required this.author,
    required this.date,
    required this.comments,
  });

  factory Article.fromJson(Map<String, dynamic> json) {
    return Article(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      category: json['category'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      author: json['author'] ?? '',
      date: json['date'] ?? '',
      comments: (json['comments'] as List?)?.map((e) => BlogComment.fromJson(e as Map<String, dynamic>)).toList() ?? [],
    );
  }
}

class AppMessage {
  final String id;
  final String sender;
  final String recipient;
  final String title;
  final String body;
  final String date;
  final String type;
  bool isRead;

  AppMessage({
    required this.id,
    required this.sender,
    this.recipient = 'All',
    required this.title,
    required this.body,
    required this.date,
    this.type = 'message',
    this.isRead = false,
  });

  factory AppMessage.fromJson(Map<String, dynamic> json) {
    return AppMessage(
      id: json['id'] ?? '',
      sender: json['sender'] ?? '',
      recipient: json['recipient'] ?? 'All',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      date: json['date'] ?? '',
      type: json['type'] ?? 'message',
      isRead: json['isRead'] ?? false,
    );
  }
}

// -----------------------------------------------------------------------------
// AppState — real backend-backed provider. Every list below is fetched from
// the server; every action below (login, reserve, order, register, comment,
// chat, redeem) calls a real endpoint and only updates local state with what
// the server actually confirmed happened.
// -----------------------------------------------------------------------------
class AppState extends ChangeNotifier {
  static const _tokenKey = 'bazino_auth_token';

  String _language = 'fa'; // 'fa', 'en', 'ru', 'tr'
  String get language => _language;
  TextDirection get textDirection => _language == 'fa' ? TextDirection.rtl : TextDirection.ltr;

  String? _authToken;
  bool get isLoggedIn => _authToken != null && _user.username != 'Guest';

  UserState _user = UserState.guest();
  UserState get user => _user;

  bool _isBootstrapping = true;
  bool get isBootstrapping => _isBootstrapping;
  String? _lastError;
  String? get lastError => _lastError;

  List<AppSlider> _appSliders = [];
  List<AppSlider> get appSliders => _appSliders;
  bool _isLoadingSliders = false;
  bool get isLoadingSliders => _isLoadingSliders;

  List<ChatRoom> chatRooms = [];
  List<ChatMessage> chatMessages = [];
  final List<AppMessage> messages = [];
  final List<String> notifications = [];
  List<LoyaltyTx> transactions = [];
  List<DiscountCode> activeCoupons = [];
  List<GameSystem> systems = [];
  List<CafeItem> cafeItems = [];
  List<Accessory> accessories = [];
  List<Tournament> tournaments = [];
  List<Article> articles = [];

  AppState() {
    _bootstrap();
  }

  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSubscription;
  bool _wsConnected = false;
  bool get isRealtimeConnected => _wsConnected;

  Map<String, String> _authHeaders({bool json = false}) {
    final headers = <String, String>{};
    if (json) headers['Content-Type'] = 'application/json';
    if (_authToken != null) headers['Authorization'] = 'Bearer $_authToken';
    return headers;
  }

  /// Runs once on app start: restores a saved session (if any) via the real
  /// token, then loads every real public data list in parallel.
  Future<void> _bootstrap() async {
    _isBootstrapping = true;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString(_tokenKey);
      if (_authToken != null) {
        final ok = await _restoreSession();
        if (!ok) {
          _authToken = null;
          await prefs.remove(_tokenKey);
        }
      }
    } catch (e) {
      debugPrint('[AppState] Session restore failed: $e');
    }

    await Future.wait([
      fetchSliders(),
      fetchSystems(),
      fetchCafeItems(),
      fetchAccessories(),
      fetchTournaments(),
      fetchArticles(),
      fetchChatRooms(),
      if (isLoggedIn) fetchTransactions(),
      if (isLoggedIn) fetchCoupons(),
    ]);

    _connectRealtime();

    _isBootstrapping = false;
    notifyListeners();
  }

  /// Opens the real-time WebSocket connection (the exact same endpoint the
  /// website uses) so new chat messages and admin notifications from ANY
  /// client — website, another phone, the admin panel — arrive here
  /// instantly, instead of waiting for the next poll.
  void _connectRealtime() {
    try {
      _wsChannel = WebSocketChannel.connect(Uri.parse(kApiWebSocketUrl));
      _wsConnected = true;
      _wsSubscription = _wsChannel!.stream.listen(
        (raw) {
          try {
            final payload = jsonDecode(raw as String);
            final event = payload['event'];
            final data = payload['data'];
            if (event == 'message' && data is Map<String, dynamic>) {
              final msg = ChatMessage.fromJson(data);
              // Avoid duplicating a message we already added optimistically ourselves
              if (!chatMessages.any((m) => m.id == msg.id)) {
                chatMessages.add(msg);
                notifyListeners();
              }
            } else if (event == 'notification' && data is Map<String, dynamic>) {
              messages.insert(0, AppMessage.fromJson(data));
              notifications.insert(0, '✉️ ${data['title'] ?? ''}');
              notifyListeners();
            }
          } catch (e) {
            debugPrint('[AppState] Failed to parse realtime payload: $e');
          }
        },
        onDone: _scheduleReconnect,
        onError: (_) => _scheduleReconnect(),
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('[AppState] Realtime connection failed: $e');
      _wsConnected = false;
      _scheduleReconnect();
    }
  }

  bool _reconnectScheduled = false;

  void _scheduleReconnect() {
    _wsConnected = false;
    notifyListeners();
    if (_reconnectScheduled) return;
    _reconnectScheduled = true;
    Future.delayed(const Duration(seconds: 5), () {
      _reconnectScheduled = false;
      _connectRealtime();
    });
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    _wsChannel?.sink.close();
    super.dispose();
  }

  Future<bool> _restoreSession() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/auth/me'), headers: _authHeaders()).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        _user = UserState.fromJson(data['user']);
        return true;
      }
    } catch (e) {
      debugPrint('[AppState] /api/auth/me failed: $e');
    }
    return false;
  }

  // ---- Real data fetching ----

  Future<void> fetchSliders() async {
    _isLoadingSliders = true;
    notifyListeners();
    try {
      final response = await http.get(Uri.parse('$kApiBaseUrl/api/app-sliders')).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(response.bodyBytes));
        _appSliders = data.map((item) => AppSlider.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('[AppState] Failed to fetch sliders: $e');
    } finally {
      _isLoadingSliders = false;
      notifyListeners();
    }
  }

  Future<void> fetchSystems() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/systems')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        systems = data.map((e) => GameSystem.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchSystems failed: $e');
    }
  }

  Future<void> fetchCafeItems() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/cafe')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        cafeItems = data.map((e) => CafeItem.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchCafeItems failed: $e');
    }
  }

  Future<void> fetchAccessories() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/accessories')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        accessories = data.map((e) => Accessory.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchAccessories failed: $e');
    }
  }

  Future<void> fetchTournaments() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/tournaments')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        tournaments = data.map((e) => Tournament.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchTournaments failed: $e');
    }
  }

  Future<void> fetchArticles() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/articles')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        articles = data.map((e) => Article.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchArticles failed: $e');
    }
  }

  Future<void> fetchChatRooms() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/chat/rooms')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        chatRooms = data.map((e) => ChatRoom.fromName(e.toString())).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchChatRooms failed: $e');
    }
  }

  /// Loads the real message history for one room. Call this whenever the user
  /// opens a room, and poll it periodically while the room stays open — the
  /// Flutter app doesn't hold a persistent WebSocket connection (unlike the
  /// website), so near-real-time updates come from polling instead of push.
  Future<void> fetchChatMessages(String room) async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/chat/messages/${Uri.encodeComponent(room)}')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        final fetched = data.map((e) => ChatMessage.fromJson(e)).toList();
        chatMessages.removeWhere((m) => m.roomId == room);
        chatMessages.addAll(fetched);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchChatMessages failed: $e');
    }
  }

  Future<void> fetchTransactions() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/transactions'), headers: _authHeaders()).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        transactions = data.map((e) => LoyaltyTx.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchTransactions failed: $e');
    }
  }

  Future<void> fetchCoupons() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/coupons'), headers: _authHeaders()).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        activeCoupons = data.map((e) => DiscountCode.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchCoupons failed: $e');
    }
  }

  // ---- Real authentication ----

  void setLanguage(String lang) {
    _language = lang;
    notifyListeners();
  }

  /// Returns null on success, or a real error message from the server on failure.
  Future<String?> login(String username, String password) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/auth/login'), headers: _authHeaders(json: true), body: jsonEncode({'username': username, 'password': password}))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ورود ناموفق بود.';

      _authToken = data['token'] as String?;
      _user = UserState.fromJson(data['user']);
      final prefs = await SharedPreferences.getInstance();
      if (_authToken != null) await prefs.setString(_tokenKey, _authToken!);

      await Future.wait([fetchTransactions(), fetchCoupons()]);
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Returns null on success, or a real error message from the server on failure.
  Future<String?> register(String username, String email, String password, String phone) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/auth/register'),
              headers: _authHeaders(json: true), body: jsonEncode({'username': username, 'email': email, 'password': password, 'phone': phone}))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ثبت‌نام ناموفق بود.';

      _authToken = data['token'] as String?;
      _user = UserState.fromJson(data['user']);
      final prefs = await SharedPreferences.getInstance();
      if (_authToken != null) await prefs.setString(_tokenKey, _authToken!);

      await Future.wait([fetchTransactions(), fetchCoupons()]);
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  Future<void> logout() async {
    try {
      await http.post(Uri.parse('$kApiBaseUrl/api/auth/logout'), headers: _authHeaders()).timeout(const Duration(seconds: 10));
    } catch (_) {
      // Even if the network call fails, we still log out locally (discard the token)
    }
    _authToken = null;
    _user = UserState.guest();
    transactions = [];
    activeCoupons = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    notifyListeners();
  }

  /// Reflects a real, server-confirmed loyalty balance locally (used by the
  /// Jarvis assistant after it performs a real action).
  void syncLoyaltyPoints(int realBalance) {
    if (user.loyaltyPoints == realBalance) return;
    user.loyaltyPoints = realBalance;
    notifyListeners();
  }

  // ---- Messages / notifications (real: fetched from /api/messages) ----

  Future<void> fetchMessages() async {
    try {
      final uri = Uri.parse('$kApiBaseUrl/api/messages').replace(queryParameters: isLoggedIn ? {'username': user.username} : null);
      final res = await http.get(uri).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
        messages
          ..clear()
          ..addAll(data.map((e) => AppMessage.fromJson(e)));
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchMessages failed: $e');
    }
  }

  Future<void> markMessageAsRead(String id) async {
    try {
      final res = await http.post(Uri.parse('$kApiBaseUrl/api/messages/$id/read')).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final msg = messages.where((m) => m.id == id).toList();
        if (msg.isNotEmpty) msg.first.isRead = true;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] markMessageAsRead failed: $e');
    }
  }

  /// Sends a real support request to the on-duty staff (shows up in the admin panel).
  Future<String?> sendSupportRequest(String message) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/support/request'), headers: _authHeaders(json: true), body: jsonEncode({'message': message}))
          .timeout(const Duration(seconds: 10));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ارسال درخواست ناموفق بود.';
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  // ---- Real chat ----

  Future<String?> sendChatMessage(String roomId, String username, String content) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/chat/messages'),
              headers: _authHeaders(json: true), body: jsonEncode({'room': roomId, 'username': username, 'message': content}))
          .timeout(const Duration(seconds: 10));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ارسال پیام ناموفق بود.';
      chatMessages.add(ChatMessage.fromJson(data['message']));
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  // ---- Real reservations, orders, tournaments, comments ----

  /// Books a real reservation. The server computes the real price and points
  /// itself from the system's real hourly rate — this app never sends a price.
  Future<String?> reserveSystem(String systemId, String startTime, String endTime, {String? couponCode}) async {
    try {
      final body = {
        'systemId': systemId,
        'startTime': startTime,
        'endTime': endTime,
        'date': 'امروز',
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      };
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/systems/reserve'), headers: _authHeaders(json: true), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'رزرو ناموفق بود.';

      systems = (data['systems'] as List).map((e) => GameSystem.fromJson(e)).toList();
      if (data['user'] != null) _user = UserState.fromJson(data['user']);
      if (data['transactions'] != null) transactions = (data['transactions'] as List).map((e) => LoyaltyTx.fromJson(e)).toList();
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Extends the user's currently active reservation by [hours] (max 4), for
  /// real — real overlap check, real point deduction, matches Jarvis exactly.
  Future<String?> extendActiveReservation(int hours) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/reservations/extend'), headers: _authHeaders(json: true), body: jsonEncode({'hours': hours}))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'تمدید ناموفق بود.';
      await fetchTransactions();
      final me = await http.get(Uri.parse('$kApiBaseUrl/api/auth/me'), headers: _authHeaders()).timeout(const Duration(seconds: 10));
      if (me.statusCode == 200) {
        _user = UserState.fromJson(jsonDecode(utf8.decode(me.bodyBytes))['user']);
      }
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Places a real cafe order. `cart` maps a CafeItem to the desired quantity.
  /// The server recomputes the total from its own real menu prices/stock —
  /// this app never sends a price or a point amount.
  Future<String?> placeCafeOrder(Map<CafeItem, int> cart, String? promoCode) async {
    try {
      final items = cart.entries.map((e) => {'item': e.key.toJson(), 'quantity': e.value}).toList();
      final body = {'items': items, if (promoCode != null && promoCode.isNotEmpty) 'couponCode': promoCode};
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/cafe/order'), headers: _authHeaders(json: true), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ثبت سفارش ناموفق بود.';

      cafeItems = (data['cafeItems'] as List).map((e) => CafeItem.fromJson(e)).toList();
      if (data['user'] != null) _user = UserState.fromJson(data['user']);
      if (data['transactions'] != null) transactions = (data['transactions'] as List).map((e) => LoyaltyTx.fromJson(e)).toList();
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Purchases a real accessory. Server recomputes price/points/stock itself.
  Future<String?> purchaseAccessory(String accessoryId, String? promoCode) async {
    try {
      final item = accessories.firstWhere((a) => a.id == accessoryId);
      final body = {
        'cart': [{'item': item.toJson(), 'quantity': 1}],
        if (promoCode != null && promoCode.isNotEmpty) 'couponCode': promoCode,
      };
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/accessories/order'), headers: _authHeaders(json: true), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'خرید ناموفق بود.';

      accessories = (data['accessories'] as List).map((e) => Accessory.fromJson(e)).toList();
      if (data['user'] != null) _user = UserState.fromJson(data['user']);
      if (data['transactions'] != null) transactions = (data['transactions'] as List).map((e) => LoyaltyTx.fromJson(e)).toList();
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Redeems real loyalty points for a real, server-issued discount coupon
  /// (with a real 30-day expiry and single-use limit, enforced server-side).
  Future<String?> redeemPoints(int pts, int couponValue, String code) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/loyalty/redeem'),
              headers: _authHeaders(json: true), body: jsonEncode({'points': pts, 'couponValue': couponValue, 'code': code}))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'تبدیل امتیاز ناموفق بود.';

      if (data['user'] != null) _user = UserState.fromJson(data['user']);
      if (data['transactions'] != null) transactions = (data['transactions'] as List).map((e) => LoyaltyTx.fromJson(e)).toList();
      if (data['activeCoupons'] != null) activeCoupons = (data['activeCoupons'] as List).map((e) => DiscountCode.fromJson(e)).toList();
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Registers a real team for a real tournament.
  Future<String?> registerTeam(String tournamentId, String teamName, String leader, List<String> members) async {
    try {
      final team = TournamentTeam(name: teamName, leader: leader, members: members);
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/tournaments/register'),
              headers: _authHeaders(json: true), body: jsonEncode({'tournamentId': tournamentId, 'team': team.toJson()}))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ثبت‌نام تیم ناموفق بود.';

      tournaments = (data['tournaments'] as List).map((e) => Tournament.fromJson(e)).toList();
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// Posts a real comment on a real article.
  Future<String?> addComment(String articleId, String comment, String gamerTag) async {
    try {
      final res = await http
          .post(Uri.parse('$kApiBaseUrl/api/articles/$articleId/comment'),
              headers: _authHeaders(json: true), body: jsonEncode({'gamerTag': gamerTag, 'content': comment}))
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode != 200) return data['error']?.toString() ?? 'ثبت نظر ناموفق بود.';

      articles = (data['articles'] as List).map((e) => Article.fromJson(e)).toList();
      notifyListeners();
      return null;
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }
}

extension IntFormatting on num {
  String toLocaleString() {
    return toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}

// Translations Directory for Flutter Multi-Language support
class AppLocalizations {
  static final Map<String, Map<String, String>> _translations = {
    'fa': {
      'brand.name': 'بازینو',
      'brand.tagline': 'سیستم رزرو آنلاین، بوفه هوشمند، تورنمنت‌ها و کلوپ وفاداری یکپارچه گیم‌نت',
      'user.pts': 'امتیاز',
      'nav.home': 'صفحه اصلی',
      'nav.loyalty': 'باشگاه مشتریان',
      'nav.reservations': 'رزرو آنلاین',
      'nav.cafe': 'کافه و بوفه',
      'nav.shop': 'فروشگاه جانبی',
      'nav.tournaments': 'تورنمنت‌ها',
      'nav.chat': 'اتاق گفتگو',
      'nav.blog': 'اخبار و بلاگ',
      'nav.messages': 'صندوق پیام',
    },
    'en': {
      'brand.name': 'BAZINO',
      'brand.tagline': 'Integrated game-net reservation, smart buffet, tournaments & loyalty',
      'user.pts': 'Points',
      'nav.home': 'Home',
      'nav.loyalty': 'Loyalty Club',
      'nav.reservations': 'Bookings',
      'nav.cafe': 'Cafe Menu',
      'nav.shop': 'Accessories',
      'nav.tournaments': 'Tournaments',
      'nav.chat': 'Chat Rooms',
      'nav.blog': 'News Blog',
      'nav.messages': 'Inbox',
    }
  };

  static String translate(String key, String lang) {
    return _translations[lang]?[key] ?? _translations['en']?[key] ?? key;
  }
}
