import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import './ScrollToTop.css';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const { language } = useLanguage();
  const isProductPage = location.pathname === '/' && new URLSearchParams(location.search).get('view') === 'product';

  // 스크롤 위치 감지
  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // 맨 위로 부드럽게 스크롤
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      type="button"
      className={`scroll-to-top${isProductPage ? ' scroll-to-top--product' : ''}`}
      aria-label={language === 'ko' ? '맨 위로 이동' : 'Back to top'}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    </button>
  );
}
