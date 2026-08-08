import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Header({ onNavigateHome }) {
  const { t, language, setLanguage } = useLanguage();
  const { cart, setIsCartOpen } = useCart();
  const { currentUser } = useAuth();
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkAdminPermission = async () => {
      if (!currentUser || !currentUser.email) {
        if (isMounted) setIsAdmin(false);
        return;
      }

      try {
        const adminDocRef = doc(db, 'settings', 'admin');
        const adminDoc = await getDoc(adminDocRef);

        let allowedEmails = ['jeonwang80@gmail.com'];
        if (adminDoc.exists() && Array.isArray(adminDoc.data()?.adminEmails)) {
          allowedEmails = [...allowedEmails, ...adminDoc.data().adminEmails];
        }

        const isAllowed = allowedEmails.some(
          e => e && currentUser.email && e.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
        );

        if (isMounted) setIsAdmin(isAllowed);
      } catch (err) {
        console.error("Header admin check error:", err);
        if (isMounted) setIsAdmin(false);
      }
    };

    checkAdminPermission();

    return () => { isMounted = false; };
  }, [currentUser]);

  const handleLogoClick = () => {
    setMobileMenuOpen(false);
    if (onNavigateHome) {
      onNavigateHome();
    }
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (type, e) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (type === 'collection') {
      navigate('/?view=collection');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (type === 'shop') {
      if (window.location.pathname !== '/' || window.location.search !== '') {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById('featured-products');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById('featured-products');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (type === 'about') {
      if (window.location.pathname !== '/' || window.location.search !== '') {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById('about');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById('about');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="header" style={{ padding: scrolled ? '1rem 5%' : '1.5rem 5%' }}>
      <div className="header-logo" style={{ cursor: 'pointer' }} onClick={handleLogoClick}>LikeDzy</div>
      
      <nav className={`header-nav ${mobileMenuOpen ? 'open' : ''}`}>
        <a href="/#featured-products" onClick={(e) => handleNavClick('shop', e)}>{t('nav.shop')}</a>
        <a href="/?view=collection" onClick={(e) => handleNavClick('collection', e)}>{t('nav.collection')}</a>
        <a href="/#about" onClick={(e) => handleNavClick('about', e)}>{t('nav.about')}</a>
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
        
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {isAdmin && (
              <Link to="/admin" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '800', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>ADMIN</Link>
            )}
            <Link to="/mypage" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>마이페이지</Link>
          </div>
        ) : (
          <Link to="/login" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>로그인</Link>
        )}

        <button onClick={() => setIsCartOpen(true)} style={{ background: 'transparent', color: 'inherit', position: 'relative', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          {cartItemCount > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-10px', background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '0.75rem', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {cartItemCount}
            </span>
          )}
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
