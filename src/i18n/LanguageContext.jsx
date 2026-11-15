import React, { createContext, useState, useContext, useEffect } from 'react';
import { currencyForLanguage } from '../utils/market';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, updateLanguage] = useState(() => {
    try { return localStorage.getItem('likedzy-language') === 'hu' ? 'hu' : ['en', 'vi'].includes(localStorage.getItem('likedzy-language')) ? 'en' : 'ko'; } catch { return 'ko'; }
  });
  const setLanguage = (value) => updateLanguage(['ko', 'en', 'hu'].includes(value) ? value : 'en');
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('likedzy-language', language); } catch { /* Persistence is optional. */ }
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language] || translations.en;
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
