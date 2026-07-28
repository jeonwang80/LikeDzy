import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminBoard() {
  const [activeTab, setActiveTab] = useState('qna');
  const [reviews, setReviews] = useState([]);
  const [qnas, setQnas] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [replyFormId, setReplyFormId] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
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
    const qQna = query(collection(db, 'qna'), orderBy('createdAt', 'desc'));
    const unsubQna = onSnapshot(qQna, (snapshot) => {
      setQnas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() })));
    });

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

  if (loading) return <div style={{ color: '#707072', fontWeight: 'bold' }}>데이터 불러오는 중...</div>;

  return (
    <div>
      <div className="admin-header">
        <h1 className="admin-title">게시판 & 리뷰 관리</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('qna')}
          className={activeTab === 'qna' ? "admin-btn-primary" : "admin-btn-secondary"}
        >
          Q&A 문의 ({qnas.length})
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={activeTab === 'reviews' ? "admin-btn-primary" : "admin-btn-secondary"}
        >
          고객 리뷰 ({reviews.length})
        </button>
      </div>

      <div className="admin-card">
        {activeTab === 'qna' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {qnas.length === 0 ? <p style={{ color: '#707072', padding: '2rem 0', textAlign: 'center' }}>등록된 Q&A 문의가 없습니다.</p> : qnas.map(qna => (
              <div key={qna.id} style={{ background: '#f5f5f5', padding: '1.5rem', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`admin-badge ${qna.status === '답변 완료' ? 'admin-badge-success' : 'admin-badge-warning'}`}>{qna.status}</span>
                    <span style={{ color: '#111111', fontWeight: '600', fontSize: '0.9rem' }}>상품: {productsMap[qna.productId] || '알 수 없는 상품'}</span>
                    <span style={{ color: '#707072', fontSize: '0.875rem' }}>작성자: {qna.author}</span>
                    {qna.isSecret && <span style={{ color: '#d30005', fontSize: '0.85rem' }}>🔒 비밀글</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#707072', fontSize: '0.85rem' }}>{qna.createdAt?.toLocaleString()}</span>
                    <button onClick={() => handleDelete('qna', qna.id)} className="admin-btn-danger" style={{ height: '32px', padding: '4px 12px' }}>삭제</button>
                  </div>
                </div>

                <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6', color: '#111111', whiteSpace: 'pre-wrap', fontWeight: '500' }}>{qna.content}</p>

                {qna.reply ? (
                  <div style={{ background: '#ffffff', borderLeft: '4px solid #111111', padding: '1rem', border: '1px solid #e5e5e5', borderLeftColor: '#111111' }}>
                    <div style={{ color: '#111111', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.875rem' }}>↳ 관리자 답변</div>
                    <p style={{ margin: 0, color: '#39393b', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{qna.reply}</p>
                    <button onClick={() => { setReplyFormId(qna.id); setReplyText(qna.reply); }} style={{ background: 'none', border: 'none', color: '#707072', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.6rem', padding: 0, textDecoration: 'underline' }}>답변 수정하기</button>
                  </div>
                ) : (
                  replyFormId === qna.id ? (
                    <div style={{ marginTop: '1rem' }}>
                      <textarea 
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        className="admin-textarea"
                        style={{ minHeight: '80px', marginBottom: '0.75rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setReplyFormId(null)} className="admin-btn-secondary" style={{ height: '36px' }}>취소</button>
                        <button onClick={() => handleReplySubmit(qna.id)} className="admin-btn-primary" style={{ height: '36px' }}>답변 등록</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyFormId(qna.id); setReplyText(''); }} className="admin-btn-primary" style={{ height: '36px', fontSize: '0.85rem' }}>답변 작성</button>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {reviews.length === 0 ? <p style={{ color: '#707072', padding: '2rem 0', textAlign: 'center' }}>등록된 리뷰가 없습니다.</p> : reviews.map(review => (
              <div key={review.id} style={{ background: '#f5f5f5', padding: '1.5rem', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#111111', letterSpacing: '2px', fontWeight: 'bold' }}>{'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}</span>
                    <span style={{ color: '#111111', fontWeight: '600', fontSize: '0.9rem' }}>상품: {productsMap[review.productId] || '알 수 없는 상품'}</span>
                    <span style={{ color: '#707072', fontSize: '0.875rem' }}>작성자: {review.author}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#707072', fontSize: '0.85rem' }}>{review.createdAt?.toLocaleString()}</span>
                    <button onClick={() => handleDelete('reviews', review.id)} className="admin-btn-danger" style={{ height: '32px', padding: '4px 12px' }}>삭제</button>
                  </div>
                </div>
                <p style={{ margin: 0, lineHeight: '1.6', color: '#39393b', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
