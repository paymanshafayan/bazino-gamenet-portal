import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../api_config.dart';
import '../models/parent_models.dart';

class ParentState extends ChangeNotifier {
  bool isLoading = false;
  String? error;
  String? authToken;
  List<Child> children = [];
  List<ApprovalRequest> pendingRequests = [];
  List<Activity> activities = [];
  Child? selectedChild;
  ChildLimits? currentLimits;

  // Mock data for offline demo - در حالت واقعی از API می‌آید
  bool get useMock => true;

  ParentState() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    authToken = prefs.getString('parent_auth_token');
    if (authToken != null) {
      await refreshAll();
    }
    notifyListeners();
  }

  Future<void> _saveToken(String token) async {
    authToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('parent_auth_token', token);
  }

  Future<void> logout() async {
    authToken = null;
    children = [];
    pendingRequests = [];
    activities = [];
    selectedChild = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('parent_auth_token');
    notifyListeners();
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  Future<bool> login(String phone, String password) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      if (useMock) {
        // Mock login - در حالت واقعی به سرور وصل می‌شود
        await Future.delayed(const Duration(seconds: 1));
        await _saveToken('mock_parent_token_${phone}');
        _loadMockData();
        isLoading = false;
        notifyListeners();
        return true;
      }

      final res = await http.post(
        Uri.parse('$kApiBaseUrl/api/auth/login'),
        headers: _headers,
        body: jsonEncode({'username': phone, 'password': password}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['token'] != null) {
          await _saveToken(data['token']);
          await refreshAll();
          isLoading = false;
          notifyListeners();
          return true;
        }
      }
      error = 'ورود ناموفق بود';
      isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      error = e.toString();
      isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> refreshAll() async {
    if (useMock) {
      _loadMockData();
      return;
    }
    isLoading = true;
    notifyListeners();
    try {
      await Future.wait([
        fetchChildren(),
        fetchPendingRequests(),
      ]);
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchChildren() async {
    if (useMock) return;
    try {
      final res = await http.get(Uri.parse('$kParentApiBase/children'), headers: _headers);
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        children = data.map((e) => Child.fromJson(e)).toList();
        if (selectedChild == null && children.isNotEmpty) {
          selectedChild = children.first;
        }
        notifyListeners();
      }
    } catch (e) {
      error = e.toString();
    }
  }

  Future<void> fetchPendingRequests() async {
    if (useMock) return;
    try {
      final res = await http.get(Uri.parse('$kParentApiBase/requests'), headers: _headers);
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        pendingRequests = data.map((e) => ApprovalRequest.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (e) {
      error = e.toString();
    }
  }

  Future<void> fetchActivities(String childId) async {
    if (useMock) return;
    try {
      final res = await http.get(Uri.parse('$kParentApiBase/activity/$childId'), headers: _headers);
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        activities = data.map((e) => Activity.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> fetchLimits(String childId) async {
    if (useMock) {
      currentLimits = ChildLimits();
      notifyListeners();
      return;
    }
    try {
      final res = await http.get(Uri.parse('$kParentApiBase/settings/$childId'), headers: _headers);
      if (res.statusCode == 200) {
        currentLimits = ChildLimits.fromJson(jsonDecode(res.body));
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> approveRequest(String requestId, {String? note}) async {
    try {
      if (useMock) {
        pendingRequests = pendingRequests.map((r) {
          if (r.id == requestId) {
            return ApprovalRequest(
              id: r.id,
              childId: r.childId,
              childName: r.childName,
              type: r.type,
              status: RequestStatus.approved,
              createdAt: r.createdAt,
              payload: r.payload,
              parentNote: note,
            );
          }
          return r;
        }).toList();
        pendingRequests = pendingRequests.where((r) => r.status == RequestStatus.pending).toList();
        notifyListeners();
        return true;
      }
      final res = await http.post(
        Uri.parse('$kParentApiBase/requests/$requestId/approve'),
        headers: _headers,
        body: jsonEncode({'note': note}),
      );
      if (res.statusCode == 200) {
        await fetchPendingRequests();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> rejectRequest(String requestId, {required String reason}) async {
    try {
      if (useMock) {
        pendingRequests = pendingRequests.map((r) {
          if (r.id == requestId) {
            return ApprovalRequest(
              id: r.id,
              childId: r.childId,
              childName: r.childName,
              type: r.type,
              status: RequestStatus.rejected,
              createdAt: r.createdAt,
              payload: r.payload,
              rejectionReason: reason,
            );
          }
          return r;
        }).toList();
        pendingRequests = pendingRequests.where((r) => r.status == RequestStatus.pending).toList();
        notifyListeners();
        return true;
      }
      final res = await http.post(
        Uri.parse('$kParentApiBase/requests/$requestId/reject'),
        headers: _headers,
        body: jsonEncode({'reason': reason}),
      );
      if (res.statusCode == 200) {
        await fetchPendingRequests();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> linkChild(String identifier) async {
    if (useMock) {
      // شبیه‌سازی لینک فرزند جدید
      final newChild = Child(
        id: 'child_${DateTime.now().millisecondsSinceEpoch}',
        username: identifier,
        displayName: identifier,
        age: 12,
        presence: ChildPresence.offline,
      );
      children = [...children, newChild];
      selectedChild = newChild;
      notifyListeners();
      return true;
    }
    try {
      final res = await http.post(
        Uri.parse('$kParentApiBase/link-child'),
        headers: _headers,
        body: jsonEncode({'identifier': identifier}),
      );
      if (res.statusCode == 200) {
        await fetchChildren();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  void _loadMockData() {
    children = [
      Child(
        id: 'c1',
        username: 'amir_14',
        displayName: 'امیرحسین',
        age: 14,
        presence: ChildPresence.playing,
        currentStation: 'PC-07 - VIP',
        currentGame: 'Valorant',
        sessionStart: DateTime.now().subtract(const Duration(minutes: 42)),
        loyaltyPoints: 320,
        todaySpentMinutes: 85,
        todaySpentAmount: 120000,
      ),
      Child(
        id: 'c2',
        username: 'sara_11',
        displayName: 'سارا',
        age: 11,
        presence: ChildPresence.online,
        currentStation: 'Lobby',
        loyaltyPoints: 150,
        todaySpentMinutes: 20,
        todaySpentAmount: 0,
      ),
    ];
    selectedChild = children.first;

    pendingRequests = [
      ApprovalRequest(
        id: 'r1',
        childId: 'c1',
        childName: 'امیرحسین',
        type: RequestType.stationReservation,
        createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
        payload: {
          'stationName': 'PC-12 - Gaming',
          'duration': 120,
          'hourlyRate': 75000,
          'total': 150000,
        },
      ),
      ApprovalRequest(
        id: 'r2',
        childId: 'c1',
        childName: 'امیرحسین',
        type: RequestType.cafeOrder,
        createdAt: DateTime.now().subtract(const Duration(minutes: 12)),
        payload: {
          'items': ['پیتزا پپرونی', 'نوشابه'],
          'total': 185000,
          'note': 'بدون فلفل',
        },
      ),
      ApprovalRequest(
        id: 'r3',
        childId: 'c1',
        childName: 'امیرحسین',
        type: RequestType.tournamentJoin,
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        payload: {
          'tournamentTitle': 'Valorant Weekly Cup',
          'fee': 100000,
          'prize': '500,000 تومان',
        },
      ),
      ApprovalRequest(
        id: 'r4',
        childId: 'c1',
        childName: 'امیرحسین',
        type: RequestType.gameSelection,
        createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
        payload: {
          'gameName': 'Call of Duty: Warzone',
          'ageRating': '+18',
          'genre': 'Shooter',
        },
      ),
    ];

    activities = [
      Activity(
        id: 'a1',
        childId: 'c1',
        type: RequestType.stationReservation,
        at: DateTime.now().subtract(const Duration(hours: 2)),
        title: 'رزرو PC-07',
        detail: '120 دقیقه - Valorant',
        durationMinutes: 120,
        amount: 150000,
      ),
      Activity(
        id: 'a2',
        childId: 'c1',
        type: RequestType.cafeOrder,
        at: DateTime.now().subtract(const Duration(hours: 3)),
        title: 'سفارش بوفه',
        detail: 'ساندویچ + آبمیوه',
        amount: 95000,
      ),
    ];

    currentLimits = ChildLimits();
    notifyListeners();
  }

  void selectChild(Child child) {
    selectedChild = child;
    if (!useMock) {
      fetchActivities(child.id);
      fetchLimits(child.id);
    }
    notifyListeners();
  }
}
