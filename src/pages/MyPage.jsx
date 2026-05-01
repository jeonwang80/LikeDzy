import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function MyPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    async function fetchOrders() {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const userOrders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setOrders(userOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [currentUser, navigate]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  if (!currentUser) return null;

  return (
    <div style={{ padding: '4rem 5%', minHeight: '80vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}>
            <span>&larr;</span> 쇼핑몰 홈으로
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>마이페이지</h2>
          <button onClick={handleLogout} className="btn-secondary">로그아웃</button>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', marginBottom: '3rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-color)' }}>내 정보</h3>
          <p style={{ color: 'var(--text-muted)' }}><strong>이메일:</strong> {currentUser.email}</p>
        </div>

        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>나의 주문 내역</h3>
        
        {loading ? (
          <p>주문 내역을 불러오는 중...</p>
        ) : orders.length === 0 ? (
          <div style={{ background: 'var(--card-bg)', padding: '3rem', textAlign: 'center', borderRadius: '12px', color: 'var(--text-muted)' }}>
            아직 주문하신 내역이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => (
              <div key={order.id} style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>주문일자: {order.createdAt?.toLocaleDateString()}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.items?.map(i => i.productName).join(', ')}</div>
                  </div>
                  <div style={{ padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', color: order.status === '결제 완료' ? '#4ade80' : 'white' }}>
                    {order.status}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>결제 금액</span>
                  <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{order.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
