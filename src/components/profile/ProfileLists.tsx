import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { LEGAL_PALETTE } from '../../legal/LegalShell';

function useFetch<T>(url: string, pick: (d: any) => T, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || r.statusText); return d; })
      .then(d => { if (!cancelled) setData(pick(d)); })
      .catch(e => { if (!cancelled) setError(String(e.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);
  return { data, loading, error };
}

const Card: React.FC<{ title: string; children: React.ReactNode; extra?: React.ReactNode }> = ({ title, children, extra }) => (
  <div className="bz-legal-card" style={{ padding: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{title}</h2>{extra}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="bz-empty">{text}</div>;
const Loading = () => <div className="bz-empty">…</div>;
const localName = (o: any, lang: string) => o?.[`name${lang[0].toUpperCase()}${lang.slice(1)}`] || o?.name || '';

export function ProfilePoints() {
  const { language } = useLanguage();
  const { data, loading } = useFetch('/api/me/points', d => d, { loyaltyPoints: 0, transactions: [] as any[] });
  return (
    <Card title={L(language, { fa: 'امتیازهای باشگاه', en: 'Loyalty points', ru: 'Баллы лояльности', tr: 'Sadakat puanları' })}
      extra={<span style={{ fontWeight: 900, color: LEGAL_PALETTE.warn, fontSize: 20 }} data-points-total>{Number(data.loyaltyPoints || 0).toLocaleString()}</span>}>
      {loading ? <Loading /> : data.transactions.length === 0 ? <Empty text={L(language, { fa: 'هنوز تراکنشی ثبت نشده.', en: 'No transactions yet.', ru: 'Операций пока нет.', tr: 'Henüz işlem yok.' })} /> : (
        <table><thead><tr><th>{L(language, { fa: 'شرح', en: 'Description', ru: 'Описание', tr: 'Açıklama' })}</th><th>{L(language, { fa: 'نوع', en: 'Type', ru: 'Тип', tr: 'Tür' })}</th><th>{L(language, { fa: 'امتیاز', en: 'Points', ru: 'Баллы', tr: 'Puan' })}</th><th>{L(language, { fa: 'تاریخ', en: 'Date', ru: 'Дата', tr: 'Tarih' })}</th></tr></thead>
          <tbody>{data.transactions.map((t: any) => (
            <tr key={t.id}><td>{t.description}</td><td>{t.type}</td><td style={{ color: t.type === 'Redeemed' ? LEGAL_PALETTE.danger : LEGAL_PALETTE.success, fontWeight: 800 }} dir="ltr">{t.type === 'Redeemed' ? '-' : '+'}{Math.abs(t.points)}</td><td>{t.date}</td></tr>
          ))}</tbody></table>
      )}
    </Card>
  );
}

export function ProfileReservations() {
  const { language } = useLanguage();
  const { data, loading } = useFetch('/api/me/reservations', d => d.reservations as any[], []);
  return (
    <Card title={L(language, { fa: 'رزروهای من', en: 'My reservations', ru: 'Мои брони', tr: 'Rezervasyonlarım' })}>
      {loading ? <Loading /> : data.length === 0 ? <Empty text={L(language, { fa: 'رزروی ثبت نشده است.', en: 'No reservations.', ru: 'Броней нет.', tr: 'Rezervasyon yok.' })} /> : (
        <table><thead><tr><th>{L(language, { fa: 'سیستم', en: 'System', ru: 'Система', tr: 'Sistem' })}</th><th>{L(language, { fa: 'زمان', en: 'Time', ru: 'Время', tr: 'Saat' })}</th><th>{L(language, { fa: 'تاریخ', en: 'Date', ru: 'Дата', tr: 'Tarih' })}</th><th>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th></tr></thead>
          <tbody>{data.map((r: any) => (
            <tr key={r.id}><td>{r.systemName}</td><td dir="ltr">{r.startTime}–{r.endTime}</td><td>{r.date}</td><td dir="ltr">{Number(r.totalPrice).toLocaleString()} TL</td>
              <td><span className="bz-pill" style={{ background: r.checkedIn ? 'rgba(34,197,94,.15)' : 'rgba(59,130,246,.15)', color: r.checkedIn ? '#86efac' : '#93c5fd' }}>{r.checkedIn ? L(language, { fa: 'حضور ثبت شد', en: 'Checked in', ru: 'Отмечен', tr: 'Giriş yapıldı' }) : L(language, { fa: 'فعال', en: 'Active', ru: 'Активна', tr: 'Aktif' })}</span></td></tr>
          ))}</tbody></table>
      )}
    </Card>
  );
}

export function ProfileOrders() {
  const { language } = useLanguage();
  const { data, loading } = useFetch('/api/me/orders', d => ({ cafe: d.cafe as any[], shop: d.shop as any[] }), { cafe: [], shop: [] });
  const rows = [...data.cafe.map(o => ({ ...o, lines: (o.items || []).map((i: any) => `${localName(i.item || i, language) || i.name || ''} ×${i.quantity || 1}`) })),
    ...data.shop.map(o => ({ ...o, lines: (o.cart || []).map((i: any) => `${localName(i.item || i, language) || i.name || ''} ×${i.quantity || 1}`) }))];
  return (
    <Card title={L(language, { fa: 'سفارش‌های من', en: 'My orders', ru: 'Мои заказы', tr: 'Siparişlerim' })}>
      {loading ? <Loading /> : rows.length === 0 ? <Empty text={L(language, { fa: 'سفارشی ثبت نشده است. سفارش‌های قبل از ورود به حساب، به پروفایل وصل نمی‌شوند.', en: 'No orders yet. Orders placed before signing in are not linked to your profile.', ru: 'Заказов пока нет. Заказы, сделанные без входа, не привязаны к профилю.', tr: 'Henüz sipariş yok. Giriş yapmadan verilen siparişler profile bağlanmaz.' })} /> : (
        <table><thead><tr><th>#</th><th>{L(language, { fa: 'نوع', en: 'Type', ru: 'Тип', tr: 'Tür' })}</th><th>{L(language, { fa: 'اقلام', en: 'Items', ru: 'Позиции', tr: 'Ürünler' })}</th><th>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</th><th>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th></tr></thead>
          <tbody>{rows.map((o: any) => (
            <tr key={o.id}><td dir="ltr">{o.id}</td><td>{o.kind === 'cafe' ? L(language, { fa: 'کافه', en: 'Cafe', ru: 'Кафе', tr: 'Kafe' }) : L(language, { fa: 'فروشگاه', en: 'Shop', ru: 'Магазин', tr: 'Mağaza' })}</td><td style={{ fontSize: 13 }}>{o.lines.join('، ')}</td><td dir="ltr">{Number(o.finalAmount).toLocaleString()} TL</td><td>{o.status}</td></tr>
          ))}</tbody></table>
      )}
    </Card>
  );
}

export function ProfileTournaments() {
  const { language } = useLanguage();
  const { data, loading } = useFetch('/api/me/tournaments', d => d.tournaments as any[], []);
  const title = (t: any) => t[`title${language[0].toUpperCase()}${language.slice(1)}`] || t.title;
  return (
    <Card title={L(language, { fa: 'تورنمنت‌های من', en: 'My tournaments', ru: 'Мои турниры', tr: 'Turnuvalarım' })}>
      {loading ? <Loading /> : data.length === 0 ? <Empty text={L(language, { fa: 'در تورنمنتی ثبت‌نام نکرده‌اید.', en: 'You have not registered for any tournament.', ru: 'Вы не зарегистрированы ни в одном турнире.', tr: 'Hiçbir turnuvaya kayıtlı değilsiniz.' })} /> : (
        <table><thead><tr><th>{L(language, { fa: 'عنوان', en: 'Title', ru: 'Название', tr: 'Başlık' })}</th><th>{L(language, { fa: 'بازی', en: 'Game', ru: 'Игра', tr: 'Oyun' })}</th><th>{L(language, { fa: 'شروع', en: 'Start', ru: 'Начало', tr: 'Başlangıç' })}</th><th>{L(language, { fa: 'وضعیت', en: 'Status', ru: 'Статус', tr: 'Durum' })}</th></tr></thead>
          <tbody>{data.map((t: any) => <tr key={t.id}><td>{title(t)}</td><td>{t.game}</td><td dir="ltr">{t.startDate}</td><td>{t.status}</td></tr>)}</tbody></table>
      )}
    </Card>
  );
}
