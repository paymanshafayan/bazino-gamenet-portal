import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { LEGAL_PALETTE } from '../../legal/LegalShell';
import type { UserState } from '../../types/gamenet';
import type { ProfilePageProps } from './ProfilePage';

export function ProfileSecurity({ user, onUserChange, addNotification }: ProfilePageProps & { user: UserState }) {
  const { language } = useLanguage();
  const hasPassword = user.hasPassword !== false;
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 6) return setMsg({ kind: 'err', text: L(language, { fa: 'رمز عبور باید حداقل ۶ کاراکتر باشد.', en: 'Password must be at least 6 characters.', ru: 'Пароль — минимум 6 символов.', tr: 'Şifre en az 6 karakter olmalı.' }) });
    if (newPassword !== confirm) return setMsg({ kind: 'err', text: L(language, { fa: 'تکرار رمز عبور مطابقت ندارد.', en: 'Passwords do not match.', ru: 'Пароли не совпадают.', tr: 'Şifreler eşleşmiyor.' }) });
    setBusy(true);
    try {
      const r = await fetch('/api/me/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      onUserChange({ ...user, hasPassword: true });
      setOld(''); setNew(''); setConfirm('');
      const text = L(language, { fa: 'رمز دائمی ذخیره شد. از این پس می‌توانید با نام کاربری و رمز هم وارد شوید.', en: 'Permanent password saved. You can now also sign in with username and password.', ru: 'Постоянный пароль сохранён. Теперь можно входить по имени пользователя и паролю.', tr: 'Kalıcı şifre kaydedildi. Artık kullanıcı adı ve şifre ile de giriş yapabilirsiniz.' });
      setMsg({ kind: 'ok', text }); addNotification(text, 'success');
    } catch (err: any) { setMsg({ kind: 'err', text: err.message }); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }} data-profile-security>
      <div className="bz-legal-card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 900 }}>{L(language, { fa: 'شماره موبایل', en: 'Mobile number', ru: 'Номер телефона', tr: 'Cep telefonu' })}</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span dir="ltr" style={{ fontWeight: 800, fontSize: 16 }}>{user.phone || '—'}</span>
          {user.phoneVerified
            ? <span className="bz-pill" style={{ background: 'rgba(34,197,94,.15)', color: '#86efac' }} data-phone-verified>✓ {L(language, { fa: 'تأیید شده با پیامک', en: 'Verified via SMS', ru: 'Подтверждён по SMS', tr: 'SMS ile doğrulandı' })}</span>
            : <span className="bz-pill" style={{ background: 'rgba(245,158,11,.15)', color: '#fcd34d' }}>{L(language, { fa: 'تأیید نشده — یک‌بار با کد پیامکی وارد شوید', en: 'Not verified — sign in once with an SMS code', ru: 'Не подтверждён — войдите один раз по SMS-коду', tr: 'Doğrulanmadı — bir kez SMS koduyla giriş yapın' })}</span>}
        </div>
        <p style={{ color: LEGAL_PALETTE.muted, fontSize: 13, marginTop: 10 }}>{L(language, { fa: 'نام کاربری شما:', en: 'Your username:', ru: 'Ваше имя пользователя:', tr: 'Kullanıcı adınız:' })} <b dir="ltr">{user.username}</b></p>
      </div>

      <div className="bz-legal-card" style={{ padding: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 900 }}>{hasPassword ? L(language, { fa: 'تغییر رمز عبور', en: 'Change password', ru: 'Смена пароля', tr: 'Şifre değiştir' }) : L(language, { fa: 'تنظیم رمز دائمی (اختیاری)', en: 'Set a permanent password (optional)', ru: 'Задать постоянный пароль (необязательно)', tr: 'Kalıcı şifre belirle (isteğe bağlı)' })}</h2>
        <p style={{ color: LEGAL_PALETTE.muted, fontSize: 13, margin: '0 0 14px' }}>
          {hasPassword
            ? L(language, { fa: 'برای تغییر، رمز فعلی و رمز جدید را وارد کنید.', en: 'Enter your current and new password.', ru: 'Введите текущий и новый пароль.', tr: 'Mevcut ve yeni şifrenizi girin.' })
            : L(language, { fa: 'حساب شما فقط با کد پیامکی باز می‌شود. اگر بخواهید، یک رمز دائمی بسازید تا بدون پیامک هم بتوانید وارد شوید.', en: 'Your account currently opens only with SMS codes. Optionally set a permanent password to sign in without SMS.', ru: 'Сейчас вход только по SMS-коду. При желании задайте постоянный пароль для входа без SMS.', tr: 'Hesabınız şu anda yalnızca SMS koduyla açılıyor. İsterseniz SMS olmadan giriş için kalıcı bir şifre belirleyin.' })}
        </p>
        {msg && <div className={`bz-alert ${msg.kind === 'ok' ? 'bz-alert-ok' : 'bz-alert-err'}`} role="status">{msg.text}</div>}
        <form onSubmit={submit} data-password-form>
          {hasPassword && <div className="bz-field"><label htmlFor="pw-old">{L(language, { fa: 'رمز فعلی', en: 'Current password', ru: 'Текущий пароль', tr: 'Mevcut şifre' })}</label><input id="pw-old" type="password" autoComplete="current-password" value={oldPassword} onChange={e => setOld(e.target.value)} required /></div>}
          <div className="bz-grid2">
            <div className="bz-field"><label htmlFor="pw-new">{L(language, { fa: 'رمز جدید', en: 'New password', ru: 'Новый пароль', tr: 'Yeni şifre' })}</label><input id="pw-new" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNew(e.target.value)} minLength={6} required /></div>
            <div className="bz-field"><label htmlFor="pw-confirm">{L(language, { fa: 'تکرار رمز جدید', en: 'Confirm new password', ru: 'Повторите пароль', tr: 'Yeni şifre (tekrar)' })}</label><input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} required /></div>
          </div>
          <button type="submit" className="bz-legal-btn bz-legal-btn-primary" disabled={busy} data-password-save>{busy ? '…' : L(language, { fa: 'ذخیرهٔ رمز', en: 'Save password', ru: 'Сохранить пароль', tr: 'Şifreyi kaydet' })}</button>
        </form>
      </div>
    </div>
  );
}
