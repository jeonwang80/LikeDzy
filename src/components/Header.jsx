import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { getCategoryName, useCategoryMasters } from '../hooks/useCategoryMasters';
import './Header.css';

const buildCategoryTree = (categories, language) => {
  const level1Map = new Map();

  categories.forEach((category) => {
    if (!category.level1Code || !category.level2Code || !category.level3Code) return;

    if (!level1Map.has(category.level1Code)) {
      level1Map.set(category.level1Code, {
        code: category.level1Code,
        name: getCategoryName(category, 1, language),
        groups: new Map(),
      });
    }

    const level1 = level1Map.get(category.level1Code);
    if (!level1.groups.has(category.level2Code)) {
      level1.groups.set(category.level2Code, {
        code: `${category.level1Code}-${category.level2Code}`,
        name: getCategoryName(category, 2, language),
        items: [],
      });
    }

    level1.groups.get(category.level2Code).items.push({
      code: category.code,
      name: getCategoryName(category, 3, language),
    });
  });

  return Array.from(level1Map.values()).map((level1) => ({
    ...level1,
    groups: Array.from(level1.groups.values()),
  }));
};

export default function Header({ onNavigateHome }) {
  const { t, language, setLanguage } = useLanguage();
  const { cart, setIsCartOpen } = useCart();
  const { currentUser } = useAuth();
  const { categories } = useCategoryMasters({ activeOnly: true });
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoryCode, setMobileCategoryCode] = useState('');
  const [activeMegaCode, setActiveMegaCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const categoryTree = useMemo(() => buildCategoryTree(categories, language), [categories, language]);
  const activeMegaCategory = categoryTree.find((category) => category.code === activeMegaCode);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkAdminPermission = async () => {
      if (!currentUser?.email) {
        if (isMounted) setIsAdmin(false);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
        let allowedEmails = ['jeonwang80@gmail.com'];
        if (adminDoc.exists() && Array.isArray(adminDoc.data()?.adminEmails)) {
          allowedEmails = [...allowedEmails, ...adminDoc.data().adminEmails];
        }
        const isAllowed = allowedEmails.some((email) => (
          email && email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
        ));
        if (isMounted) setIsAdmin(isAllowed);
      } catch (error) {
        console.error('Header admin check error:', error);
        if (isMounted) setIsAdmin(false);
      }
    };

    checkAdminPermission();
    return () => { isMounted = false; };
  }, [currentUser]);

  const closeNavigation = () => {
    setActiveMegaCode('');
    setMobileMenuOpen(false);
    setMobileCategoryCode('');
  };

  const openMegaMenu = (categoryCode) => {
    setActiveMegaCode(categoryCode);
  };

  const handleLogoClick = () => {
    closeNavigation();
    if (onNavigateHome) onNavigateHome();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryLinkClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(closeNavigation, 0);
  };

  const getCategoryUrl = (categoryCode) => `/?view=collection&category=${encodeURIComponent(categoryCode)}`;

  const handleNavClick = (type, event) => {
    event.preventDefault();
    closeNavigation();
    const isHomeView = location.pathname === '/' && !location.search;

    if (type === 'collection') {
      navigate('/?view=collection');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const sectionId = type === 'shop' ? 'featured-products' : 'about';
    if (!isHomeView) {
      navigate('/');
      window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        className={`header storefront-header ${scrolled ? 'scrolled' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeNavigation();
        }}
      >
        <button type="button" className="header-logo" onMouseEnter={() => setActiveMegaCode('')} onClick={handleLogoClick}>LikeDzy</button>

        <nav className="header-nav" aria-label="주요 카테고리">
          {categoryTree.length > 0 ? categoryTree.map((category) => (
            <button
              type="button"
              key={category.code}
              className={`header-category-tab ${activeMegaCode === category.code ? 'active' : ''}`}
              onMouseEnter={() => openMegaMenu(category.code)}
              onFocus={() => openMegaMenu(category.code)}
              onClick={() => openMegaMenu(category.code)}
              aria-expanded={activeMegaCode === category.code}
            >
              {category.name}
            </button>
          )) : (
            <a href="/#featured-products" onClick={(event) => handleNavClick('shop', event)}>{t('nav.shop')}</a>
          )}
          <a href="/?view=collection" onMouseEnter={() => setActiveMegaCode('')} onFocus={() => setActiveMegaCode('')} onClick={(event) => handleNavClick('collection', event)}>{t('nav.collection')}</a>
          <a href="/#about" onMouseEnter={() => setActiveMegaCode('')} onFocus={() => setActiveMegaCode('')} onClick={(event) => handleNavClick('about', event)}>{t('nav.about')}</a>
        </nav>

        <div className="header-actions" onMouseEnter={() => setActiveMegaCode('')}>
          <select className="lang-select" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="언어 선택">
            <option value="ko">KR</option>
            <option value="en">EN</option>
            <option value="vi">VI</option>
          </select>

          {currentUser ? (
            <div className="header-account-links">
              {isAdmin && <Link to="/admin" className="header-admin-link">ADMIN</Link>}
              <Link to="/mypage" className="header-account-link">마이페이지</Link>
            </div>
          ) : (
            <Link to="/login" className="header-account-link">로그인</Link>
          )}

          <button type="button" className="header-cart-btn" onClick={() => setIsCartOpen(true)} aria-label={`장바구니 ${cartItemCount}개`}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartItemCount > 0 && <span>{cartItemCount}</span>}
          </button>

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setActiveMegaCode('');
            }}
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {mobileMenuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></>
              )}
            </svg>
          </button>
        </div>

        {activeMegaCategory && (
          <section
            className="category-mega-menu"
            aria-label={`${activeMegaCategory.name} 카테고리`}
          >
            <div className="category-mega-heading">
              <div><span>EXPLORE</span><strong>{activeMegaCategory.name}</strong></div>
              <Link to={getCategoryUrl(activeMegaCategory.code)} onClick={handleCategoryLinkClick}>전체 상품 보기 <span>→</span></Link>
            </div>
            <div className="category-mega-grid">
              {activeMegaCategory.groups.map((group) => (
                <div className="category-mega-group" key={group.code}>
                  <Link to={getCategoryUrl(group.code)} className="category-mega-group-title" onClick={handleCategoryLinkClick}>
                    {group.name}<span>↗</span>
                  </Link>
                  <div>
                    {group.items.map((item) => (
                      <Link to={getCategoryUrl(item.code)} key={item.code} onClick={handleCategoryLinkClick}>{item.name}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {mobileMenuOpen && (
          <section className="mobile-category-menu" aria-label="모바일 메뉴">
            <div className="mobile-category-scroll">
              {categoryTree.map((category) => {
                const expanded = mobileCategoryCode === category.code;
                return (
                  <div className="mobile-category-section" key={category.code}>
                    <button type="button" onClick={() => setMobileCategoryCode(expanded ? '' : category.code)} aria-expanded={expanded}>
                      <span>{category.name}</span><small>{expanded ? '−' : '+'}</small>
                    </button>
                    {expanded && (
                      <div className="mobile-category-groups">
                        <Link to={getCategoryUrl(category.code)} className="mobile-view-all" onClick={handleCategoryLinkClick}>전체 상품</Link>
                        {category.groups.map((group) => (
                          <div key={group.code}>
                            <Link to={getCategoryUrl(group.code)} className="mobile-group-title" onClick={handleCategoryLinkClick}>{group.name}</Link>
                            {group.items.map((item) => (
                              <Link to={getCategoryUrl(item.code)} key={item.code} onClick={handleCategoryLinkClick}>{item.name}</Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <a href="/?view=collection" onClick={(event) => handleNavClick('collection', event)}>{t('nav.collection')}</a>
              <a href="/#about" onClick={(event) => handleNavClick('about', event)}>{t('nav.about')}</a>
            </div>
          </section>
        )}
      </header>

      {(activeMegaCategory || mobileMenuOpen) && (
        <button
          type="button"
          className="header-menu-scrim"
          onMouseMove={() => {
            if (!mobileMenuOpen) setActiveMegaCode('');
          }}
          onClick={closeNavigation}
          aria-label="메뉴 닫기"
        />
      )}
    </>
  );
}
