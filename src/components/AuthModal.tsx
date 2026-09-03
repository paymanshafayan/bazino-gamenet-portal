import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Mail, Lock, User, Phone, LogIn, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
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

export default function AuthModal({ isOpen, onClose, onAuthSuccess, addNotification }: Props) {
  useModalDismiss(isOpen, onClose);
  const { language, dir, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const url = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = activeTab === 'login' 
      ? { username, password } 
      : { username, email, password, phone };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطایی رخ داد.');
      }

      // Persist the JWT: privileged routes (/api/admin/*) require a real token
      // rather than the legacy shared "activeUsername" server setting.
      setAuthToken(data.token);

      onAuthSuccess(data.user);
      const msg = activeTab === 'login'
        ? (L(language, { fa: `خوش آمدید، @${data.user.username}!`, en: `Welcome back, @${data.user.username}!`, ru: `С возвращением, @${data.user.username}!`, tr: `Tekrar hoş geldin, @${data.user.username}!` }))
        : (L(language, { fa: 'ثبت‌نام موفقیت‌آمیز بود! ۱۰۰ امتیاز هدیه به شما تعلق گرفت.', en: 'Registration successful! 100 bonus points earned.', ru: 'Регистрация успешна! Вам начислено 100 бонусных баллов.', tr: 'Kayıt başarılı! 100 bonus puan kazandınız.' }));
      
      addNotification(msg, 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'اتصال برقرار نشد.');
      addNotification(err.message || 'خطا در احراز هویت', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="bg-dark-card border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(255,184,0,0.15)] z-10"
        dir={dir}
      >
        {/* Neon Glows */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/10 blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon and Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,184,0,0.3)]">
            <LogIn className="w-6 h-6 text-black" />
          </div>
          <h3 className="text-xl font-black text-white font-display">
            {activeTab === 'login' 
              ? (L(language, { fa: 'ورود به گیم‌نت بازینو', en: 'Login to BAZINO', ru: 'Вход в BAZINO', tr: 'BAZINO Girişi' }))
              : (L(language, { fa: 'عضویت در باشگاه مشتریان', en: 'Join Loyalty Arena', ru: 'Вступить в клуб лояльности', tr: 'Sadakat Kulübüne Katıl' }))}
          </h3>
          <p className="text-gray-400 text-xs">
            {activeTab === 'login'
              ? (L(language, { fa: 'وارد حساب خود شوید تا از امتیازات خود استفاده کنید.', en: 'Access your gaming profile & reservations.', ru: 'Войдите, чтобы использовать свои баллы и бронирования.', tr: 'Puanlarınızı ve rezervasyonlarınızı kullanmak için giriş yapın.' }))
              : (L(language, { fa: 'با ثبت‌نام اولیه ۱۰۰ امتیاز هدیه بلافاصله دریافت کنید!', en: 'Register to get 100 free bonus points instantly.', ru: 'Зарегистрируйтесь и сразу получите 100 бонусных баллов!', tr: 'Kayıt olun, anında 100 bonus puan kazanın!' }))}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-primary text-black shadow-lg font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{L(language, { fa: 'ورود گیمر', en: 'Login', ru: 'Вход', tr: 'Giriş' })}</span>
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-primary text-black shadow-lg font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{L(language, { fa: 'ثبت‌نام جدید', en: 'Register', ru: 'Регистрация', tr: 'Kayıt Ol' })}</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              {L(language, { fa: 'نام کاربری (گیمر تگ)', en: 'Gamertag / Username', ru: 'Геймертег / Имя пользователя', tr: 'Oyuncu Adı / Kullanıcı Adı' })}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
              <input 
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Sina_ProGamer"
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all font-bold"
              />
            </div>
          </div>

          {/* Email (only for register) */}
          {activeTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {L(language, { fa: 'آدرس ایمیل', en: 'Email Address', ru: 'Адрес электронной почты', tr: 'E-posta Adresi' })}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all font-bold"
                />
              </div>
            </div>
          )}

          {/* Phone (only for register) */}
          {activeTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {L(language, { fa: 'شماره تماس (اختیاری)', en: 'Phone Number (Optional)', ru: 'Номер телефона (необязательно)', tr: 'Telefon Numarası (İsteğe bağlı)' })}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all font-bold"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              {L(language, { fa: 'کلمه عبور', en: 'Password', ru: 'Пароль', tr: 'Şifre' })}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all font-bold"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-black py-3.5 rounded-xl font-black text-xs transition-all shadow-[0_0_15px_rgba(255,184,0,0.3)] hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                {activeTab === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>
                  {activeTab === 'login'
                    ? (L(language, { fa: 'ورود به کابین گیمینگ', en: 'Login Now', ru: 'Войти', tr: 'Şimdi Giriş Yap' }))
                    : (L(language, { fa: 'ایجاد حساب کاربری', en: 'Register Profile', ru: 'Создать профиль', tr: 'Profil Oluştur' }))}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Bottom promo info */}
        {activeTab === 'register' && (
          <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/15 text-[10px] text-primary flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
            <p className="leading-relaxed font-bold">
              {L(language, { fa: 'با عضویت در باشگاه مشتریان بازینو، از هر سفارش کافه، رزرو سیستم و خرید کالا امتیاز نقدی دریافت کرده و آن را به تخفیف‌های طلایی تبدیل کنید!', en: 'As a golden member, earn cashback loyalty points on all lounge bookings, cafeteria snacks, and premium shop orders!', ru: 'Как участник клуба BAZINO вы получаете кэшбэк-баллы за каждое бронирование, заказ в кафе и покупку в магазине — обменивайте их на золотые скидки!', tr: 'BAZINO sadakat kulübü üyesi olarak her rezervasyon, kafe siparişi ve mağaza alışverişinde puan kazanın ve altın indirimlere dönüştürün!' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
