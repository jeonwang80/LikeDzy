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

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', fontWeight: 'bold' }}>Loading...</div>;

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">LikeDzy Admin</div>
        <nav className="admin-sidebar-nav">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            상품 관리
          </NavLink>
          <NavLink 
            to="/admin/orders" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            주문 관리
          </NavLink>
          <NavLink 
            to="/admin/inventory" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            재고 관리
          </NavLink>
          <NavLink 
            to="/admin/board" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            게시판 관리
          </NavLink>
          <NavLink 
            to="/admin/stats" 
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            방문자 통계
          </NavLink>
        </nav>
        <button onClick={handleLogout} className="admin-logout-btn">
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
