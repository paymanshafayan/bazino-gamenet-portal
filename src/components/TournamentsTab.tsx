import React, { useState } from 'react';
import { Tournament } from '../types/gamenet';
import { Trophy, Calendar, Users, Plus, UserPlus, Trash2, Check, Star, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CheckoutModal, formatDue, type CheckoutResult } from '../legal/CheckoutModal';
import { L, localeOf, formatJalaliForLanguage, jalaliToGregorianDate } from '../utils/i18n';

// Jalali Date Helpers
const persianToEnglishDigits = (str: string): string => {
  const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[۰-۹]/g, (c) => p.indexOf(c).toString());
};

const englishToPersianDigits = (num: number | string, lang: string): string => {
  if (lang !== 'fa') return num.toString();
  const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (c) => p[parseInt(c)]);
};

const parseJalaliDate = (dateStr: string) => {
  const normalized = persianToEnglishDigits(dateStr);
  const parts = normalized.split('/');
  if (parts.length === 3) {
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]),
      day: parseInt(parts[2]),
    };
  }
  return null;
};

// تبدیل جلالی→میلادی با الگوریتم استاندارد مشترک (قبلاً محاسبهٔ تقریبی اشتباه بود — تسک ۱۳)
const jalaliToGregorian = (y: number, m: number, d: number): Date => jalaliToGregorianDate(y, m, d);

const getPersianWeekdayIndex = (gregorianDay: number): number => {
  return (gregorianDay + 1) % 7;
};

const getDaysInJalaliMonth = (y: number, m: number): number => {
  if (m >= 1 && m <= 6) return 31;
  if (m >= 7 && m <= 11) return 30;
  return 29;
};

const getMonthName = (m: number, lang: string): string => {
  const namesFa = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
    'مرداد', 'شهریور', 'مهر', 'آبان',
    'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  const namesEn = [
    'Farvardin', 'Ordibehesht', 'Khordad', 'Tir',
    'Mordad', 'Shahrivar', 'Mehr', 'Aban',
    'Azar', 'Dey', 'Bahman', 'Esfand'
  ];
  const namesRu = [
    'Фарвардин', 'Ордибехешт', 'Хордад', 'Тир',
    'Мордад', 'Шахривар', 'Мехр', 'Абан',
    'Азар', 'Дей', 'Бахман', 'Эсфанд'
  ];
  const namesTr = [
    'Farvardin', 'Ordibehesht', 'Khordad', 'Tir',
    'Mordad', 'Shahrivar', 'Mehr', 'Aban',
    'Azar', 'Dey', 'Bahman', 'Esfand'
  ];
  
  if (lang === 'fa') return namesFa[m - 1] || '';
  if (lang === 'ru') return namesRu[m - 1] || '';
  if (lang === 'tr') return namesTr[m - 1] || '';
  return namesEn[m - 1] || '';
};

interface Props {
  themeId?: string;
  tournaments: Tournament[];
  onAddLoyaltyPoints: (points: number, desc: string) => void | Promise<void>;
  onRegisterTeam: (tournamentId: string, team: { name: string; leader: string; members: string[] }) => void | Promise<void>;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function TournamentsTab({
  tournaments,
  onAddLoyaltyPoints,
  onRegisterTeam,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(tournaments[0]?.id || '');
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);

  // Calendar States
  const [currentYear, setCurrentYear] = useState(1405);
  const [currentMonth, setCurrentMonth] = useState(4); // Tir (تیر)
  const [selectedDay, setSelectedDay] = useState<number | null>(22); // Today (تیر ۲۲)
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'user' | 'finals'>('all');

  const getEventsForDate = (y: number, m: number, d: number) => {
    const events: Array<{
      id: string;
      title: string;
      type: 'tournament_start' | 'match' | 'event';
      time: string;
      tournamentTitle: string;
      game: string;
      details?: string;
      badgeColor: string;
      isUserMatch?: boolean;
    }> = [];

    tournaments.forEach(t => {
      const tDate = parseJalaliDate(t.startDate);
      if (tDate && tDate.year === y && tDate.month === m && tDate.day === d) {
        events.push({
          id: `start-${t.id}`,
          title: L(language, { fa: `🏆 افتتاحیه و آغاز بازی‌های ${t.title}`, en: `🏆 Opening & Kick-off of ${t.title}`, ru: `🏆 Открытие и начало игр ${t.title}`, tr: `🏆 ${t.title} açılışı ve başlangıcı` }),
          type: 'tournament_start',
          time: '۱۵:۰۰',
          tournamentTitle: t.title,
          game: t.game,
          details: L(language, { fa: `ورودی: ${t.registrationFee.toLocaleString(localeOf(language))} لیر | ظرفیت: ${t.registeredTeamsCount}/${t.maxTeams} تیم`, en: `Entry: ${t.registrationFee.toLocaleString(localeOf(language))} TL | Capacity: ${t.registeredTeamsCount}/${t.maxTeams} Teams`, ru: `Взнос: ${t.registrationFee.toLocaleString(localeOf(language))} TL | Вместимость: ${t.registeredTeamsCount}/${t.maxTeams} команд`, tr: `Giriş: ${t.registrationFee.toLocaleString(localeOf(language))} TL | Kapasite: ${t.registeredTeamsCount}/${t.maxTeams} Takım` }),
          badgeColor: 'from-primary to-yellow-500',
        });
      }

      if (t.id === 't1') {
        const startDay = tDate ? tDate.day : 20;
        if (y === 1405 && m === 4) {
          if (d === startDay) {
            events.push({
              id: 't1-m1',
              title: `⚔️ مسابقه CS2: Persian Hawks vs Overlords`,
              type: 'match',
              time: '۱۶:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۱',
              badgeColor: 'from-primary to-blue-500',
            });
            events.push({
              id: 't1-m2',
              title: `⚔️ مسابقه CS2: VIP Gladiators vs Cyber Storm`,
              type: 'match',
              time: '۱۸:۳۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۲',
              badgeColor: 'from-primary to-blue-500',
              isUserMatch: true,
            });
          } else if (d === startDay + 1) {
            events.push({
              id: 't1-m3',
              title: `⚔️ مسابقه CS2: Zero Ping vs تیم رزرو الف`,
              type: 'match',
              time: '۱۶:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۳',
              badgeColor: 'from-primary to-blue-500',
            });
            events.push({
              id: 't1-m4',
              title: `⚔️ مسابقه CS2: تیم رزرو ب vs تیم رزرو ج`,
              type: 'match',
              time: '۱۸:۳۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۴',
              badgeColor: 'from-primary to-blue-500',
            });
          } else if (d === startDay + 3) {
            events.push({
              id: 't1-m5',
              title: `🔥 مسابقه CS2: Persian Hawks vs VIP Gladiators`,
              type: 'match',
              time: '۱۷:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله نیمه‌نهایی - بازی شماره ۵',
              badgeColor: 'from-primary to-pink-500',
              isUserMatch: true,
            });
            events.push({
              id: 't1-m6',
              title: `🔥 مسابقه CS2: Zero Ping vs تیم رزرو ج`,
              type: 'match',
              time: '۱۹:۳۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله نیمه‌نهایی - بازی شماره ۶',
              badgeColor: 'from-primary to-pink-500',
            });
          } else if (d === startDay + 5) {
            events.push({
              id: 't1-m7',
              title: `👑 فینال بزرگ CS2: VIP Gladiators vs Zero Ping`,
              type: 'match',
              time: '۱۸:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'فینال قهرمانی سالن - پخش زنده روی مانیتورهای اصلی',
              badgeColor: 'from-primary to-rose-500',
              isUserMatch: true,
            });
          }
        }
      }

      if (t.id === 't2') {
        const startDay = tDate ? tDate.day : 28;
        if (y === 1405 && m === 4) {
          if (d === startDay) {
            events.push({
              id: 't2-m1',
              title: `⚽ مسابقه فیفا: Cris_Goat vs Leo_Messi`,
              type: 'match',
              time: '۱۵:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۱',
              badgeColor: 'from-primary to-blue-500',
            });
            events.push({
              id: 't2-m2',
              title: `⚽ مسابقه فیفا: Ali_Perspolis vs Mehdi_Esteghlal`,
              type: 'match',
              time: '۱۶:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۲',
              badgeColor: 'from-primary to-blue-500',
            });
            events.push({
              id: 't2-m3',
              title: `⚽ مسابقه فیفا: Sina_Gamer vs Arash_Pro`,
              type: 'match',
              time: '۱۷:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۳',
              badgeColor: 'from-primary to-blue-500',
            });
            events.push({
              id: 't2-m4',
              title: `⚽ مسابقه فیفا: Reza_R9 vs Mmd_CR7`,
              type: 'match',
              time: '۱۸:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله یک‌چهارم نهایی - بازی شماره ۴',
              badgeColor: 'from-primary to-blue-500',
            });
          } else if (d === startDay + 1) {
            events.push({
              id: 't2-m5',
              title: `🔥 مسابقه فیفا: نیمه‌نهایی اول`,
              type: 'match',
              time: '۱۶:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله نیمه‌نهایی',
              badgeColor: 'from-primary to-pink-500',
            });
            events.push({
              id: 't2-m6',
              title: `🔥 مسابقه فیفا: نیمه‌نهایی دوم`,
              type: 'match',
              time: '۱۷:۳۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'مرحله نیمه‌نهایی',
              badgeColor: 'from-primary to-pink-500',
            });
          } else if (d === startDay + 2) {
            events.push({
              id: 't2-m7',
              title: `👑 فینال مسابقات فیفا ۲۶ تک‌به‌تک`,
              type: 'match',
              time: '۱۸:۰۰',
              tournamentTitle: t.title,
              game: t.game,
              details: 'فینال قهرمانی فیفا - اهدا جوایز',
              badgeColor: 'from-primary to-rose-500',
            });
          }
        }
      }
    });

    return events;
  };

  const getFilteredEvents = (events: ReturnType<typeof getEventsForDate>) => {
    if (calendarFilter === 'user') {
      return events.filter(e => e.isUserMatch);
    }
    if (calendarFilter === 'finals') {
      return events.filter(e => e.title.includes('فینال') || e.title.includes('👑'));
    }
    return events;
  };

  const handleAddMember = () => {
    if (!memberInput.trim()) return;
    if (members.length >= 4) {
      addNotification('حداکثر تعداد اعضای اضافه (به جز سرپرست) ۴ نفر است.', 'error');
      return;
    }
    setMembers([...members, memberInput.trim()]);
    setMemberInput('');
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ثبت‌نام حالا واقعاً به سرور می‌رود؛ توست موفقیت و پاک‌کردن فرم فقط پس از
  // تأیید سرور انجام می‌شوند (قبلاً تیم فقط در state کلاینت ظاهر می‌شد و با
  // یک refresh ناپدید می‌شد).
  const [checkout, setCheckout] = useState<{ params: Record<string, unknown>; amount: number; title: string } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || isSubmitting) return;
    if (!teamName.trim() || !leaderName.trim()) {
      addNotification('لطفاً نام تیم و نام سرپرست را وارد کنید.', 'error');
      return;
    }

    const allMembers = [leaderName, ...members];
    // تسک ۱۳: هزینهٔ ثبت‌نام > 0 → انتخاب روش پرداخت (کیف پول / در محل با مهلت ۴۸ ساعت)؛ ثبت تیم را سرور انجام می‌دهد
    if (selectedTournament.registrationFee > 0) {
      setCheckout({ params: { tournamentId: selectedTournament.id, team: { name: teamName, leader: leaderName, members: allMembers } }, amount: selectedTournament.registrationFee, title: selectedTournament.title });
      return;
    }
    setIsSubmitting(true);
    try {
      await onRegisterTeam(selectedTournament.id, {
        name: teamName,
        leader: leaderName,
        members: allMembers,
      });

      // Award loyalty points for tournament registration fee: 1 point per 10 TL
      const pointsEarned = Math.floor(selectedTournament.registrationFee / 10);
      await onAddLoyaltyPoints(pointsEarned, `ثبت‌نام تیم ${teamName} در تورنمنت ${selectedTournament.title}`);

      addNotification(`تیم "${teamName}" با موفقیت در تورنمنت ثبت‌نام شد! ${pointsEarned} امتیاز وفاداری باشگاه مشتریان به شما تعلق گرفت.`, 'success');

      // Reset Form
      setTeamName('');
      setLeaderName('');
      setMembers([]);
    } catch {
      // پیام خطای واقعی سرور را خود onRegisterTeam نمایش داده است.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in font-sans" dir={dir}>
      {checkout && <CheckoutModal kind="tournament" params={checkout.params} estimatedAmount={checkout.amount} title={checkout.title} onClose={() => setCheckout(null)}
        onDone={(r: CheckoutResult) => {
          setCheckout(null);
          if (r.method === 'wallet') addNotification(L(language, { fa: `تیم «${teamName}» ثبت شد و هزینه از کیف پول کسر شد (${r.result?.points ?? 0} امتیاز).`, en: `Team “${teamName}” registered; fee deducted from your wallet (${r.result?.points ?? 0} points).`, ru: `Команда «${teamName}» зарегистрирована; взнос списан из кошелька (${r.result?.points ?? 0} баллов).`, tr: `“${teamName}” takımı kaydedildi; ücret cüzdandan düşüldü (${r.result?.points ?? 0} puan).` }), 'success');
          else addNotification(L(language, { fa: `تیم «${teamName}» ثبت شد. لطفاً حداکثر تا ${formatDue(r.dueAt, language)} (۴۸ ساعت قبل از شروع) در کلاب حاضر شده و حضوری پرداخت کنید؛ در غیر این صورت ثبت‌نام باطل می‌شود.`, en: `Team “${teamName}” registered. Please arrive and pay at the club by ${formatDue(r.dueAt, language)} (48 hours before the start); otherwise the registration will be cancelled.`, ru: `Команда «${teamName}» зарегистрирована. Придите и оплатите в клубе до ${formatDue(r.dueAt, language)} (за 48 часов до начала); иначе регистрация будет аннулирована.`, tr: `“${teamName}” takımı kaydedildi. Lütfen en geç ${formatDue(r.dueAt, language)} (başlangıçtan 48 saat önce) kulübe gelip ödeme yapın; aksi hâlde kayıt iptal edilir.` }), 'info');
          setTeamName(''); setLeaderName(''); setMembers([]);
          window.dispatchEvent(new CustomEvent('bazino:refresh-data'));
        }} />}
      
      {/* Tournament Selector and Bracket Display */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Selector Header */}
        <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
                <span>{L(language, { fa: 'جداول مسابقات و براکت‌ها', en: 'Tournament Brackets', ru: 'Турнирные сетки', tr: 'Turnuva Tabloları' })}</span>
              </h3>
              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">
                {L(language, { fa: 'تورنمنت مورد نظر را برای مشاهده روند بازی‌ها و جدول حذفی انتخاب کنید.', en: 'Choose tournament to view brackets & game results.', ru: 'Выберите турнир, чтобы посмотреть сетку и результаты матчей.', tr: 'Tabloyu ve maç sonuçlarını görmek için bir turnuva seçin.' })}
              </p>
            </div>

            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="bg-card-2 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold font-mono cursor-pointer"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.game})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Bracket Section */}
        {selectedTournament && (
          <div className="rounded-2xl border border-white/10 bg-dark-card p-6 overflow-x-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
              <div className="flex gap-4 text-xs text-gray-400 font-mono font-bold">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> {L(language, { fa: 'شروع:', en: 'Starts:', ru: 'Начало:', tr: 'Başlangıç:' })} {formatJalaliForLanguage(selectedTournament.startDate, language)}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> {L(language, { fa: 'ظرفیت:', en: 'Teams:', ru: 'Команд:', tr: 'Kapasite:' })} {selectedTournament.registeredTeamsCount}/{selectedTournament.maxTeams}</span>
              </div>
              <span className="px-3 py-1 rounded bg-primary/10 text-primary border border-primary/20 font-black text-xs font-mono">
                {L(language, { fa: 'جایزه بزرگ: ۱۰,۰۰۰ لیر + ۱۰۰۰ امتیاز', en: 'Prize: 10,000 TL + 1,000 PTS', ru: 'Главный приз: 10 000 TL + 1000 баллов', tr: 'Büyük Ödül: 10.000 TL + 1000 Puan' })}
              </span>
            </div>

            {/* Render brackets: Round 1, Semis, Finals */}
            {!selectedTournament.bracket?.round1?.length ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <Trophy className="w-12 h-12 text-primary/30" />
                <span className="text-sm font-bold text-gray-400 font-display">
                  {L(language, { fa: 'جدول حذفی هنوز مشخص نشده است', en: 'Bracket not drawn yet', ru: 'Сетка ещё не сформирована', tr: 'Eleme tablosu henüz belirlenmedi' })}
                </span>
              </div>
            ) : (
              <div className="flex gap-8 justify-between items-center min-w-[600px]">
                {/* Round 1 Column (Quarter Finals) */}
                <div className="flex-1 flex flex-col gap-6 justify-around h-full">
                  <div className="text-center text-xs text-primary font-black tracking-wider uppercase mb-2 font-display">
                    {L(language, { fa: 'یک‌چهارم نهایی', en: 'Quarterfinals', ru: 'Четвертьфинал', tr: 'Çeyrek Final' })}
                  </div>
                  {selectedTournament.bracket.round1.map((match) => (
                  <div key={match.id} className="bg-card-2 rounded-lg border border-white/10 p-3.5 flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold font-display ${match.winner === match.teamA ? 'text-primary' : 'text-gray-300'}`}>{match.teamA}</span>
                      <span className="text-gray-500 font-mono">{match.scoreA ?? '-'}</span>
                    </div>
                    <div className="border-t border-white/5 my-1" />
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold font-display ${match.winner === match.teamB ? 'text-primary' : 'text-gray-300'}`}>{match.teamB}</span>
                      <span className="text-gray-500 font-mono">{match.scoreB ?? '-'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connecting lines spacer */}
              <div className="flex-1 flex flex-col gap-12 justify-around h-full">
                <div className="text-center text-xs text-primary font-black tracking-wider uppercase mb-2 font-display">
                  {L(language, { fa: 'نیمه نهایی', en: 'Semifinals', ru: 'Полуфинал', tr: 'Yarı Final' })}
                </div>
                {selectedTournament.bracket.semis.map((match) => (
                  <div key={match.id} className="bg-card-2 rounded-lg border border-primary/20 p-3.5 flex flex-col gap-2 relative shadow-[0_0_15px_rgba(0,240,255,0.02)]">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold font-display ${match.winner === match.teamA ? 'text-primary' : 'text-gray-300'}`}>{match.teamA}</span>
                      <span className="text-gray-500 font-mono">{match.scoreA ?? '-'}</span>
                    </div>
                    <div className="border-t border-white/5 my-1" />
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold font-display ${match.winner === match.teamB ? 'text-primary' : 'text-gray-300'}`}>{match.teamB}</span>
                      <span className="text-gray-500 font-mono">{match.scoreB ?? '-'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Finals Spacer */}
              <div className="flex-1 flex flex-col gap-24 justify-center h-full">
                <div className="text-center text-xs text-primary font-black tracking-wider uppercase mb-2 font-display">
                  {L(language, { fa: 'فینال بزرگ', en: 'Grand Finals', ru: 'Гранд-финал', tr: 'Büyük Final' })}
                </div>
                {selectedTournament.bracket.finals.map((match) => (
                  <div key={match.id} className="bg-primary/5 rounded-lg border-2 border-primary p-5 flex flex-col gap-2.5 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold font-display ${match.winner === match.teamA ? 'text-primary' : 'text-gray-300'}`}>{match.teamA}</span>
                      <span className="text-gray-500 font-mono">{match.scoreA ?? '-'}</span>
                    </div>
                    <div className="border-t border-white/10 my-1" />
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold font-display ${match.winner === match.teamB ? 'text-primary' : 'text-gray-300'}`}>{match.teamB}</span>
                      <span className="text-gray-500 font-mono">{match.scoreB ?? '-'}</span>
                    </div>
                    
                    {match.winner && (
                      <div className="mt-2 text-center bg-primary/10 text-primary font-black text-xs rounded py-1.5 flex items-center justify-center gap-1 font-display">
                        <Star className="w-3.5 h-3.5 fill-primary" />
                        <span>{L(language, { fa: 'قهرمان:', en: 'Champion:', ru: 'Чемпион:', tr: 'Şampiyon:' })} {match.winner}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Calendar Visualization Card */}
        {(() => {
          const firstDayDate = jalaliToGregorian(currentYear, currentMonth, 1);
          const firstDayGWeekday = firstDayDate.getDay();
          const firstDayPersianWeekday = getPersianWeekdayIndex(firstDayGWeekday);

          const daysInMonth = getDaysInJalaliMonth(currentYear, currentMonth);

          const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
          const daysInPrevMonth = getDaysInJalaliMonth(prevYear, prevMonth);

          const cells: Array<{ day: number; type: 'prev' | 'current' | 'next'; month: number; year: number }> = [];

          // Previous month overflow
          for (let i = firstDayPersianWeekday - 1; i >= 0; i--) {
            cells.push({
              day: daysInPrevMonth - i,
              type: 'prev',
              month: prevMonth,
              year: prevYear,
            });
          }

          // Current month
          for (let i = 1; i <= daysInMonth; i++) {
            cells.push({
              day: i,
              type: 'current',
              month: currentMonth,
              year: currentYear,
            });
          }

          // Next month overflow
          const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
          const nextMonthDaysNeeded = 42 - cells.length;
          for (let i = 1; i <= nextMonthDaysNeeded; i++) {
            cells.push({
              day: i,
              type: 'next',
              month: nextMonth,
              year: nextYear,
            });
          }

          return (
            <div className="rounded-2xl border border-white/10 bg-dark-card p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-primary/5 blur-3xl pointer-events-none"></div>
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-primary/5 blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>{L(language, { fa: 'تقویم زمان‌بندی مسابقات و رویدادها', en: 'Arena Match Schedule', ru: 'Календарь матчей и событий', tr: 'Maç ve Etkinlik Takvimi' })}</span>
                  </h3>
                  <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">
                    {L(language, { fa: 'زمان‌بندی مسابقات، مراحل حذفی و بازی‌های خود را روی تقویم دنبال کنید.', en: 'Track live events, finals and tournament matches on calendar.', ru: 'Следите за расписанием матчей, стадиями плей-офф и своими играми в календаре.', tr: 'Maç programını, eleme aşamalarını ve kendi oyunlarınızı takvimde takip edin.' })}
                  </p>
                </div>

                {/* Quick Filters */}
                <div className="flex gap-2 bg-card-2 p-1 rounded-lg border border-white/5 self-start">
                  <button
                    onClick={() => setCalendarFilter('all')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      calendarFilter === 'all'
                        ? 'bg-primary text-black font-black'
                        : 'text-gray-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {L(language, { fa: 'همه بازی‌ها', en: 'All Matches', ru: 'Все матчи', tr: 'Tüm Maçlar' })}
                  </button>
                  <button
                    onClick={() => setCalendarFilter('user')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      calendarFilter === 'user'
                        ? 'bg-primary text-black font-black'
                        : 'text-gray-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {L(language, { fa: 'بازی‌های من', en: 'My Matches', ru: 'Мои матчи', tr: 'Maçlarım' })}
                  </button>
                  <button
                    onClick={() => setCalendarFilter('finals')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      calendarFilter === 'finals'
                        ? 'bg-primary text-black font-black'
                        : 'text-gray-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {L(language, { fa: 'فینال‌ها', en: 'Finals', ru: 'Финалы', tr: 'Finaller' })}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                
                {/* Calendar Grid (Col Span 3) */}
                <div className="md:col-span-3 flex flex-col gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
                  
                  {/* Month Selector Header */}
                  <div className="flex justify-between items-center px-2">
                    <button
                      onClick={() => {
                        if (currentMonth === 1) {
                          setCurrentMonth(12);
                          setCurrentYear(currentYear - 1);
                        } else {
                          setCurrentMonth(currentMonth - 1);
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    <span className="text-sm font-bold text-white font-mono flex items-center gap-1">
                      <span>{getMonthName(currentMonth, language)}</span>
                      <span>{englishToPersianDigits(currentYear, language)}</span>
                    </span>

                    <button
                      onClick={() => {
                        if (currentMonth === 12) {
                          setCurrentMonth(1);
                          setCurrentYear(currentYear + 1);
                        } else {
                          setCurrentMonth(currentMonth + 1);
                        }
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Weekday Labels */}
                  <div className="grid grid-cols-7 gap-1 text-center border-b border-white/5 pb-2">
                    {(language === 'fa' ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] : language === 'ru' ? ['Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'] : language === 'tr' ? ['Ct', 'Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu'] : ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']).map((day, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-black ${
                          idx === 6 ? 'text-rose-400' : 'text-gray-500'
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell, cellIdx) => {
                      const isCurrentMonth = cell.type === 'current';
                      const isSelected = selectedDay === cell.day && isCurrentMonth;
                      const isToday = currentYear === 1405 && currentMonth === 4 && cell.day === 22 && isCurrentMonth;
                      const dayEvents = getEventsForDate(cell.year, cell.month, cell.day);
                      const filteredDayEvents = getFilteredEvents(dayEvents);
                      const hasEvents = filteredDayEvents.length > 0;
                      
                      const dotColor = filteredDayEvents.some(e => e.isUserMatch)
                        ? 'bg-primary'
                        : filteredDayEvents.some(e => e.title.includes('فینال') || e.title.includes('👑'))
                        ? 'bg-primary'
                        : 'bg-primary';

                      return (
                        <button
                          key={cellIdx}
                          onClick={() => {
                            if (isCurrentMonth) {
                              setSelectedDay(cell.day);
                            }
                          }}
                          disabled={!isCurrentMonth}
                          className={`aspect-square relative rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                            !isCurrentMonth
                              ? 'opacity-20 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary/20 border-2 border-primary text-primary font-black'
                              : isToday
                              ? 'bg-primary/10 border border-primary/30 text-primary font-bold'
                              : 'hover:bg-white/5 text-gray-300'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold">
                            {englishToPersianDigits(cell.day, language)}
                          </span>
                          
                          {isToday && !isSelected && (
                            <span className="absolute top-0.5 text-[10px] text-primary font-black scale-90">{L(language, { fa: 'امروز', en: 'Today', ru: 'Сегодня', tr: 'Bugün' })}</span>
                          )}

                          {hasEvents && (
                            <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor} ${
                              isSelected ? 'animate-pulse' : ''
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                </div>

                {/* Event Details Panel */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-display uppercase tracking-wide">
                      <span className="w-1.5 h-3.5 bg-primary rounded-md"></span>
                      <span>
                        {language === 'fa' && `رویدادهای ${selectedDay ? `${getMonthName(currentMonth, language)} ${englishToPersianDigits(selectedDay, language)}` : ''}`}
                        {language === 'en' && `Events for ${selectedDay ? `${getMonthName(currentMonth, language)} ${englishToPersianDigits(selectedDay, language)}` : ''}`}
                        {language === 'ru' && `События на ${selectedDay ? `${getMonthName(currentMonth, language)} ${englishToPersianDigits(selectedDay, language)}` : ''}`}
                        {language === 'tr' && `${selectedDay ? `${getMonthName(currentMonth, language)} ${englishToPersianDigits(selectedDay, language)}` : ''} Etkinlikleri`}
                      </span>
                    </h4>
                    {selectedDay === 22 && currentMonth === 4 && currentYear === 1405 && (
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black border border-primary/20">{L(language, { fa: 'امروز', en: 'Today', ru: 'Сегодня', tr: 'Bugün' })}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[250px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {selectedDay ? (
                      (() => {
                        const events = getFilteredEvents(getEventsForDate(currentYear, currentMonth, selectedDay));
                        if (events.length === 0) {
                          return (
                            <div className="text-center py-10 text-gray-500 bg-black/20 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
                              <Calendar className="w-8 h-8 opacity-30 text-gray-400" />
                              <p className="text-xs font-medium">{L(language, { fa: 'رویدادی برای این روز برنامه‌ریزی نشده است.', en: 'No events scheduled for today.', ru: 'На этот день событий не запланировано.', tr: 'Bu gün için planlanmış etkinlik yok.' })}</p>
                            </div>
                          );
                        }
                        return events.map((ev) => (
                          <div
                            key={ev.id}
                            className={`p-3.5 rounded-xl bg-white/5 border transition-all flex flex-col gap-1.5 text-right ${
                              ev.isUserMatch
                                ? 'border-primary/30 hover:border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
                                : 'border-white/5 hover:border-primary/30'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded text-black bg-primary uppercase tracking-wide`}>
                                {ev.type === 'tournament_start' ? 'شروع' : 'مسابقه'}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary" />
                                {ev.time}
                              </span>
                            </div>

                            <h5 className={`text-xs font-black leading-snug font-display ${ev.isUserMatch ? 'text-primary' : 'text-white'}`}>
                              {ev.title}
                            </h5>

                            {ev.details && (
                              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                {ev.details}
                              </p>
                            )}

                            <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold border-t border-white/5 pt-1.5 mt-1">
                              <span>{L(language, { fa: 'بازی:', en: 'Game:', ru: 'Игра:', tr: 'Oyun:' })} {ev.game}</span>
                              <span className="truncate max-w-[120px] text-left">{ev.tournamentTitle}</span>
                            </div>

                            <button
                              onClick={() => {
                                addNotification(`رویداد "${ev.title.substring(2)}" به یادآورهای تقویم شخصی شما افزوده شد.`, 'info');
                              }}
                              className="mt-2 text-right text-[10px] text-primary hover:text-white font-bold flex items-center gap-1 transition-all self-start cursor-pointer font-mono"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{L(language, { fa: 'افزودن به تقویم شخصی', en: 'Add to personal calendar', ru: 'Добавить в личный календарь', tr: 'Kişisel takvime ekle' })}</span>
                            </button>
                          </div>
                        ));
                      })()
                    ) : (
                      <div className="text-center py-10 text-gray-500 bg-black/20 rounded-xl border border-white/5">
                        <p className="text-xs font-medium">{L(language, { fa: 'یک روز را از تقویم انتخاب کنید تا رویدادهای آن نمایش داده شود.', en: 'Pick a day on the calendar to see its events.', ru: 'Выберите день в календаре, чтобы увидеть события.', tr: 'Etkinlikleri görmek için takvimden bir gün seçin.' })}</p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          );
        })()}

      </div>

      {/* Registration Sidebar */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 sticky top-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 font-display uppercase tracking-wider">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
            <span>{L(language, { fa: 'ثبت‌نام مسابقات', en: 'Tournament Register', ru: 'Регистрация на турнир', tr: 'Turnuva Kaydı' })}</span>
          </h3>

          {selectedTournament?.status === 'Completed' ? (
            <div className="text-center py-8 text-gray-400 bg-slate-950/40 rounded-xl border border-white/5">
              <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-bold">{L(language, { fa: 'تورنمنت به پایان رسیده است.', en: 'This tournament has ended.', ru: 'Турнир завершён.', tr: 'Bu turnuva sona erdi.' })}</p>
              <p className="text-xs text-gray-500 mt-1">{L(language, { fa: 'جهت ثبت‌نام، یکی از تورنمنت‌های آینده را انتخاب کنید.', en: 'Pick an upcoming tournament to register.', ru: 'Для регистрации выберите предстоящий турнир.', tr: 'Kayıt için yaklaşan turnuvalardan birini seçin.' })}</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              
              <div className="bg-card-2 p-4 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase font-mono">{L(language, { fa: 'تورنمنت انتخاب شده:', en: 'Selected Tournament:', ru: 'Выбранный турнир:', tr: 'Seçilen Turnuva:' })}</span>
                <h4 className="text-white text-xs font-bold mt-1 font-display">{selectedTournament?.title}</h4>
                <div className="flex justify-between items-center text-xs text-primary font-bold mt-2 pt-2 border-t border-white/5 font-mono">
                  <span>{L(language, { fa: 'هزینه ورودی تیم:', en: 'Entry Fee:', ru: 'Взнос команды:', tr: 'Takım Giriş Ücreti:' })}</span>
                  <span>{selectedTournament?.registrationFee.toLocaleString(localeOf(language))} {t('common.currency', 'لیر')}</span>
                </div>
              </div>

              {/* Team name */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نام تیم (Team Name)', en: 'Team Name', ru: 'Название команды', tr: 'Takım Adı' })}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Persis Esports"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Leader name */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نام و گیمرتگ سرپرست', en: 'Leader Gamertag', ru: 'Имя и геймертег капитана', tr: 'Kaptan Adı ve Oyuncu Adı' })}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sina_Gamer"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  className="w-full bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Dynamic Member registration */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: `افزودن هم‌تیمی‌ها (${members.length}/4 نفر)`, en: `Add Teammates (${members.length}/4)`, ru: `Добавить тиммейтов (${members.length}/4)`, tr: `Takım Arkadaşı Ekle (${members.length}/4)` })}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Gamertag"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    className="flex-1 bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-medium font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="p-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-black rounded-lg border border-primary/20 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>

                {/* Render current members list */}
                {members.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 bg-card-2 p-3 rounded-lg border border-white/5">
                    {members.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-gray-300 font-bold font-mono">
                        <span>{idx + 1}. {m}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex justify-between text-xs text-gray-400 font-bold font-mono">
                  <span>{L(language, { fa: 'امتیاز دریافتی بابت ثبت‌نام:', en: 'Loyalty Points Earned:', ru: 'Баллы лояльности за регистрацию:', tr: 'Kayıt için Kazanılan Puan:' })}</span>
                  <span className="text-primary font-bold">
                    {selectedTournament ? Math.floor(selectedTournament.registrationFee / 10) : 0} PTS
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all flex items-center justify-center gap-2 cursor-pointer font-display text-xs"
              >
                <span>{L(language, { fa: 'پرداخت ورودی و ثبت‌نام تیم', en: 'PAY FEE & REGISTER TEAM', ru: 'ОПЛАТИТЬ ВЗНОС И ЗАРЕГИСТРИРОВАТЬ КОМАНДУ', tr: 'ÜCRETİ ÖDE VE TAKIMI KAYDET' })}</span>
              </button>

            </form>
          )}

          {/* Registered teams lists in selected tournament */}
          {selectedTournament && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5 font-display uppercase tracking-wide">
                <Users className="w-4 h-4 text-primary" />
                <span>{L(language, { fa: `تیم‌های ثبت‌نام شده (${selectedTournament.teams?.length ?? 0})`, en: `Registered Teams (${selectedTournament.teams?.length ?? 0})`, ru: `Зарегистрированные команды (${selectedTournament.teams?.length ?? 0})`, tr: `Kayıtlı Takımlar (${selectedTournament.teams?.length ?? 0})` })}</span>
              </h4>

              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                {(selectedTournament.teams ?? []).map((t, idx) => (
                  <div key={idx} className="bg-card-2 p-3 rounded-lg border border-white/5 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between font-bold text-gray-200">
                      <span className="font-display text-primary">{t.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Leader: {t.leader}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 truncate font-medium">Members: {t.members.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
