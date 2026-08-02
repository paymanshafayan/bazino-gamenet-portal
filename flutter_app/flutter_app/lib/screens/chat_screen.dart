import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';
import 'auth_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  ChatRoom? _selectedRoom;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  /// Opens a room and loads its real message history. New messages after
  /// that arrive instantly through AppState's real-time WebSocket connection
  /// (see models.dart `_connectRealtime`) — no polling needed.
  void _openRoom(AppState appState, ChatRoom room) {
    setState(() => _selectedRoom = room);
    appState.fetchChatMessages(room.id).then((_) => _scrollToBottom());
  }

  void _closeRoom() {
    setState(() => _selectedRoom = null);
  }

  Future<void> _sendMessage(AppState appState) async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _selectedRoom == null) return;
    _messageController.clear();
    final error = await appState.sendChatMessage(_selectedRoom!.id, appState.user.username, text);
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.redAccent));
      return;
    }
    _scrollToBottom();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    // Guard: If guest, prompt to login
    if (appState.user.username == 'Guest') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: GamingTheme.primary.withOpacity(0.05),
                  shape: BoxShape.circle,
                  border: Border.all(color: GamingTheme.primary.withOpacity(0.15)),
                ),
                child: const Icon(
                  Icons.lock_person_outlined,
                  size: 80,
                  color: GamingTheme.primary,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                isFa ? 'ورود به چت‌روم بازینو' : 'Access Bazino Chat',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                isFa
                    ? 'برای شرکت در اتاق‌های گفتگوی بازی‌ها، هماهنگی تیم‌ها و کل‌کل با بقیه گیمرها باید ابتدا وارد حساب کاربری خود شوید.'
                    : 'To participate in game chats, arrange teams, and chat with other gamers, please login first.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: GamingTheme.textMuted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AuthScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: GamingTheme.primary,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 8,
                  shadowColor: GamingTheme.primary.withOpacity(0.3),
                ),
                icon: const Icon(Icons.login),
                label: Text(
                  isFa ? 'ورود یا عضویت سریع گیمرها' : 'Login / Register Now',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_selectedRoom != null) {
      final roomMessages = appState.chatMessages
          .where((m) => m.roomId == _selectedRoom!.id)
          .toList();

      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: GamingTheme.darkCard,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: GamingTheme.primary),
            onPressed: _closeRoom,
          ),
          title: Row(
            children: [
              Text(
                _selectedRoom!.icon,
                style: const TextStyle(fontSize: 20),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _selectedRoom!.gameName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      isFa ? 'گفتگوی فعال کاربران' : 'Active gamer hub',
                      style: const TextStyle(
                        fontSize: 11,
                        color: GamingTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        body: Column(
          children: [
            // Chat Room Info banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black12,
                border: Border(
                  bottom: BorderSide(color: Colors.white.withOpacity(0.05)),
                ),
              ),
              child: Text(
                _selectedRoom!.description,
                style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
              ),
            ),
            // Messages List
            Expanded(
              child: roomMessages.isEmpty
                  ? Center(
                      child: Text(
                        isFa ? 'هیچ پیامی در این اتاق وجود ندارد.\nاولین پیام را بنویسید!' : 'No messages here yet.\nBe the first to speak!',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: GamingTheme.textMuted, height: 1.5),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: roomMessages.length,
                      itemBuilder: (context, index) {
                        final msg = roomMessages[index];
                        final isMe = msg.username == appState.user.username;

                        return Align(
                          alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.75,
                            ),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isMe
                                  ? GamingTheme.primary.withOpacity(0.12)
                                  : GamingTheme.darkCard,
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(16),
                                topRight: const Radius.circular(16),
                                bottomLeft: isMe ? Radius.zero : const Radius.circular(16),
                                bottomRight: isMe ? const Radius.circular(16) : Radius.zero,
                              ),
                              border: Border.all(
                                color: isMe
                                    ? GamingTheme.primary.withOpacity(0.3)
                                    : Colors.white.withOpacity(0.05),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (!isMe)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 4.0),
                                    child: Text(
                                      '@${msg.username}',
                                      style: const TextStyle(
                                        color: GamingTheme.primary,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                Text(
                                  msg.content,
                                  style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
                                ),
                                const SizedBox(height: 4),
                                Align(
                                  alignment: Alignment.bottomLeft,
                                  child: Text(
                                    msg.timestamp,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.35),
                                      fontSize: 9,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
            // Message Input bar
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: GamingTheme.darkCard,
                border: Border(
                  top: BorderSide(color: Colors.white.withOpacity(0.05)),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      onSubmitted: (_) => _sendMessage(appState),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: isFa ? 'پیام خود را بنویسید...' : 'Write a message...',
                        hintStyle: const TextStyle(color: GamingTheme.textMuted),
                        fillColor: Colors.black26,
                        filled: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _sendMessage(appState),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: GamingTheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.send,
                        color: Colors.black,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Default Rooms List View
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isFa ? 'اتاق‌های گفتگوی بازینو' : 'Bazino Chat Hub',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                isFa
                    ? 'برای هماهنگی مسابقات و کل‌کل با دیگر بازیکنان، اتاق بازی خود را انتخاب کنید.'
                    : 'Choose your game room to coordinate and banter with other gamers.',
                style: const TextStyle(
                  fontSize: 12,
                  color: GamingTheme.textMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: appState.chatRooms.length,
            itemBuilder: (context, index) {
              final room = appState.chatRooms[index];
              final count = appState.chatMessages
                  .where((m) => m.roomId == room.id)
                  .length;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: GamingTheme.darkCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    leading: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: GamingTheme.primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: GamingTheme.primary.withOpacity(0.2)),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        room.icon,
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                    title: Text(
                      room.gameName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        room.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: GamingTheme.textMuted),
                      ),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: GamingTheme.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$count پیام',
                        style: const TextStyle(
                          color: GamingTheme.primary,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    onTap: () => _openRoom(appState, room),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
