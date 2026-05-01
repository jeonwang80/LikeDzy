import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminBoard() {
  const [activeTab, setActiveTab] = useState('qna');
  const [reviews, setReviews] = useState([]);
  const [qnas, setQnas] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // For QnA reply
  const [replyFormId, setReplyFormId] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    // Fetch products to map ID to Name
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      const map = {};
      snap.forEach(doc => {
        map[doc.id] = doc.data().name || doc.data().ko?.name;
      });
      setProductsMap(map);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    // Fetch Q&A
    const qQna = query(collection(db, 'qna'), orderBy('createdAt', 'desc'));
    const unsubQna = onSnapshot(qQna, (snapshot) => {
      setQnas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() })));
    });

    // Fetch Reviews
    const qReview = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubReview = onSnapshot(qReview, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() })));
      setLoading(false);
    });

    return () => {
      unsubQna();
      unsubReview();
    };
  }, []);

  const handleDelete = async (collectionName, id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(error);
      alert('삭제 실패');
    }
  };

  const handleReplySubmit = async (qnaId) => {
    if (!replyText.trim()) return alert('답변을 입력해주세요.');
    try {
      await updateDoc(doc(db, 'qna', qnaId), {
        reply: replyText,
        status: '답변 완료'
      });
      setReplyFormId(null);
      setReplyText('');
    } catch (error) {
      console.error(error);
      alert('답변 등록 실패');
    }
  };

  if (loading) return <div style={{ color: '#94a3b8' }}>데이터 불러오는 중...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#f1f5f9' }}>게시판 관리</h2>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('qna')}
          style={{ padding: '0.75rem 1.5rem', background: activeTab === 'qna' ? '#3b82f6' : '#1e293b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Q&A 관리 ({qnas.length})
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          style={{ padding: '0.75rem 1.5rem', background: activeTab === 'reviews' ? '#3b82f6' : '#1e293b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          리뷰 관리 ({reviews.length})
        </button>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '8px', padding: '1.5rem' }}>
        {activeTab === 'qna' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {qnas.length === 0 ? <p style={{ color: '#94a3b8' }}>등록된 Q&A가 없습니다.</p> : qnas.map(qna => (
              <div key={qna.id} style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ padding: '0.2rem 0.5rem', background: qna.status === '답변 완료' ? '#16a34a' : '#475569', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{qna.status}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>상품: {productsMap[qna.productId] || '알 수 없는 상품'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>작성자: {qna.author}</span>
                    {qna.isSecret && <span style={{ color: '#eab308', fontSize: '0.9rem' }}>🔒 비밀글</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{qna.createdAt?.toLocaleString()}</span>
                    <button onClick={() => handleDelete('qna', qna.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>삭제</button>
                  </div>
                </div>

                <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>{qna.content}</p>

                {qna.reply ? (
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #3b82f6', padding: '1rem', borderRadius: '0 4px 4px 0' }}>
                    <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>↳ 관리자 답변</div>
                    <p style={{ margin: 0, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{qna.reply}</p>
                    <button onClick={() => { setReplyFormId(qna.id); setReplyText(qna.reply); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem', padding: 0 }}>답변 수정하기</button>
                  </div>
                ) : (
                  replyFormId === qna.id ? (
                    <div style={{ marginTop: '1rem' }}>
                      <textarea 
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #475569', color: 'white', borderRadius: '4px', minHeight: '80px', marginBottom: '0.5rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setReplyFormId(null)} style={{ padding: '0.5rem 1rem', background: '#475569', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
                        <button onClick={() => handleReplySubmit(qna.id)} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>답변 등록</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyFormId(qna.id); setReplyText(''); }} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>답변 달기</button>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.length === 0 ? <p style={{ color: '#94a3b8' }}>등록된 리뷰가 없습니다.</p> : reviews.map(review => (
              <div key={review.id} style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#eab308', letterSpacing: '2px' }}>{'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>상품: {productsMap[review.productId] || '알 수 없는 상품'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>작성자: {review.author}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{review.createdAt?.toLocaleString()}</span>
                    <button onClick={() => handleDelete('reviews', review.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>삭제</button>
                  </div>
                </div>
                <p style={{ margin: 0, lineHeight: '1.6', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
