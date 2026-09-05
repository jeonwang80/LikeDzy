import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../admin.css';

const NAV_ITEMS = [
  { to: '/admin', end: true, index: '01', label: '운영 홈', description: '메인 콘텐츠 관리' },
  { to: '/admin/inventory', index: '02', label: '상품 관리', description: '등록·수정·진열·재고' },
  { to: '/admin/orders', index: '03', label: '주문 관리', description: '결제·배송 상태' },
  { to: '/admin/board', index: '04', label: '고객 응대', description: '문의·리뷰' },
  { to: '/admin/stats', index: '05', label: '통계', description: '방문 데이터' },
  { to: '/admin/master-data', index: '06', label: '기준정보', description: '판매·배송·카테고리' },
];

export default function AdminLayout() {
  const [resetMessage, setResetMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { currentUser: user, isAdmin: isAuthorized, adminLoading: loading, adminError, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentNav = NAV_ITEMS.find((item) => (
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )) || NAV_ITEMS[0];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const handleQuickResetPassword = async () => {
    if (!user?.email) return;
    if (!window.confirm(`[${user.email}] 계정으로 비밀번호 재설정 이메일을 발송할까요?`)) return;

    try {
      await resetPassword(user.email);
      setResetMessage('비밀번호 재설정 이메일을 발송했습니다.');
      window.setTimeout(() => setResetMessage(''), 5000);
    } catch (error) {
      console.error('Password reset error:', error);
      alert(`비밀번호 재설정 이메일 발송에 실패했습니다: ${error.message || error}`);
    }
  };

  if (loading) {
    return (
      <div className="admin-auth-loading">
        <span className="admin-loading-mark">LD</span>
        <strong>관리자 권한을 확인하고 있습니다.</strong>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAuthorized) return (
    <div className="admin-auth-loading" role="alert">
      <strong>{adminError || (user.emailVerified ? '이 계정에 관리자 권한이 없습니다.' : '관리자는 이메일 인증을 완료해야 합니다.')}</strong>
      <button type="button" className="admin-btn-secondary" onClick={handleLogout}>로그아웃하고 다시 로그인</button>
    </div>
  );

  return (
    <div className="admin-layout">
      <button
        type="button"
        className={`admin-sidebar-scrim ${sidebarOpen ? 'visible' : ''}`}
        aria-label="관리자 메뉴 닫기"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">
          <button type="button" className="admin-sidebar-logo" onClick={() => navigate('/admin')}>
            LIKEDZY
          </button>
          <span>OPERATIONS</span>
        </div>

        <div className="admin-sidebar-context">
          <span>TECHNICAL OUTDOOR</span>
          <strong>STORE CONTROL</strong>
        </div>

        <nav className="admin-sidebar-nav" aria-label="관리자 메뉴">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="admin-nav-index">{item.index}</span>
              <span className="admin-nav-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-account">
          <div className="admin-account-avatar">{user.email?.slice(0, 1).toUpperCase()}</div>
          <div>
            <span>승인된 관리자</span>
            <strong title={user.email}>{user.email}</strong>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="admin-logout-btn">로그아웃</button>
      </aside>

      <section className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-topbar-heading">
            <button
              type="button"
              className="admin-mobile-menu-btn"
              aria-label="관리자 메뉴 열기"
              onClick={() => setSidebarOpen(true)}
            >
              <span />
              <span />
            </button>
            <div>
              <span>LIKEDZY ADMIN / {currentNav.index}</span>
              <strong>{currentNav.label}</strong>
            </div>
          </div>

          <div className="admin-topbar-actions">
            {resetMessage && <span className="admin-inline-notice">{resetMessage}</span>}
            <button type="button" className="admin-topbar-btn" onClick={() => navigate('/')}>스토어 보기</button>
            <button type="button" className="admin-topbar-btn" onClick={handleQuickResetPassword}>비밀번호 변경</button>
            <button type="button" className="admin-topbar-profile" onClick={handleLogout} title="로그아웃">
              {user.email?.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
