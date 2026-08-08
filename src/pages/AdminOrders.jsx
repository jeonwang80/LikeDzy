import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setOrders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("상태 업데이트 실패");
    }
  };

  if (loading) return <div style={{ color: '#707072', fontWeight: 'bold' }}>주문 목록 불러오는 중...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">ORDER WORKFLOW</span>
          <h1>주문 관리</h1>
          <p>주문 상태를 확인하고 입금·결제·발송 단계를 변경합니다.</p>
        </div>
        <span className="admin-page-count">{orders.length} ORDERS</span>
      </div>
      
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>주문일시</th>
                <th>상품명</th>
                <th>구매자(입금자)</th>
                <th>연락처 / 배송지</th>
                <th>결제 금액</th>
                <th>추가 요청사항</th>
                <th>주문 상태</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#707072' }}>들어온 주문이 없습니다.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontSize: '0.85rem', color: '#707072' }}>{order.createdAt.toLocaleString()}</td>
                    <td style={{ fontWeight: '600' }}>
                      {order.items && order.items.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                          {order.items.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '0.2rem' }}>
                              {item.productName} <span style={{ color: '#707072', fontSize: '0.85rem' }}>({item.optionName})</span> x {item.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        order.productName
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{order.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#707072' }}>(입금자: {order.depositName})</div>
                    </td>
                    <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>
                      <div style={{ fontWeight: '600' }}>{order.phone}</div>
                      <div style={{ fontSize: '0.85rem', color: '#707072' }}>{order.address}</div>
                    </td>
                    <td style={{ fontWeight: '700', color: '#111111' }}>{order.totalAmount || order.price}</td>
                    <td style={{ color: '#707072', maxWidth: '150px', whiteSpace: 'pre-wrap' }}>{order.notes || '-'}</td>
                    <td>
                      <select 
                        value={order.status || '입금 대기'} 
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="admin-select"
                        style={{ 
                          width: 'auto',
                          padding: '6px 12px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          backgroundColor: order.status === '입금 완료' || order.status === '결제 완료' ? '#111111' : order.status === '발송 완료' ? '#007d48' : order.status === '주문 취소' ? '#d30005' : '#f5f5f5',
                          color: order.status === '입금 완료' || order.status === '결제 완료' || order.status === '발송 완료' || order.status === '주문 취소' ? '#ffffff' : '#111111',
                          borderColor: order.status === '입금 완료' || order.status === '결제 완료' || order.status === '발송 완료' || order.status === '주문 취소' ? 'transparent' : '#cacacb'
                        }}
                      >
                        <option value="입금 대기">입금 대기</option>
                        <option value="입금 완료">입금 완료</option>
                        <option value="결제 완료">결제 완료</option>
                        <option value="발송 완료">발송 완료</option>
                        <option value="주문 취소">주문 취소</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
