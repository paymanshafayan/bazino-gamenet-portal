/**
 * تورنمنت پلنر - نسخه سفید
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
    } catch {} finally { setLoading(false); }
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
      notify(L(language, { fa: 'ذخیره شد', en: 'Saved', ru: 'Сохранено', tr: 'Kaydedildi' }), 'success');
      setForm(EMPTY); await load();
    } catch {
      notify(L(language, { fa: 'خطا', en: 'Failed', ru: 'Ошибка', tr: 'Hata' }), 'error');
    } finally { setBusy(false); }
  };

  const remove = async (c: Card) => {
    if (!window.confirm(L(language, { fa: `حذف «${c.title}»؟`, en: `Delete “${c.title}”?`, ru: `Удалить?`, tr: `Sil?` }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete-failed');
      notify(L(language, { fa: 'حذف شد', en: 'Deleted', ru: 'Удалено', tr: 'Silindi' }), 'success');
      await load();
    } catch {
      notify(L(language, { fa: 'خطا', en: 'Failed', ru: 'Ошибка', tr: 'Hata' }), 'error');
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
      notify(L(language, { fa: 'به‌روز شد', en: 'Updated', ru: 'Обновлено', tr: 'Güncellendi' }), 'success');
      setEditing(null); setForm(EMPTY); await load();
    } catch {
      notify(L(language, { fa: 'خطا', en: 'Failed', ru: 'Ошибка', tr: 'Hata' }), 'error');
    } finally { setBusy(false); }
  };

  const kindBadge = (c: Card) => c.kind === 'special'
    ? L(language, { fa: 'ویژه', en: 'SPECIAL', ru: 'ОСОБЫЙ', tr: 'ÖZEL' })
    : L(language, { fa: 'هفتگی', en: 'WEEKLY', ru: 'ЕЖЕНЕД.', tr: 'HAFTALIK' });

  const cardCls = "bg-white border border-[#c3c4c7] shadow-[0_1px_1px_rgba(0,0,0,0.04)] rounded-[2px] p-4";
  const inp = "w-full h-[30px] bg-white border border-[#8c8f94] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1] rounded-[3px] px-2.5 text-[13px] text-[#2c3338] outline-none";

  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h3 className="text-[13px] font-semibold text-[#1d2327] mb-4 flex items-center gap-2 border-b border-[#dcdcde] pb-2">
          {editing ? <Pencil className="w-4 h-4 text-[#2271b1]" /> : <Trophy className="w-4 h-4 text-[#2271b1]" />}
          <span>{editing ? L(language, { fa: 'ویرایش', en: 'Edit', ru: 'Изм.', tr: 'Düzenle' }) : L(language, { fa: 'رویداد جدید', en: 'New Event', ru: 'Новое', tr: 'Yeni' })}</span>
        </h3>

        <form onSubmit={editing ? applyEdit : create} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={L(language, { fa: 'عنوان', en: 'Title', ru: 'Название', tr: 'Ad' })}><input type="text" required disabled={!!editing} value={form.title} onChange={ev => set('title', ev.target.value)} placeholder="عنوان" className={inp} /></Field>
            <Field label={L(language, { fa: 'بازی', en: 'Game', ru: 'Игра', tr: 'Oyun' })}><input type="text" required disabled={!!editing} value={form.game} onChange={ev => set('game', ev.target.value)} placeholder="Game" className={inp} /></Field>
            <Field label={L(language, { fa: 'نوع', en: 'Kind', ru: 'Тип', tr: 'Tür' })}><select value={form.kind} onChange={ev => set('kind', ev.target.value)} className={inp}><option value="weekly">Weekly</option><option value="special">Special</option></select></Field>
            <Field label={L(language, { fa: 'ثبت‌نام', en: 'Signup', ru: 'Регистрация', tr: 'Kayıt' })}><select value={form.signupMode} onChange={ev => set('signupMode', ev.target.value)} className={inp}><option value="open">Open</option><option value="info_only">Info only</option></select></Field>
            {!editing && <Field label="Fee"><input type="number" required value={form.registrationFee} onChange={ev => set('registrationFee', Number(ev.target.value))} className={`${inp} font-mono`} /></Field>}
            {!editing && <div className="grid grid-cols-2 gap-2"><Field label="Date"><input type="text" required value={form.startDate} onChange={ev => set('startDate', ev.target.value)} placeholder="1405/06/15" className={inp} /></Field><Field label="Max"><input type="number" required max={32} value={form.maxTeams} onChange={ev => set('maxTeams', Number(ev.target.value))} className={`${inp} font-mono`} /></Field></div>}
          </div>

          <Field label="Rules"><textarea rows={3} value={form.rules} onChange={ev => set('rules', ev.target.value)} placeholder="قوانین" className="bg-white border border-[#8c8f94] rounded-[3px] px-2.5 py-2 text-[13px] text-[#2c3338] outline-none w-full resize-none" /></Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="🥇 1st"><input type="text" value={form.first} onChange={ev => set('first', ev.target.value)} placeholder="Prize" className={`${inp} font-mono`} /></Field>
            <Field label="🥈 2nd"><input type="text" value={form.second} onChange={ev => set('second', ev.target.value)} placeholder="Prize" className={`${inp} font-mono`} /></Field>
            <Field label="🥉 3rd"><input type="text" value={form.third} onChange={ev => set('third', ev.target.value)} placeholder="Prize" className={`${inp} font-mono`} /></Field>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="h-[30px] px-3 rounded-[3px] bg-white border border-[#8c8f94] text-[#2c3338] text-[13px] flex items-center gap-1"><X className="w-4 h-4" />Cancel</button>}
            <button type="submit" disabled={busy} className="h-[30px] px-4 bg-[#2271b1] hover:bg-[#135e96] text-white rounded-[3px] text-[13px] flex items-center gap-1.5 disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>{editing ? 'Save' : 'Publish'}</span></button>
          </div>
        </form>
      </div>

      <div className={cardCls}>
        <h3 className="text-[13px] font-semibold text-[#1d2327] mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#2271b1]" />{L(language, { fa: 'رویدادها', en: 'Events', ru: 'События', tr: 'Etkinlikler' })}</h3>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#2271b1]" /></div> : cards.length === 0 ? <p className="text-[12px] text-[#646970] py-6 text-center">—</p> : (
          <div className="flex flex-col gap-2">
            {cards.map(c => (
              <div key={c.id} className="bg-[#fcfcfc] border border-[#dcdcde] rounded-[2px] p-3 flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex items-center gap-2 md:w-60 shrink-0">
                  <div className={`w-8 h-8 rounded-[2px] border flex items-center justify-center ${c.kind === 'special' ? 'bg-[#fcf0f1] border-[#e9a0a0] text-[#8a2424]' : 'bg-[#f0f6fc] border-[#a7d0e4] text-[#2271b1]'}`}>{c.kind === 'special' ? <Star className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}</div>
                  <div className="min-w-0"><div className="text-[12px] font-medium text-[#1d2327] truncate">{c.title}</div><div className="text-[10px] text-[#a7aaad] font-mono truncate">{c.game}</div></div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-[#50575e] flex-1">
                  <span className="px-1.5 py-0.5 rounded bg-[#f0f0f1] border border-[#dcdcde] text-[10px]">{kindBadge(c)}</span>
                  {c.signupMode === 'info_only' ? <span className="px-1.5 py-0.5 rounded bg-[#fcf0f1] border border-[#e9a0a0] text-[#8a2424] text-[10px]">INFO</span> : <span className="flex items-center gap-1 text-[11px]"><Users className="w-3 h-3" />{c.checkedIn || c.teamCount}/{c.maxTeams}</span>}
                  <span className="font-mono text-[11px]">{c.registrationFee.toLocaleString(localeOf(language))}</span>
                  <span className="text-[#a7aaad] text-[10px]">{formatJalaliForLanguage(c.startDate, language)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(c)} className="h-[26px] px-2 rounded-[3px] bg-white border border-[#2271b1] text-[#2271b1] text-[11px] flex items-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                  <button onClick={() => remove(c)} disabled={busy} className="h-[26px] px-2 rounded-[3px] bg-white border border-[#dcdcde] text-[#d63638] text-[11px]"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return <div className="block"><span className="text-[11px] text-[#646970] font-bold block mb-1">{props.label}</span>{props.children}</div>;
}
