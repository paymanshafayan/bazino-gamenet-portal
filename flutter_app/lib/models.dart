import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';

String _localizedValue(Map<String, dynamic> json, String baseKey, String language, String fallback) {
  final suffix = language == 'fa'
      ? 'Fa'
      : language == 'ru'
          ? 'Ru'
          : language == 'tr'
              ? 'Tr'
              : 'En';
  return (json['$baseKey$suffix'] ?? json[baseKey] ?? fallback).toString();
}

String _resolveMediaUrl(String url) {
  if (url.isEmpty || url.startsWith('http://') || url.startsWith('https://')) return url;
  final base = kApiBaseUrl.endsWith('/') ? kApiBaseUrl.substring(0, kApiBaseUrl.length - 1) : kApiBaseUrl;
  return '$base${url.startsWith('/') ? url : '/$url'}';
}

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
  final String titleRu;
  final String titleTr;

  AppSlider({
    required this.id,
    required this.imageUrl,
    required this.target,
    required this.titleFa,
    required this.titleEn,
    required this.titleRu,
    required this.titleTr,
  });

  factory AppSlider.fromJson(Map<String, dynamic> json) {
    return AppSlider(
      id: json['id'] ?? '',
      imageUrl: _resolveMediaUrl(json['mobileImageUrl'] ?? json['imageUrl'] ?? ''),
      target: json['target'] ?? '',
      titleFa: json['titleFa'] ?? json['title'] ?? '',
      titleEn: json['titleEn'] ?? json['title'] ?? '',
      titleRu: json['titleRu'] ?? json['titleEn'] ?? json['title'] ?? '',
      titleTr: json['titleTr'] ?? json['titleEn'] ?? json['title'] ?? '',
    );
  }

  String titleFor(String language) => language == 'fa'
      ? titleFa
      : language == 'ru'
          ? titleRu
          : language == 'tr'
              ? titleTr
              : titleEn;
}

class UserState {
  String username;
  String email;
  String phone;
  int loyaltyPoints;
  String role;

  // فیلدهای حساب کامل (تسک حساب کاربری) — از /api/me/profile و publicUser سرور
  double credits;
  String displayName;
  String avatarUrl;
  String bio;
  String gamerTag;
  String city;
  String birthDate;
  bool phoneVerified;
  bool hasPassword;
  String createdAt;

  UserState({
    required this.username,
    required this.email,
    required this.phone,
    required this.loyaltyPoints,
    this.role = 'gamer',
    this.credits = 0,
    this.displayName = '',
    this.avatarUrl = '',
    this.bio = '',
    this.gamerTag = '',
    this.city = '',
    this.birthDate = '',
    this.phoneVerified = false,
    this.hasPassword = true,
    this.createdAt = '',
  });

  factory UserState.fromJson(Map<String, dynamic> json) {
    return UserState(
      username: json['username'] ?? 'Guest',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      loyaltyPoints: (json['loyaltyPoints'] ?? 0) is int ? json['loyaltyPoints'] : int.tryParse('${json['loyaltyPoints']}') ?? 0,
      role: json['role'] ?? 'gamer',
      credits: (json['credits'] ?? 0) is num ? (json['credits'] as num).toDouble() : double.tryParse('${json['credits']}') ?? 0,
      displayName: json['displayName'] ?? '',
      avatarUrl: json['avatarUrl'] ?? '',
      bio: json['bio'] ?? '',
      gamerTag: json['gamerTag'] ?? '',
      city: json['city'] ?? '',
      birthDate: json['birthDate'] ?? '',
      phoneVerified: json['phoneVerified'] == true,
      hasPassword: json['hasPassword'] == null ? true : json['hasPassword'] == true,
      createdAt: json['createdAt'] ?? '',
    );
  }

  static UserState guest() => UserState(username: 'Guest', email: '', phone: '', loyaltyPoints: 0);

  Map<String, dynamic> toJson() => {
        'username': username,
        'email': email,
        'phone': phone,
        'loyaltyPoints': loyaltyPoints,
        'role': role,
        'credits': credits,
        'displayName': displayName,
        'avatarUrl': avatarUrl,
        'bio': bio,
        'gamerTag': gamerTag,
        'city': city,
        'birthDate': birthDate,
        'phoneVerified': phoneVerified,
        'hasPassword': hasPassword,
        'createdAt': createdAt,
      };
}

/// تراکنش کیف پول (TL) — GET /api/me/wallet
class WalletTx {
  final String id;
  final double amount;
  final String type;
  final String note;
  final double balanceAfter;
  final String createdAt;

  WalletTx({required this.id, required this.amount, required this.type, required this.note, required this.balanceAfter, required this.createdAt});

  factory WalletTx.fromJson(Map<String, dynamic> json) {
    return WalletTx(
      id: json['id']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      type: json['type']?.toString() ?? '',
      note: json['note']?.toString() ?? '',
      balanceAfter: (json['balanceAfter'] as num?)?.toDouble() ?? 0,
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }

  bool get isTopup => amount > 0;
}

/// سفارش «پرداخت در محل» / سفارش تسویه‌شده — GET /api/me/onsite-orders
class OnsiteOrder {
  final String id;
  final String kind; // reservation | cafe | shop | tournament
  final double amount;
  final String status; // pending_onsite | settled | cancelled_*
  final String? dueAt;
  final String description;
  final String createdAt;

  OnsiteOrder({required this.id, required this.kind, required this.amount, required this.status, this.dueAt, required this.description, required this.createdAt});

  factory OnsiteOrder.fromJson(Map<String, dynamic> json) {
    return OnsiteOrder(
      id: json['id']?.toString() ?? '',
      kind: json['kind']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status']?.toString() ?? '',
      dueAt: json['dueAt']?.toString(),
      description: json['description']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }

  bool get isPending => status == 'pending_onsite';
}

/// روش‌های پرداخت مجاز هر نوع سفارش — GET /api/payments/methods
class PaymentMethods {
  final bool online;
  final String currency;
  final Map<String, List<String>> methods;
  final int reservationLeadMinutes;

  PaymentMethods({required this.online, required this.currency, required this.methods, required this.reservationLeadMinutes});

  factory PaymentMethods.fromJson(Map<String, dynamic> json) {
    final m = <String, List<String>>{};
    final raw = json['methods'];
    if (raw is Map) {
      raw.forEach((k, v) {
        m[k.toString()] = (v as List?)?.map((e) => e.toString()).toList() ?? [];
      });
    }
    return PaymentMethods(
      online: json['online'] == true,
      currency: json['currency']?.toString() ?? 'TL',
      methods: m,
      reservationLeadMinutes: ((json['onsiteLeadMinutes'] as Map?)?['reservation'] as num?)?.toInt() ?? 10,
    );
  }
}

/// نتیجهٔ یک checkout موفق — POST /api/checkout/{wallet,credits,onsite}
class CheckoutOutcome {
  final String orderId;
  final double amount;
  final String method; // wallet | credits | onsite
  final String status; // settled | pending_onsite
  final String? dueAt;
  final double? balanceAfter;
  final int? creditsCost;
  final double? creditsBalance;
  final Map<String, dynamic> raw;

  CheckoutOutcome({
    required this.orderId,
    required this.amount,
    required this.method,
    required this.status,
    this.dueAt,
    this.balanceAfter,
    this.creditsCost,
    this.creditsBalance,
    required this.raw,
  });
}

/// رزرو کاربر — GET /api/me/reservations
class MyReservationLog {
  final String id;
  final String systemName;
  final String startTime;
  final String endTime;
  final double totalPrice;
  final String date;
  final bool checkedIn;

  MyReservationLog({required this.id, required this.systemName, required this.startTime, required this.endTime, required this.totalPrice, required this.date, required this.checkedIn});

  factory MyReservationLog.fromJson(Map<String, dynamic> json) {
    return MyReservationLog(
      id: json['id']?.toString() ?? '',
      systemName: json['systemName']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? '',
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0,
      date: json['date']?.toString() ?? '',
      checkedIn: json['checkedIn'] == true,
    );
  }
}

/// سفارش کافه/فروشگاه کاربر — GET /api/me/orders
class MyOrder {
  final String id;
  final String kind; // cafe | shop
  final double finalAmount;
  final String status;
  final String date;
  final String rawItems;

  MyOrder({required this.id, required this.kind, required this.finalAmount, required this.status, required this.date, required this.rawItems});

  factory MyOrder.fromJson(Map<String, dynamic> json, {required String kind}) {
    return MyOrder(
      id: json['id']?.toString() ?? '',
      kind: kind,
      finalAmount: (json['finalAmount'] as num?)?.toDouble() ?? 0,
      status: json['status']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      rawItems: jsonEncode(json['items'] ?? json['cart'] ?? []),
    );
  }

  String get itemsSummary {
    try {
      final list = jsonDecode(rawItems) as List;
      return list.map((l) {
        final name = (l is Map && l['item'] is Map) ? l['item']['name'].toString() : '';
        final qty = (l is Map ? l['quantity'] : 1) ?? 1;
        return name.isEmpty ? '' : '$name ×$qty';
      }).where((s) => s.isNotEmpty).join('، ');
    } catch (_) {
      return '';
    }
  }
}

/// تیکت پشتیبانی — GET/POST /api/me/tickets
class SupportTicket {
  final String id;
  final String subject;
  final String category;
  final String priority;
  final String status;
  final String createdAt;
  final String updatedAt;
  final bool hasNewReply;

  SupportTicket({required this.id, required this.subject, required this.category, required this.priority, required this.status, required this.createdAt, required this.updatedAt, required this.hasNewReply});

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id']?.toString() ?? '',
      subject: json['subject']?.toString() ?? '',
      category: json['category']?.toString() ?? 'general',
      priority: json['priority']?.toString() ?? 'normal',
      status: json['status']?.toString() ?? 'open',
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      hasNewReply: json['hasNewReply'] == true,
    );
  }
}

/// پیام داخل تیکت
class TicketMessage {
  final String id;
  final bool isStaff;
  final String body;
  final String createdAt;

  TicketMessage({required this.id, required this.isStaff, required this.body, required this.createdAt});

  factory TicketMessage.fromJson(Map<String, dynamic> json) {
    return TicketMessage(
      id: json['id']?.toString() ?? '',
      isStaff: json['isStaff'] == 1 || json['isStaff'] == true,
      body: json['body']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
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
    if (lower.contains('cs') || lower.contains('کانتر')) {
      icon = '🔫';
    } else if (lower.contains('dota') || lower.contains('دوتا')) {
      icon = '⚔️';
    } else if (lower.contains('fifa') || lower.contains('fc') || lower.contains('فیفا')) {
      icon = '⚽';
    } else if (lower.contains('valorant')) {
      icon = '🎯';
    } else if (lower.contains('عمومی') || lower.contains('general')) {
      icon = '🌐';
    }
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
  final String nameFa;
  final String nameEn;
  final String nameRu;
  final String nameTr;
  final String category; // 'Foods', 'Drinks', 'Snacks'
  final num price;
  final String imageUrl;
  int inventory;
  final bool isAvailable;

  CafeItem({
    required this.id,
    required this.name,
    required this.nameFa,
    required this.nameEn,
    required this.nameRu,
    required this.nameTr,
    required this.category,
    required this.price,
    required this.imageUrl,
    required this.inventory,
    this.isAvailable = true,
  });

  factory CafeItem.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] ?? '').toString();
    return CafeItem(
      id: json['id'] ?? '',
      name: name,
      nameFa: _localizedValue(json, 'name', 'fa', name),
      nameEn: _localizedValue(json, 'name', 'en', name),
      nameRu: _localizedValue(json, 'name', 'ru', name),
      nameTr: _localizedValue(json, 'name', 'tr', name),
      category: json['category'] ?? 'Foods',
      price: json['price'] ?? 0,
      imageUrl: _resolveMediaUrl(json['mobileImageUrl'] ?? json['imageUrl'] ?? ''),
      inventory: (json['inventory'] ?? 0) as int,
      isAvailable: json['isAvailable'] ?? true,
    );
  }

  String nameFor(String language) => language == 'fa'
      ? nameFa
      : language == 'ru'
          ? nameRu
          : language == 'tr'
              ? nameTr
              : nameEn;

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'category': category, 'price': price, 'imageUrl': imageUrl};
}

class Accessory {
  final String id;
  final String name;
  final String nameFa;
  final String nameEn;
  final String nameRu;
  final String nameTr;
  final String description;
  final String descriptionFa;
  final String descriptionEn;
  final String descriptionRu;
  final String descriptionTr;
  final num price;
  final String imageUrl;
  int stock;
  final String category;

  Accessory({
    required this.id,
    required this.name,
    required this.nameFa,
    required this.nameEn,
    required this.nameRu,
    required this.nameTr,
    required this.description,
    required this.descriptionFa,
    required this.descriptionEn,
    required this.descriptionRu,
    required this.descriptionTr,
    required this.price,
    required this.imageUrl,
    required this.stock,
    required this.category,
  });

  factory Accessory.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] ?? '').toString();
    final desc = (json['description'] ?? '').toString();
    return Accessory(
      id: json['id'] ?? '',
      name: name,
      nameFa: _localizedValue(json, 'name', 'fa', name),
      nameEn: _localizedValue(json, 'name', 'en', name),
      nameRu: _localizedValue(json, 'name', 'ru', name),
      nameTr: _localizedValue(json, 'name', 'tr', name),
      description: desc,
      descriptionFa: _localizedValue(json, 'description', 'fa', desc),
      descriptionEn: _localizedValue(json, 'description', 'en', desc),
      descriptionRu: _localizedValue(json, 'description', 'ru', desc),
      descriptionTr: _localizedValue(json, 'description', 'tr', desc),
      price: json['price'] ?? 0,
      imageUrl: _resolveMediaUrl(json['mobileImageUrl'] ?? json['imageUrl'] ?? ''),
      stock: (json['stock'] ?? 0) as int,
      category: json['category'] ?? '',
    );
  }

  String nameFor(String language) => language == 'fa'
      ? nameFa
      : language == 'ru'
          ? nameRu
          : language == 'tr'
              ? nameTr
              : nameEn;

  String descriptionFor(String language) => language == 'fa'
      ? descriptionFa
      : language == 'ru'
          ? descriptionRu
          : language == 'tr'
              ? descriptionTr
              : descriptionEn;

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
  final String titleFa;
  final String titleEn;
  final String titleRu;
  final String titleTr;
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
    required this.titleFa,
    required this.titleEn,
    required this.titleRu,
    required this.titleTr,
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
    final title = (json['title'] ?? '').toString();
    return Tournament(
      id: json['id'] ?? '',
      title: title,
      titleFa: _localizedValue(json, 'title', 'fa', title),
      titleEn: _localizedValue(json, 'title', 'en', title),
      titleRu: _localizedValue(json, 'title', 'ru', title),
      titleTr: _localizedValue(json, 'title', 'tr', title),
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

  String titleFor(String language) => language == 'fa'
      ? titleFa
      : language == 'ru'
          ? titleRu
          : language == 'tr'
              ? titleTr
              : titleEn;
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
  final String titleFa;
  final String titleEn;
  final String titleRu;
  final String titleTr;
  final String content;
  final String contentFa;
  final String contentEn;
  final String contentRu;
  final String contentTr;
  final String category;
  final String imageUrl;
  final String author;
  final String authorFa;
  final String authorEn;
  final String authorRu;
  final String authorTr;
  final String date;
  final List<BlogComment> comments;

  Article({
    required this.id,
    required this.title,
    required this.titleFa,
    required this.titleEn,
    required this.titleRu,
    required this.titleTr,
    required this.content,
    required this.contentFa,
    required this.contentEn,
    required this.contentRu,
    required this.contentTr,
    required this.category,
    required this.imageUrl,
    required this.author,
    required this.authorFa,
    required this.authorEn,
    required this.authorRu,
    required this.authorTr,
    required this.date,
    required this.comments,
  });

  factory Article.fromJson(Map<String, dynamic> json) {
    final title = (json['title'] ?? '').toString();
    final content = (json['content'] ?? '').toString();
    final author = (json['author'] ?? '').toString();
    return Article(
      id: json['id'] ?? '',
      title: title,
      titleFa: _localizedValue(json, 'title', 'fa', title),
      titleEn: _localizedValue(json, 'title', 'en', title),
      titleRu: _localizedValue(json, 'title', 'ru', title),
      titleTr: _localizedValue(json, 'title', 'tr', title),
      content: content,
      contentFa: _localizedValue(json, 'content', 'fa', content),
      contentEn: _localizedValue(json, 'content', 'en', content),
      contentRu: _localizedValue(json, 'content', 'ru', content),
      contentTr: _localizedValue(json, 'content', 'tr', content),
      category: json['category'] ?? '',
      imageUrl: _resolveMediaUrl(json['mobileImageUrl'] ?? json['imageUrl'] ?? ''),
      author: author,
      authorFa: _localizedValue(json, 'author', 'fa', author),
      authorEn: _localizedValue(json, 'author', 'en', author),
      authorRu: _localizedValue(json, 'author', 'ru', author),
      authorTr: _localizedValue(json, 'author', 'tr', author),
      date: json['date'] ?? '',
      comments: (json['comments'] as List?)?.map((e) => BlogComment.fromJson(e as Map<String, dynamic>)).toList() ?? [],
    );
  }

  String titleFor(String language) => language == 'fa'
      ? titleFa
      : language == 'ru'
          ? titleRu
          : language == 'tr'
              ? titleTr
              : titleEn;

  String contentFor(String language) => language == 'fa'
      ? contentFa
      : language == 'ru'
          ? contentRu
          : language == 'tr'
              ? contentTr
              : contentEn;

  String authorFor(String language) => language == 'fa'
      ? authorFa
      : language == 'ru'
          ? authorRu
          : language == 'tr'
              ? authorTr
              : authorEn;
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
  String? get authToken => _authToken;
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

  // ---- حساب کاربری کامل (تسک فاز ۲) ----
  double walletBalance = 0;
  List<WalletTx> walletTransactions = [];
  List<OnsiteOrder> onsiteOrders = [];
  PaymentMethods? paymentMethods;
  List<MyReservationLog> myReservations = [];
  List<MyOrder> myOrders = [];
  List<SupportTicket> tickets = [];
  int unreadTickets = 0;
  bool isLoadingAccount = false;

  /// اعلان‌های درون‌برنامه‌ای که هنوز توسط کاربر دیده نشده‌اند (ورودی اورلی هاب).
  /// `_inAppNotifVersion` با هر اعلانِ جدید بالا می‌رود تا هاب فقط «تازه‌ها» را اورلی کند.
  final List<String> unseenInAppNotifications = [];
  int _inAppNotifVersion = 0;
  int get inAppNotifVersion => _inAppNotifVersion;

  void markInAppNotificationsSeen() {
    if (unseenInAppNotifications.isNotEmpty) {
      unseenInAppNotifications.clear();
      notifyListeners();
    }
  }

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
      if (isLoggedIn) fetchAccountData(),
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
              unseenInAppNotifications.insert(0, '✉️ ${data['title'] ?? ''}');
              _inAppNotifVersion++;
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

      await Future.wait([fetchTransactions(), fetchCoupons(), fetchAccountData()]);
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

      await Future.wait([fetchTransactions(), fetchCoupons(), fetchAccountData()]);
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

  void removeNotificationAt(int index) {
    if (index < 0 || index >= notifications.length) return;
    notifications.removeAt(index);
    notifyListeners();
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

  // =========================================================================
  // حساب کاربری کامل + اقتصاد جدید (checkout کیف پول / کردیت / حضوری)
  // — همگی روی APIهای واقعی سرور: /api/payments/methods، /api/checkout/*،
  // /api/me/*، /api/auth/otp/*
  // =========================================================================

  Future<Map<String, dynamic>> _apiJson(String method, String path, {Object? body, Map<String, String>? extraHeaders}) async {
    final req = http.Request(method, Uri.parse('$kApiBaseUrl$path'));
    req.headers.addAll(_authHeaders(json: body != null));
    if (extraHeaders != null) req.headers.addAll(extraHeaders);
    if (body != null) req.body = jsonEncode(body);
    final res = await http.Client().send(req).timeout(const Duration(seconds: 20));
    final bytes = await res.stream.toBytes();
    final text = utf8.decode(bytes);
    try {
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (_) {
      return {'error': text.isNotEmpty ? text : 'HTTP ${res.statusCode}', '_status': res.statusCode};
    }
  }

  /// بارگیری یکجاً داده‌های حساب: کیف پول، سفارش‌های حضوری، روش‌های پرداخت،
  /// رزروها/سفارش‌ها و تیکت‌ها. بعد از هر ورود و هر checkout صدا زده می‌شود.
  Future<void> fetchAccountData() async {
    if (!isLoggedIn) return;
    isLoadingAccount = true;
    notifyListeners();
    try {
      await Future.wait([
        fetchWallet(),
        fetchOnsiteOrders(),
        fetchPaymentMethods(),
        fetchMyReservations(),
        fetchMyOrders(),
        fetchTickets(),
      ]);
    } finally {
      isLoadingAccount = false;
      notifyListeners();
    }
  }

  Future<void> fetchWallet() async {
    try {
      final data = await _apiJson('GET', '/api/me/wallet');
      if (data['balance'] is num) {
        walletBalance = (data['balance'] as num).toDouble();
        walletTransactions = ((data['transactions'] as List?) ?? []).map((e) => WalletTx.fromJson(e as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchWallet failed: $e');
    }
  }

  Future<void> fetchOnsiteOrders() async {
    try {
      final res = await http.get(Uri.parse('$kApiBaseUrl/api/me/onsite-orders'), headers: _authHeaders()).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(res.bodyBytes));
        if (decoded is List) {
          onsiteOrders = decoded.map((e) => OnsiteOrder.fromJson(e as Map<String, dynamic>)).toList();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('[AppState] fetchOnsiteOrders failed: $e');
    }
  }

  Future<void> fetchPaymentMethods() async {
    try {
      final data = await _apiJson('GET', '/api/payments/methods');
      if (data.containsKey('methods')) {
        paymentMethods = PaymentMethods.fromJson(data);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AppState] fetchPaymentMethods failed: $e');
    }
  }

  Future<void> fetchMyReservations() async {
    try {
      final data = await _apiJson('GET', '/api/me/reservations');
      myReservations = ((data['reservations'] as List?) ?? []).map((e) => MyReservationLog.fromJson(e as Map<String, dynamic>)).toList();
      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] fetchMyReservations failed: $e');
    }
  }

  Future<void> fetchMyOrders() async {
    try {
      final data = await _apiJson('GET', '/api/me/orders');
      final cafe = ((data['cafe'] as List?) ?? []).map((e) => MyOrder.fromJson(e as Map<String, dynamic>, kind: 'cafe')).toList();
      final shop = ((data['shop'] as List?) ?? []).map((e) => MyOrder.fromJson(e as Map<String, dynamic>, kind: 'shop')).toList();
      myOrders = [...cafe, ...shop];
      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] fetchMyOrders failed: $e');
    }
  }

  Future<void> fetchTickets() async {
    try {
      final data = await _apiJson('GET', '/api/me/tickets');
      tickets = ((data['tickets'] as List?) ?? []).map((e) => SupportTicket.fromJson(e as Map<String, dynamic>)).toList();
      unreadTickets = (data['unread'] as num?)?.toInt() ?? 0;
      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] fetchTickets failed: $e');
    }
  }

  /// پرداخت واقعی سفارش با یکی از روش‌های جدید سرور.
  /// [kind]: reservation | cafe | shop | tournament — [method]: wallet | credits | onsite
  /// خروجی: null + outcome=موفق، یا پیام خطای واقعی سرور.
  Future<String?> checkoutOrder({
    required String kind,
    required String method,
    required Map<String, dynamic> params,
  }) async {
    if (!isLoggedIn) {
      return 'برای ثبت سفارش ابتدا وارد حساب کاربری شوید.';
    }
    try {
      final data = await _apiJson('POST', '/api/checkout/$method', body: {'kind': kind, 'params': params});
      if (data['success'] == true) {
        _lastCheckout = CheckoutOutcome(
          orderId: data['orderId']?.toString() ?? '',
          amount: (data['amount'] as num?)?.toDouble() ?? 0,
          method: method,
          status: data['status']?.toString() ?? 'settled',
          dueAt: data['dueAt']?.toString(),
          balanceAfter: (data['balance'] as num?)?.toDouble(),
          creditsCost: (data['creditsCost'] as num?)?.toInt(),
          creditsBalance: (data['creditsBalance'] as num?)?.toDouble(),
          raw: data,
        );
        // به‌روزرسانی هم‌زمان کیف پول/کردیت/رزروها/سفارش‌های حضوری
        await fetchAccountData();
        return null;
      }
      return _friendlyCheckoutError(data);
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  CheckoutOutcome? _lastCheckout;
  CheckoutOutcome? get lastCheckout => _lastCheckout;

  String _friendlyCheckoutError(Map<String, dynamic> data) {
    final code = data['code']?.toString() ?? data['error']?.toString() ?? 'خطای نامشخص';
    switch (code) {
      case 'INSUFFICIENT_FUNDS':
        return 'موجودی کیف پول کافی نیست. موجودی فعلی: ${walletBalance.toStringAsFixed(0)} لیر — از پنل مدیریت شارژ کنید یا «پرداخت در محل» را انتخاب کنید.';
      case 'INSUFFICIENT_CREDITS':
        return 'کردیت بازینو (BC) کافی نیست (لازم: ${data['creditsCost'] ?? '?'}, موجودی: ${data['creditsBalance'] ?? 0}).';
      case 'ONSITE_TOO_LATE':
        return 'برای «پرداخت در محل» دیر شده است (مهلت: ۱۰ دقیقه قبل از شروع سانس). لطفاً با کیف پول پرداخت کنید.';
      case 'METHOD_NOT_ALLOWED':
        return 'این روش پرداخت برای این نوع سفارش مجاز نیست.';
      case 'OUT_OF_STOCK':
        return 'موجودی این کالا تمام شده است.';
      case 'INVALID_RESERVATION_TIME':
      case 'PAST_RESERVATION':
        return 'بازهٔ زمانی انتخابی معتبر نیست؛ لطفاً ساعت دیگری انتخاب کنید.';
      case 'SLOT_TAKEN':
      case 'STATION_BUSY':
        return 'این سیستم در بازهٔ انتخابی گرفته شد؛ ساعت یا سیستم دیگری انتخاب کنید.';
      default:
        return data['message']?.toString() ?? data['error']?.toString() ?? code;
    }
  }

  /// لغو سفارش حضوری/کیف‌پولی توسط خود کاربر (قبل از مهلت).
  Future<String?> cancelOnsiteOrder(String orderId) async {
    try {
      final data = await _apiJson('POST', '/api/checkout/onsite/$orderId/cancel', body: {});
      if (data['success'] == true) {
        await fetchAccountData();
        return null;
      }
      return data['error']?.toString() ?? 'لغو ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  // ---- پروفایل ----

  Future<String?> updateProfile(Map<String, String> fields) async {
    try {
      final data = await _apiJson('PUT', '/api/me/profile', body: fields);
      if (data['success'] == true && data['user'] is Map<String, dynamic>) {
        _user = UserState.fromJson(data['user']);
        notifyListeners();
        return null;
      }
      return data['error']?.toString() ?? 'ذخیره پروفایل ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// آپلود آواتار — بدنهٔ خام تصویر (JPEG/PNG/WebP تا ۵ مگابایت).
  Future<String?> uploadAvatar(Uint8List bytes, String contentType) async {
    try {
      final req = http.Request('POST', Uri.parse('$kApiBaseUrl/api/me/avatar'));
      req.headers.addAll(_authHeaders());
      req.headers['Content-Type'] = contentType;
      req.bodyBytes = bytes;
      final res = await http.Client().send(req).timeout(const Duration(seconds: 30));
      final text = utf8.decode(await res.stream.toBytes());
      final data = jsonDecode(text) as Map<String, dynamic>;
      if (data['success'] == true) {
        _user = UserState.fromJson({..._user.toJson(), 'avatarUrl': data['avatarUrl']});
        notifyListeners();
        return null;
      }
      return data['error']?.toString() ?? 'آپلود آواتار ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  Future<String?> removeAvatar() async {
    try {
      final data = await _apiJson('DELETE', '/api/me/avatar');
      if (data['success'] == true) {
        _user = UserState.fromJson({..._user.toJson(), 'avatarUrl': ''});
        notifyListeners();
        return null;
      }
      return data['error']?.toString() ?? 'حذف آواتار ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// تغییر/تعیین رمز. کاربر OTP-only (بدون رمز) oldPassword نمی‌خواهد.
  Future<String?> changePassword({required String newPassword, String? oldPassword}) async {
    try {
      final data = await _apiJson('POST', '/api/me/password', body: {
        'newPassword': newPassword,
        if (oldPassword != null && oldPassword.isNotEmpty) 'oldPassword': oldPassword,
      });
      if (data['success'] == true) return null;
      final err = data['error']?.toString() ?? '';
      if (err.contains('OLD_PASSWORD')) return 'رمز فعلی اشتباه است.';
      if (err.contains('TOO_SHORT')) return 'رمز جدید باید حداقل ۶ کاراکتر باشد.';
      return err.isNotEmpty ? err : 'تغییر رمز ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  // ---- ورود با پیامک (OTP) ----

  /// درخواست کد پیامکی. خروجی null = ارسال شد.
  Future<String?> requestOtp(String phone) async {
    try {
      final data = await _apiJson('POST', '/api/auth/otp/request', body: {'phone': phone});
      if (data['success'] == true) return null;
      final err = data['error']?.toString() ?? '';
      if (err.contains('TOO_SOON')) return 'کد قبلی هنوز معتبر است؛ کمی صبر کنید و دوباره امتحان کنید.';
      if (err.contains('RATE_LIMIT')) return 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.';
      if (err.contains('PHONE')) return 'شمارهٔ موبایل معتبر نیست.';
      if (err.contains('SEND')) return 'ارسال پیامک ناموفق بود؛ دوباره تلاش کنید.';
      return err.isNotEmpty ? err : 'درخواست کد ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  /// تأیید کد و ورود. null = ورود موفق.
  Future<String?> verifyOtp(String phone, String code) async {
    try {
      final data = await _apiJson('POST', '/api/auth/otp/verify', body: {'phone': phone, 'code': code});
      if (data['success'] == true) {
        _authToken = data['token'] as String?;
        _user = UserState.fromJson(data['user'] as Map<String, dynamic>);
        final prefs = await SharedPreferences.getInstance();
        if (_authToken != null) await prefs.setString(_tokenKey, _authToken!);
        await Future.wait([fetchTransactions(), fetchCoupons(), fetchAccountData()]);
        notifyListeners();
        return null;
      }
      final err = data['error']?.toString() ?? '';
      if (err.contains('WRONG')) return 'کد واردشده اشتباه است.';
      if (err.contains('EXPIRED')) return 'کد منقضی شده است؛ کد جدید بگیرید.';
      if (err.contains('LOCKED')) return 'تعداد تلاش‌های ناموفق زیاد بود؛ کد جدید بگیرید.';
      if (err.contains('NOT_FOUND')) return 'کدی برای این شماره ثبت نشده است.';
      return err.isNotEmpty ? err : 'تأیید کد ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  // ---- تیکت پشتیبانی ----

  Future<String?> createTicket({required String subject, required String message, String category = 'general', String priority = 'normal'}) async {
    try {
      final data = await _apiJson('POST', '/api/me/tickets', body: {'subject': subject, 'message': message, 'category': category, 'priority': priority});
      if (data['success'] == true) {
        await fetchTickets();
        return null;
      }
      return data['error']?.toString() ?? 'ثبت تیکت ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  Future<List<TicketMessage>> fetchTicketMessages(String ticketId) async {
    try {
      final data = await _apiJson('GET', '/api/me/tickets/$ticketId');
      await fetchTickets(); // hasNewReply پاک می‌شود
      return ((data['messages'] as List?) ?? []).map((e) => TicketMessage.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('[AppState] fetchTicketMessages failed: $e');
      return [];
    }
  }

  Future<String?> replyTicket(String ticketId, String message) async {
    try {
      final data = await _apiJson('POST', '/api/me/tickets/$ticketId/reply', body: {'message': message});
      if (data['success'] == true) {
        await fetchTickets();
        return null;
      }
      return data['error']?.toString() ?? 'ارسال پیام ناموفق بود.';
    } catch (e) {
      return 'اتصال به سرور برقرار نشد: $e';
    }
  }

  Future<String?> closeTicket(String ticketId) async {
    try {
      final data = await _apiJson('POST', '/api/me/tickets/$ticketId/close');
      if (data['success'] == true) {
        await fetchTickets();
        return null;
      }
      return data['error']?.toString() ?? 'بستن تیکت ناموفق بود.';
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
    },
    'ru': {
      'brand.name': 'BAZINO',
      'brand.tagline': 'Бронирование, буфет, турниры и клуб лояльности геймнета',
      'user.pts': 'Очки',
      'nav.home': 'Главная',
      'nav.loyalty': 'Клуб лояльности',
      'nav.reservations': 'Бронирование',
      'nav.cafe': 'Кафе',
      'nav.shop': 'Аксессуары',
      'nav.tournaments': 'Турниры',
      'nav.chat': 'Чаты',
      'nav.blog': 'Блог',
      'nav.messages': 'Входящие',
    },
    'tr': {
      'brand.name': 'BAZINO',
      'brand.tagline': 'Oyun salonu rezervasyonu, büfe, turnuvalar ve sadakat kulübü',
      'user.pts': 'Puan',
      'nav.home': 'Ana Sayfa',
      'nav.loyalty': 'Sadakat Kulübü',
      'nav.reservations': 'Rezervasyon',
      'nav.cafe': 'Kafe',
      'nav.shop': 'Aksesuarlar',
      'nav.tournaments': 'Turnuvalar',
      'nav.chat': 'Sohbet',
      'nav.blog': 'Blog',
      'nav.messages': 'Gelen Kutusu',
    },
  };

  static String translate(String key, String lang) {
    return _translations[lang]?[key] ?? _translations['en']?[key] ?? key;
  }
}
