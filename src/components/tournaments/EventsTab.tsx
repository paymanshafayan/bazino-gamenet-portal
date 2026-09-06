/**
 * Batch 10 — Tournaments/Events page (public website), built in the EXISTING site
 * theme (Arena dark/cyan). The home page and other pages are untouched; everything the
 * client asked for lives in this one tournaments page as internal tabs:
 *   Weekly · Special · Season ranking · Live brackets · Register
 * Data comes from the Batch-10 public API (real backend), not the hardcoded sample.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Trophy, Calendar, Users, Star, Crown, Medal, Radio, MonitorPlay,
  Info, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { formatJalaliForLanguage } from '../../utils/i18n';
import { localeOf } from '../../utils/i18n';

type TabKey = 'weekly' | 'special' | 'season' | 'bracket' | 'register';

interface Prize { first?: string; second?: string; third?: string; }
interface Card {
  id: string; title: string; game: string; startDate: string; registrationFee: number;
  maxTeams: number; registeredTeamsCount: number; kind: 'weekly' | 'special';
  signupMode: 'open' | 'info_only'; prizes: Prize; teamCount: number; checkedIn: number;
  bracketTotal: number; bracketDone: number; liveState: 'upcoming' | 'live' | 'past';
  finalized: boolean; version: number;
}
interface BracketMatch {
  id: string; round: number; position: number; teamA?: string; teamB?: string;
  scoreA?: number; scoreB?: number; winnerId?: string;
  status: 'pending' | 'ready' | 'playing' | 'done'; startsAt?: string;
}
interface LiveBracket {
  id: string; title: string; game: string; startDate: string; registrationFee: number;
  kind: 'weekly' | 'special'; signupMode: string; rules: string; prizes: Prize;
  teams: { teamName: string; captainName?: string; checkedIn: boolean; paid: boolean; seed: number }[];
  bracket: BracketMatch[]; rounds: BracketMatch[][]; version: number; finalized: boolean;
  champion?: string | null;
}
interface Standing {
  playerKey: string; name: string; username?: string; points: number;
  wins: number; seconds: number; thirds: number; played: number;
}
interface Season {
  id: string; name: string; year: number; startsAt: string; endsAt: string; daysLeft: number;
  standings: Standing[]; top3: Standing[];
}
interface EventsPayload {
  weekly: Card[]; special: Card[]; season: Season;
  live: { id: string; title: string; game: string; version: number; bracketTotal: number } | null;
}
interface Stats { available: boolean; championships: number; secondPlaces: number; thirdPlaces: number; tournaments: number; seasonPoints: number; }

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const TABS: { key: TabKey; icon: React.ReactNode; fa: string; en: string }[] = [
  { key: 'weekly', icon: <Calendar className="w-4 h-4" />, fa: 'مسابقات هفتگی', en: 'Weekly' },
  { key: 'special', icon: <Star className="w-4 h-4" />, fa: 'رویدادهای ویژه', en: 'Special Events' },
  { key: 'season', icon: <Crown className="w-4 h-4" />, fa: 'رتبه‌بندی فصل', en: 'Season Ranking' },
  { key: 'bracket', icon: <Trophy className="w-4 h-4" />, fa: 'براکت و نتایج زنده', en: 'Live Brackets' },
  { key: 'register', icon: <Users className="w-4 h-4" />, fa: 'ثبت‌نام', en: 'Register' },
];

export default function EventsTab() {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<TabKey>('bracket');
  const [data, setData] = useState<EventsPayload | null>(null);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getJson<EventsPayload>('/api/tournaments/events')); setError(''); }
    catch (e: any) { setError(e.message || 'error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const season = data?.season;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden bg-dark-card border border-white/10">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white flex items-center gap-2 font-display uppercase tracking-wider">
            <span className="w-1.5 h-7 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]" />
            {L(language, { fa: 'رویدادها و مسابقات', en: 'EVENTS', ru: 'СОБЫТИЯ', tr: 'ETKİNLİKLER' })}
          </h2>
          <p className="text-gray-400 text-xs mt-2 font-bold">
            {L(language, {
              fa: 'بازی کن · رقابت کن · امتیاز بگیر · قهرمان شو',
              en: 'PLAY • COMPETE • EARN CREDITS • BE A LEGEND',
              ru: 'ИГРАЙ • СОРЕВНУЙСЯ • ЗАРАБАТЫВАЙ • СТАНЬ ЛЕГЕНДОЙ',
              tr: 'OYNA • YARIŞ • KAZAN • EFSANE OL',
            })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(x => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
              tab === x.key
                ? 'bg-primary text-black border-primary shadow-[0_0_18px_rgba(0,240,255,0.35)]'
                : 'bg-dark-card text-gray-300 border-white/10 hover:border-primary/40'
            }`}
          >
            {x.icon}{L(language, { fa: x.fa, en: x.en, ru: x.en, tr: x.en })}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-bold p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {!data && !error && (
        <div className="flex items-center justify-center py-20 text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>
      )}

      {data && tab === 'weekly' && <WeeklyList cards={data.weekly} language={language} onWatch={() => setTab('bracket')} />}
      {data && tab === 'special' && <SpecialList cards={data.special} language={language} />}
      {data && tab === 'season' && season && <SeasonBoard season={season} language={language} />}
      {data && tab === 'bracket' && (
        <BracketBoard
          language={language}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen(v => !v)}
          onChanged={load}
        />
      )}
      {data && tab === 'register' && <RegisterCard language={language} weekly={data.weekly} onDone={load} />}

      {fullscreen && <TvOverlay language={language} onClose={() => setFullscreen(false)} />}
    </div>
  );
}

/* ── Weekly cards ─────────────────────────────────────────────────────────── */
function WeeklyList({ cards, language, onWatch }: { cards: Card[]; language: string; onWatch: () => void }) {
  if (!cards.length) return <Empty language={language} fa="هنوز مسابقهٔ هفتگی برنامه‌ریزی نشده است." en="No weekly tournaments yet." />;
  return (
    <div className="flex flex-col gap-4">
      {cards.map(c => (
        <div key={c.id} className="rounded-2xl border border-white/10 bg-dark-card p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 md:w-64 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black font-display">{c.game.slice(0, 4)}</div>
            <div>
              <div className="text-white font-black font-display text-sm">{c.title}</div>
              <div className="text-[11px] text-gray-400 font-mono">{c.game}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-300 font-bold flex-1">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" />{formatJalaliForLanguage(c.startDate, language)}</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{c.checkedIn || c.teamCount}/{c.maxTeams}</span>
            <span className="flex items-center gap-1.5 text-primary">{c.registrationFee.toLocaleString(localeOf(language))} {L(language, { fa: 'لیر', en: 'TL' })}</span>
            {c.bracketTotal > 0 && (
              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${c.liveState === 'live' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                {c.liveState === 'live' ? <Radio className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                {c.bracketDone}/{c.bracketTotal}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {c.prizes?.first && <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-black font-mono">🏆 {c.prizes.first}</span>}
            <button onClick={onWatch} className="px-4 py-1.5 rounded-lg bg-primary text-black text-[11px] font-black uppercase cursor-pointer hover:bg-primary-hover transition-all">{L(language, { fa: 'تماشا', en: 'Watch' })}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Special events (info only, no registration) ──────────────────────────── */
function SpecialList({ cards, language }: { cards: Card[]; language: string }) {
  if (!cards.length) return <Empty language={language} fa="رویداد ویژه‌ای در حال حاضر اعلام نشده است." en="No special events announced." />;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-200 text-xs font-bold p-3 flex items-center gap-2">
        <Info className="w-4 h-4" />
        {L(language, { fa: 'رویدادهای ویژه صرفاً اطلاع‌رسانی هستند و ثبت‌نام آنلاین ندارند.', en: 'Special events are announcements only — no online registration.' })}
      </div>
      {cards.map(c => (
        <div key={c.id} className="rounded-2xl border border-fuchsia-500/20 bg-dark-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-300"><Star className="w-6 h-6" /></div>
            <div>
              <div className="text-white font-black font-display text-sm">{c.title}</div>
              <div className="text-[11px] text-gray-400 font-mono">{c.game} · {formatJalaliForLanguage(c.startDate, language)}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.prizes?.first && <Prize label="🥇" v={c.prizes.first} />}
            {c.prizes?.second && <Prize label="🥈" v={c.prizes.second} />}
            {c.prizes?.third && <Prize label="🥉" v={c.prizes.third} />}
          </div>
        </div>
      ))}
    </div>
  );
}
function Prize({ label, v }: { label: string; v: string }) {
  return <span className="px-3 py-1.5 rounded-lg bg-card-2 border border-white/10 text-[11px] font-bold text-gray-200 font-mono">{label} {v}</span>;
}

/* ── Season ranking ───────────────────────────────────────────────────────── */
function SeasonBoard({ season, language }: { season: Season; language: string }) {
  const medal = (i: number) => i === 0 ? 'text-amber-300' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-gray-400';
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-dark-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-black font-display uppercase tracking-wider flex items-center gap-2 text-sm">
            <Crown className="w-5 h-5 text-amber-300" />{season.name} {season.year}
          </h3>
          <span className="text-[11px] text-gray-400 font-mono">{L(language, { fa: `${season.daysLeft} روز مانده`, en: `${season.daysLeft} days left` })}</span>
        </div>
        {!season.standings.length ? <Empty language={language} fa="هنوز امتیازی ثبت نشده است." en="No points yet." /> : (
          <div className="flex flex-col gap-2">
            {season.standings.map((s, i) => (
              <div key={s.playerKey} className={`flex items-center gap-3 rounded-xl p-3 border ${i < 3 ? 'bg-card-2 border-primary/20' : 'bg-slate-950/40 border-white/5'}`}>
                <span className={`w-7 text-center font-black font-display ${medal(i)}`}>{i + 1}</span>
                <span className="flex-1 text-white font-bold text-sm truncate">{s.name}</span>
                <span className="text-[10px] text-gray-500 font-mono hidden sm:block">{s.wins}W · {s.seconds}×2nd</span>
                <span className="text-primary font-black font-mono text-sm w-14 text-left">{s.points} {L(language, { fa: 'امتیاز', en: 'PTS' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-amber-500/20 bg-dark-card p-5">
          <h4 className="text-amber-300 font-black text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><Medal className="w-4 h-4" />{L(language, { fa: 'سه برتر فصل', en: 'Top 3' })}</h4>
          <div className="flex flex-col gap-2">
            {(season.top3 || []).map((s, i) => (
              <div key={s.playerKey} className="flex items-center gap-2 text-sm">
                <span className={medal(i)}>{['🥇', '🥈', '🥉'][i]}</span>
                <span className="flex-1 text-gray-200 font-bold truncate">{s.name}</span>
                <span className="text-primary font-mono font-black">{s.points}</span>
              </div>
            ))}
            {!season.top3?.length && <span className="text-xs text-gray-500">—</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-dark-card p-5">
          <h4 className="text-gray-200 font-black text-xs uppercase tracking-wider mb-3">{L(language, { fa: 'امتیازدهی', en: 'Scoring' })}</h4>
          <table className="w-full text-[11px] font-mono text-gray-300">
            <thead><tr className="text-gray-500"><th className="text-right font-bold pb-2">{L(language, { fa: 'جایگاه', en: 'Place' })}</th><th className="font-bold pb-2">{L(language, { fa: 'هفتگی', en: 'Weekly' })}</th><th className="font-bold pb-2">{L(language, { fa: 'ویژه', en: 'Special' })}</th></tr></thead>
            <tbody className="text-center">
              <tr className="border-t border-white/5"><td className="text-right py-1.5">1st</td><td>5</td><td className="text-fuchsia-300">10</td></tr>
              <tr className="border-t border-white/5"><td className="text-right py-1.5">2nd</td><td>2</td><td className="text-fuchsia-300">4</td></tr>
              <tr className="border-t border-white/5"><td className="text-right py-1.5">3rd</td><td>1</td><td className="text-fuchsia-300">2</td></tr>
            </tbody>
          </table>
          <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">{L(language, { fa: 'امتیاز فصل فقط برای رتبه‌بندی است و با اعتبار خرید (Credits) فرق دارد.', en: 'Season points rank the season only and are separate from spendable Credits.' })}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Live bracket board (SSE + poll, real backend) ────────────────────────── */
function BracketBoard({ language, fullscreen, onToggleFullscreen, onChanged }: {
  language: string; fullscreen: boolean; onToggleFullscreen: () => void; onChanged: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState('');
  const [live, setLive] = useState<LiveBracket | null>(null);
  const [loading, setLoading] = useState(true);
  const [tv, setTv] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async (id: string) => {
    const b = await getJson<LiveBracket>(`/api/tournaments/${id}/live`);
    setLive(b);
  }, []);

  useEffect(() => {
    getJson<{ weekly: Card[]; special: Card[] }>('/api/tournaments/events').then(d => {
      const all = [...d.weekly, ...d.special].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
      setCards(all);
      const withBracket = all.find(c => c.bracketTotal > 0) || all[0];
      setSelected(withBracket?.id || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    refresh(selected).catch(() => {});
    // SSE live updates; fall back to polling if EventSource is unavailable.
    let poll: any = null;
    try {
      const es = new EventSource(`/api/tournaments/${selected}/stream`);
      es.addEventListener('bracket-update', () => { refresh(selected).catch(() => {}); onChanged(); });
      sseRef.current = es;
    } catch { /* poll below */ }
    poll = setInterval(() => refresh(selected).catch(() => {}), 5000);
    return () => { sseRef.current?.close(); clearInterval(poll); };
  }, [selected, refresh, onChanged]);

  const rounds = live?.rounds || [];
  const roundName = (r: number, total: number) => {
    const namesFa: Record<number, string> = { 1: 'مرحله ۱', 2: 'مرحله ۲', 3: 'یک‌چهارم', 4: 'نیمه‌نهایی', 5: 'فینال' };
    const namesEn: Record<number, string> = { 1: 'Round 1', 2: 'Round 2', 3: 'Quarterfinal', 4: 'Semifinal', 5: 'Final' };
    if (r === total) return L(language, { fa: 'فینال', en: 'FINAL' });
    return L(language, { fa: namesFa[r] || `Round ${r}`, en: namesEn[r] || `Round ${r}` });
  };

  return (
    <div className={`rounded-2xl border border-white/10 bg-dark-card ${fullscreen ? '' : 'p-5'}`}>
      {/* controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="bg-card-2 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer">
            {cards.map(c => <option key={c.id} value={c.id}>{c.title} ({c.game})</option>)}
          </select>
          {live && (
            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${live.bracket.some(m => m.status === 'playing' || m.status === 'ready') ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse' : 'bg-primary/10 text-primary border-primary/20'}`}>
              {live.finalized ? L(language, { fa: 'پایان‌یافته', en: 'FINISHED' }) : live.bracket.some(m => m.status === 'ready' || m.status === 'playing') ? '● LIVE' : L(language, { fa: 'در انتظار', en: 'UPCOMING' })}
            </span>
          )}
        </div>
        <button onClick={onToggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/20 text-[11px] font-black uppercase transition-all cursor-pointer">
          <MonitorPlay className="w-4 h-4" />{L(language, { fa: 'حالت تلویزیون', en: 'TV / Fullscreen' })}
        </button>
      </div>

      {/* champion banner */}
      {live?.champion && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
          <Crown className="w-7 h-7 text-amber-300" />
          <div>
            <div className="text-amber-200 font-black font-display">{L(language, { fa: 'قهرمان:', en: 'Champion:' })} {live.champion}</div>
            <div className="text-[11px] text-amber-200/70">{live.title}</div>
          </div>
        </div>
      )}

      {/* rules */}
      {live?.rules && (
        <details className="mb-5 rounded-xl bg-card-2 border border-white/10 p-3 text-xs text-gray-300">
          <summary className="cursor-pointer font-black text-gray-200 flex items-center gap-2"><Info className="w-4 h-4 text-primary" />{L(language, { fa: 'قوانین این رویداد', en: 'Event rules' })}</summary>
          <p className="mt-2 leading-relaxed whitespace-pre-wrap">{live.rules}</p>
        </details>
      )}

      {loading || !live ? (
        <div className="flex justify-center py-16 text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : !live.bracket.length ? (
        <Empty language={language} fa="براکت هنوز قرعه‌کشی نشده است؛ روز مسابقه اینجا زنده می‌شود." en="Bracket not drawn yet — it goes live on tournament day." />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-5 min-w-max">
            {rounds.map((matches, ri) => (
              <div key={ri} className="flex flex-col justify-around gap-4 min-w-[200px]">
                <div className="text-center text-[11px] text-primary font-black uppercase tracking-wider font-display">{roundName(ri + 1, rounds.length)}</div>
                {matches.map(m => <div key={m.id}><MatchCard m={m} language={language} /></div>)}
              </div>
            ))}
          </div>
        </div>
      )}
      {tv && null}
    </div>
  );
}

function MatchCard({ m, language }: { m: BracketMatch; language: string }) {
  const row = (name?: string, score?: number, winner?: boolean, isBye?: boolean) => (
    <div className={`flex justify-between items-center px-3 py-2 text-xs font-bold ${winner ? 'text-primary' : name ? 'text-gray-300' : 'text-gray-600'}`}>
      <span className="truncate max-w-[120px]">{name || (isBye ? '—' : 'BYE')}</span>
      <span className="font-mono">{score ?? (name ? '' : '·')}</span>
    </div>
  );
  const bye = !m.teamA || !m.teamB;
  return (
    <div className={`rounded-lg border p-2 ${m.status === 'done' ? 'border-primary/20 bg-card-2' : m.status === 'playing' ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/10 bg-slate-950/40'}`}>
      {row(m.teamA, m.scoreA, m.winnerId === m.teamA, bye && !m.teamA)}
      <div className="border-t border-white/5 mx-2" />
      {row(m.teamB, m.scoreB, m.winnerId === m.teamB, bye && !m.teamB)}
    </div>
  );
}

/* Fullscreen TV overlay rendered at the board level via a portal-like fixed div */
function TvOverlay({ language, onClose }: { language: string; onClose: () => void }) {
  const [selected, setSelected] = useState('');
  const [live, setLive] = useState<LiveBracket | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  useEffect(() => {
    getJson<{ weekly: Card[]; special: Card[] }>('/api/tournaments/events').then(d => {
      const all = [...d.weekly, ...d.special].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
      setCards(all); setSelected(all.find(c => c.bracketTotal > 0)?.id || all[0]?.id || '');
    });
  }, []);
  useEffect(() => {
    if (!selected) return;
    const f = () => getJson<LiveBracket>(`/api/tournaments/${selected}/live`).then(setLive).catch(() => {});
    f();
    const poll = setInterval(f, 4000);
    return () => clearInterval(poll);
  }, [selected]);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-primary font-black font-display text-lg flex items-center gap-2"><Trophy className="w-6 h-6" />{live?.title || 'BAZINO'}</div>
        <div className="flex items-center gap-3">
          <select value={selected} onChange={e => setSelected(e.target.value)} className="bg-slate-900 border border-white/20 rounded-lg px-3 py-2 text-sm text-white">
            {cards.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-black uppercase cursor-pointer">{L(language, { fa: 'بستن', en: 'Close' })}</button>
        </div>
      </div>
      {live?.champion && <div className="text-amber-300 font-black text-xl mb-3 flex items-center gap-2"><Crown className="w-6 h-6" />{live.champion}</div>}
      <div className="flex-1 overflow-auto">
        {live && (
          <div className="flex gap-8 min-w-max h-full items-center">
            {(live.rounds || []).map((matches, ri) => (
              <div key={ri} className="flex flex-col justify-around gap-6 min-w-[260px]">
                <div className="text-center text-primary font-black uppercase text-sm font-display">{ri + 1 === live.rounds.length ? 'FINAL' : `ROUND ${ri + 1}`}</div>
                {matches.map(m => (
                  <div key={m.id} className={`rounded-xl border-2 p-4 ${m.status === 'playing' ? 'border-rose-500' : m.status === 'done' ? 'border-primary/50 bg-slate-900' : 'border-white/20 bg-slate-900/50'}`}>
                    <div className={`flex justify-between text-lg font-black ${m.winnerId === m.teamA ? 'text-primary' : 'text-white'}`}><span>{m.teamA || 'BYE'}</span><span className="font-mono">{m.scoreA ?? ''}</span></div>
                    <div className="border-t border-white/10 my-2" />
                    <div className={`flex justify-between text-lg font-black ${m.winnerId === m.teamB ? 'text-primary' : 'text-white'}`}><span>{m.teamB || 'BYE'}</span><span className="font-mono">{m.scoreB ?? ''}</span></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Register (keeps the existing prop-free API registration flow) ────────── */
function RegisterCard({ language, weekly, onDone }: { language: string; weekly: Card[]; onDone: () => void }) {
  const open = weekly.filter(c => c.signupMode !== 'info_only');
  const [selected, setSelected] = useState(open[0]?.id || '');
  const [team, setTeam] = useState('');
  const [leader, setLeader] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { if (!selected && open[0]) setSelected(open[0].id); }, [open, selected]);
  const sel = open.find(c => c.id === selected);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setDone('');
    try {
      const res = await fetch('/api/tournaments/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: selected, team: { name: team, leader, members: [] } }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
      setDone(team); setTeam(''); setLeader(''); onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <form onSubmit={submit} className="lg:col-span-2 rounded-2xl border border-white/10 bg-dark-card p-6 flex flex-col gap-4">
        <h3 className="text-white font-black font-display uppercase tracking-wider flex items-center gap-2 text-sm"><Users className="w-5 h-5 text-primary" />{L(language, { fa: 'ثبت‌نام در مسابقات هفتگی', en: 'Register for a weekly tournament' })}</h3>
        {!open.length ? <Empty language={language} fa="ثبت‌نامی در حال حاضر باز نیست." en="No open registrations right now." /> : (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'انتخاب مسابقه', en: 'Tournament' })}</label>
              <select value={selected} onChange={e => setSelected(e.target.value)} className="w-full bg-card-2 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white">
                {open.map(c => <option key={c.id} value={c.id}>{c.title} — {c.registrationFee.toLocaleString(localeOf(language))} TL</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'نام تیم', en: 'Team name' })}</label>
              <input required value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. Persis Esports" className="w-full bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-bold">{L(language, { fa: 'گیمرتگ سرپرست', en: 'Leader gamertag' })}</label>
              <input required value={leader} onChange={e => setLeader(e.target.value)} placeholder="e.g. Sina_Gamer" className="w-full bg-card-2 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary" />
            </div>
            {sel && <div className="text-xs text-gray-400 font-mono">{L(language, { fa: 'ورودی:', en: 'Entry:' })} <span className="text-primary font-black">{sel.registrationFee.toLocaleString(localeOf(language))} TL</span> · {sel.checkedIn || sel.teamCount}/{sel.maxTeams}</div>}
            {err && <div className="text-rose-300 text-xs font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{err}</div>}
            {done && <div className="text-emerald-300 text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{L(language, { fa: `تیم «${done}» ثبت شد.`, en: `Team “${done}” registered.` })}</div>}
            <button disabled={busy} className="w-full py-3.5 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{L(language, { fa: 'ثبت‌نام تیم', en: 'REGISTER TEAM' })}
            </button>
            <p className="text-[10px] text-gray-500 leading-relaxed">{L(language, { fa: 'رویدادهای ویژه ثبت‌نام آنلاین ندارند. پرداخت ورودی در کلاب (نقدی/کارتی) انجام می‌شود.', en: 'Special events have no online signup. Entry fees are paid at the club (cash/card).' })}</p>
          </>
        )}
      </form>
      <PlayerStats language={language} />
    </div>
  );
}

function PlayerStats({ language }: { language: string }) {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { getJson<Stats>('/api/player/tournament-stats').then(setS).catch(() => {}); }, []);
  const box = (n: number, label: string, icon: React.ReactNode, color: string) => (
    <div className="flex-1 rounded-xl bg-card-2 border border-white/10 p-3 text-center">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <div className="text-white font-black text-xl font-display">{n}</div>
      <div className="text-[10px] text-gray-400 font-bold mt-0.5">{label}</div>
    </div>
  );
  return (
    <div className="rounded-2xl border border-white/10 bg-dark-card p-6">
      <h4 className="text-white font-black font-display uppercase tracking-wider flex items-center gap-2 text-sm mb-4"><Trophy className="w-5 h-5 text-amber-300" />{L(language, { fa: 'آمار تورنومنت من', en: 'My tournament stats' })}</h4>
      {!s ? <div className="flex justify-center py-8 text-primary"><Loader2 className="w-6 h-6 animate-spin" /></div>
        : !s.available ? <p className="text-xs text-gray-500 leading-relaxed">{L(language, { fa: 'پس از شرکت در تورنومنت‌ها، آمار شما اینجا نمایش داده می‌شود.', en: 'Your championship stats will appear here once you play in tournaments.' })}</p>
        : (
          <>
            <div className="flex gap-2 mb-3">
              {box(s.championships, L(language, { fa: 'قهرمانی', en: 'Wins' }), <Crown className="w-5 h-5" />, 'text-amber-300')}
              {box(s.secondPlaces, L(language, { fa: 'نایب', en: '2nd' }), <Medal className="w-5 h-5" />, 'text-slate-300')}
              {box(s.tournaments, L(language, { fa: 'تورنومنت', en: 'Played' }), <Trophy className="w-5 h-5" />, 'text-primary')}
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
              <div className="text-primary font-black text-2xl font-display">{s.seasonPoints}</div>
              <div className="text-[10px] text-gray-400 font-bold">{L(language, { fa: 'امتیاز فصل جاری', en: 'Current season points' })}</div>
            </div>
          </>
        )}
    </div>
  );
}

function Empty({ language, fa, en }: { language: string; fa: string; en: string }) {
  return (
    <div className="py-14 text-center flex flex-col items-center gap-3">
      <Trophy className="w-10 h-10 text-primary/30" />
      <span className="text-sm font-bold text-gray-400">{L(language, { fa, en })}</span>
    </div>
  );
}
