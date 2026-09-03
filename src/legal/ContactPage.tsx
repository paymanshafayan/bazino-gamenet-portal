import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { LegalShell, LEGAL_PALETTE } from './LegalShell';
import { useCompanyInfo } from './useCompanyInfo';
import { PaymentBadgeRow } from './PaymentBadges';

function Row({ label, value, href, ltr }: { label: string; value?: string; href?: string; ltr?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '10px 0', borderBottom: `1px solid ${LEGAL_PALETTE.border}`, fontSize: 14 }}>
      <span style={{ color: LEGAL_PALETTE.muted, fontWeight: 700 }}>{label}</span>
      {href ? <a href={href} dir={ltr ? 'ltr' : undefined} style={{ wordBreak: 'break-word' }}>{value}</a> : <span dir={ltr ? 'ltr' : undefined} style={{ wordBreak: 'break-word' }}>{value}</span>}
    </div>
  );
}

export function ContactPage({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const { info, settings } = useCompanyInfo();
  const s = settings || {};
  const mapUrl = s.club_map_url || (s.club_map_lat && s.club_map_lng ? `https://www.google.com/maps?q=${s.club_map_lat},${s.club_map_lng}` : '');
  return (
    <LegalShell title={L(language, { fa: 'تماس با ما و مشخصات قانونی', en: 'Contact & Legal Details', ru: 'Контакты и реквизиты', tr: 'İletişim ve Yasal Bilgiler' })}
      subtitle={L(language, { fa: 'اطلاعات رسمی فروشنده طبق الزامات فروش از راه دور', en: 'Official seller information as required for distance sales', ru: 'Официальные сведения о продавце', tr: 'Mesafeli satış mevzuatı gereği satıcı bilgileri' })}
      onBack={onBack}>
      <div className="bz-legal-card" style={{ padding: '10px 24px 4px' }} data-contact-card>
        <Row label={L(language, { fa: 'نام قانونی', en: 'Legal name', ru: 'Юр. название', tr: 'Ticari Unvan' })} value={info.company} />
        <Row label={L(language, { fa: 'نشانی', en: 'Address', ru: 'Адрес', tr: 'Adres' })} value={info.address} />
        <Row label={L(language, { fa: 'کشور', en: 'Country', ru: 'Страна', tr: 'Ülke' })} value={s.company_country || 'KKTC'} />
        <Row label={L(language, { fa: 'تلفن ثابت', en: 'Landline', ru: 'Телефон', tr: 'Sabit Telefon' })} value={s.company_landline} href={s.company_landline ? `tel:${s.company_landline.replace(/\s+/g, '')}` : undefined} ltr />
        <Row label={L(language, { fa: 'موبایل / واتساپ', en: 'Mobile / WhatsApp', ru: 'Мобильный / WhatsApp', tr: 'Cep / WhatsApp' })} value={s.club_phone} href={s.club_phone ? `tel:${s.club_phone.replace(/\s+/g, '')}` : undefined} ltr />
        <Row label={L(language, { fa: 'ایمیل', en: 'E-mail', ru: 'E-mail', tr: 'E-posta' })} value={info.email} href={info.email ? `mailto:${info.email}` : undefined} ltr />
        <Row label={L(language, { fa: 'شمارهٔ مالیاتی', en: 'Tax number', ru: 'Налоговый №', tr: 'Vergi No' })} value={info.taxNo} ltr />
        <Row label={L(language, { fa: 'شمارهٔ ثبت', en: 'Registration no', ru: 'Рег. №', tr: 'Sicil No' })} value={s.company_registration_no} ltr />
        <Row label={L(language, { fa: 'ساعت کار', en: 'Opening hours', ru: 'Часы работы', tr: 'Çalışma Saatleri' })} value={s.club_hours} />
        {mapUrl && <Row label={L(language, { fa: 'نقشه', en: 'Map', ru: 'Карта', tr: 'Harita' })} value={L(language, { fa: 'مسیریابی در Google Maps', en: 'Open in Google Maps', ru: 'Открыть в Google Maps', tr: "Google Maps'te aç" })} href={mapUrl} />}
      </div>

      <div className="bz-legal-card" style={{ padding: 20, marginTop: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{L(language, { fa: 'پرداخت امن', en: 'Secure payment', ru: 'Безопасная оплата', tr: 'Güvenli Ödeme' })}</div>
        <PaymentBadgeRow height={26} />
        <p style={{ fontSize: 13, color: LEGAL_PALETTE.muted, margin: '10px 0 0' }}>
          {L(language, { fa: 'برای پشتیبانی پرداخت، شمارهٔ سفارش (merchant_oid) را همراه پیام بفرستید.', en: 'For payment support please include your order number (merchant_oid).', ru: 'Для поддержки по оплате укажите номер заказа (merchant_oid).', tr: 'Ödeme desteği için sipariş numaranızı (merchant_oid) belirtin.' })}
        </p>
      </div>
    </LegalShell>
  );
}
