import React from 'react';
import { Coffee, ShoppingBag, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

/**
 * پنل «به‌زودی» برای بخش‌های غیرفعال موقت (کافه/فروشگاه/گفتگو).
 * کد سفارش/خرید/چت دست‌نخورده می‌ماند تا با برداشتن پرچم، بدون تغییر کد فعال شود.
 */
export default function ComingSoonPanel({ kind }: { kind: 'food' | 'shop' | 'chat' }) {
  const { dir, language } = useLanguage();
  const Icon = kind === 'food' ? Coffee : kind === 'shop' ? ShoppingBag : MessageSquare;
  const title = kind === 'food'
    ? L(language, { fa: 'کافه و غذا', en: 'Food & Drinks', ru: 'Кафе и напитки', tr: 'Yiyecek ve İçecek' })
    : kind === 'shop'
      ? L(language, { fa: 'فروشگاه', en: 'Shop', ru: 'Магазин', tr: 'Mağaza' })
      : L(language, { fa: 'گفتگو', en: 'Chat', ru: 'Чат', tr: 'Sohbet' });
  const body = kind === 'food'
    ? L(language, {
        fa: 'سفارش آنلاین غذا و نوشیدنی به‌زودی فعال می‌شود؛ فعلاً حضوری در کلاب سفارش دهید.',
        en: 'Online food & drinks ordering is coming soon; for now please order in person at the club.',
        ru: 'Онлайн-заказ еды и напитков скоро откроется; пока заказывайте лично в клубе.',
        tr: 'Çevrimiçi yiyecek ve içecek siparişi çok yakında; şimdilik lütfen kulüpte yüz yüze sipariş verin.',
      })
    : kind === 'shop'
      ? L(language, {
          fa: 'فروشگاه آنلاین به‌زودی با محصولات کلوپ باز می‌شود.',
          en: 'The online shop opens soon with club products.',
          ru: 'Интернет-магазин скоро откроется с товарами клуба.',
          tr: 'Çevrimiçi mağaza kulüp ürünleriyle çok yakında açılıyor.',
        })
      : L(language, {
          fa: 'بخش گفتگو فعلاً غیرفعال است و به‌زودی برمی‌گردد.',
          en: 'Chat is currently disabled and will be back soon.',
          ru: 'Чат временно отключён и скоро вернётся.',
          tr: 'Sohbet şu anda kapalı, çok yakında dönecek.',
        });
  return (
    <div className="rounded-2xl border border-white/10 bg-dark-card p-10 text-center animate-fade-in font-sans" dir={dir} data-coming-soon={kind}>
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <div className="text-[11px] font-black tracking-[0.3em] text-primary font-display mb-2">COMING SOON</div>
      <h2 className="text-white text-xl font-black font-display mb-2">{title}</h2>
      <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">{body}</p>
    </div>
  );
}
