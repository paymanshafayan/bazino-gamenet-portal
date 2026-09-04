import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageType, translations } from '../utils/translations';

interface LanguageContextProps {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, defaultValue?: string) => string;
  dir: 'rtl' | 'ltr';
}

const SUPPORTED: LanguageType[] = ['fa', 'en', 'ru', 'tr'];
const isLanguage = (v: unknown): v is LanguageType => typeof v === 'string' && (SUPPORTED as string[]).includes(v);

function readStoredLanguage(): LanguageType | null {
  try {
    const saved = localStorage.getItem('cyber_lang');
    return isLanguage(saved) ? saved : null;
  } catch { return null; }
}

function readBootstrapLanguage(): LanguageType | null {
  if (typeof window === 'undefined') return null;
  const boot = (window as unknown as { __BAZINO_BOOTSTRAP__?: { lang?: unknown } }).__BAZINO_BOOTSTRAP__;
  return boot && isLanguage(boot.lang) ? boot.lang : null;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // اولویت انتخاب زبان:
  //   ۱) انتخاب دستی کاربر (localStorage: cyber_lang) — همیشه بر GeoIP غالب است
  //   ۲) زبان پیشنهادی سرور بر اساس کشور IP که در HTML تزریق شده (production)
  //   ۳) fetch /api/geo/lang (حالت dev که bootstrap در HTML نیست)
  //   ۴) en
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const saved = readStoredLanguage();
    if (saved) return saved;
    const boot = readBootstrapLanguage();
    return boot || 'en';
  });

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    try { localStorage.setItem('cyber_lang', lang); } catch { /* حالت خصوصی */ }
  };

  // فقط وقتی نه انتخاب دستی هست و نه bootstrap (dev)، از سرور می‌پرسیم
  useEffect(() => {
    if (readStoredLanguage() || readBootstrapLanguage()) return;
    let cancelled = false;
    fetch('/api/geo/lang')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { lang?: string } | null) => {
        if (!cancelled && d && isLanguage(d.lang) && !readStoredLanguage()) setLanguageState(d.lang);
      })
      .catch(() => { /* بدون شبکه: همان en می‌ماند */ });
    return () => { cancelled = true; };
  }, []);

  const t = (key: string, defaultValue?: string): string => {
    const item = translations[key];
    if (item && item[language]) {
      return item[language];
    }
    return defaultValue || key;
  };

  const dir = language === 'fa' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Optionally update document HTML dir attribute for global CSS styling support
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
