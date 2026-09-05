import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';
import { formatKRW, getTrackingUrl } from '../utils/commerce';

export default function MyPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursors, setCursors] = useState([null]);
  const [lastDoc, setLastDoc] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const cursor = cursors[cursors.length - 1];

  useEffect(() => {
    let active = true;
    if (!currentUser) {
      navigate('/login');
      return;
    }

    async function fetchOrders() {
      setLoading(true); setError('');
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        if (!active) return;
        const userOrders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setOrders(userOrders);
        setLastDoc(querySnapshot.docs.at(-1) || null);
      } catch {
        if (!active) return;
        setError('주문 내역을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요. 문제가 계속되면 고객센터에 문의해 주세요.');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchOrders();
    return () => { active = false; };
  }, [currentUser, navigate, cursor, refresh]);

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
        {error && <p role="alert">{error} <button onClick={() => setRefresh((value) => value + 1)}>다시 시도</button></p>}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}><button disabled={loading || cursors.length === 1} onClick={() => setCursors((value) => value.slice(0, -1))}>이전</button><span>{cursors.length}페이지</span><button disabled={loading || orders.length < 20 || !lastDoc} onClick={() => setCursors((value) => [...value, lastDoc])}>다음</button><button onClick={() => navigate('/orders/lookup')}>비회원 주문 조회</button></div>
        
        {loading ? (
          <p>주문 내역을 불러오는 중...</p>
        ) : error ? null : orders.length === 0 ? (
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
                  <div style={{ padding: '0.3rem 0.8rem', background: 'rgba(36,52,40,0.1)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', color: order.status === '발송 완료' ? '#007d48' : 'var(--text-color)' }}>
                    {order.status}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>주문번호: {order.orderNumber || order.id}</div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>결제 금액</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{order.totalAmount || formatKRW(order.totalAmountNumber)}</span>
                </div>
                {order.trackingNumber && (
                  <a href={getTrackingUrl(order.courier, order.trackingNumber)} target="_blank" rel="noreferrer" style={{ marginTop: '1rem', minHeight: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderRadius: '8px', background: '#243428', color: '#fff', fontWeight: 'bold', textDecoration: 'none' }}>
                    {order.courier} 배송조회 · {order.trackingNumber}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
