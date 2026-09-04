/**
 * صفحهٔ پروفایل کاربر — /profile[/tab]
 *
 * مثل صفحات قانونی/پرداخت، مستقل از قالب رندر می‌شود (پوستهٔ LegalShell) تا هیچ قالب ZIP
 * نتواند آن را تغییر دهد. تب‌ها: overview (ویرایش + آواتار)، points، reservations، orders،
 * tournaments، tickets (لیست/جزئیات/ایجاد)، security (شماره تأییدشده + رمز دائمی).
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { LegalShell, LEGAL_PALETTE } from '../../legal/LegalShell';
import { PROFILE_TABS, pathFromProfileTab, type ProfileTab } from '../../utils/routes';
import type { UserState } from '../../types/gamenet';
import { ProfileOverview } from './ProfileOverview';
import { ProfilePoints, ProfileReservations, ProfileOrders, ProfileTournaments } from './ProfileLists';
import ProfileWallet from './ProfileWallet';
import { ProfileTickets } from './ProfileTickets';
import { ProfileSecurity } from './ProfileSecurity';

export interface ProfilePageProps {
  user: UserState | null;
  tab: ProfileTab;
  ticketId?: string;
  onNavigate: (path: string) => void;
  onUserChange: (u: UserState) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const PROFILE_TAB_LABELS: Record<ProfileTab, { fa: string; en: string; ru: string; tr: string }> = {
  overview: { fa: 'حساب من', en: 'My account', ru: 'Мой аккаунт', tr: 'Hesabım' },
  wallet: { fa: 'کیف پول', en: 'Wallet', ru: 'Кошелёк', tr: 'Cüzdan' },
  points: { fa: 'امتیازها', en: 'Points', ru: 'Баллы', tr: 'Puanlar' },
  reservations: { fa: 'رزروها', en: 'Reservations', ru: 'Брони', tr: 'Rezervasyonlar' },
  orders: { fa: 'سفارش‌ها', en: 'Orders', ru: 'Заказы', tr: 'Siparişler' },
  tournaments: { fa: 'تورنمنت‌ها', en: 'Tournaments', ru: 'Турниры', tr: 'Turnuvalar' },
  tickets: { fa: 'پشتیبانی', en: 'Support', ru: 'Поддержка', tr: 'Destek' },
  security: { fa: 'امنیت', en: 'Security', ru: 'Безопасность', tr: 'Güvenlik' },
};

export const PROFILE_STYLE = `
.bz-profile-tabs { display:flex; gap:6px; flex-wrap:wrap; margin: 0 0 18px; }
.bz-profile-tabs a { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; font-size:13px; font-weight:700; color:${LEGAL_PALETTE.muted} !important; border:1px solid ${LEGAL_PALETTE.border}; background:${LEGAL_PALETTE.card}; text-decoration:none !important; }
.bz-profile-tabs a[aria-current="page"] { background:${LEGAL_PALETTE.accent}; color:#fff !important; border-color:${LEGAL_PALETTE.accent}; }
.bz-profile-tabs a .bz-badge { background:${LEGAL_PALETTE.danger}; color:#fff; border-radius:999px; font-size:11px; min-width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; padding:0 5px; }
.bz-profile input, .bz-profile textarea, .bz-profile select { width:100%; background:#0b0f17; border:1px solid ${LEGAL_PALETTE.border}; color:${LEGAL_PALETTE.text}; border-radius:10px; padding:10px 12px; font-size:14px; font-family:inherit; }
.bz-profile input:focus, .bz-profile textarea:focus { outline:none; border-color:${LEGAL_PALETTE.accent}; }
.bz-profile label { display:block; font-size:12px; font-weight:700; color:${LEGAL_PALETTE.muted}; margin:0 0 6px; }
.bz-profile .bz-field { margin-bottom:14px; }
.bz-profile .bz-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media (max-width:640px){ .bz-profile .bz-grid2 { grid-template-columns:1fr; } }
.bz-profile .bz-legal-card { overflow-x:auto; }
.bz-profile table { width:100%; border-collapse:collapse; font-size:14px; min-width:520px; }
.bz-profile a.bz-legal-btn-primary { color:#fff !important; }
.bz-profile a.bz-legal-btn-ghost { color:${LEGAL_PALETTE.text} !important; }
.bz-profile th, .bz-profile td { padding:10px 8px; border-bottom:1px solid ${LEGAL_PALETTE.border}; text-align:start; vertical-align:top; }
.bz-profile th { color:${LEGAL_PALETTE.muted}; font-size:12px; font-weight:700; }
.bz-profile .bz-empty { color:${LEGAL_PALETTE.muted}; padding:26px; text-align:center; font-size:14px; }
.bz-profile .bz-pill { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:700; }
.bz-profile .bz-msg { border-radius:12px; padding:12px 14px; margin-bottom:10px; max-width:88%; white-space:pre-wrap; font-size:14px; }
.bz-profile .bz-msg-user { background:#1a2333; margin-inline-start:auto; }
.bz-profile .bz-msg-staff { background:#14301f; border:1px solid #1f5a34; }
.bz-profile .bz-msg small { display:block; color:${LEGAL_PALETTE.muted}; font-size:11px; margin-top:6px; }
.bz-profile .bz-alert { border-radius:10px; padding:10px 12px; font-size:13px; margin-bottom:12px; }
.bz-profile .bz-alert-err { background:rgba(239,68,68,.12); color:#fca5a5; border:1px solid rgba(239,68,68,.35); }
.bz-profile .bz-alert-ok { background:rgba(34,197,94,.12); color:#86efac; border:1px solid rgba(34,197,94,.35); }
`;

let injected = false;
function ensureProfileStyles() {
  if (injected || typeof document === 'undefined') return;
  const tag = document.createElement('style'); tag.id = 'bz-profile-styles'; tag.textContent = PROFILE_STYLE; document.head.appendChild(tag); injected = true;
}

export function ticketStatusLabel(status: string, language: 'fa' | 'en' | 'ru' | 'tr') {
  const map: Record<string, { fa: string; en: string; ru: string; tr: string }> = {
    open: { fa: 'در حال بررسی', en: 'Under review', ru: 'На рассмотрении', tr: 'İnceleniyor' },
    answered: { fa: 'پاسخ داده شده', en: 'Answered', ru: 'Есть ответ', tr: 'Yanıtlandı' },
    customer_reply: { fa: 'در حال بررسی', en: 'Under review', ru: 'На рассмотрении', tr: 'İnceleniyor' },
    closed: { fa: 'بسته شده', en: 'Closed', ru: 'Закрыт', tr: 'Kapatıldı' },
  };
  return L(language, map[status] || { fa: status, en: status, ru: status, tr: status });
}
export function ticketStatusColor(status: string) {
  return status === 'answered' ? '#22c55e' : status === 'customer_reply' ? '#f59e0b' : status === 'closed' ? '#64748b' : LEGAL_PALETTE.accent;
}

export default function ProfilePage(props: ProfilePageProps) {
  const { user, tab, onNavigate, onOpenAuth } = props;
  const { language } = useLanguage();
  const [unread, setUnread] = useState(0);
  ensureProfileStyles();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/me/tickets').then(r => (r.ok ? r.json() : null)).then(d => { if (!cancelled && d) setUnread(d.unread || 0); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.username, tab]);

  const title = L(language, { fa: 'پروفایل کاربری', en: 'My profile', ru: 'Мой профиль', tr: 'Profilim' });

  if (!user) {
    return (
      <LegalShell title={title} onBack={() => onNavigate('home')}>
        <div className="bz-legal-card bz-profile" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>{L(language, { fa: 'برای مشاهدهٔ پروفایل ابتدا وارد شوید.', en: 'Sign in to view your profile.', ru: 'Войдите, чтобы открыть профиль.', tr: 'Profilinizi görmek için giriş yapın.' })}</p>
          <button type="button" className="bz-legal-btn bz-legal-btn-primary" onClick={onOpenAuth} data-profile-login>
            {L(language, { fa: 'ورود / عضویت', en: 'Sign in / Join', ru: 'Войти / регистрация', tr: 'Giriş / Üyelik' })}
          </button>
        </div>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={title} subtitle={user.displayName ? `${user.displayName} · @${user.username}` : `@${user.username}`} onBack={() => onNavigate('home')} maxWidth={960}>
      <div className="bz-profile" data-profile-page data-profile-tab={tab}>
        <nav className="bz-profile-tabs" aria-label="Profile sections">
          {PROFILE_TABS.map(t => (
            <a key={t} href={pathFromProfileTab(t)} aria-current={t === tab ? 'page' : undefined} onClick={e => { e.preventDefault(); onNavigate(pathFromProfileTab(t)); }} data-profile-tab-link={t}>
              {L(language, PROFILE_TAB_LABELS[t])}
              {t === 'tickets' && unread > 0 && <span className="bz-badge" data-unread-badge>{unread}</span>}
            </a>
          ))}
        </nav>
        {tab === 'overview' && <ProfileOverview {...props} user={user} />}
        {tab === 'wallet' && <ProfileWallet addNotification={props.addNotification} />}
        {tab === 'points' && <ProfilePoints />}
        {tab === 'reservations' && <ProfileReservations />}
        {tab === 'orders' && <ProfileOrders />}
        {tab === 'tournaments' && <ProfileTournaments />}
        {tab === 'tickets' && <ProfileTickets ticketId={props.ticketId} onNavigate={onNavigate} addNotification={props.addNotification} onUnreadChange={setUnread} />}
        {tab === 'security' && <ProfileSecurity {...props} user={user} />}
      </div>
    </LegalShell>
  );
}
