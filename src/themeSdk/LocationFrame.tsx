/**
 * فریم آماده‌ی «لوکیشن واقعی کلاب» برای قالب‌ها.
 *
 * منبع داده فقط تنظیمات سایت (پنل ادمین → شخصی‌سازی) است؛ قالب هرگز مختصات/آدرس را هاردکد نمی‌کند:
 *   club_map_lat, club_map_lng, club_map_url, club_address, club_phone, club_hours, club_name
 *
 * استفاده در theme.js:
 *   var SDK = window.BazinoThemeSDK, R = SDK.React;
 *   SDK.registerComponent('home.location', { apiVersion: 2, render: function (p) {
 *     return R.createElement(SDK.LocationFrame, { settings: p.settings, language: p.language, dir: p.dir, variant: 'card' });
 *   }});
 *
 * یا فقط داده‌ی نرمال‌شده:  var loc = SDK.locationFrom(p.settings);  // {lat,lng,mapUrl,embedUrl,directionsUrl,address,phone,hours,name}
 */
import React from 'react';

export interface ClubLocation {
  lat: number;
  lng: number;
  /** لینک کوتاه/کامل Google Maps از تنظیمات (اگر خالی باشد از lat/lng ساخته می‌شود) */
  mapUrl: string;
  /** آدرس iframe نقشه (OpenStreetMap embed، بدون کلید API) */
  embedUrl: string;
  /** لینک مسیریابی Google Maps */
  directionsUrl: string;
  address: string;
  phone: string;
  hours: string;
  name: string;
}

const DEFAULT_LAT = 35.2628;
const DEFAULT_LNG = 33.9084;

export function locationFrom(settings: Record<string, string> | undefined | null): ClubLocation {
  const s = settings || {};
  const lat = Number.parseFloat(s.club_map_lat || '') || DEFAULT_LAT;
  const lng = Number.parseFloat(s.club_map_lng || '') || DEFAULT_LNG;
  const d = 0.005;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - d).toFixed(4)}%2C${(lat - 0.004).toFixed(4)}%2C${(lng + d).toFixed(4)}%2C${(lat + 0.004).toFixed(4)}&layer=mapnik&marker=${lat}%2C${lng}`;
  return {
    lat, lng,
    mapUrl: s.club_map_url || `https://www.google.com/maps?q=${lat},${lng}`,
    embedUrl,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    address: s.club_address || '',
    phone: s.club_phone || s.company_landline || '',
    hours: s.club_hours || '',
    name: s.company_legal_name || s.club_name || 'Bazino',
  };
}

const LABELS: Record<string, Record<string, string>> = {
  address: { fa: 'نشانی', en: 'Address', ru: 'Адрес', tr: 'Adres' },
  phone: { fa: 'تلفن', en: 'Phone', ru: 'Телефон', tr: 'Telefon' },
  hours: { fa: 'ساعت کار', en: 'Hours', ru: 'Часы работы', tr: 'Çalışma Saatleri' },
  directions: { fa: 'مسیریابی', en: 'Get directions', ru: 'Маршрут', tr: 'Yol tarifi' },
  openMap: { fa: 'باز کردن در Google Maps', en: 'Open in Google Maps', ru: 'Открыть в Google Maps', tr: "Google Maps'te aç" },
  title: { fa: 'موقعیت کلاب', en: 'Find us', ru: 'Как нас найти', tr: 'Bizi bulun' },
};
const lbl = (k: string, lang: string) => LABELS[k][lang] || LABELS[k].en;

export interface LocationFrameProps {
  settings: Record<string, string>;
  language?: string;
  dir?: 'rtl' | 'ltr';
  /**
   * card  = نقشه + کارت اطلاعات (پیش‌فرض)
   * map   = فقط نقشه (قالب خودش اطلاعات را می‌چیند)
   * inline= یک خط: آدرس + تلفن + لینک نقشه (برای فوتر/هدر)
   */
  variant?: 'card' | 'map' | 'inline';
  /** ارتفاع نقشه (px) */
  mapHeight?: number;
  /** کلاس اضافی ریشه (برای استایل‌دهی قالب) */
  className?: string;
  /** عنوان دلخواه (پیش‌فرض ۴زبانه) */
  title?: string;
  /** پنهان‌کردن دکمه‌ها */
  hideActions?: boolean;
}

/** فریم لوکیشن — بدون توکن قالب؛ همه‌چیز با کلاس‌های `bz-loc-*` قابل استایل‌دهی از theme.css است. */
export function LocationFrame({ settings, language = 'en', dir, variant = 'card', mapHeight = 320, className = '', title, hideActions }: LocationFrameProps) {
  const loc = locationFrom(settings);
  const direction = dir || (language === 'fa' ? 'rtl' : 'ltr');

  const map = (
    <div className="bz-loc-map" style={{ position: 'relative', width: '100%', height: mapHeight, borderRadius: 16, overflow: 'hidden', background: '#0f172a' }}>
      <iframe title="map" src={loc.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, width: '100%', height: '100%', filter: 'grayscale(0.2) contrast(1.05)' }} />
      {!hideActions && (
        <a className="bz-loc-open" href={loc.mapUrl} target="_blank" rel="noopener noreferrer"
          style={{ position: 'absolute', bottom: 10, insetInlineEnd: 10, background: 'rgba(15,23,42,0.9)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, textDecoration: 'none' }}>
          {lbl('openMap', language)} ↗
        </a>
      )}
    </div>
  );

  if (variant === 'map') return <div className={`bz-loc bz-loc-map-only ${className}`} dir={direction}>{map}</div>;

  if (variant === 'inline') {
    return (
      <div className={`bz-loc bz-loc-inline ${className}`} dir={direction} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', alignItems: 'center', fontSize: 13 }}>
        {loc.address && <span className="bz-loc-address">📍 {loc.address}</span>}
        {loc.phone && <a className="bz-loc-phone" href={`tel:${loc.phone.replace(/\s+/g, '')}`} dir="ltr" style={{ color: 'inherit' }}>☎ {loc.phone}</a>}
        <a className="bz-loc-open" href={loc.directionsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>{lbl('directions', language)} ↗</a>
      </div>
    );
  }

  return (
    <section className={`bz-loc bz-loc-card ${className}`} dir={direction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'stretch' }}>
      <div className="bz-loc-info" style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
        <h3 className="bz-loc-title" style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{title || lbl('title', language)}</h3>
        <div className="bz-loc-name" style={{ fontWeight: 700, opacity: 0.9 }}>{loc.name}</div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', fontSize: 14 }}>
          {loc.address && <><dt className="bz-loc-label" style={{ opacity: 0.6 }}>{lbl('address', language)}</dt><dd className="bz-loc-address" style={{ margin: 0 }}>{loc.address}</dd></>}
          {loc.phone && <><dt className="bz-loc-label" style={{ opacity: 0.6 }}>{lbl('phone', language)}</dt><dd style={{ margin: 0 }}><a className="bz-loc-phone" href={`tel:${loc.phone.replace(/\s+/g, '')}`} dir="ltr" style={{ color: 'inherit' }}>{loc.phone}</a></dd></>}
          {loc.hours && <><dt className="bz-loc-label" style={{ opacity: 0.6 }}>{lbl('hours', language)}</dt><dd className="bz-loc-hours" style={{ margin: 0 }}>{loc.hours}</dd></>}
        </dl>
        <div className="bz-loc-coords" dir="ltr" style={{ fontSize: 11, opacity: 0.55, fontFamily: 'monospace' }}>{loc.lat.toFixed(4)}° N, {loc.lng.toFixed(4)}° E</div>
        {!hideActions && (
          <div className="bz-loc-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a className="bz-loc-btn bz-loc-btn-primary" href={loc.directionsUrl} target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--primary-color, #3b82f6)', color: '#000', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
              {lbl('directions', language)}
            </a>
            <a className="bz-loc-btn" href={loc.mapUrl} target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid currentColor', color: 'inherit', fontWeight: 700, fontSize: 13, textDecoration: 'none', opacity: 0.85 }}>
              {lbl('openMap', language)}
            </a>
          </div>
        )}
      </div>
      {map}
    </section>
  );
}

export default LocationFrame;
