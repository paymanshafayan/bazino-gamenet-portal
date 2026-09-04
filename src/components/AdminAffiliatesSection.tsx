/** پنل ادمین — طرح همکاری در فروش (/admin/affiliates) */
import React, { useEffect, useState } from 'react';
import { Megaphone, RefreshCw, Plus, Save } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

interface Props { addNotification: (message: string, type: 'success' | 'error' | 'info') => void }

const post = async (url: string, body: any, method = 'POST') => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  return d;
};

const SETTING_FIELDS: Array<{ key: string; fa: string; en: string; ru: string; tr: string }> = [
  { key: 'affiliate_new_pct', fa: '٪ مشتری جدید (رزرو)', en: 'New customer % (reservation)', ru: '% нового клиента', tr: 'Yeni müşteri %' },
  { key: 'affiliate_return_pct', fa: '٪ مشتری بازگشتی (رزرو)', en: 'Returning customer %', ru: '% вернувшегося', tr: 'Geri dönen müşteri %' },
  { key: 'affiliate_tournament_pct', fa: '٪ تورنمنت', en: 'Tournament %', ru: '% турнира', tr: 'Turnuva %' },
  { key: 'affiliate_override_pct', fa: '٪ بالاسری (سطح ۲)', en: 'Override % (level 2)', ru: '% оверрайда', tr: 'Üst komisyon %' },
  { key: 'affiliate_window_days', fa: 'پنجرهٔ انتساب (روز)', en: 'Attribution window (days)', ru: 'Окно атрибуции (дни)', tr: 'Atıf penceresi (gün)' },
  { key: 'wallet_cashout_min_tl', fa: 'حداقل نقد کیف پول (لیر)', en: 'Min wallet cash-out (TL)', ru: 'Мин. вывод (TL)', tr: 'Min. nakit çekim (TL)' },
  { key: 'affiliate_excluded_roles', fa: 'نقش‌های مستثنی', en: 'Excluded roles', ru: 'Исключённые роли', tr: 'Hariç roller' },
  { key: 'affiliate_program_open', fa: 'طرح باز است (1/0)', en: 'Program open (1/0)', ru: 'Программа открыта (1/0)', tr: 'Program açık (1/0)' },
];

export default function AdminAffiliatesSection({ addNotification }: Props) {
  const { language, dir } = useLanguage();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [list, setList] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({ code: '', username: '', name: '', type: 'gamer', language: 'tr', destination: '/', parentId: '', status: 'active', newPct: '', returnPct: '', tournamentPct: '', overridePct: '', notes: '' });

  const load = () => {
    fetch('/api/admin/affiliate-settings').then(r => r.json()).then(d => setSettings(d && typeof d === 'object' ? d : {})).catch(() => {});
    fetch('/api/admin/affiliates').then(r => r.json()).then(d => setList(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/affiliates/report').then(r => r.json()).then(setReport).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setBusy('settings');
    try {
      const d = await post('/api/admin/affiliate-settings', settings, 'PUT');
      setSettings(d.settings || settings);
      addNotification(L(language, { fa: 'تنظیمات طرح ذخیره شد.', en: 'Program settings saved.', ru: 'Настройки сохранены.', tr: 'Ayarlar kaydedildi.' }), 'success');
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(''); }
  };

  const create = async () => {
    setBusy('create');
    try {
      const body: any = { ...form };
      ['newPct', 'returnPct', 'tournamentPct', 'overridePct'].forEach(k => { if (body[k] === '') body[k] = ''; });
      await post('/api/admin/affiliates', body);
      addNotification(L(language, { fa: 'همکار ثبت شد.', en: 'Affiliate created.', ru: 'Партнёр создан.', tr: 'İş ortaklığı kaydedildi.' }), 'success');
      setForm({ ...form, code: '', username: '', name: '', notes: '' });
      load();
    } catch (e: any) { addNotification(e.message, 'error'); } finally { setBusy(''); }
  };

  const patchStatus = async (id: string, status: string) => {
    try { await post(`/api/admin/affiliates/${encodeURIComponent(id)}`, { status }, 'PUT'); load(); if (detail?.affiliate?.id === id) open(id); }
    catch (e: any) { addNotification(e.message, 'error'); }
  };

  const open = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/affiliates/${encodeURIComponent(id)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'error');
      setDetail(d);
    } catch (e: any) { addNotification(e.message, 'error'); }
  };

  const th = 'text-[11px] text-gray-400 font-bold px-3 py-2 text-start';
  const td = 'text-xs px-3 py-2 border-t border-white/5';
  const inp = 'bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white';

  const money = (n: number) => `${Number(n || 0).toLocaleString()} TL`;

  return (
    <div className="space-y-6 animate-fade-in" dir={dir} data-admin-affiliates>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-black text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" />{L(language, { fa: 'همکاری در فروش', en: 'Affiliate Marketing', ru: 'Партнёрская программа', tr: 'Satış Ortaklığı' })}</h2>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3" data-affiliate-settings>
        <h3 className="text-sm font-black text-white">{L(language, { fa: 'اعداد و اطلاعات طرح (از جدول تنظیمات)', en: 'Program numbers (from settings table)', ru: 'Числа программы (из настроек)', tr: 'Program rakamları (ayarlar tablosu)' })}</h3>
        <p className="text-[11px] text-gray-400">{L(language, { fa: 'این مقادیر ردیف واقعی جدول settings هستند؛ خالی نمی‌مانند و موتور فقط همین‌ها را می‌خواند.', en: 'These are real settings rows; they are never left blank and the engine reads only these values.', ru: 'Это реальные строки настроек; движок читает только их.', tr: 'Bunlar gerçek ayar satırlarıdır; motor yalnızca bunları okur.' })}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SETTING_FIELDS.map(f => (
            <label key={f.key} className="text-[11px] text-gray-400 space-y-1">
              <span>{L(language, f)}</span>
              <input data-setting={f.key} className={`${inp} w-full`} dir="ltr" value={settings[f.key] ?? ''} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} />
            </label>
          ))}
        </div>
        <button disabled={busy === 'settings'} onClick={saveSettings} data-save-settings className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Save className="w-3.5 h-3.5" />{L(language, { fa: 'ذخیره تنظیمات', en: 'Save settings', ru: 'Сохранить', tr: 'Kaydet' })}</button>
      </section>

      {report?.totals && (
        <section className="bg-black/30 border border-white/10 rounded-2xl p-4" data-affiliate-report>
          <h3 className="text-sm font-black text-white mb-3">{L(language, { fa: 'گزارش مالی کل طرح', en: 'Program-wide financial report', ru: 'Финансовый отчёт программы', tr: 'Program mali raporu' })}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
            {([
              ['clicks', 'کلیک', 'Clicks'],
              ['leads', 'سرنخ', 'Leads'],
              ['paid', 'پرداخت‌شده', 'Paid'],
              ['attended', 'حضور', 'Attended'],
              ['netSales', 'فروش خالص', 'Net sales'],
              ['paidOut', 'کمیسیون پرداختی', 'Paid out'],
              ['pending', 'در انتظار', 'Pending'],
              ['reversed', 'برگشت', 'Reversed'],
            ] as const).map(([k, fa, en]) => (
              <div key={k} className="bg-black/40 rounded-xl p-3">
                <div className="text-[10px] text-gray-500">{L(language, { fa, en, ru: en, tr: en })}</div>
                <div className="text-primary font-black" dir="ltr" data-total={k}>{k === 'netSales' || k === 'paidOut' || k === 'pending' || k === 'reversed' ? money(report.totals[k]) : report.totals[k]}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-black text-white flex items-center gap-2"><Plus className="w-4 h-4" />{L(language, { fa: 'ثبت همکار جدید', en: 'New affiliate', ru: 'Новый партнёр', tr: 'Yeni iş ortağı' })}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {([
            ['code', 'کد (خالی=خودکار)', 'Code (blank=auto)'],
            ['username', 'نام کاربری کیف پول', 'Wallet username'],
            ['name', 'نام نمایشی', 'Display name'],
            ['type', 'نوع (gamer/influencer/…)', 'Type'],
            ['language', 'زبان لینک', 'Link language'],
            ['destination', 'مقصد لینک', 'Destination'],
            ['parentId', 'شناسه والد (سطح ۲)', 'Parent id (level 2)'],
            ['notes', 'یادداشت', 'Notes'],
          ] as const).map(([k, fa, en]) => (
            <input key={k} className={inp} placeholder={L(language, { fa, en, ru: en, tr: en })} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} data-new={k} />
          ))}
          {(['newPct', 'returnPct', 'tournamentPct', 'overridePct'] as const).map(k => (
            <input key={k} className={inp} dir="ltr" placeholder={`${k} (−1=سراسری)`} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} data-new={k} />
          ))}
        </div>
        <button disabled={busy === 'create'} onClick={create} data-create-affiliate className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold disabled:opacity-50">{L(language, { fa: 'ثبت', en: 'Create', ru: 'Создать', tr: 'Kaydet' })}</button>
      </section>

      <section className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
        <h3 className="text-sm font-black text-white px-4 py-3 border-b border-white/10">{L(language, { fa: 'همکاران و زیرمجموعه‌ها', en: 'Affiliates & downline', ru: 'Партнёры и нижестоящие', tr: 'İş ortakları ve alt hat' })} <span className="text-primary">({list.length})</span></h3>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr>
            <th className={th}>کد</th><th className={th}>{L(language, { fa: 'نام', en: 'Name', ru: 'Имя', tr: 'Ad' })}</th><th className={th}>{L(language, { fa: 'کاربر', en: 'User', ru: 'User', tr: 'Kullanıcı' })}</th>
            <th className={th}>{L(language, { fa: 'کلیک', en: 'Clicks', ru: 'Клики', tr: 'Tıklama' })}</th><th className={th}>{L(language, { fa: 'فروش', en: 'Sales', ru: 'Продажи', tr: 'Satış' })}</th>
            <th className={th}>{L(language, { fa: 'کمیسیون', en: 'Commission', ru: 'Комиссия', tr: 'Komisyon' })}</th><th className={th}>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th>
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td className={`${td} text-gray-500 text-center`} colSpan={7}>{L(language, { fa: 'هنوز همکاری ثبت نشده.', en: 'No affiliates yet.', ru: 'Партнёров нет.', tr: 'Kayıt yok.' })}</td></tr>}
            {list.map(a => (
              <tr key={a.id} className="text-gray-200 cursor-pointer hover:bg-white/5" data-aff-row={a.code} onClick={() => open(a.id)}>
                <td className={td} dir="ltr">{a.code}{a.parentId ? <span className="text-gray-500 text-[10px] ms-1">↳</span> : null}</td>
                <td className={td}>{a.name}</td>
                <td className={td}>{a.username || '—'}</td>
                <td className={td} dir="ltr">{a.stats?.clicks ?? 0}</td>
                <td className={td} dir="ltr">{money(a.stats?.netSales)}</td>
                <td className={td} dir="ltr">{money(a.stats?.paidOut)} / {money(a.stats?.pending)}</td>
                <td className={td}>
                  <button type="button" className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
                    onClick={e => { e.stopPropagation(); patchStatus(a.id, a.status === 'active' ? 'paused' : 'active'); }}>{a.status}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      {detail && (
        <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3" data-aff-detail>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-white">{detail.affiliate?.name} · <span dir="ltr">{detail.affiliate?.code}</span></h3>
            <button className="text-xs text-gray-400" onClick={() => setDetail(null)}>✕</button>
          </div>
          <p className="text-[11px] text-gray-400" dir="ltr">/?ref={detail.affiliate?.code}</p>
          <div className="text-xs text-gray-300">{L(language, { fa: 'گزارش مالی این همکار', en: 'This affiliate’s financials', ru: 'Финансы партнёра', tr: 'Bu ortağın mali raporu' })}: {money(detail.stats?.netSales)} / {L(language, { fa: 'پرداخت‌شده', en: 'paid out', ru: 'выплачено', tr: 'ödendi' })} {money(detail.stats?.paidOut)}</div>
          {detail.children?.length > 0 && (
            <div className="text-xs">
              <div className="font-bold text-white mb-1">{L(language, { fa: 'زیرمجموعه‌ها', en: 'Downline', ru: 'Нижестоящие', tr: 'Alt hat' })}</div>
              {detail.children.map((c: any) => <div key={c.id} dir="ltr">{c.code} · {c.name} · {money(c.stats?.paidOut)}</div>)}
            </div>
          )}
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr><th className={th}>id</th><th className={th}>event</th><th className={th}>%</th><th className={th}>TL</th><th className={th}>status</th><th className={th}>user</th></tr></thead>
            <tbody>
              {(detail.commissions || []).map((c: any) => (
                <tr key={c.id} className="text-gray-200">
                  <td className={td} dir="ltr">{c.id}</td>
                  <td className={td}>{c.eventType}</td>
                  <td className={td} dir="ltr">{c.ratePct}</td>
                  <td className={td} dir="ltr">{c.commissionAmount}</td>
                  <td className={td}>{c.status}{c.flag ? `/${c.flag}` : ''}</td>
                  <td className={td}>{c.username}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}
