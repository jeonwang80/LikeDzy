import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './BottomNav.css';

export default function BottomNav() {
  const location = useLocation();
  const { cart, setIsCartOpen } = useCart();
  const { currentUser } = useAuth();
  
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  // 현재 경로가 어드민이면 쇼핑몰 하단 네비게이션 숨김
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="bottom-nav-container">
      <nav className="bottom-nav">
        <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill={isActive('/') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>홈</span>
        </Link>
        
        <Link to="/#collection" className="bottom-nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>컬렉션</span>
        </Link>
        
        <button className="bottom-nav-item" onClick={() => setIsCartOpen(true)}>
          <div className="bottom-nav-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {cartItemCount > 0 && (
              <span className="bottom-nav-badge">{cartItemCount}</span>
            )}
          </div>
          <span>장바구니</span>
        </button>
        
        <Link to={currentUser ? "/mypage" : "/login"} className={`bottom-nav-item ${isActive('/mypage') || isActive('/login') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill={isActive('/mypage') ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>내정보</span>
        </Link>
      </nav>
    </div>
  );
}
