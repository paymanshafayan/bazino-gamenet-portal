import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../theme.dart';

class BlogScreen extends StatefulWidget {
  const BlogScreen({super.key});

  @override
  State<BlogScreen> createState() => _BlogScreenState();
}

class _BlogScreenState extends State<BlogScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _commentController = TextEditingController();
  Article? _selectedArticle;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isFa = appState.language == 'fa';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(isFa ? '📰 اخبار و بلاگ بازینو' : '📰 Bazino News & Blog', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: GamingTheme.primary)),
              const SizedBox(height: 6),
              Text(isFa ? 'تب‌های بلاگ / جزئیات — هم‌ارز پرتال blog, blog.detail' : 'Blog / Detail tabs — parity with portal blog, blog.detail', style: const TextStyle(fontSize: 10, color: Colors.white70)),
            ]),
          ),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: GamingTheme.darkCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: GamingTheme.primary.withValues(alpha: 0.15))),
          child: TabBar(
            controller: _tabController,
            labelColor: GamingTheme.primary,
            unselectedLabelColor: Colors.white54,
            indicatorColor: GamingTheme.primary,
            labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            tabs: [
              Tab(text: isFa ? 'بلاگ' : 'Blog'),
              Tab(text: isFa ? 'جزئیات' : 'Detail'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildBlogList(appState, isFa),
              _buildDetail(appState, isFa),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBlogList(AppState appState, bool isFa) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: appState.articles.length,
      itemBuilder: (context, index) {
        final article = appState.articles[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            padding: EdgeInsets.zero,
            onTap: () {
              setState(() {
                _selectedArticle = article;
                _tabController.animateTo(1);
              });
            },
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              ClipRRect(borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18)), child: Container(height: 120, width: double.infinity, decoration: BoxDecoration(image: DecorationImage(image: NetworkImage(article.imageUrl), fit: BoxFit.cover)))),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: GamingTheme.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)), child: Text(article.category, style: const TextStyle(fontSize: 9, color: GamingTheme.primary, fontWeight: FontWeight.bold))),
                    Text(article.date, style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted)),
                  ]),
                  const SizedBox(height: 8),
                  Text(article.titleFor(appState.language), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Text(article.contentFor(appState.language), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: Colors.white70)),
                ]),
              ),
            ]),
          ),
        );
      },
    );
  }

  Widget _buildDetail(AppState appState, bool isFa) {
    if (_selectedArticle == null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: GlassCard(padding: const EdgeInsets.all(20), child: Text(isFa ? 'مقاله‌ای انتخاب نشده.' : 'No article selected.', style: const TextStyle(color: Colors.white54, fontSize: 12)))));
    }
    final article = _selectedArticle!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(borderRadius: BorderRadius.circular(18), child: Container(height: 180, width: double.infinity, decoration: BoxDecoration(image: DecorationImage(image: NetworkImage(article.imageUrl), fit: BoxFit.cover)))),
        const SizedBox(height: 16),
        Text(article.titleFor(appState.language), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 8),
        Row(children: [Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: GamingTheme.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)), child: Text(article.category, style: const TextStyle(fontSize: 9, color: GamingTheme.primary, fontWeight: FontWeight.bold))), const SizedBox(width: 8), Text(article.date, style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted))]),
        const SizedBox(height: 12),
        Text(article.contentFor(appState.language), style: const TextStyle(fontSize: 12, color: Colors.white70, height: 1.6)),
        const SizedBox(height: 12),
        Row(children: [const Icon(Icons.person, size: 14, color: GamingTheme.textMuted), const SizedBox(width: 4), Text('${isFa ? 'نویسنده:' : 'Author:'} ${article.authorFor(appState.language)}', style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted))]),
        const Divider(color: Color(0xFF22242D), height: 32),
        Text(isFa ? '💬 دیدگاه‌ها' : '💬 Comments', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 10),
        article.comments.isEmpty
            ? Text(isFa ? 'دیدگاهی وجود ندارد.' : 'No comments yet.', style: const TextStyle(fontSize: 10, color: GamingTheme.textMuted, fontStyle: FontStyle.italic))
            : Column(children: article.comments.map((c) => Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF22242D))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(c.gamerTag, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: GamingTheme.primary)), Text(c.date, style: const TextStyle(fontSize: 8, color: GamingTheme.textMuted))]), const SizedBox(height: 4), Text(c.content, style: const TextStyle(fontSize: 10, color: Colors.white70))]))).toList()),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: TextField(controller: _commentController, decoration: InputDecoration(hintText: isFa ? 'نوشتن دیدگاه...' : 'Add a comment...', contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)))),
          const SizedBox(width: 8),
          IconButton(icon: const Icon(Icons.send, color: GamingTheme.primary), onPressed: () { if (_commentController.text.isNotEmpty) { appState.addComment(article.id, _commentController.text, appState.user.username); _commentController.clear(); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(isFa ? 'دیدگاه ثبت شد!' : 'Comment posted!'), backgroundColor: Colors.green)); } }),
        ]),
      ]),
    );
  }
}
