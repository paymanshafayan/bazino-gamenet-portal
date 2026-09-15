enum ChildPresence { offline, online, playing, inTournament }
enum RequestType { stationReservation, tournamentJoin, gameSelection, cafeOrder }
enum RequestStatus { pending, approved, rejected, expired }

class Child {
  final String id;
  final String username;
  final String displayName;
  final String avatarUrl;
  final int age;
  final ChildPresence presence;
  final String? currentStation;
  final String? currentGame;
  final DateTime? sessionStart;
  final int loyaltyPoints;
  final double todaySpentMinutes;
  final double todaySpentAmount;

  Child({
    required this.id,
    required this.username,
    required this.displayName,
    this.avatarUrl = '',
    required this.age,
    this.presence = ChildPresence.offline,
    this.currentStation,
    this.currentGame,
    this.sessionStart,
    this.loyaltyPoints = 0,
    this.todaySpentMinutes = 0,
    this.todaySpentAmount = 0,
  });

  factory Child.fromJson(Map<String, dynamic> j) => Child(
        id: j['id'] ?? j['username'] ?? '',
        username: j['username'] ?? '',
        displayName: j['displayName'] ?? j['username'] ?? '',
        avatarUrl: j['avatarUrl'] ?? '',
        age: j['age'] ?? 12,
        presence: _presenceFromString(j['presence'] ?? 'offline'),
        currentStation: j['currentStation'],
        currentGame: j['currentGame'],
        sessionStart: j['sessionStart'] != null ? DateTime.tryParse(j['sessionStart']) : null,
        loyaltyPoints: j['loyaltyPoints'] ?? 0,
        todaySpentMinutes: (j['todaySpentMinutes'] ?? 0).toDouble(),
        todaySpentAmount: (j['todaySpentAmount'] ?? 0).toDouble(),
      );

  static ChildPresence _presenceFromString(String s) {
    switch (s) {
      case 'online':
        return ChildPresence.online;
      case 'playing':
        return ChildPresence.playing;
      case 'inTournament':
        return ChildPresence.inTournament;
      default:
        return ChildPresence.offline;
    }
  }

  String get presenceLabelFa {
    switch (presence) {
      case ChildPresence.online:
        return 'در لابی';
      case ChildPresence.playing:
        return 'در حال بازی';
      case ChildPresence.inTournament:
        return 'در تورنمنت';
      case ChildPresence.offline:
        return 'خارج از مجموعه';
    }
  }

  bool get isInside => presence != ChildPresence.offline;
}

class ApprovalRequest {
  final String id;
  final String childId;
  final String childName;
  final RequestType type;
  final RequestStatus status;
  final DateTime createdAt;
  final Map<String, dynamic> payload;
  final String? parentNote;
  final String? rejectionReason;

  ApprovalRequest({
    required this.id,
    required this.childId,
    required this.childName,
    required this.type,
    this.status = RequestStatus.pending,
    required this.createdAt,
    required this.payload,
    this.parentNote,
    this.rejectionReason,
  });

  factory ApprovalRequest.fromJson(Map<String, dynamic> j) => ApprovalRequest(
        id: j['id'] ?? '',
        childId: j['childId'] ?? '',
        childName: j['childName'] ?? '',
        type: _typeFromString(j['type'] ?? 'stationReservation'),
        status: _statusFromString(j['status'] ?? 'pending'),
        createdAt: DateTime.tryParse(j['createdAt'] ?? '') ?? DateTime.now(),
        payload: j['payload'] ?? {},
        parentNote: j['parentNote'],
        rejectionReason: j['rejectionReason'],
      );

  static RequestType _typeFromString(String s) {
    switch (s) {
      case 'tournamentJoin':
        return RequestType.tournamentJoin;
      case 'gameSelection':
        return RequestType.gameSelection;
      case 'cafeOrder':
        return RequestType.cafeOrder;
      default:
        return RequestType.stationReservation;
    }
  }

  static RequestStatus _statusFromString(String s) {
    switch (s) {
      case 'approved':
        return RequestStatus.approved;
      case 'rejected':
        return RequestStatus.rejected;
      case 'expired':
        return RequestStatus.expired;
      default:
        return RequestStatus.pending;
    }
  }

  String get typeLabelFa {
    switch (type) {
      case RequestType.stationReservation:
        return 'رزرو ایستگاه';
      case RequestType.tournamentJoin:
        return 'شرکت در مسابقه';
      case RequestType.gameSelection:
        return 'انتخاب بازی';
      case RequestType.cafeOrder:
        return 'سفارش بوفه';
    }
  }

  String get summaryFa {
    switch (type) {
      case RequestType.stationReservation:
        return '${payload['stationName'] ?? 'ایستگاه'} - ${payload['duration'] ?? ''} دقیقه';
      case RequestType.tournamentJoin:
        return '${payload['tournamentTitle'] ?? 'تورنمنت'} - ورودی ${payload['fee'] ?? 0}';
      case RequestType.gameSelection:
        return '${payload['gameName'] ?? 'بازی'} - ${payload['ageRating'] ?? ''}';
      case RequestType.cafeOrder:
        final items = (payload['items'] as List?)?.length ?? 0;
        return '$items آیتم - ${payload['total'] ?? 0} تومان';
    }
  }
}

class Activity {
  final String id;
  final String childId;
  final RequestType type;
  final DateTime at;
  final String title;
  final String detail;
  final double? amount;
  final int? durationMinutes;

  Activity({
    required this.id,
    required this.childId,
    required this.type,
    required this.at,
    required this.title,
    required this.detail,
    this.amount,
    this.durationMinutes,
  });

  factory Activity.fromJson(Map<String, dynamic> j) => Activity(
        id: j['id'] ?? '',
        childId: j['childId'] ?? '',
        type: ApprovalRequest._typeFromString(j['type'] ?? 'stationReservation'),
        at: DateTime.tryParse(j['at'] ?? '') ?? DateTime.now(),
        title: j['title'] ?? '',
        detail: j['detail'] ?? '',
        amount: (j['amount'] as num?)?.toDouble(),
        durationMinutes: j['durationMinutes'],
      );
}

class ChildLimits {
  final int dailyMinutesLimit;
  final double dailySpendingLimit;
  final List<String> allowedGames;
  final List<String> blockedGames;
  final String allowedFrom; // "14:00"
  final String allowedTo; // "21:00"
  final bool requireApprovalForCafe;
  final bool requireApprovalForTournaments;
  final bool requireApprovalForGameSelection;

  ChildLimits({
    this.dailyMinutesLimit = 180,
    this.dailySpendingLimit = 500000,
    this.allowedGames = const [],
    this.blockedGames = const [],
    this.allowedFrom = '14:00',
    this.allowedTo = '21:00',
    this.requireApprovalForCafe = true,
    this.requireApprovalForTournaments = true,
    this.requireApprovalForGameSelection = true,
  });

  factory ChildLimits.fromJson(Map<String, dynamic> j) => ChildLimits(
        dailyMinutesLimit: j['dailyMinutesLimit'] ?? 180,
        dailySpendingLimit: (j['dailySpendingLimit'] ?? 500000).toDouble(),
        allowedGames: List<String>.from(j['allowedGames'] ?? []),
        blockedGames: List<String>.from(j['blockedGames'] ?? []),
        allowedFrom: j['allowedFrom'] ?? '14:00',
        allowedTo: j['allowedTo'] ?? '21:00',
        requireApprovalForCafe: j['requireApprovalForCafe'] ?? true,
        requireApprovalForTournaments: j['requireApprovalForTournaments'] ?? true,
        requireApprovalForGameSelection: j['requireApprovalForGameSelection'] ?? true,
      );

  Map<String, dynamic> toJson() => {
        'dailyMinutesLimit': dailyMinutesLimit,
        'dailySpendingLimit': dailySpendingLimit,
        'allowedGames': allowedGames,
        'blockedGames': blockedGames,
        'allowedFrom': allowedFrom,
        'allowedTo': allowedTo,
        'requireApprovalForCafe': requireApprovalForCafe,
        'requireApprovalForTournaments': requireApprovalForTournaments,
        'requireApprovalForGameSelection': requireApprovalForGameSelection,
      };
}
