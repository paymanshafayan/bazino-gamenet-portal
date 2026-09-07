/** داشبورد همکار در پروفایل — /profile/affiliate */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L, localeOf } from '../../utils/i18n';
import { LEGAL_PALETTE } from '../../legal/LegalShell';

export default function ProfileAffiliate() {
  const { language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch('/api/me/affiliate').then(async r => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.code || d.error || 'NOT_AFFILIATE'); setData(null); return; }
      setErr(''); setData(d);
    }).catch(() => setErr('NETWORK'));
  }, []);

  if (err) {
    return (
      <div data-profile-affiliate className="text-sm" style={{ color: LEGAL_PALETTE.muted }}>
        {err === 'NOT_AFFILIATE'
          ? L(language, { fa: 'حساب شما همکار فروش نیست. اگر دعوت‌نامه دارید با پذیرش تماس بگیرید.', en: 'Your account is not an affiliate. Contact reception if you have an invite.', ru: 'Ваш аккаунт не является партнёрским.', tr: 'Hesabınız satış ortağı değil.' })
          : err}
      </div>
    );
  }
  if (!data) return <div data-profile-affiliate className="text-xs" style={{ color: LEGAL_PALETTE.muted }}>…</div>;

  const copy = () => {
    if(!data.link)return;
    const url = `${window.location.origin}${data.link}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  };
  const money = (n: number) => `${Number(n || 0).toLocaleString(localeOf(language))} TL`;

  return (
    <div data-profile-affiliate className="space-y-4 text-sm" style={{ color: LEGAL_PALETTE.text }}>
      <div>
        <div className="text-xs" style={{ color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'کد معرفی شما', en: 'Your referral code', ru: 'Ваш код', tr: 'Referans kodunuz' })}</div>
        <div className="font-black text-lg" dir="ltr">{data.code}</div>
        {data.link ? <button type="button" onClick={copy} className="mt-1 text-xs underline" dir="ltr">{data.link}</button> : <p className="mt-2 text-xs" data-partner-code-only>{L(language,{fa:'در این کمپین فقط کد خود را برای دوست بفرستید؛ لینک خصوصی پس از تکمیل گیت مستقیماً برای دوست ارسال می‌شود.',en:'Share your code only. The private link is sent directly to your friend after the gate.',tr:'Yalnızca kodunuzu paylaşın. Özel bağlantı koşullardan sonra arkadaşınıza gönderilir.',ru:'Делитесь только кодом. Личная ссылка отправляется другу после выполнения условий.'})}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {([
          ['clicks', { fa: 'کلیک', en: 'Clicks', ru: 'Клики', tr: 'Tıklama' }],
          ['leads', { fa: 'سرنخ', en: 'Leads', ru: 'Лиды', tr: 'Aday' }],
          ['paid', { fa: 'پرداخت', en: 'Paid', ru: 'Оплачено', tr: 'Ödenen' }],
          ['attended', { fa: 'حضور', en: 'Attended', ru: 'Присутствие', tr: 'Katılım' }],
        ] as const).map(([k, lab]) => (
          <div key={k} className="rounded-xl p-3" style={{ background: LEGAL_PALETTE.card, border: `1px solid ${LEGAL_PALETTE.border}` }}>
            <div style={{ color: LEGAL_PALETTE.muted }}>{L(language, lab)}</div>
            <div className="font-black" dir="ltr">{data.stats?.[k] ?? 0}</div>
          </div>
        ))}
      </div>
      {data.rates && <div className="text-xs">
        {L(language, { fa: 'نرخ‌ها', en: 'Rates', ru: 'Ставки', tr: 'Oranlar' })}:
        {' '}new {data.rates?.newPct}% · return {data.rates?.returnPct}% · tournament {data.rates?.tournamentPct}%
      </div>}
      {data.type==='instagram'&&<div className="text-xs">{L(language,{fa:'اعتبار واریزشده به کیف پول (نه تحویل نقد)',en:'Credited to wallet (not cash handed over)',tr:'Cüzdan kredisi (nakit teslim değil)',ru:'Зачислено в кошелёк (не выдача наличных)'})}: {money(data.stats?.walletCredited)}</div>}
      <div className="text-xs">{L(language, { fa: 'کمیسیون پرداخت‌شده', en: 'Paid out', ru: 'Выплачено', tr: 'Ödenen komisyon' })}: <b dir="ltr">{money(data.stats?.paidOut)}</b> · {L(language, { fa: 'در انتظار', en: 'pending', ru: 'ожидает', tr: 'beklemede' })} <b dir="ltr">{money(data.stats?.pending)}</b></div>
      {data.children?.length > 0 && (
        <div>
          <div className="font-bold mb-1">{L(language, { fa: 'زیرمجموعه‌ها (بدون اطلاعات شخصی مشتریان)', en: 'Downline (no customer PII)', ru: 'Нижестоящие', tr: 'Alt hat' })}</div>
          {data.children.map((c: any) => <div key={c.code} dir="ltr" className="text-xs">{c.code} · {c.name} · {money(c.stats?.paidOut)}</div>)}
        </div>
      )}
      <p className="text-[11px]" style={{ color: LEGAL_PALETTE.muted }}>
        {data.type==='instagram'?L(language,{fa:'تأیید کمیسیون پس از مهلت بازپرداخت است؛ واریز کیف پول با تسویهٔ ماهانهٔ مصوب و تحویل نقد فقط حضوری انجام می‌شود.',en:'Commissions are approved after the refund window. Wallet credit requires an approved monthly settlement; cash handover is in person.',tr:'Komisyon iade süresi sonunda onaylanır. Cüzdan kredisi onaylı aylık mutabakatla; nakit teslim yerinde yapılır.',ru:'Комиссии утверждаются после срока возврата. Кошелёк пополняется при месячном расчёте; наличные выдаются на месте.'}):L(language, { fa: 'نقد کردن موجودی کیف پول فقط حضوری در گیم‌نت ثبت می‌شود. کمیسیون پس از پایان مهلت لغو به کیف پول واریز می‌شود.', en: 'Wallet cash-out is recorded in person at the venue. Commission is credited after the cancellation window.', ru: 'Вывод — только на месте. Комиссия после окна отмены.', tr: 'Cüzdan nakde çevirme mekânda kaydedilir. Komisyon iptal penceresinden sonra yatırılır.' })}
      </p>
    </div>
  );
}
