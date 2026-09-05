import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Storefront from './pages/Storefront';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import CheckoutPage from './pages/CheckoutPage';
import CartModal from './components/CartModal';
import IntroSplash from './components/IntroSplash';
import BottomNav from './components/BottomNav';
import ScrollToTop from './components/ScrollToTop';

const AdminLayout = lazy(() => import('./pages/AdminLayout'));
const OrderLookup = lazy(() => import('./pages/OrderLookup'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminStats = lazy(() => import('./pages/AdminStats'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminInventory = lazy(() => import('./pages/AdminInventory'));
const AdminBoard = lazy(() => import('./pages/AdminBoard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminMasterData = lazy(() => import('./pages/AdminMasterData'));

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <HashRouter>
      {showSplash && <IntroSplash onComplete={() => setShowSplash(false)} />}
      
      <Suspense fallback={<div role="status" style={{ padding: '6rem 5%', textAlign: 'center' }}>화면을 불러오는 중입니다.</div>}>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/lookup" element={<OrderLookup />} />
        <Route path="/orders/:orderId" element={<OrderLookup />} />
        <Route path="/policies/:type" element={<PolicyPage />} />
        
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
      </Suspense>
      <CartModal />
      <BottomNav />
      <ScrollToTop />
    </HashRouter>
  );
}

export default App;
