import React, { useState } from 'react';
import { Gamepad2, Baby, Swords, Lightbulb, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { GameSystem, DiscountCode } from '../types/gamenet';
import { L } from '../utils/i18n';
import { useLanguage } from '../context/LanguageContext';
import { filterSystemsForAudience, type GameAudience } from '../../shared/games';
import ReservationsTab from './ReservationsTab';

/**
 * صفحهٔ عمومی «Games» — سه کارت کاملاً جدا:
 *
 *   ۱) KIDS          → بازی‌های مفرح و ایمن برای بازیکنان کوچک‌تر (سیستم‌های دستهٔ kids)
 *   ۲) ADULTS        → اکشن، ورزشی، مسابقه‌ای و بیشتر (سیستم‌های دستهٔ adults)
 *   ۳) GAME REQUESTS → پیشنهاد بازی؛ جریان رزرو با فوکوس فیلد «بازی مورد درخواست» باز می‌شود
 *
 * بعد از انتخاب KIDS/ADULTS همان ReservationsTab موجود (سیستم‌ها، کوپن، کیف پول/در محل)
 * با فیلتر مخاطب رندر می‌شود — منطق رزرو دست‌نخورده است.
 * Deep-link: /games?category=kids|adults|requests
 */
type GamesCategory = GameAudience | 'requests';

interface Props {
  themeId?: string;
  systems: GameSystem[];
  activeCoupons: DiscountCode[];
  onAddLoyaltyPoints: (points: number, desc: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORY_PARAM: Record<GamesCategory, string> = { kids: 'kids', adults: 'adults', requests: 'requests' };

/**
 * توجه: این کامپوننت باید «بیرون» از GamesTab تعریف شود — تعریف داخل بدنهٔ
 * کامپوننت والد با هر رندر هویت جدید می‌سازد و کل subtree (شامل انتخاب سیستم
 * کاربر) remount می‌شود. این باگ واقعاً در تست مرورگر گرفته شد.
 */
function GamesReservationFlow({
  audience,
  focusGame,
  onBack,
  ...rest
}: {
  audience: 'kids' | 'adults' | null;
  focusGame?: boolean;
  onBack: () => void;
} & Props) {
  const { t, dir, language } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          data-testid="games-back"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-primary/50 text-xs font-black transition-all cursor-pointer"
        >
          {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {L(language, { fa: 'همهٔ دسته‌ها', en: 'All categories', ru: 'Все категории', tr: 'Tüm kategoriler' })}
        </button>
        <span className="text-[11px] text-gray-500 font-bold">
          {L(language, { fa: 'رزرو ایستگاه گیمینگ', en: 'Book a gaming station', ru: 'Бронь игровой станции', tr: 'Oyun istasyonu rezervasyonu' })}
        </span>
      </div>
      <ReservationsTab
        themeId={rest.themeId}
        systems={rest.systems}
        activeCoupons={rest.activeCoupons}
        onAddLoyaltyPoints={rest.onAddLoyaltyPoints}
        addNotification={rest.addNotification}
        audienceFilter={audience}
        focusRequestedGame={focusGame}
      />
    </div>
  );
}

function readCategoryFromUrl(): GamesCategory | null {
  if (typeof window === 'undefined') return null;
  const c = new URLSearchParams(window.location.search).get('category');
  return c === 'kids' || c === 'adults' || c === 'requests' ? c : null;
}

export default function GamesTab({
  themeId,
  systems,
  activeCoupons,
  onAddLoyaltyPoints,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [category, setCategory] = useState<GamesCategory | null>(() => readCategoryFromUrl());

  const selectCategory = (c: GamesCategory | null) => {
    setCategory(c);
    // آدرس دسته را در URL نگه می‌داریم تا رفرش/اشتراک‌گذاری همان دسته را باز کند
    if (typeof window !== 'undefined') {
      const url = c ? `/games?category=${CATEGORY_PARAM[c]}` : '/games';
      window.history.replaceState({}, '', url);
    }
  };

  const cardMeta: Array<{
    id: Exclude<GamesCategory, null>;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    count: number | null;
    accent: string;
    testid: string;
  }> = [
    {
      id: 'kids',
      icon: Baby,
      title: L(language, { fa: 'کودکان', en: 'KIDS', ru: 'ДЕТИ', tr: 'ÇOCUKLAR' }),
      desc: L(language, { fa: 'بازی‌های مفرح و ایمن برای بازیکنان کوچک‌تر', en: 'Fun & safe games for younger players', ru: 'Весёлые и безопасные игры для юных игроков', tr: 'Küçük oyuncular için eğlenceli ve güvenli oyunlar' }),
      count: filterSystemsForAudience(systems, 'kids').length,
      accent: 'from-emerald-400/20 to-cyan-400/10 border-emerald-400/30 hover:border-emerald-400/60 text-emerald-300',
      testid: 'games-card-kids',
    },
    {
      id: 'adults',
      icon: Swords,
      title: L(language, { fa: 'بزرگسالان', en: 'ADULTS', ru: 'ВЗРОСЛЫЕ', tr: 'YETİŞKİNLER' }),
      desc: L(language, { fa: 'اکشن، ورزشی، مسابقه‌ای و بیشتر', en: 'Action, sports, racing and more', ru: 'Экшен, спорт, гонки и не только', tr: 'Aksiyon, spor, yarış ve daha fazlası' }),
      count: filterSystemsForAudience(systems, 'adults').length,
      accent: 'from-fuchsia-400/20 to-rose-400/10 border-fuchsia-400/30 hover:border-fuchsia-400/60 text-fuchsia-300',
      testid: 'games-card-adults',
    },
    {
      id: 'requests',
      icon: Lightbulb,
      title: L(language, { fa: 'درخواست بازی', en: 'GAME REQUESTS', ru: 'ЗАПРОС ИГРЫ', tr: 'OYUN İSTEKLERİ' }),
      desc: L(language, { fa: 'بازی مورد نظرت را پیشنهاد بده و همراه جامعه بازی کن', en: 'Suggest new games and join the community', ru: 'Предлагайте новые игры и присоединяйтесь к сообществу', tr: 'Yeni oyunlar öner ve topluluğa katıl' }),
      count: null,
      accent: 'from-amber-400/20 to-orange-400/10 border-amber-400/30 hover:border-amber-400/60 text-amber-300',
      testid: 'games-card-requests',
    },
  ];

  return (
    <div className="animate-fade-in font-sans" dir={dir} data-testid="games-page">
      {category === 'kids' && <GamesReservationFlow audience="kids" onBack={() => selectCategory(null)} themeId={themeId} systems={systems} activeCoupons={activeCoupons} onAddLoyaltyPoints={onAddLoyaltyPoints} addNotification={addNotification} />}
      {category === 'adults' && <GamesReservationFlow audience="adults" onBack={() => selectCategory(null)} themeId={themeId} systems={systems} activeCoupons={activeCoupons} onAddLoyaltyPoints={onAddLoyaltyPoints} addNotification={addNotification} />}
      {category === 'requests' && <GamesReservationFlow audience={null} focusGame onBack={() => selectCategory(null)} themeId={themeId} systems={systems} activeCoupons={activeCoupons} onAddLoyaltyPoints={onAddLoyaltyPoints} addNotification={addNotification} />}

      {!category && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5 font-display uppercase tracking-wider">
                <Gamepad2 className="w-7 h-7 text-primary" />
                {L(language, { fa: 'بازی‌ها', en: 'Games', ru: 'ИГРЫ', tr: 'OYUNLAR' })}
              </h2>
              <p className="text-gray-400 text-xs mt-2 leading-relaxed font-medium max-w-2xl">
                {L(language,
                  { fa: 'دستهٔ موردنظرت را انتخاب کن؛ بعد از انتخاب دسته، رزرو ایستگاه گیمینگ با همان روال همیشگی (سیستم، کوپن، کیف پول یا پرداخت در محل) انجام می‌شود.', en: 'Pick a category first — station booking then runs exactly like before (system, coupon, wallet or pay-on-site).', ru: 'Сначала выберите категорию — бронирование станции идёт как обычно (система, купон, кошелёк или оплата на месте).', tr: 'Önce bir kategori seçin; istasyon rezervasyonu her zamanki gibi işler (sistem, kupon, cüzdan veya yerinde ödeme).' })}
              </p>
            </div>
          </div>

          {/* Three separated cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cardMeta.map((card) => (
              <button
                key={card.id}
                data-testid={card.testid}
                onClick={() => selectCategory(card.id)}
                className={`group text-left rtl:text-right rounded-2xl border bg-gradient-to-b ${card.accent} bg-dark-card/80 p-7 flex flex-col items-start gap-4 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,240,255,0.08)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40`}
              >
                <span className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-inherit">
                  <card.icon className="w-8 h-8" />
                </span>
                <span className="text-lg font-black font-display uppercase tracking-wider text-white">{card.title}</span>
                <span className="text-xs text-gray-400 leading-relaxed font-medium">{card.desc}</span>
                <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-inherit">
                  <Sparkles className="w-3.5 h-3.5" />
                  {card.count !== null
                    ? (card.count > 0
                      ? L(language, { fa: `${card.count} سیستم آماده رزرو`, en: `${card.count} systems ready to book`, ru: `${card.count} систем готово к брони`, tr: `${card.count} sistem rezervasyona hazır` })
                      : L(language, { fa: 'به‌زودی — سیستم این دسته تعریف نشده', en: 'Coming soon — no systems in this category yet', ru: 'Скоро — в этой категории пока нет систем', tr: 'Yakında — bu kategoride sistem yok' }))
                    : L(language, { fa: 'پیشنهادت را هنگام رزرو ثبت کن', en: 'Add your suggestion while booking', ru: 'Добавьте пожелание при бронировании', tr: 'Rezervasyon sırasında önerinizi ekleyin' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
