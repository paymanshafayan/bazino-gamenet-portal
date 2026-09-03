import React, { useState } from 'react';
import { Article } from '../types/gamenet';
import { MessageSquare, User, Calendar, Tag, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Sparkles, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

interface Props {
  themeId?: string;
  articles: Article[];
  onAddComment: (articleId: string, comment: { gamerTag: string; content: string }) => void | Promise<void>;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function BlogTab({
  articles,
  onAddComment,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [commentGamerTag, setCommentGamerTag] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  const categories = ['All', 'News', 'Hardware', 'Dota 2', 'CS2'];

  const filteredArticles = activeCategory === 'All'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId) return;
    if (!commentGamerTag.trim() || !commentContent.trim()) {
      const errorMsg = L(language, { fa: 'لطفاً گیمرتگ و متن دیدگاه خود را وارد کنید.', en: 'Please enter both your gamertag and comment content.', ru: 'Пожалуйста, введите ваш геймертег и текст комментария.', tr: 'Lütfen oyuncu adınızı ve yorum metnini girin.' });
      addNotification(errorMsg, 'error');
      return;
    }

    // فقط پس از تأیید سرور فرم پاک می‌شود؛ در صورت خطا متن کاربر حفظ می‌ماند
    // تا دوباره تایپش نکند. پیام موفقیت/خطا را خود onAddComment می‌دهد.
    try {
      await onAddComment(selectedArticleId, {
        gamerTag: commentGamerTag.trim(),
        content: commentContent.trim(),
      });
      setCommentContent('');
    } catch {
      /* پیام خطا بالادست نمایش داده شد */
    }
  };

  return (
    <div className="animate-fade-in font-sans" dir={dir}>
      {selectedArticle ? (
        /* Full Article Read View */
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => setSelectedArticleId(null)}
            className="flex items-center gap-2 text-primary hover:text-white font-black text-xs uppercase tracking-wider mb-6 bg-primary/10 px-4 py-2.5 rounded-lg border border-primary/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all cursor-pointer font-display"
          >
            {dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>
              {language === 'fa' && 'بازگشت به اخبار و مقالات'}
              {language === 'en' && 'Back to News & Articles'}
              {language === 'ru' && 'Назад к новостям'}
              {language === 'tr' && 'Haberlere Geri Dön'}
            </span>
          </button>

          {/* Article Header */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-card-2 border border-white/10 mb-6">
            <img loading="lazy" 
              src={selectedArticle.imageUrl} 
              alt={selectedArticle.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-6 right-6 left-6">
              <span className="px-3 py-1 bg-primary text-black rounded text-xs font-black border border-primary/30 font-display uppercase tracking-wide">
                {selectedArticle.category === 'News' && (L(language, { fa: 'دنیای گیم', en: 'Gaming', ru: 'Общие новости', tr: 'Oyun Dünyası' }))}
                {selectedArticle.category === 'Hardware' && (L(language, { fa: 'سخت‌افزار', en: 'Hardware', ru: 'Железо', tr: 'Donanım' }))}
                {selectedArticle.category !== 'News' && selectedArticle.category !== 'Hardware' && selectedArticle.category}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-3.5 leading-snug drop-shadow-md font-display tracking-wide">
                {selectedArticle.title}
              </h1>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-6 border-b border-white/5 pb-4 font-mono">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              <span>
                {language === 'fa' && `نویسنده: ${selectedArticle.author}`}
                {language === 'en' && `Author: ${selectedArticle.author}`}
                {language === 'ru' && `Автор: ${selectedArticle.author}`}
                {language === 'tr' && `Yazar: ${selectedArticle.author}`}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>
                {language === 'fa' && `انتشار: ${selectedArticle.date}`}
                {language === 'en' && `Published: ${selectedArticle.date}`}
                {language === 'ru' && `Опубликовано: ${selectedArticle.date}`}
                {language === 'tr' && `Yayınlanma: ${selectedArticle.date}`}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>
                {language === 'fa' && `نظرات: ${selectedArticle.comments.length} نظر`}
                {language === 'en' && `Comments: ${selectedArticle.comments.length}`}
                {language === 'ru' && `Комментарии: ${selectedArticle.comments.length}`}
                {language === 'tr' && `Yorumlar: ${selectedArticle.comments.length}`}
              </span>
            </span>
          </div>

          {/* Article Content */}
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-8 text-justify font-medium">
            {selectedArticle.content}
          </div>

          {/* Comments Section */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-3 font-display uppercase tracking-wider">
              <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
              <span>
                {language === 'fa' && `دیدگاه‌های گیمرها (${selectedArticle.comments.length})`}
                {language === 'en' && `Gamers' Discussion (${selectedArticle.comments.length})`}
                {language === 'ru' && `Обсуждение игроков (${selectedArticle.comments.length})`}
                {language === 'tr' && `Oyuncu Yorumları (${selectedArticle.comments.length})`}
              </span>
            </h3>

            {/* Comments List */}
            <div className="flex flex-col gap-4 mb-8">
              {selectedArticle.comments.length === 0 ? (
                <p className="text-gray-500 text-xs py-5 text-center rounded-lg bg-white/5 border border-white/5">
                  {language === 'fa' && 'اولین کسی باشید که برای این مطلب دیدگاهی ثبت می‌کند!'}
                  {language === 'en' && 'Be the first to share your thoughts on this post!'}
                  {language === 'ru' && 'Оставьте первый комментарий к этой статье!'}
                  {language === 'tr' && 'Bu yazı hakkında ilk yorumu siz yapın!'}
                </p>
              ) : (
                selectedArticle.comments.map((comment) => (
                  <div key={comment.id} className="bg-card-2 p-4 rounded-lg border border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-primary font-mono">@{comment.gamerTag}</span>
                      <span className="text-gray-500 font-bold font-mono">{comment.date}</span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed font-medium">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="bg-card-3 p-6 rounded-xl border border-white/10 flex flex-col gap-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>
                  {language === 'fa' && 'ارسال دیدگاه جدید'}
                  {language === 'en' && 'Write a Comment'}
                  {language === 'ru' && 'Написать комментарий'}
                  {language === 'tr' && 'Yeni Yorum Yaz'}
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs text-gray-400 block mb-1.5 font-bold">
                    {language === 'fa' && 'گیمرتگ شما'}
                    {language === 'en' && 'Your GamerTag'}
                    {language === 'ru' && 'Ваш геймертег'}
                    {language === 'tr' && 'Oyuncu Etiketiniz'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Gamer_Tag"
                    value={commentGamerTag}
                    onChange={(e) => setCommentGamerTag(e.target.value)}
                    className="w-full bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1.5 font-bold">
                    {language === 'fa' && 'متن دیدگاه شما'}
                    {language === 'en' && 'Your Comment'}
                    {language === 'ru' && 'Текст вашего комментария'}
                    {language === 'tr' && 'Yorumunuz'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder={
                        L(language, { fa: 'دیدگاه خود را وارد کنید...', en: 'Type your comment here...', ru: 'Введите комментарий...', tr: 'Yorumunuzu buraya yazın...' })
                      }
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="flex-1 bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-medium"
                    />
                    <button
                      type="submit"
                      className="p-3 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg border border-primary/20 transition-all shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

        </div>
      ) : (
        /* Articles List Grid View */
        <div className="flex flex-col gap-6">
          
          {/* Category filter menu */}
          <div className="flex flex-wrap gap-2 rounded-xl p-4 bg-dark-card border border-white/10 font-display">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer uppercase tracking-wider border ${
                  activeCategory === cat
                    ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    : 'text-gray-400 hover:text-white bg-card-3 hover:bg-white/5 border-white/10'
                }`}
              >
                {cat === 'All' && (L(language, { fa: 'همه خبرها', en: 'All News', ru: 'Все новости', tr: 'Tüm Haberler' }))}
                {cat === 'News' && (L(language, { fa: 'دنیای گیم', en: 'Gaming', ru: 'Игры', tr: 'Oyun Dünyası' }))}
                {cat === 'Hardware' && (L(language, { fa: 'سخت‌افزار', en: 'Hardware', ru: 'Железо', tr: 'Donanım' }))}
                {cat !== 'All' && cat !== 'News' && cat !== 'Hardware' && cat}
              </button>
            ))}
          </div>

          {/* News Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredArticles.map((article) => (
              <div 
                key={article.id}
                className="rounded-2xl border border-white/10 bg-dark-card overflow-hidden flex flex-col group hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300"
              >
                <div className="relative aspect-[16/9] w-full bg-card-2 overflow-hidden">
                  <img loading="lazy" 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-primary text-black text-[10px] font-black border border-primary/30 backdrop-blur-sm rounded font-display uppercase tracking-wider">
                    {article.category === 'News' && (L(language, { fa: 'دنیای گیم', en: 'Gaming', ru: 'Игры', tr: 'Oyun Dünyası' }))}
                    {article.category === 'Hardware' && (L(language, { fa: 'سخت‌افزار', en: 'Hardware', ru: 'Железо', tr: 'Donanım' }))}
                    {article.category !== 'News' && article.category !== 'Hardware' && article.category}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white text-base font-black group-hover:text-primary transition-colors line-clamp-1 leading-snug font-display tracking-wide">
                      {article.title}
                    </h4>
                    <p className="text-gray-400 text-xs mt-3 leading-relaxed line-clamp-3 font-medium">
                      {article.content}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex gap-4 text-[10px] text-gray-500 font-bold font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{article.date}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {language === 'fa' && `${article.comments.length} دیدگاه`}
                          {language === 'en' && `${article.comments.length} Comments`}
                          {language === 'ru' && `${article.comments.length} ответа`}
                          {language === 'tr' && `${article.comments.length} Yorum`}
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedArticleId(article.id)}
                      className="flex items-center gap-1 text-primary hover:text-white text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider"
                    >
                      <span>
                        {language === 'fa' && 'ادامه مطلب'}
                        {language === 'en' && 'Read More'}
                        {language === 'ru' && 'Подробнее'}
                        {language === 'tr' && 'Devamını Oku'}
                      </span>
                      {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
