import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Push Notification Log
          Row(
            children: [
              const Icon(Icons.notifications_active, color: GamingTheme.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                isFa ? '🔔 نوتیفیکیشن‌های لایو اپلیکیشن' : '🔔 Live Push Notifications',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 10),
          appState.notifications.isEmpty
              ? Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  decoration: BoxDecoration(
                    color: GamingTheme.darkCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                  ),
                  child: Center(
                    child: Text(
                      isFa ? 'هیچ نوتیفیکیشن فعالی وجود ندارد' : 'No active notifications',
                      style: const TextStyle(color: GamingTheme.textMuted, fontSize: 12),
                    ),
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.notifications.length,
                  itemBuilder: (context, index) {
                    final notif = appState.notifications[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      color: Colors.amber.withValues(alpha: 0.05),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: GamingTheme.primary.withValues(alpha: 0.2)),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: GamingTheme.primary.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.flash_on, color: GamingTheme.primary, size: 16),
                        ),
                        title: Text(
                          notif,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.close, color: Colors.white60, size: 16),
                          onPressed: () {
                            appState.removeNotificationAt(index);
                          },
                        ),
                      ),
                    );
                  },
                ),
          
          const SizedBox(height: 24),

          // Message Inbox
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.mail_outline, color: GamingTheme.primary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    isFa ? '📬 صندوق پیام‌های دریافتی' : '📬 Messages Inbox',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: GamingTheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${appState.messages.where((m) => !m.isRead).length} ${isFa ? 'جدید' : 'new'}',
                  style: const TextStyle(fontSize: 10, color: GamingTheme.primary, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          appState.messages.isEmpty
              ? Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  decoration: BoxDecoration(
                    color: GamingTheme.darkCard,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.mail_lock, color: GamingTheme.textMuted, size: 40),
                      const SizedBox(height: 12),
                      Text(
                        isFa ? 'صندوق پیام‌های شما خالی است.' : 'Your message inbox is empty.',
                        style: const TextStyle(color: GamingTheme.textMuted, fontSize: 13),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: appState.messages.length,
                  itemBuilder: (context, index) {
                    final msg = appState.messages[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      color: msg.isRead ? GamingTheme.darkCard : const Color(0xFF181510),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: msg.isRead 
                              ? Colors.white.withValues(alpha: 0.05) 
                              : GamingTheme.primary.withValues(alpha: 0.3),
                          width: msg.isRead ? 1.0 : 1.5,
                        ),
                      ),
                      child: InkWell(
                        onTap: () {
                          appState.markMessageAsRead(msg.id);
                          _showMessageDetails(context, msg, isFa);
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      if (!msg.isRead) ...[
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: GamingTheme.primary,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                      ],
                                      Text(
                                        msg.sender,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: msg.isRead ? GamingTheme.textMuted : GamingTheme.primary,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    msg.date,
                                    style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                msg.title,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                msg.body,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.white70,
                                  height: 1.5,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  Text(
                                    isFa ? 'مشاهده جزئیات ←' : 'Read details →',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: GamingTheme.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }

  void _showMessageDetails(BuildContext context, AppMessage msg, bool isFa) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: GamingTheme.darkCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Colors.white10),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: GamingTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        msg.sender,
                        style: const TextStyle(
                          fontSize: 11,
                          color: GamingTheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Text(
                      msg.date,
                      style: const TextStyle(fontSize: 11, color: GamingTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  msg.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const Divider(color: Colors.white10, height: 24),
                Text(
                  msg.body,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.8),
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white12,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: Text(isFa ? 'بستن' : 'Close'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
