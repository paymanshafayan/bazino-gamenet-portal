/**
 * بخش ادمین: مشخصات قانونی شرکت + ویرایش متن‌های قانونی (۴ زبان) + فهرست پرداخت‌های آنلاین.
 * داخل پنل مدیریت (تب customization) رندر می‌شود؛ خروجی‌اش صفحات مستقل از قالب را تغذیه می‌کند.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { LEGAL_DEFAULTS, LEGAL_SLUGS, LEGAL_TITLES, type Lang4, type LegalSlug } from './legalContent';
import { invalidateSiteSettings } from './useCompanyInfo';
import { PaymentBadgeRow } from './PaymentBadges';

interface Props {
  siteSettings: Record<string, string>;
  saveSetting: (key: string, value: string) => Promise<boolean | void>;
  addNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const inputCls = 'w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold';
const LANGS: Lang4[] = ['tr', 'en', 'fa', 'ru'];

interface PaymentRow { merchantOid: string; kind: string; username: string; email: string; amount: number; totalAmount: number; currency: string; status: string; failedCode?: string; failedMsg?: string; createdAt: string; updatedAt: string; }

export function LegalAdminSection({ siteSettings, saveSetting, addNotification }: Props) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [slug, setSlug] = useState<LegalSlug>('distance-sales');
  const [lang, setLang] = useState<Lang4>('tr');
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [payCfg, setPayCfg] = useState<{ enabled: boolean; testMode: boolean; mock: boolean } | null>(null);

  const val = (k: string) => (k in draft ? draft[k] : (siteSettings[k] || ''));
  const commit = async (k: string) => {
    if (!(k in draft)) return;
    await saveSetting(k, draft[k]);
    invalidateSiteSettings();
    setDraft(d => { const n = { ...d }; delete n[k]; return n; });
  };

  const legalKey = `legal_${slug}_${lang}`;
  const legalValue = useMemo(() => (legalKey in draft ? draft[legalKey] : (siteSettings[legalKey] || '')), [draft, siteSettings, legalKey]);
  const isOverridden = !!(siteSettings[legalKey] && siteSettings[legalKey].trim());

  const loadPayments = async () => {
    try {
      const r = await fetch('/api/admin/payments');
      setPayments(r.ok ? await r.json() : []);
    } catch { setPayments([]); }
  };
  useEffect(() => {
    fetch('/api/payments/config').then(r => r.json()).then(setPayCfg).catch(() => setPayCfg({ enabled: false, testMode: false, mock: false }));
    loadPayments();
  }, []);

  const refund = async (oid: string) => {
    if (!window.confirm(L(language, { fa: `بازپرداخت کامل ${oid}?`, en: `Full refund of ${oid}?`, ru: `Полный возврат ${oid}?`, tr: `${oid} tam iade edilsin mi?` }))) return;
    try {
      const r = await fetch(`/api/admin/payments/${oid}/refund`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'refund failed');
      addNotification(L(language, { fa: 'بازپرداخت ثبت شد', en: 'Refund submitted', ru: 'Возврат отправлен', tr: 'İade gönderildi' }), 'success');
      loadPayments();
    } catch (e: any) { addNotification(String(e?.message || e), 'error'); }
  };

  const field = (key: string, label: string, placeholder = '', ltr = false, type = 'text') => (
    <div>
      <label className="text-xs text-gray-400 block mb-1.5 font-bold">{label}</label>
      <input type={type} dir={ltr ? 'ltr' : undefined} placeholder={placeholder} value={val(key)}
        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} onBlur={() => commit(key)}
        data-setting={key} className={inputCls + (ltr ? ' font-mono' : '')} />
    </div>
  );

  const statusColor: Record<string, string> = { success: 'text-emerald-300', failed: 'text-red-300', pending: 'text-amber-300', paid_unfulfilled: 'text-orange-300', refunded: 'text-sky-300' };

  return (
    <div className="space-y-6" data-legal-admin>
      {/* شرکت */}
      <div className="rounded-2xl border border-white/10 bg-dark-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-black text-white">{L(language, { fa: 'مشخصات قانونی شرکت (برای PayTR، فوتر و صفحهٔ تماس)', en: 'Company legal details (PayTR, footer, contact page)', ru: 'Юридические данные компании (PayTR, футер, контакты)', tr: 'Şirket Yasal Bilgileri (PayTR, altbilgi, İletişim)' })}</h3>
          <p className="text-[10px] text-gray-400 mt-1">{L(language, { fa: 'این فیلدها در متن‌های قانونی جایگزین {{company}}، {{taxNo}}، {{email}} و {{phone}} می‌شوند. فیلدهای خالی تا زمان دریافت مدارک، خالی می‌مانند (placeholder).', en: 'These values replace {{company}}, {{taxNo}}, {{email}} and {{phone}} in the legal texts. Leave blank until documents are ready.', ru: 'Значения подставляются вместо {{company}}, {{taxNo}}, {{email}}, {{phone}} в юридических текстах.', tr: 'Bu değerler yasal metinlerdeki {{company}}, {{taxNo}}, {{email}} ve {{phone}} alanlarına yazılır. Belgeler hazır olana kadar boş bırakılabilir.' })}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('company_legal_name', L(language, { fa: 'نام قانونی / عنوان تجاری', en: 'Legal name / Trade title', ru: 'Юридическое название', tr: 'Ticari Unvan' }), 'Bazino Gaming Lounge Ltd.')}
          {field('company_tax_no', L(language, { fa: 'شمارهٔ مالیاتی (Vergi No)', en: 'Tax number (Vergi No)', ru: 'Налоговый номер (Vergi No)', tr: 'Vergi Numarası' }), '', true)}
          {field('company_registration_no', L(language, { fa: 'شمارهٔ ثبت شرکت', en: 'Registration number', ru: 'Регистрационный номер', tr: 'Şirket Sicil No' }), '', true)}
          {field('company_email', L(language, { fa: 'ایمیل رسمی', en: 'Corporate e-mail', ru: 'Корпоративный e-mail', tr: 'Kurumsal E-posta' }), 'info@bazino.club', true, 'email')}
          {field('company_landline', L(language, { fa: 'تلفن ثابت', en: 'Landline', ru: 'Стационарный телефон', tr: 'Sabit Telefon' }), '+90 392 ...', true, 'tel')}
          {field('company_country', L(language, { fa: 'کشور', en: 'Country', ru: 'Страна', tr: 'Ülke' }), 'KKTC')}
        </div>
        <PaymentBadgeRow height={22} compact />
      </div>

      {/* متن‌های قانونی */}
      <div className="rounded-2xl border border-white/10 bg-dark-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-black text-white">{L(language, { fa: 'متن‌های قانونی (Mesafeli Satış، Ön Bilgilendirme، KVKK، İade…)', en: 'Legal texts (Distance Sales, Pre-Information, KVKK, Refund…)', ru: 'Юридические тексты', tr: 'Yasal Metinler (Mesafeli Satış, Ön Bilgilendirme, KVKK, İade…)' })}</h3>
          <p className="text-[10px] text-gray-400 mt-1">{L(language, { fa: 'خالی = متن پیش‌فرض سیستم نمایش داده می‌شود. فرمت: خطوط «## عنوان»، «- آیتم»، **پررنگ**. لینک عمومی: /legal/<slug>', en: 'Empty = built-in default is shown. Format: "## heading", "- item", **bold**. Public URL: /legal/<slug>', ru: 'Пусто = показывается текст по умолчанию. Формат: "## заголовок", "- пункт", **жирный**.', tr: 'Boş = sistem varsayılanı gösterilir. Biçim: "## başlık", "- madde", **kalın**. Genel adres: /legal/<slug>' })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LEGAL_SLUGS.map(s => (
            <button key={s} type="button" onClick={() => setSlug(s)} data-legal-slug-btn={s}
              className={`text-[11px] px-3 py-1.5 rounded-full border font-bold ${s === slug ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'border-white/10 text-gray-300'}`}>
              {LEGAL_TITLES[s].tr}{siteSettings[`legal_${s}_${lang}`]?.trim() ? ' •' : ''}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {LANGS.map(l => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`text-[11px] px-2.5 py-1 rounded-md border font-mono ${l === lang ? 'bg-white/10 border-white/40 text-white' : 'border-white/10 text-gray-400'}`}>{l.toUpperCase()}</button>
          ))}
          <span className="text-[10px] text-gray-500 ms-auto">{isOverridden ? L(language, { fa: 'سفارشی‌شده', en: 'custom', ru: 'изменено', tr: 'özelleştirildi' }) : L(language, { fa: 'پیش‌فرض', en: 'default', ru: 'по умолчанию', tr: 'varsayılan' })}</span>
        </div>
        <textarea dir={lang === 'fa' ? 'rtl' : 'ltr'} rows={14} value={legalValue} placeholder={LEGAL_DEFAULTS[slug][lang]}
          onChange={e => setDraft(d => ({ ...d, [legalKey]: e.target.value }))}
          data-legal-editor className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] leading-relaxed" />
        <div className="flex flex-wrap gap-2">
          <button type="button" data-legal-save onClick={() => commit(legalKey)} className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-xs font-black">{L(language, { fa: 'ذخیره', en: 'Save', ru: 'Сохранить', tr: 'Kaydet' })}</button>
          <button type="button" onClick={() => setDraft(d => ({ ...d, [legalKey]: LEGAL_DEFAULTS[slug][lang] }))} className="px-4 py-2 rounded-lg border border-white/10 text-xs font-bold text-gray-200">{L(language, { fa: 'بارگذاری پیش‌فرض در ویرایشگر', en: 'Load default into editor', ru: 'Загрузить текст по умолчанию', tr: 'Varsayılanı düzenleyiciye yükle' })}</button>
          <button type="button" onClick={async () => { await saveSetting(legalKey, ''); invalidateSiteSettings(); setDraft(d => { const n = { ...d }; delete n[legalKey]; return n; }); }} className="px-4 py-2 rounded-lg border border-red-500/30 text-xs font-bold text-red-300">{L(language, { fa: 'بازگشت به پیش‌فرض', en: 'Reset to default', ru: 'Сбросить', tr: 'Varsayılana dön' })}</button>
          <a href={`/legal/${slug}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg border border-white/10 text-xs font-bold text-sky-300 ms-auto">{L(language, { fa: 'پیش‌نمایش', en: 'Preview', ru: 'Просмотр', tr: 'Önizle' })} ↗</a>
        </div>
      </div>

      {/* پرداخت‌ها */}
      <div className="rounded-2xl border border-white/10 bg-dark-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white">{L(language, { fa: 'پرداخت‌های آنلاین (PayTR)', en: 'Online payments (PayTR)', ru: 'Онлайн-платежи (PayTR)', tr: 'Online Ödemeler (PayTR)' })}</h3>
          <span className={`text-[10px] px-2 py-1 rounded-full ${payCfg?.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`} data-pay-status>
            {payCfg === null ? '…' : payCfg.enabled ? (payCfg.mock ? 'MOCK' : payCfg.testMode ? 'TEST MODE' : 'LIVE') : (payCfg as any).onlineDisabled ? L(language, { fa: 'موقتاً غیرفعال — برای فعال‌سازی PAYMENT_ONLINE_ENABLED=1 را تنظیم کنید (پرداخت فعلاً با کیف پول / در محل)', en: 'Temporarily disabled — set PAYMENT_ONLINE_ENABLED=1 to enable (payments via wallet / on-site for now)', ru: 'Временно отключено — задайте PAYMENT_ONLINE_ENABLED=1 (оплата кошельком / на месте)', tr: 'Geçici olarak kapalı — açmak için PAYMENT_ONLINE_ENABLED=1 (şimdilik cüzdan / mekânda ödeme)' }) : L(language, { fa: 'غیرفعال — PAYTR_MERCHANT_ID/KEY/SALT تنظیم نشده', en: 'Disabled — set PAYTR_MERCHANT_ID/KEY/SALT', ru: 'Отключено — задайте PAYTR_MERCHANT_ID/KEY/SALT', tr: 'Kapalı — PAYTR_MERCHANT_ID/KEY/SALT tanımlı değil' })}
          </span>
        </div>
        <p className="text-[10px] text-gray-400">{L(language, { fa: 'راهنمای دریافت درگاه: docs/payments/PAYTR-BASVURU-REHBERI.md — آدرس Bildirim URL: /api/payments/paytr/callback', en: 'Onboarding guide: docs/payments/PAYTR-BASVURU-REHBERI.md — Notification URL: /api/payments/paytr/callback', ru: 'Инструкция: docs/payments/PAYTR-BASVURU-REHBERI.md — URL уведомлений: /api/payments/paytr/callback', tr: 'Başvuru rehberi: docs/payments/PAYTR-BASVURU-REHBERI.md — Bildirim URL: /api/payments/paytr/callback' })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-gray-300" data-payments-table>
            <thead><tr className="text-gray-500 text-start">
              <th className="py-2 text-start">OID</th><th className="text-start">{L(language, { fa: 'نوع', en: 'Kind', ru: 'Тип', tr: 'Tür' })}</th><th className="text-start">{L(language, { fa: 'کاربر', en: 'User', ru: 'Пользователь', tr: 'Kullanıcı' })}</th><th className="text-start">TL</th><th className="text-start">{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th><th className="text-start">{L(language, { fa: 'زمان', en: 'Time', ru: 'Время', tr: 'Zaman' })}</th><th></th>
            </tr></thead>
            <tbody>
              {payments === null && <tr><td colSpan={7} className="py-3 text-gray-500">…</td></tr>}
              {payments && payments.length === 0 && <tr><td colSpan={7} className="py-3 text-gray-500">{L(language, { fa: 'هنوز پرداختی ثبت نشده است.', en: 'No payments yet.', ru: 'Платежей пока нет.', tr: 'Henüz ödeme yok.' })}</td></tr>}
              {payments?.map(p => (
                <tr key={p.merchantOid} className="border-t border-white/5">
                  <td className="py-2 font-mono" dir="ltr">{p.merchantOid}</td>
                  <td>{p.kind}</td>
                  <td>{p.username || p.email || '—'}</td>
                  <td dir="ltr">{p.amount}</td>
                  <td className={statusColor[p.status] || ''} title={p.failedMsg || p.failedCode || ''}>{p.status}</td>
                  <td dir="ltr" className="text-gray-500">{(p.updatedAt || p.createdAt || '').replace('T', ' ').slice(0, 16)}</td>
                  <td>{(p.status === 'success' || p.status === 'paid_unfulfilled') && <button type="button" onClick={() => refund(p.merchantOid)} className="px-2 py-1 rounded border border-red-500/30 text-red-300 font-bold">{L(language, { fa: 'بازپرداخت', en: 'Refund', ru: 'Возврат', tr: 'İade' })}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={loadPayments} className="px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-gray-300">{L(language, { fa: 'به‌روزرسانی', en: 'Refresh', ru: 'Обновить', tr: 'Yenile' })}</button>
      </div>
    </div>
  );
}
