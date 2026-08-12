import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class BlogScreen extends StatefulWidget {
  const BlogScreen({super.key});

  @override
  State<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends State<BlogScreen> {
  final _commentController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: appState.articles.length,
      itemBuilder: (context, index) {
        final article = appState.articles[index];

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: GlassCard(
            radius: 18,
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero cover
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                  ),
                  child: Container(
                    height: 150,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      image: DecorationImage(
                        image: NetworkImage(article.imageUrl),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),

              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Meta row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: GamingTheme.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            article.category,
                            style: const TextStyle(fontSize: 9, color: GamingTheme.primary, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Text(
                          article.date,
                          style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Title
                    Text(
                      article.titleFor(appState.language),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),

                    // Content
                    Text(
                      article.contentFor(appState.language),
                      style: const TextStyle(fontSize: 11, color: Colors.white70, height: 1.6),
                    ),
                    const SizedBox(height: 12),

                    // Author line
                    Row(
                      children: [
                        const Icon(Icons.person, size: 14, color: GamingTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          '${isFa ? 'نویسنده:' : 'Author:'} ${article.authorFor(appState.language)}',
                          style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted),
                        ),
                      ],
                    ),

                    const Divider(color: Color(0xFF22242D), height: 32),

                    // Comments Title
                    Text(
                      isFa ? '💬 دیدگاه‌های گیمرها' : '💬 Gamer Discussions',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 10),

                    // Comments list
                    article.comments.isEmpty
                        ? Text(
                            isFa ? 'دیدگاهی وجود ندارد. اولین نفری باشید که دیدگاه ارسال میکند!' : 'No comments yet. Be the first to express yours!',
                            style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted, fontStyle: FontStyle.italic),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: article.comments.length,
                            itemBuilder: (context, cIndex) {
                              final comment = article.comments[cIndex];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.black26,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFF22242D)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          comment.gamerTag,
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: GamingTheme.primary),
                                        ),
                                        Text(
                                          comment.date,
                                          style: const TextStyle(fontSize: 8, color: GamingTheme.textMuted),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      comment.content,
                                      style: const TextStyle(fontSize: 10, color: Colors.white70),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),

                    const SizedBox(height: 16),

                    // Add comment Input box
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _commentController,
                            decoration: InputDecoration(
                              hintText: isFa ? 'نوشتن دیدگاه شما...' : 'Add a comment...',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.send, color: GamingTheme.primary),
                          onPressed: () {
                            if (_commentController.text.isNotEmpty) {
                              appState.addComment(
                                article.id,
                                _commentController.text,
                                appState.user.username,
                              );
                              _commentController.clear();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    isFa ? 'دیدگاه شما ثبت و نمایش داده شد!' : 'Your comment posted successfully!',
                                  ),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ));
      },
    );
  }
}
