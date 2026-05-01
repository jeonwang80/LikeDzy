import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ author: '', password: '', rating: 5, content: '' });

  useEffect(() => {
    if (!productId) return;
    const q = query(
      collection(db, 'reviews'), 
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.author || !form.password || !form.content) return alert('모든 항목을 입력해주세요.');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId,
        ...form,
        createdAt: new Date()
      });
      alert('리뷰가 등록되었습니다.');
      setShowModal(false);
      setForm({ author: '', password: '', rating: 5, content: '' });
    } catch (error) {
      console.error(error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>고객 리뷰 ({reviews.length})</h3>
        <button onClick={() => setShowModal(true)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          리뷰 작성하기
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>리뷰를 불러오는 중...</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '8px' }}>아직 등록된 리뷰가 없습니다. 첫 리뷰를 작성해보세요!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(review => (
            <div key={review.id} style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#eab308', letterSpacing: '2px' }}>{renderStars(review.rating)}</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {review.createdAt ? review.createdAt.toLocaleDateString() : ''}
                </span>
              </div>
              <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>{review.content}</p>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold' }}>
                작성자: {review.author}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-modal-content" style={{ maxWidth: '500px', width: '90%', background: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>리뷰 작성</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>이름</label>
                  <input required value={form.author} onChange={e => setForm({...form, author: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="홍길동" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>비밀번호 (수정/삭제용)</label>
                  <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="4자리 이상" />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>별점</label>
                <select value={form.rating} onChange={e => setForm({...form, rating: Number(e.target.value)})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}>
                  <option value={5}>★★★★★ (5점 - 아주 좋아요)</option>
                  <option value={4}>★★★★☆ (4점 - 맘에 들어요)</option>
                  <option value={3}>★★★☆☆ (3점 - 보통이에요)</option>
                  <option value={2}>★★☆☆☆ (2점 - 그냥 그래요)</option>
                  <option value={1}>★☆☆☆☆ (1점 - 별로예요)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>리뷰 내용</label>
                <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '100px', fontFamily: 'inherit' }} placeholder="솔직한 리뷰를 남겨주세요." />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isSubmitting ? '등록 중...' : '리뷰 등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
