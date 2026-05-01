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

  if (loading) return <div style={{ color: '#94a3b8' }}>주문 목록 불러오는 중...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#f1f5f9' }}>주문 관리</h2>
      
      <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#334155', color: '#f8fafc' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>주문일시</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>상품명</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>구매자(입금자)</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>연락처 / 배송지</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>결제 금액</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>추가 요청사항</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #475569' }}>주문 상태</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>들어온 주문이 없습니다.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>{order.createdAt.toLocaleString()}</td>
                  <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 'bold' }}>
                    {order.items && order.items.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {order.items.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: '0.3rem' }}>
                            {item.productName} <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>({item.optionName})</span> x {item.quantity}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      order.productName // legacy fallback
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                    {order.name}<br/>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(입금: {order.depositName})</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', maxWidth: '200px', wordBreak: 'break-all' }}>
                    {order.phone}<br/>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{order.address}</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#ef4444', fontWeight: 'bold' }}>{order.totalAmount || order.price}</td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', maxWidth: '150px', whiteSpace: 'pre-wrap' }}>{order.notes || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <select 
                      value={order.status || '입금 대기'} 
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{ 
                        padding: '0.4rem', 
                        borderRadius: '4px', 
                        border: '1px solid #475569', 
                        background: order.status === '입금 완료' ? '#16a34a' : order.status === '발송 완료' ? '#3b82f6' : order.status === '주문 취소' ? '#64748b' : '#eab308',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="입금 대기" style={{ background: '#1e293b', color: 'white' }}>입금 대기</option>
                      <option value="입금 완료" style={{ background: '#1e293b', color: 'white' }}>입금 완료</option>
                      <option value="발송 완료" style={{ background: '#1e293b', color: 'white' }}>발송 완료</option>
                      <option value="주문 취소" style={{ background: '#1e293b', color: 'white' }}>주문 취소</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
