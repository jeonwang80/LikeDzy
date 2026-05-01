import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, NavLink } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import '../admin.css';

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar / Topbar */}
      <aside className="admin-sidebar">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '2rem' }}>LikeDzy Admin</h2>
        <nav className="admin-sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink 
            to="/admin" 
            end
            style={({ isActive }) => ({ padding: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' })}
          >
            상품 관리
          </NavLink>
          <NavLink 
            to="/admin/orders" 
            style={({ isActive }) => ({ padding: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' })}
          >
            주문 관리
          </NavLink>
          <NavLink 
            to="/admin/inventory" 
            style={({ isActive }) => ({ padding: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' })}
          >
            재고 관리
          </NavLink>
          <NavLink 
            to="/admin/board" 
            style={({ isActive }) => ({ padding: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' })}
          >
            게시판 관리
          </NavLink>
          <NavLink 
            to="/admin/stats" 
            style={({ isActive }) => ({ padding: '0.75rem', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' })}
          >
            방문자 통계
          </NavLink>
        </nav>
        <button onClick={handleLogout} style={{ padding: '0.75rem', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', marginTop: 'auto' }}>
          로그아웃
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
