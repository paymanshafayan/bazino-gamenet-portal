/**
 * نوار قانونی ثابت پایین همهٔ صفحات عمومی — خارج از ThemeRegion و بدون توکن قالب.
 * لینک‌های متن‌های قانونی، تماس، نشان‌های کارت/امنیت و مشخصات شرکت.
 */
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { LEGAL_SLUGS, LEGAL_TITLES, type Lang4 } from './legalContent';
import { ensureLegalStyles, LEGAL_PALETTE } from './LegalShell';
import { PaymentBadgeRow } from './PaymentBadges';
import { useCompanyInfo } from './useCompanyInfo';

export function legalPath(slug: string) { return `/legal/${slug}`; }

export function LegalFooter({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { language, dir } = useLanguage();
  const lang = (['fa', 'en', 'ru', 'tr'].includes(language) ? language : 'en') as Lang4;
  const { info, settings } = useCompanyInfo();
  ensureLegalStyles();
  const go = (path: string) => (e: React.MouseEvent) => { e.preventDefault(); onNavigate(path); };
  const year = new Date().getFullYear();
  return (
    <footer className="bz-legal" dir={dir} data-bz-legal-footer style={{ borderTop: `1px solid ${LEGAL_PALETTE.border}`, background: '#0a0e15', padding: '22px 20px 90px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{L(language, { fa: 'متن‌های قانونی', en: 'Legal', ru: 'Правовая информация', tr: 'Yasal Metinler' })}</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {LEGAL_SLUGS.map(slug => (
              <li key={slug}><a href={legalPath(slug)} onClick={go(legalPath(slug))} style={{ fontSize: 12, color: LEGAL_PALETTE.muted }}>{LEGAL_TITLES[slug][lang]}</a></li>
            ))}
            <li><a href="/contact" onClick={go('/contact')} style={{ fontSize: 12, color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'تماس با ما', en: 'Contact', ru: 'Контакты', tr: 'İletişim' })}</a></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{L(language, { fa: 'مشخصات شرکت', en: 'Company', ru: 'Компания', tr: 'Şirket Bilgileri' })}</div>
          <div style={{ fontSize: 12, color: LEGAL_PALETTE.muted, display: 'grid', gap: 3 }}>
            <span style={{ color: LEGAL_PALETTE.text, fontWeight: 700 }}>{info.company}</span>
            {info.address && <span>{info.address}</span>}
            {(settings?.company_landline || settings?.club_phone) && <span dir="ltr" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>{settings?.company_landline || settings?.club_phone}</span>}
            {info.email && <a href={`mailto:${info.email}`} style={{ color: LEGAL_PALETTE.muted }}>{info.email}</a>}
            {info.taxNo && <span>{L(language, { fa: 'شمارهٔ مالیاتی', en: 'Tax No', ru: 'Налоговый №', tr: 'Vergi No' })}: {info.taxNo}</span>}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{L(language, { fa: 'پرداخت امن', en: 'Secure payment', ru: 'Безопасная оплата', tr: 'Güvenli Ödeme' })}</div>
          <PaymentBadgeRow height={26} />
          <p style={{ fontSize: 11, color: LEGAL_PALETTE.muted, margin: '10px 0 0' }}>
            {L(language, { fa: 'پرداخت‌ها با 3D Secure از طریق زیرساخت PayTR انجام می‌شود؛ اطلاعات کارت شما نزد ما ذخیره نمی‌شود.', en: 'Payments are processed with 3D Secure via PayTR; your card details are never stored by us.', ru: 'Платежи проходят с 3D Secure через PayTR; данные карты у нас не хранятся.', tr: 'Ödemeler PayTR altyapısı üzerinden 3D Secure ile alınır; kart bilgileriniz tarafımızca saklanmaz.' })}
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 1180, margin: '18px auto 0', paddingTop: 12, borderTop: `1px solid ${LEGAL_PALETTE.border}`, fontSize: 11, color: LEGAL_PALETTE.muted, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <span>© {year} {info.company}. {L(language, { fa: 'همهٔ حقوق محفوظ است.', en: 'All rights reserved.', ru: 'Все права защищены.', tr: 'Tüm hakları saklıdır.' })}</span>
        <span>{L(language, { fa: 'قیمت‌ها به لیر ترکیه (TL) و شامل KDV هستند.', en: 'Prices are in Turkish Lira (TL) incl. VAT.', ru: 'Цены в турецких лирах (TL) с НДС.', tr: 'Fiyatlar TL cinsindendir, KDV dâhildir.' })}</span>
      </div>
    </footer>
  );
}
