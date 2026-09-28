import React, { createContext, useState, useContext, useEffect } from 'react';
import { currencyForLanguage } from '../utils/market';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, updateLanguage] = useState(() => {
    try { return ['en', 'vi'].includes(localStorage.getItem('likedzy-language')) ? 'en' : 'ko'; } catch { return 'ko'; }
  });
  const setLanguage = (value) => updateLanguage(value === 'ko' ? 'ko' : 'en');
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('likedzy-language', language); } catch { /* Persistence is optional. */ }
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value === undefined) return key;
      value = value[k];
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, currency: currencyForLanguage(language), setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
