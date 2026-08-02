import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageType, translations } from '../utils/translations';

interface LanguageContextProps {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, defaultValue?: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use 'fa' as default since the app is originally Persian, but persist choice in localStorage
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('cyber_lang');
    return (saved as LanguageType) || 'fa';
  });

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem('cyber_lang', lang);
  };

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
