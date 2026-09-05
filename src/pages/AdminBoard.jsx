import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { safeRating, toSafeDate } from '../utils/boardPresentation';

export default function AdminBoard() {
  const [activeTab, setActiveTab] = useState('qna');
  const [reviews, setReviews] = useState([]);
  const [qnas, setQnas] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [hasMore, setHasMore] = useState(false);

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
    fetchProducts().catch(() => setError('상품명을 불러오지 못했습니다. 문의와 리뷰의 상품 ID를 참고해 주세요.'));
  }, []);

  useEffect(() => {
    const results = new Map();
    const unsubscribes = ['qnaV2', 'qna', 'reviewsV2', 'reviews'].map((source) => onSnapshot(
      query(collection(db, source), orderBy('createdAt', 'desc'), limit(pageSize)),
      (snapshot) => {
        results.set(source, snapshot.docs.map((entry) => {
          const data = entry.data();
          return { id: entry.id, key: `${source}/${entry.id}`, source, productId: data.productId,
            author: data.author, content: data.content, reply: data.reply, rating: safeRating(data.rating),
            isSecret: data.isSecret, status: data.status, createdAt: toSafeDate(data.createdAt) };
        }));
        const sort = (entries) => entries.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        setQnas(sort([...(results.get('qnaV2') || []), ...(results.get('qna') || [])]));
        setReviews(sort([...(results.get('reviewsV2') || []), ...(results.get('reviews') || [])]));
        setHasMore([...results.values()].some((entries) => entries.length >= pageSize));
        setLoading(false);
      },
      () => { setError('일부 문의/리뷰를 불러올 수 없습니다. 접근 권한 또는 네트워크를 확인해 주세요.'); setLoading(false); },
    ));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [pageSize]);

  const handleDelete = async (collectionName, id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(error);
      alert('삭제 실패');
    }
  };

  const handleReplySubmit = async (qna) => {
    if (!replyText.trim()) return alert('답변을 입력해주세요.');
    try {
      await updateDoc(doc(db, qna.source, qna.id), {
        reply: replyText.trim(),
        status: '답변 완료',
        updatedAt: serverTimestamp()
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
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">CUSTOMER SUPPORT</span>
          <h1>고객 응대</h1>
          <p>상품 문의와 구매 리뷰를 확인하고 답변을 관리합니다.</p>
        </div>
        <span className="admin-page-count">{qnas.length + reviews.length} ITEMS</span>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="admin-inline-notice">이전 비밀번호 방식의 글은 관리자만 열람할 수 있습니다. 새 글은 로그인한 작성자 계정으로 관리합니다.</p>

      <div className="admin-segmented-tabs">
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
              <div key={qna.key} style={{ background: '#f5f5f5', padding: '1.5rem', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`admin-badge ${qna.status === '답변 완료' ? 'admin-badge-success' : 'admin-badge-warning'}`}>{qna.status}</span>
                    <span style={{ color: '#111111', fontWeight: '600', fontSize: '0.9rem' }}>상품: {productsMap[qna.productId] || '알 수 없는 상품'}</span>
                    <span style={{ color: '#707072', fontSize: '0.875rem' }}>작성자: {qna.author}</span>
                    {qna.isSecret && <span style={{ color: '#d30005', fontSize: '0.85rem' }}>🔒 비밀글</span>}
                    {qna.source === 'qna' && <span className="admin-badge">이전 문의 · 관리자 전용</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#707072', fontSize: '0.85rem' }}>{qna.createdAt?.toLocaleString()}</span>
                    <button onClick={() => handleDelete(qna.source, qna.id)} className="admin-btn-danger" style={{ height: '32px', padding: '4px 12px' }}>삭제</button>
                  </div>
                </div>

                <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6', color: '#111111', whiteSpace: 'pre-wrap', fontWeight: '500' }}>{qna.content}</p>

                {qna.reply && replyFormId !== qna.key ? (
                  <div style={{ background: '#ffffff', borderLeft: '4px solid #111111', padding: '1rem', border: '1px solid #e5e5e5', borderLeftColor: '#111111' }}>
                    <div style={{ color: '#111111', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.875rem' }}>↳ 관리자 답변</div>
                    <p style={{ margin: 0, color: '#39393b', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{qna.reply}</p>
                    <button onClick={() => { setReplyFormId(qna.key); setReplyText(qna.reply); }} style={{ background: 'none', border: 'none', color: '#707072', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.6rem', padding: 0, textDecoration: 'underline' }}>답변 수정하기</button>
                  </div>
                ) : (
                  replyFormId === qna.key ? (
                    <div style={{ marginTop: '1rem' }}>
                      <textarea 
                        maxLength={3000}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        className="admin-textarea"
                        style={{ minHeight: '80px', marginBottom: '0.75rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setReplyFormId(null)} className="admin-btn-secondary" style={{ height: '36px' }}>취소</button>
                        <button onClick={() => handleReplySubmit(qna)} className="admin-btn-primary" style={{ height: '36px' }}>답변 등록</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyFormId(qna.key); setReplyText(''); }} className="admin-btn-primary" style={{ height: '36px', fontSize: '0.85rem' }}>답변 작성</button>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {reviews.length === 0 ? <p style={{ color: '#707072', padding: '2rem 0', textAlign: 'center' }}>등록된 리뷰가 없습니다.</p> : reviews.map(review => (
              <div key={review.key} style={{ background: '#f5f5f5', padding: '1.5rem', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#111111', letterSpacing: '2px', fontWeight: 'bold' }}>{'★'.repeat(safeRating(review.rating)) + '☆'.repeat(5 - safeRating(review.rating))}</span>
                    <span style={{ color: '#111111', fontWeight: '600', fontSize: '0.9rem' }}>상품: {productsMap[review.productId] || '알 수 없는 상품'}</span>
                    <span style={{ color: '#707072', fontSize: '0.875rem' }}>작성자: {review.author}</span>
                    {review.source === 'reviews' && <span className="admin-badge">이전 리뷰 · 관리자 전용</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#707072', fontSize: '0.85rem' }}>{review.createdAt?.toLocaleString()}</span>
                    <button onClick={() => handleDelete(review.source, review.id)} className="admin-btn-danger" style={{ height: '32px', padding: '4px 12px' }}>삭제</button>
                  </div>
                </div>
                <p style={{ margin: 0, lineHeight: '1.6', color: '#39393b', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {hasMore && <button type="button" className="admin-btn-secondary" onClick={() => setPageSize((size) => size + 50)}>이전 글 더 보기</button>}
    </div>
  );
}
