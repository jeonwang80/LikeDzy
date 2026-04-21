import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Header() {
  const { t, language, setLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="header" style={{ padding: scrolled ? '1rem 5%' : '1.5rem 5%' }}>
      <div className="header-logo">LikeDzy</div>
      
      <nav className={`header-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="#shop" onClick={() => setMobileMenuOpen(false)}>{t('nav.shop')}</a>
        <a href="#collection" onClick={() => setMobileMenuOpen(false)}>{t('nav.collection')}</a>
        <a href="#about" onClick={() => setMobileMenuOpen(false)}>{t('nav.about')}</a>
      </nav>

      <div className="header-actions">
        <select 
          className="lang-select" 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="ko">KR</option>
          <option value="en">EN</option>
          <option value="vi">VI</option>
        </select>
        
        <button style={{ background: 'transparent', color: 'inherit' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </button>

        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
