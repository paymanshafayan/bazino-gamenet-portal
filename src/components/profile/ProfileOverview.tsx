import React, { useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { L } from '../../utils/i18n';
import { LEGAL_PALETTE } from '../../legal/LegalShell';
import type { UserState } from '../../types/gamenet';
import InitialAvatar from '../InitialAvatar';
import type { ProfilePageProps } from './ProfilePage';

export function ProfileOverview({ user, onUserChange, addNotification, onLogout }: ProfilePageProps & { user: UserState }) {
  const { language } = useLanguage();
  const [form, setForm] = useState({ displayName: user.displayName || '', gamerTag: user.gamerTag || '', email: user.email || '', city: user.city || '', birthDate: user.birthDate || '', bio: user.bio || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/me/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      onUserChange(d.user);
      setMsg({ kind: 'ok', text: L(language, { fa: 'پروفایل ذخیره شد.', en: 'Profile saved.', ru: 'Профиль сохранён.', tr: 'Profil kaydedildi.' }) });
    } catch (err: any) { setMsg({ kind: 'err', text: err.message }); }
    finally { setSaving(false); }
  };

  const upload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMsg({ kind: 'err', text: L(language, { fa: 'حجم تصویر باید کمتر از ۵ مگابایت باشد.', en: 'Image must be under 5 MB.', ru: 'Размер изображения — до 5 МБ.', tr: 'Görsel 5 MB’den küçük olmalı.' }) }); return; }
    setUploading(true); setMsg(null);
    try {
      const r = await fetch('/api/me/avatar', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      onUserChange({ ...user, avatarUrl: d.avatarUrl });
      addNotification(L(language, { fa: 'آواتار به‌روز شد.', en: 'Avatar updated.', ru: 'Аватар обновлён.', tr: 'Avatar güncellendi.' }), 'success');
    } catch (err: any) { setMsg({ kind: 'err', text: err.message }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const removeAvatar = async () => {
    await fetch('/api/me/avatar', { method: 'DELETE' });
    onUserChange({ ...user, avatarUrl: '' });
  };

  return (
    <div className="bz-legal-card" style={{ padding: 22 }} data-profile-overview>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" width={84} height={84} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${LEGAL_PALETTE.accent}` }} data-avatar-img />
          : <InitialAvatar name={user.displayName || user.username} size={84} />}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{user.displayName || user.username}</div>
          <div style={{ color: LEGAL_PALETTE.muted, fontSize: 13 }} dir="ltr">@{user.username}{user.phone ? ` · ${user.phone}` : ''}</div>
          <div style={{ color: LEGAL_PALETTE.warn, fontWeight: 800, fontSize: 14, marginTop: 4 }}>{user.loyaltyPoints.toLocaleString()} {L(language, { fa: 'امتیاز', en: 'points', ru: 'баллов', tr: 'puan' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} data-avatar-input />
          <button type="button" className="bz-legal-btn bz-legal-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ fontSize: 13 }}>
            {uploading ? '…' : L(language, { fa: 'تغییر آواتار', en: 'Change avatar', ru: 'Сменить аватар', tr: 'Avatarı değiştir' })}
          </button>
          {user.avatarUrl && <button type="button" className="bz-legal-btn bz-legal-btn-ghost" onClick={removeAvatar} style={{ fontSize: 13 }}>{L(language, { fa: 'حذف', en: 'Remove', ru: 'Удалить', tr: 'Kaldır' })}</button>}
        </div>
      </div>
      <p style={{ color: LEGAL_PALETTE.muted, fontSize: 12, marginTop: -10, marginBottom: 18 }}>{L(language, { fa: 'تصویر به‌صورت خودکار به WebP ۲۵۶×۲۵۶ تبدیل می‌شود (JPG/PNG/WebP، حداکثر ۵ مگابایت).', en: 'Images are converted to 256×256 WebP automatically (JPG/PNG/WebP, max 5 MB).', ru: 'Изображение автоматически конвертируется в WebP 256×256 (JPG/PNG/WebP, до 5 МБ).', tr: 'Görsel otomatik olarak 256×256 WebP’ye dönüştürülür (JPG/PNG/WebP, en fazla 5 MB).' })}</p>

      {msg && <div className={`bz-alert ${msg.kind === 'ok' ? 'bz-alert-ok' : 'bz-alert-err'}`} role="status">{msg.text}</div>}

      <form onSubmit={save} data-profile-form>
        <div className="bz-grid2">
          <div className="bz-field"><label htmlFor="pf-displayName">{L(language, { fa: 'نام نمایشی', en: 'Display name', ru: 'Отображаемое имя', tr: 'Görünen ad' })}</label><input id="pf-displayName" value={form.displayName} onChange={set('displayName')} maxLength={60} /></div>
          <div className="bz-field"><label htmlFor="pf-gamerTag">{L(language, { fa: 'گیمرتگ', en: 'Gamertag', ru: 'Геймертег', tr: 'Oyuncu etiketi' })}</label><input id="pf-gamerTag" value={form.gamerTag} onChange={set('gamerTag')} maxLength={40} dir="ltr" /></div>
          <div className="bz-field"><label htmlFor="pf-email">{L(language, { fa: 'ایمیل', en: 'E-mail', ru: 'E-mail', tr: 'E-posta' })}</label><input id="pf-email" type="email" value={form.email} onChange={set('email')} dir="ltr" /></div>
          <div className="bz-field"><label htmlFor="pf-city">{L(language, { fa: 'شهر', en: 'City', ru: 'Город', tr: 'Şehir' })}</label><input id="pf-city" value={form.city} onChange={set('city')} maxLength={60} /></div>
          <div className="bz-field"><label htmlFor="pf-birthDate">{L(language, { fa: 'تاریخ تولد', en: 'Birth date', ru: 'Дата рождения', tr: 'Doğum tarihi' })}</label><input id="pf-birthDate" type="date" value={form.birthDate} onChange={set('birthDate')} dir="ltr" /></div>
          <div className="bz-field"><label>{L(language, { fa: 'شماره موبایل', en: 'Mobile', ru: 'Телефон', tr: 'Cep telefonu' })}</label><input value={user.phone || '—'} readOnly dir="ltr" style={{ opacity: .7 }} /></div>
        </div>
        <div className="bz-field"><label htmlFor="pf-bio">{L(language, { fa: 'دربارهٔ من', en: 'About me', ru: 'О себе', tr: 'Hakkımda' })}</label><textarea id="pf-bio" rows={3} value={form.bio} onChange={set('bio')} maxLength={500} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button type="submit" className="bz-legal-btn bz-legal-btn-primary" disabled={saving} data-profile-save>{saving ? '…' : L(language, { fa: 'ذخیرهٔ تغییرات', en: 'Save changes', ru: 'Сохранить', tr: 'Değişiklikleri kaydet' })}</button>
          <button type="button" className="bz-legal-btn bz-legal-btn-ghost" onClick={onLogout} style={{ color: LEGAL_PALETTE.danger }}>{L(language, { fa: 'خروج از حساب', en: 'Sign out', ru: 'Выйти', tr: 'Çıkış yap' })}</button>
        </div>
      </form>
    </div>
  );
}
