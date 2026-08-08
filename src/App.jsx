import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Storefront from './pages/Storefront';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import AdminLayout from './pages/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminStats from './pages/AdminStats';
import AdminOrders from './pages/AdminOrders';
import AdminInventory from './pages/AdminInventory';
import AdminBoard from './pages/AdminBoard';
import AdminLogin from './pages/AdminLogin';
import AdminMasterData from './pages/AdminMasterData';
import CartModal from './components/CartModal';
import IntroSplash from './components/IntroSplash';
import BottomNav from './components/BottomNav';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <HashRouter>
      {showSplash && <IntroSplash onComplete={() => setShowSplash(false)} />}
      
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/mypage" element={<MyPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="board" element={<AdminBoard />} />
          <Route path="master-data" element={<AdminMasterData />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CartModal />
      <BottomNav />
      <ScrollToTop />
    </HashRouter>
  );
}

export default App;
