import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, NavLink } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../admin.css';

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetMessage, setResetMessage] = useState('');
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const adminDocRef = doc(db, 'settings', 'admin');
        const adminDoc = await getDoc(adminDocRef);

        let allowedEmails = ['jeonwang80@gmail.com'];
        if (adminDoc.exists() && Array.isArray(adminDoc.data()?.adminEmails)) {
          allowedEmails = [...allowedEmails, ...adminDoc.data().adminEmails];
        } else if (!adminDoc.exists()) {
          // Initialize first admin whitelist doc with current user
          await setDoc(adminDocRef, { adminEmails: [currentUser.email] }, { merge: true });
          allowedEmails.push(currentUser.email);
        }

        const isAllowed = allowedEmails.some(
          e => e && currentUser.email && e.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
        );

        if (isAllowed) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          await signOut(auth);
          alert(`⛔ [${currentUser.email}] 계정은 어드민 승인 권한이 없습니다. 관리자에게 승인을 요청하세요.`);
        }
      } catch (err) {
        console.error("Admin permission check error:", err);
        setIsAuthorized(true);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const handleQuickResetPassword = async () => {
    if (!user || !user.email) return;
    if (window.confirm(`[${user.email}] 계정으로 비밀번호 재설정 이메일을 발송하시겠습니까?`)) {
      try {
        await resetPassword(user.email);
        setResetMessage('비밀번호 재설정 이메일이 발송되었습니다! 수신함을 확인해 주세요.');
        setTimeout(() => setResetMessage(''), 5000);
      } catch (err) {
        console.error("Password reset error:", err);
        alert('비밀번호 재설정 이메일 발송에 실패했습니다: ' + (err.message || err));
      }
    }
  };

  if (loading) return (
    <div style={{ padding: '5rem', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
      🔒 어드민 승인 계정 권한 확인 중...
    </div>
  );

  if (!user || !isAuthorized) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">LikeDzy Admin</div>
        <div style={{ padding: '0 1.25rem 1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>LOGGED IN ADMIN</div>
          <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.email}>
            {user.email}
          </div>
        </div>
        <nav className="admin-sidebar-nav">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            📊 어드민 대시보드
          </NavLink>
          <NavLink 
            to="/admin/inventory" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            🎨 상품 등록 & 비주얼 에디터
          </NavLink>
          <NavLink 
            to="/admin/orders" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            📦 주문 & 배송 관리
          </NavLink>
          <NavLink 
            to="/admin/board" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            💬 고객 문의 & 게시판
          </NavLink>
          <NavLink 
            to="/admin/stats" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            📈 매출 & 방문자 통계
          </NavLink>
        </nav>
        <button onClick={handleLogout} className="admin-logout-btn">
          🔒 어드민 로그아웃
        </button>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>
              👤 {user.email}
            </span>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px' }}>
              ✓ 승인된 어드민
            </span>
            {resetMessage && (
              <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                {resetMessage}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button 
              onClick={handleQuickResetPassword}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#334155'
              }}
              title="비밀번호 재설정 이메일 발송"
            >
              🔑 비밀번호 재설정
            </button>
            <button 
              onClick={() => navigate('/')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#334155'
              }}
            >
              🛍️ 쇼핑몰 홈
            </button>
            <button 
              onClick={handleLogout}
              style={{
                padding: '6px 16px',
                fontSize: '0.8rem',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
              }}
            >
              🔒 로그아웃
            </button>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
