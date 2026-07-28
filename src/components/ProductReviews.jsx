import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ author: '', password: '', rating: 5, content: '' });
  
  // 사진 첨부 상태
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null); // 사진 확대용 상태

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
      setErrorMsg(null);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error);
      setErrorMsg("리뷰를 불러오는 중 오류가 발생했습니다. (설정 확인 필요)");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [productId]);

  const handleImageChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (imageFiles.length + newFiles.length > 4) {
        alert("사진은 최대 4장까지만 첨부할 수 있습니다.");
        return;
      }
      const combinedFiles = [...imageFiles, ...newFiles].slice(0, 4);
      setImageFiles(combinedFiles);
      setPreviewUrls(combinedFiles.map(file => URL.createObjectURL(file)));
    }
  };

  const removeImage = (indexToRemove) => {
    setImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.author || !form.password || !form.content) return alert('모든 항목을 입력해주세요.');
    setIsSubmitting(true);
    try {
      let uploadedUrls = [];
      if (imageFiles.length > 0) {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true }; // 사진 용량 최적화
        for (const file of imageFiles) {
          const compressedFile = await imageCompression(file, options);
          const imageRef = ref(storage, `reviews/${Date.now()}_${compressedFile.name}`);
          const snapshot = await uploadBytes(imageRef, compressedFile);
          const url = await getDownloadURL(snapshot.ref);
          uploadedUrls.push(url);
        }
      }

      await addDoc(collection(db, 'reviews'), {
        productId,
        ...form,
        imageUrls: uploadedUrls,
        createdAt: new Date()
      });
      alert('리뷰가 등록되었습니다.');
      setShowModal(false);
      setForm({ author: '', password: '', rating: 5, content: '' });
      setImageFiles([]);
      setPreviewUrls([]);
    } catch (error) {
      console.error(error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (review) => {
    const pwd = window.prompt("리뷰 작성 시 입력한 비밀번호를 입력하세요.");
    if (pwd === null) return; // 취소 누름
    if (pwd !== review.password) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (window.confirm("정말 이 리뷰를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'reviews', review.id));
        alert("리뷰가 삭제되었습니다.");
      } catch (error) {
        console.error("Delete error:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
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
      ) : errorMsg ? (
        <p style={{ color: '#ef4444', padding: '2rem 0', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '8px' }}>{errorMsg}</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '8px' }}>아직 등록된 리뷰가 없습니다. 첫 리뷰를 작성해보세요!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(review => (
            <div key={review.id} style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ color: '#eab308', letterSpacing: '2px', display: 'block', marginBottom: '0.2rem' }}>{renderStars(review.rating)}</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {review.createdAt ? review.createdAt.toLocaleDateString() : ''}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteClick(review)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  삭제
                </button>
              </div>
              
              {/* 첨부된 사진 렌더링 */}
              {review.imageUrls && review.imageUrls.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0 1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {review.imageUrls.map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt={`review-photo-${idx}`} 
                      onClick={() => setExpandedImage(url)}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, border: '1px solid var(--border-color)' }} 
                    />
                  ))}
                </div>
              )}

              <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>{review.content}</p>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold' }}>
                작성자: {review.author}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 사진 확대 모달 */}
      {expandedImage && createPortal(
        <div 
          onClick={() => setExpandedImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
          <img src={expandedImage} alt="expanded" style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
        </div>,
        document.body
      )}

      {showModal && createPortal(
        <div className="admin-modal-overlay" style={{ zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-modal-content" style={{ maxWidth: '500px', width: '90%', background: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>리뷰 작성</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>이름</label>
                  <input required value={form.author} onChange={e => setForm({...form, author: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px' }} placeholder="홍길동" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>비밀번호</label>
                  <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px' }} placeholder="4자리 이상" />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>별점</label>
                <select value={form.rating} onChange={e => setForm({...form, rating: Number(e.target.value)})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px' }}>
                  <option value={5}>★★★★★ (5점 - 아주 좋아요)</option>
                  <option value={4}>★★★★☆ (4점 - 맘에 들어요)</option>
                  <option value={3}>★★★☆☆ (3점 - 보통이에요)</option>
                  <option value={2}>★★☆☆☆ (2점 - 그냥 그래요)</option>
                  <option value={1}>★☆☆☆☆ (1점 - 별로예요)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>리뷰 내용</label>
                <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px', minHeight: '100px', fontFamily: 'inherit' }} placeholder="솔직한 리뷰를 남겨주세요." />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>사진 첨부 (최대 4장)</label>
                <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ width: '100%', marginBottom: '0.5rem', color: 'var(--text-color)' }} />
                {previewUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {previewUrls.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={url} alt={`preview-${idx}`} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px' }} />
                        <button 
                          type="button" 
                          onClick={() => removeImage(idx)}
                          style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '1rem', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isSubmitting ? '등록 중...' : '리뷰 등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
