import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Lock, User, Phone, LogIn, Sparkles, AlertCircle, MessageSquareText, KeyRound, ArrowLeft, ArrowRight } from 'lucide-react';
import { UserState } from '../types/gamenet';
import { setAuthToken } from '../services/authToken';
import { useModalDismiss } from '../utils/useModalDismiss';
import { L } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserState) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * ورود با کد پیامکی (OTP) — روش اصلی — و ورود با نام کاربری/رمز (برای ادمین و کاربرانی که رمز دائمی گذاشته‌اند).
 * ثبت‌نام جداگانه وجود ندارد: اولین ورود موفق با OTP حساب را می‌سازد.
 * شمارش معکوس ارسال مجدد فقط نمایشی است؛ محدودیت واقعی سمت سرور (phone + IP) اعمال می‌شود.
 */
export default function AuthModal({ isOpen, onClose, onAuthSuccess, addNotification }: Props) {
  useModalDismiss(isOpen, onClose);
  const { language, dir } = useLanguage();
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown > 0]);

  useEffect(() => { if (step === 'code') setTimeout(() => codeRef.current?.focus(), 50); }, [step]);

  if (!isOpen) return null;

  const finish = (data: any, isNew: boolean) => {
    setAuthToken(data.token);
    onAuthSuccess(data.user);
    const name = data.user.displayName || data.user.username;
    addNotification(isNew
      ? L(language, { fa: 'حساب شما ساخته شد! ۱۰۰ امتیاز هدیه دریافت کردید.', en: 'Account created! You earned 100 bonus points.', ru: 'Аккаунт создан! Вам начислено 100 бонусных баллов.', tr: 'Hesabınız oluşturuldu! 100 bonus puan kazandınız.' })
      : L(language, { fa: `خوش آمدید، ${name}!`, en: `Welcome back, ${name}!`, ru: `С возвращением, ${name}!`, tr: `Tekrar hoş geldin, ${name}!` }), 'success');
    onClose();
  };

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  };

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { ok, status, data } = await post('/api/auth/otp/request', { phone });
      if (!ok) {
        if (status === 429 && typeof data.retryAfter === 'number') {
          setCooldown(data.retryAfter);
          // اگر کد فعالی برای این شماره هست، اجازه بده کاربر همان را وارد کند
          if (data.code === 'OTP_TOO_SOON') { setNormalizedPhone(normalizedPhone || phone); setStep('code'); }
        }
        throw new Error(data.error || 'Error');
      }
      setNormalizedPhone(data.phone);
      setCooldown(data.retryAfter || 60);
      setStep('code');
      setCode('');
      addNotification(L(language, { fa: `کد تأیید به ${data.phone} پیامک شد.`, en: `Verification code sent to ${data.phone}.`, ru: `Код отправлен на ${data.phone}.`, tr: `Doğrulama kodu ${data.phone} numarasına gönderildi.` }), 'info');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally { setLoading(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { ok, data } = await post('/api/auth/otp/verify', { phone: normalizedPhone || phone, code });
      if (!ok) {
        if (data.code === 'OTP_LOCKED' || data.code === 'OTP_EXPIRED' || data.code === 'OTP_NOT_FOUND') { setStep('phone'); setCode(''); }
        throw new Error(data.error || 'Error');
      }
      finish(data, !!data.isNew);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally { setLoading(false); }
  };

  const loginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { ok, data } = await post('/api/auth/login', { username, password });
      if (!ok) throw new Error(data.error || 'Error');
      finish(data, false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
      addNotification(err.message || 'Error', 'error');
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all font-bold';
  const labelCls = 'text-xs font-bold text-gray-400 uppercase tracking-wider block';
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in" data-auth-modal>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="bg-dark-card border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(255,184,0,0.15)] z-10" dir={dir}>
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/10 blur-3xl pointer-events-none"></div>

        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,184,0,0.3)]">
            <LogIn className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-xl font-black text-white font-display">
            {L(language, { fa: 'ورود / عضویت در بازینو', en: 'Sign in / Join BAZINO', ru: 'Вход / регистрация в BAZINO', tr: 'BAZINO Giriş / Üyelik' })}
          </h3>
          <p className="text-gray-400 text-xs">
            {mode === 'otp'
              ? L(language, { fa: 'شماره موبایل خود را وارد کنید؛ کد تأیید پیامک می‌شود. عضویت خودکار است.', en: 'Enter your mobile number; we text you a code. New numbers are registered automatically.', ru: 'Введите номер телефона — мы отправим код. Новые номера регистрируются автоматически.', tr: 'Cep numaranızı girin; doğrulama kodu SMS ile gelir. Yeni numaralar otomatik kaydedilir.' })
              : L(language, { fa: 'ورود با نام کاربری و رمز دائمی (ادمین یا کاربرانی که در پروفایل رمز گذاشته‌اند).', en: 'Sign in with username and permanent password (admin or users who set one in their profile).', ru: 'Вход по имени пользователя и постоянному паролю (админ или пользователи, задавшие пароль в профиле).', tr: 'Kullanıcı adı ve kalıcı şifre ile giriş (yönetici veya profilinde şifre belirleyen kullanıcılar).' })}
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6" role="tablist">
          <button role="tab" aria-selected={mode === 'otp'} onClick={() => { setMode('otp'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'otp' ? 'bg-primary text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'}`}>
            <MessageSquareText className="w-4 h-4" />
            <span>{L(language, { fa: 'کد پیامکی', en: 'SMS code', ru: 'SMS-код', tr: 'SMS kodu' })}</span>
          </button>
          <button role="tab" aria-selected={mode === 'password'} onClick={() => { setMode('password'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'password' ? 'bg-primary text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'}`}>
            <KeyRound className="w-4 h-4" />
            <span>{L(language, { fa: 'رمز عبور', en: 'Password', ru: 'Пароль', tr: 'Şifre' })}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 font-medium" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'otp' && step === 'phone' && (
          <form onSubmit={requestCode} className="space-y-4" data-otp-step="phone">
            <div className="space-y-1.5">
              <label className={labelCls} htmlFor="auth-phone">{L(language, { fa: 'شماره موبایل', en: 'Mobile number', ru: 'Номер телефона', tr: 'Cep telefonu' })}</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" required dir="ltr" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+90 5xx xxx xx xx" className={inputCls} />
              </div>
              <p className="text-[10px] text-gray-500">{L(language, { fa: 'پیش‌فرض کد کشور ترکیه (+90) است؛ برای سایر کشورها با + شروع کنید (مثلاً +98 یا +357).', en: 'Default country code is Türkiye (+90); for other countries start with + (e.g. +98, +357).', ru: 'Код страны по умолчанию — Турция (+90); для других стран начните с + (напр. +98, +357).', tr: 'Varsayılan ülke kodu Türkiye (+90); diğer ülkeler için + ile başlayın (örn. +98, +357).' })}</p>
            </div>
            <button type="submit" disabled={loading || (cooldown > 0 && !!normalizedPhone)} className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-black py-3.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span> : (<><MessageSquareText className="w-4 h-4" /><span>{L(language, { fa: 'ارسال کد تأیید', en: 'Send code', ru: 'Отправить код', tr: 'Kod gönder' })}</span></>)}
            </button>
            {cooldown > 0 && normalizedPhone && (
              <button type="button" onClick={() => setStep('code')} className="w-full text-xs text-primary font-bold underline-offset-2 hover:underline">
                {L(language, { fa: 'کد را قبلاً دریافت کرده‌ام', en: 'I already have a code', ru: 'У меня уже есть код', tr: 'Kodu zaten aldım' })}
              </button>
            )}
          </form>
        )}

        {mode === 'otp' && step === 'code' && (
          <form onSubmit={verifyCode} className="space-y-4" data-otp-step="code">
            <button type="button" onClick={() => { setStep('phone'); setErrorMsg(''); }} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer">
              <BackIcon className="w-3.5 h-3.5" /> <span dir="ltr">{normalizedPhone}</span> · {L(language, { fa: 'تغییر شماره', en: 'change number', ru: 'изменить номер', tr: 'numarayı değiştir' })}
            </button>
            <div className="space-y-1.5">
              <label className={labelCls} htmlFor="auth-code">{L(language, { fa: 'کد ۶ رقمی پیامک‌شده', en: '6-digit SMS code', ru: '6-значный код из SMS', tr: 'SMS ile gelen 6 haneli kod' })}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input ref={codeRef} id="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9۰-۹]{6}" maxLength={6} required dir="ltr" value={code}
                  onChange={e => setCode(e.target.value.replace(/[^0-9۰-۹]/g, ''))} placeholder="••••••" className={`${inputCls} tracking-[0.5em] text-center text-base`} />
              </div>
            </div>
            <button type="submit" disabled={loading || code.length !== 6} className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-black py-3.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center justify-center gap-2 cursor-pointer">
              {loading ? <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span> : (<><LogIn className="w-4 h-4" /><span>{L(language, { fa: 'تأیید و ورود', en: 'Verify & sign in', ru: 'Подтвердить и войти', tr: 'Doğrula ve giriş yap' })}</span></>)}
            </button>
            <div className="text-center text-xs text-gray-400" data-otp-resend>
              {cooldown > 0 ? (
                <span>{L(language, { fa: 'ارسال مجدد تا', en: 'Resend in', ru: 'Повторная отправка через', tr: 'Yeniden gönder:' })} <b className="text-white tabular-nums" dir="ltr">{String(Math.floor(cooldown / 60)).padStart(2, '0')}:{String(cooldown % 60).padStart(2, '0')}</b></span>
              ) : (
                <button type="button" onClick={() => requestCode()} disabled={loading} className="text-primary font-bold hover:underline cursor-pointer">
                  {L(language, { fa: 'ارسال مجدد کد', en: 'Resend code', ru: 'Отправить код ещё раз', tr: 'Kodu yeniden gönder' })}
                </button>
              )}
            </div>
          </form>
        )}

        {mode === 'password' && (
          <form onSubmit={loginPassword} className="space-y-4" data-password-login>
            <div className="space-y-1.5">
              <label className={labelCls} htmlFor="auth-username">{L(language, { fa: 'نام کاربری یا شماره موبایل', en: 'Username or mobile number', ru: 'Имя пользователя или телефон', tr: 'Kullanıcı adı veya cep numarası' })}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input id="auth-username" type="text" required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin / 905xxxxxxxxx" className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls} htmlFor="auth-password">{L(language, { fa: 'کلمه عبور', en: 'Password', ru: 'Пароль', tr: 'Şifre' })}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input id="auth-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-hover text-black py-3.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span> : (<><LogIn className="w-4 h-4" /><span>{L(language, { fa: 'ورود', en: 'Sign in', ru: 'Войти', tr: 'Giriş yap' })}</span></>)}
            </button>
            <p className="text-[10px] text-gray-500 text-center">
              {L(language, { fa: 'رمز ندارید؟ با کد پیامکی وارد شوید و از تب «امنیت» پروفایل رمز دائمی بسازید.', en: 'No password? Sign in with an SMS code and set one from the Security tab of your profile.', ru: 'Нет пароля? Войдите по SMS-коду и задайте пароль во вкладке «Безопасность» профиля.', tr: 'Şifreniz yok mu? SMS kodu ile girip profilinizin Güvenlik sekmesinden şifre belirleyin.' })}
            </p>
          </form>
        )}

        {mode === 'otp' && (
          <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/15 text-[10px] text-primary flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
            <p className="leading-relaxed font-bold">
              {L(language, { fa: 'اولین ورود = عضویت در باشگاه مشتریان با ۱۰۰ امتیاز هدیه. از هر رزرو، سفارش کافه و خرید امتیاز بگیرید.', en: 'First sign-in = loyalty membership with 100 bonus points. Earn points on every booking, cafe order and purchase.', ru: 'Первый вход = членство в клубе лояльности и 100 бонусных баллов. Баллы за каждое бронирование, заказ и покупку.', tr: 'İlk giriş = 100 bonus puanla sadakat üyeliği. Her rezervasyon, kafe siparişi ve alışverişte puan kazanın.' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
