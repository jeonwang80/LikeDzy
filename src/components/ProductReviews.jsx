import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, deleteDoc, limit, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { safeRating, toSafeDate } from '../utils/boardPresentation';

export default function ProductReviews({ productId }) {
  const { currentUser, isAdmin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ author: '', rating: 5, content: '' });
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  
  // 사진 첨부 상태
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null); // 사진 확대용 상태

  useEffect(() => {
    if (!productId) return;
    const q = query(
      collection(db, 'reviewsV2'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc'), limit(pageSize)
    );
    let active = true;
    let revision = 0;
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const currentRevision = ++revision;
      const entries = await Promise.all(snapshot.docs.map(async (entry) => {
        const data = entry.data();
        const imageUrls = await Promise.all((data.imagePaths || []).slice(0, 4).map((path) => getDownloadURL(ref(storage, path)).catch(() => '')));
        return { id: entry.id, ...data, imageUrls: imageUrls.filter(Boolean), createdAt: toSafeDate(data.createdAt) };
      }));
      if (!active || currentRevision !== revision) return;
      setReviews(entries);
      setHasMore(snapshot.size >= pageSize);
      setLoading(false);
      setErrorMsg(null);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error);
      setErrorMsg("리뷰를 불러오는 중 오류가 발생했습니다. (설정 확인 필요)");
      setLoading(false);
    });
    return () => { active = false; unsubscribe(); };
  }, [productId, pageSize]);

  const handleImageChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (newFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
        alert('사진은 JPG, PNG, WebP, GIF 형식, 한 장당 10MB 이하로 선택해 주세요.');
        return;
      }
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
    if (!currentUser) return alert('로그인 후 리뷰를 작성해 주세요.');
    if (!form.author.trim() || !form.content.trim()) return alert('닉네임과 내용을 입력해 주세요.');
    setIsSubmitting(true);
    try {
      const uploadedPaths = [];
      if (imageFiles.length > 0) {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' };
        for (const file of imageFiles) {
          const compressedFile = await imageCompression(file, options);
          const path = `users/${currentUser.uid}/reviews/${crypto.randomUUID()}.webp`;
          await uploadBytes(ref(storage, path), compressedFile, { contentType: 'image/webp' });
          uploadedPaths.push(path);
        }
      }

      await addDoc(collection(db, 'reviewsV2'), {
        productId,
        schemaVersion: 2,
        userId: currentUser.uid,
        author: form.author.trim(),
        content: form.content.trim(),
        rating: safeRating(form.rating),
        purchaseVerified: false,
        imagePaths: uploadedPaths,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('리뷰가 등록되었습니다.');
      setShowModal(false);
      setForm({ author: '', rating: 5, content: '' });
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
    if (!currentUser || (!isAdmin && review.userId !== currentUser.uid)) return;
    if (window.confirm("정말 이 리뷰를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'reviewsV2', review.id));
        await Promise.allSettled((review.imagePaths || []).map((path) => deleteObject(ref(storage, path))));
        alert("리뷰가 삭제되었습니다.");
      } catch (error) {
        console.error("Delete error:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const renderStars = (rating) => {
    const value = safeRating(rating);
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  };

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>고객 리뷰 ({reviews.length})</h3>
        <button onClick={() => currentUser ? setShowModal(true) : window.location.assign('#/login')} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          리뷰 작성하기
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>로그인 후 작성할 수 있습니다. 공개 리뷰와 사진에 전화번호, 주소 등 개인정보를 포함하지 마세요. 구매 인증 여부는 별도 확인 전까지 미인증으로 표시됩니다.</p>

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
                {(isAdmin || currentUser?.uid === review.userId) && <button
                  onClick={() => handleDeleteClick(review)}
                  style={{ border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  삭제
                </button>}
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
                작성자: {review.author} · {review.purchaseVerified ? '구매 인증' : '구매 미인증'}
              </div>
            </div>
          ))}
        </div>
      )}
      {hasMore && <button type="button" className="btn-secondary" onClick={() => setPageSize((size) => size + 20)}>리뷰 더 보기</button>}

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
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>닉네임</label>
                  <input required maxLength={40} value={form.author} onChange={e => setForm({...form, author: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px' }} placeholder="공개할 닉네임" />
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
                <textarea required maxLength={3000} value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px', minHeight: '100px', fontFamily: 'inherit' }} placeholder="솔직한 리뷰를 남겨주세요." />
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
