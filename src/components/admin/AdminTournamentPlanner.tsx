/**
 * Batch 10 — Site admin panel → Tournaments planner (`tournaments` sub-tab).
 * Redesigned in the CURRENT site theme (Arena dark/cyan) and brought up to the new
 * tournament model: weekly vs. special (10/4/2), open vs. info-only signup,
 * per-event rules & prizes, live bracket progress — on real backend endpoints.
 * Day-to-day operations (check-in, live pairing, results, finalize) live in the
 * neighbouring "Tournament Operations" sub-tab.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Star, Radio, Save, Trash2, Loader2, Pencil, X } from 'lucide-react';
import { L, formatJalaliForLanguage, localeOf } from '../../utils/i18n';

interface Prize { first?: string; second?: string; third?: string; }
interface Card {
  id: string; title: string; game: string; startDate: string; registrationFee: number;
  maxTeams: number; kind: 'weekly' | 'special'; signupMode: 'open' | 'info_only';
  prizes: Prize; teamCount: number; checkedIn: number; bracketTotal: number; bracketDone: number;
  liveState: 'upcoming' | 'live' | 'past'; finalized: boolean;
}
interface Form {
  title: string; game: string; registrationFee: number; startDate: string; maxTeams: number;
  kind: 'weekly' | 'special'; signupMode: 'open' | 'info_only';
  rules: string; first: string; second: string; third: string;
}
const EMPTY: Form = {
  title: '', game: '', registrationFee: 100000, startDate: '', maxTeams: 8,
  kind: 'weekly', signupMode: 'open', rules: '', first: '', second: '', third: '',
};
const inp = 'w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold';

export default function AdminTournamentPlanner(props: { language: string; notify: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const { language, notify } = props;
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<Card | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch('/api/tournaments/events')).json();
      const all = [...(d.weekly || []), ...(d.special || [])] as Card[];
      all.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
      setCards(all);
    } catch { /* keep last */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const set = (k: keyof Form, v: any) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'kind') next.signupMode = v === 'special' ? 'info_only' : 'open';
    return next;
  });

  const saveMeta = async (id: string, f: Form) => {
    const prizes: Prize = {};
    if (f.first.trim()) prizes.first = f.first.trim();
    if (f.second.trim()) prizes.second = f.second.trim();
    if (f.third.trim()) prizes.third = f.third.trim();
    const res = await fetch(`/api/management/tournaments/${id}/meta`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: f.kind, signupMode: f.signupMode, rules: f.rules, prizes }),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.game.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, game: form.game, registrationFee: form.registrationFee, startDate: form.startDate, maxTeams: form.maxTeams, status: 'Upcoming' }),
      });
      if (!res.ok) throw new Error('create-failed');
      const data = await res.json();
      const list: any[] = data.tournaments || [];
      const created = [...list].reverse().find(t => t.title === form.title) || list[list.length - 1];
      if (created && created.id) await saveMeta(created.id, form);
      notify(L(language, { fa: 'تورنومنت با مشخصات جدید ذخیره شد', en: 'Tournament saved with the new details', ru: 'Турнир сохранён', tr: 'Turnuva kaydedildi' }), 'success');
      setForm(EMPTY); await load();
    } catch {
      notify(L(language, { fa: 'خطا در ثبت تورنومنت', en: 'Failed to save tournament', ru: 'Не удалось сохранить турнир', tr: 'Turnuva kaydedilemedi' }), 'error');
    } finally { setBusy(false); }
  };

  const remove = async (c: Card) => {
    if (!window.confirm(L(language, { fa: `حذف «${c.title}»؟`, en: `Delete “${c.title}”?`, ru: `Удалить «${c.title}»?`, tr: `“${c.title}” silinsin mi?` }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete-failed');
      notify(L(language, { fa: 'تورنومنت حذف شد', en: 'Tournament deleted', ru: 'Турнир удалён', tr: 'Turnuva silindi' }), 'success');
      await load();
    } catch {
      notify(L(language, { fa: 'خطا در حذف', en: 'Failed to delete', ru: 'Не удалось удалить', tr: 'Silinemedi' }), 'error');
    } finally { setBusy(false); }
  };

  const startEdit = (c: Card) => {
    setForm({ title: c.title, game: c.game, registrationFee: c.registrationFee, startDate: c.startDate, maxTeams: c.maxTeams, kind: c.kind, signupMode: c.signupMode, rules: '', first: c.prizes?.first || '', second: c.prizes?.second || '', third: c.prizes?.third || '' });
    setEditing(c);
  };

  const applyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await saveMeta(editing.id, form);
      notify(L(language, { fa: 'به‌روزرسانی شد', en: 'Updated', ru: 'Обновлено', tr: 'Güncellendi' }), 'success');
      setEditing(null); setForm(EMPTY); await load();
    } catch {
      notify(L(language, { fa: 'خطا در به‌روزرسانی', en: 'Update failed', ru: 'Ошибка обновления', tr: 'Güncelleme hatası' }), 'error');
    } finally { setBusy(false); }
  };

  const kindBadge = (c: Card) => c.kind === 'special'
    ? L(language, { fa: 'ویژه', en: 'SPECIAL', ru: 'ОСОБЫЙ', tr: 'ÖZEL' })
    : L(language, { fa: 'هفتگی', en: 'WEEKLY', ru: 'ЕЖЕНЕД.', tr: 'HAFTALIK' });

  return (
    <div className="flex flex-col gap-6">
      {/* Create / edit */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 font-display uppercase tracking-wider border-b border-white/5 pb-3">
          {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Trophy className="w-4 h-4 text-primary" />}
          <span>{editing
            ? L(language, { fa: 'ویرایش نوع، قوانین و جوایز', en: 'Edit kind, rules & prizes', ru: 'Тип, правила и призы', tr: 'Tür, kurallar ve ödüller' })
            : L(language, { fa: 'برنامه‌ریزی رویداد جدید (هفتگی / ویژه)', en: 'Schedule a new event (weekly / special)', ru: 'Новое событие (еженед. / особое)', tr: 'Yeni etkinlik (haftalık / özel)' })}</span>
        </h3>

        <form onSubmit={editing ? applyEdit : create} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={L(language, { fa: 'عنوان رویداد', en: 'Event title', ru: 'Название', tr: 'Etkinlik adı' })}>
              <input type="text" required disabled={!!editing} value={form.title} onChange={ev => set('title', ev.target.value)}
                placeholder={L(language, { fa: 'مثلاً جام هفتگی فیفا ۲۶', en: 'e.g. Weekly FIFA 26 Cup', ru: 'Напр.: Еженедельный кубок FIFA 26', tr: 'Örn: Haftalık FIFA 26 Kupası' })} className={inp} />
            </Field>
            <Field label={L(language, { fa: 'بازی و ژانر', en: 'Game & genre', ru: 'Игра и жанр', tr: 'Oyun ve tür' })}>
              <input type="text" required disabled={!!editing} value={form.game} onChange={ev => set('game', ev.target.value)} placeholder="FIFA 26 · 1v1" className={inp} />
            </Field>
            <Field label={L(language, { fa: 'نوع رویداد', en: 'Event kind', ru: 'Тип события', tr: 'Etkinlik türü' })}>
              <select value={form.kind} onChange={ev => set('kind', ev.target.value)} className={inp}>
                <option value="weekly">{L(language, { fa: 'هفتگی — امتیاز فصل ۵/۲/۱', en: 'Weekly — season points 5/2/1', ru: 'Еженед. — очки 5/2/1', tr: 'Haftalık — 5/2/1 puan' })}</option>
                <option value="special">{L(language, { fa: 'ویژه — امتیاز فصل ۱۰/۴/۲', en: 'Special — season points 10/4/2', ru: 'Особый — очки 10/4/2', tr: 'Özel — 10/4/2 puan' })}</option>
              </select>
            </Field>
            <Field label={L(language, { fa: 'وضعیت ثبت‌نام', en: 'Signup mode', ru: 'Регистрация', tr: 'Kayıt türü' })}>
              <select value={form.signupMode} onChange={ev => set('signupMode', ev.target.value)} className={inp}>
                <option value="open">{L(language, { fa: 'ثبت‌نام باز (آنلاین + حضوری)', en: 'Open signup (online + walk-in)', ru: 'Открыта (онлайн + на месте)', tr: 'Açık kayıt (online + yerinde)' })}</option>
                <option value="info_only">{L(language, { fa: 'فقط اطلاع‌رسانی (بدون ثبت‌نام آنلاین)', en: 'Info only (no online signup)', ru: 'Только инфо (без онлайн)', tr: 'Sadece duyuru (online kayıt yok)' })}</option>
              </select>
            </Field>
            {!editing && (
              <Field label={L(language, { fa: 'هزینه ورودی (TL)', en: 'Entry fee (TL)', ru: 'Взнос (TL)', tr: 'Giriş ücreti (TL)' })}>
                <input type="number" required value={form.registrationFee} onChange={ev => set('registrationFee', Number(ev.target.value))} className={`${inp} font-mono`} />
              </Field>
            )}
            {!editing && (
              <div className="grid grid-cols-2 gap-2">
                <Field label={L(language, { fa: 'تاریخ شروع', en: 'Start date', ru: 'Дата начала', tr: 'Başlangıç' })}>
                  <input type="text" required value={form.startDate} onChange={ev => set('startDate', ev.target.value)} placeholder="1405/06/15" className={inp} />
                </Field>
                <Field label={L(language, { fa: 'حداکثر', en: 'Max', ru: 'Макс.', tr: 'Maks.' })}>
                  <input type="number" required max={32} value={form.maxTeams} onChange={ev => set('maxTeams', Number(ev.target.value))} className={`${inp} font-mono`} />
                </Field>
              </div>
            )}
          </div>

          <Field label={L(language, { fa: 'قوانین این رویداد (روی کارت و براکت نشان داده می‌شود)', en: 'Event rules (shown on card & bracket)', ru: 'Правила события', tr: 'Etkinlik kuralları' })}>
            <textarea rows={3} value={form.rules} onChange={ev => set('rules', ev.target.value)}
              placeholder={L(language, { fa: 'مثلاً: BO3، تساوی مجاز نیست، برنده صعود می‌کند...', en: 'e.g. BO3, no draws, winner advances…', ru: 'Напр.: BO3, без ничьих…', tr: 'Örn: BO3, beraberlik yok…' })}
              className={`${inp} resize-none`} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={`🥇 ${L(language, { fa: 'جایزه اول', en: '1st prize', ru: '1-е место', tr: '1.lik ödülü' })}`}>
              <input type="text" value={form.first} onChange={ev => set('first', ev.target.value)} placeholder="10,000 TL + 1000 PTS" className={`${inp} font-mono`} />
            </Field>
            <Field label={`🥈 ${L(language, { fa: 'جایزه دوم', en: '2nd prize', ru: '2-е место', tr: '2.lik ödülü' })}`}>
              <input type="text" value={form.second} onChange={ev => set('second', ev.target.value)} placeholder="5,000 TL" className={`${inp} font-mono`} />
            </Field>
            <Field label={`🥉 ${L(language, { fa: 'جایزه سوم', en: '3rd prize', ru: '3-е место', tr: '3.lük ödülü' })}`}>
              <input type="text" value={form.third} onChange={ev => set('third', ev.target.value)} placeholder="2,500 TL" className={`${inp} font-mono`} />
            </Field>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }}
                className="px-5 py-2.5 rounded-lg text-xs font-black cursor-pointer bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 flex items-center gap-1.5">
                <X className="w-4 h-4" />{L(language, { fa: 'انصراف', en: 'Cancel', ru: 'Отмена', tr: 'Vazgeç' })}
              </button>
            )}
            <button type="submit" disabled={busy}
              className="px-6 bg-primary hover:bg-primary-hover text-black py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-display uppercase tracking-wide disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{editing
                ? L(language, { fa: 'ذخیره تغییرات', en: 'Save changes', ru: 'Сохранить', tr: 'Değişiklikleri kaydet' })
                : L(language, { fa: 'ثبت و انتشار رویداد', en: 'Save & publish event', ru: 'Сохранить и опубликовать', tr: 'Kaydet ve yayınla' })}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cards */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {L(language, { fa: 'رویدادها و وضعیت زنده', en: 'Events & live status', ru: 'События и статус', tr: 'Etkinlikler ve canlı durum' })}
        </h3>

        {loading ? (
          <div className="flex justify-center py-10 text-primary"><Loader2 className="w-7 h-7 animate-spin" /></div>
        ) : cards.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">{L(language, { fa: 'هنوز رویدادی ثبت نشده است.', en: 'No events yet.', ru: 'Событий пока нет.', tr: 'Henüz etkinlik yok.' })}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map(c => (
              <div key={c.id} className="bg-[#0a0e21] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-3 md:w-60 shrink-0">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${c.kind === 'special' ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                    {c.kind === 'special' ? <Star className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-display truncate">{c.title}</div>
                    <div className="text-[10px] text-gray-400 font-mono truncate">{c.game}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-300 font-bold flex-1">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{kindBadge(c)}</span>
                  {c.signupMode === 'info_only' ? (
                    <span className="px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/20">{L(language, { fa: 'فقط اطلاع‌رسانی', en: 'INFO ONLY', ru: 'ТОЛЬКО ИНФО', tr: 'DUYURU' })}</span>
                  ) : (
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" />{c.checkedIn || c.teamCount}/{c.maxTeams}</span>
                  )}
                  <span className="text-gray-400">{c.registrationFee.toLocaleString(localeOf(language))} TL</span>
                  <span className="text-gray-500">{formatJalaliForLanguage(c.startDate, language)}</span>
                  {c.bracketTotal > 0 && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${c.liveState === 'live' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse' : c.finalized ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {c.liveState === 'live' ? <Radio className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                      {c.finalized ? L(language, { fa: 'پایان‌یافته', en: 'DONE', ru: 'ЗАВЕРШЁН', tr: 'BİTTİ' }) : `${c.bracketDone}/${c.bracketTotal}`}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {c.prizes && c.prizes.first ? <span className="hidden lg:inline text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">🏆 {c.prizes.first}</span> : null}
                  <button onClick={() => startEdit(c)} className="px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black transition-all flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" />{L(language, { fa: 'ویرایش', en: 'Edit', ru: 'Изм.', tr: 'Düzenle' })}
                  </button>
                  <button onClick={() => remove(c)} disabled={busy} className="px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer bg-white/5 text-gray-400 border border-white/10 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
          {L(language, {
            fa: 'برای ثبت‌نام حضوری، پیرینگ زنده، ثبت نتیجه و نهایی‌سازی/امتیاز فصل از تب «مدیریت عملیاتی مسابقات» استفاده کنید. امتیاز فصل (هفتگی ۵/۲/۱، ویژه ۱۰/۴/۲) فقط برای رتبه‌بندی است و جدا از اعتبار خرید است.',
            en: 'For walk-in registration, live pairing, results and finalize/season points use the “Tournament Operations” tab. Season points (weekly 5/2/1, special 10/4/2) rank the season only and are separate from Credits.',
            ru: 'Для регистрации, жеребьёвки, результатов и начисления очков используйте вкладку «Операции турниров». Очки сезона (5/2/1 и 10/4/2) — только рейтинг, отдельно от кредитов.',
            tr: 'Yerinde kayıt, canlı eşleştirme, sonuçlar ve puan için “Turnuva Operasyonları” sekmesini kullanın. Sezon puanları (5/2/1, 10/4/2) sadece sıralamadır, Kredi’den ayrıdır.',
          })}
        </p>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="text-xs text-gray-400 block mb-1.5 font-bold">{props.label}</span>
      {props.children}
    </div>
  );
}
