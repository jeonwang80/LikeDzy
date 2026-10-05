import React, { useState, useEffect, useRef } from 'react';
import FeedbackDialog from './FeedbackDialog';
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
  const [expandedImage, setExpandedImage] = useState(null);
  const previewRef = useRef([]);
  const updatePreviews = (urls) => {
    previewRef.current.forEach(url => URL.revokeObjectURL(url));
    previewRef.current = urls;
    setPreviewUrls(urls);
  };
  useEffect(() => () => previewRef.current.forEach(url => URL.revokeObjectURL(url)), []);

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
      setErrorMsg("리뷰를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
      updatePreviews(combinedFiles.map(file => URL.createObjectURL(file)));
      e.target.value = '';
    }
  };

  const removeImage = (indexToRemove) => {
    setImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    updatePreviews(imageFiles.filter((_, i) => i !== indexToRemove).map(file => URL.createObjectURL(file)));
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
      updatePreviews([]);
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

  return <section className="pf-section">
    <div className="pf-heading"><h3>고객 리뷰 ({reviews.length})</h3><button className="pf-button" onClick={() => currentUser ? setShowModal(true) : window.location.assign('#/login')}>리뷰 작성하기</button></div>
    <p className="pf-hint">로그인 후 리뷰를 작성할 수 있습니다. 글과 사진에 전화번호, 주소 등 개인정보를 포함하지 마세요.</p>
    {loading ? <p className="pf-empty">리뷰를 불러오는 중...</p> : errorMsg ? <p className="pf-error" role="alert">{errorMsg}</p> : !reviews.length ? <p className="pf-empty">아직 등록된 리뷰가 없습니다.</p> : <div className="pf-list">
      {reviews.filter(review => review.productId === productId).map(review => <article key={review.id} className="pf-card">
        <div className="pf-card-header"><div><span className="pf-stars" aria-label={`${safeRating(review.rating)}점`}>{renderStars(review.rating)}</span><div className="pf-card-meta"><time>{review.createdAt?.toLocaleDateString()}</time></div></div>{(isAdmin || currentUser?.uid === review.userId) && <button className="pf-delete" onClick={() => handleDeleteClick(review)}>삭제</button>}</div>
        {review.imageUrls?.length > 0 && <div className="pf-photos">{review.imageUrls.map((url, idx) => <button key={url} type="button" className="pf-photo" aria-label={`리뷰 사진 ${idx + 1} 크게 보기`} onClick={() => setExpandedImage(url)}><img src={url} alt={`리뷰 사진 ${idx + 1}`}/></button>)}</div>}
        <p className="pf-content">{review.content}</p>
        <p className="pf-author">작성자: {review.author} · {review.purchaseVerified ? '구매 인증' : '구매 미인증'}</p>
      </article>)}
    </div>}
    {hasMore && <button type="button" className="pf-button pf-button-secondary pf-more" onClick={() => setPageSize(size => size + 20)}>리뷰 더 보기</button>}
    {expandedImage && <FeedbackDialog title="리뷰 사진" onClose={() => setExpandedImage(null)}><div className="pf-expanded"><img src={expandedImage} alt="리뷰 사진 크게 보기"/></div></FeedbackDialog>}
    {showModal && <FeedbackDialog title="리뷰 작성" onClose={() => setShowModal(false)} busy={isSubmitting}>
      <form className="pf-form" onSubmit={handleSubmit}>
        <div className="pf-form-body">
          <div className="pf-field"><label htmlFor="review-author">닉네임</label><input id="review-author" required maxLength={40} value={form.author} onChange={e => setForm({...form, author: e.target.value})} placeholder="공개할 닉네임" disabled={isSubmitting}/></div>
          <div className="pf-field"><label htmlFor="review-rating">별점</label><select id="review-rating" value={form.rating} onChange={e => setForm({...form, rating: Number(e.target.value)})} disabled={isSubmitting}>
            <option value={5}>★★★★★ (5점 · 아주 좋아요)</option><option value={4}>★★★★☆ (4점 · 좋아요)</option><option value={3}>★★★☆☆ (3점 · 보통이에요)</option><option value={2}>★★☆☆☆ (2점 · 아쉬워요)</option><option value={1}>★☆☆☆☆ (1점 · 별로예요)</option>
          </select></div>
          <div className="pf-field"><label htmlFor="review-content">리뷰 내용</label><textarea id="review-content" required maxLength={3000} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="솔직한 리뷰를 남겨주세요." disabled={isSubmitting}/></div>
          <div className="pf-field"><label htmlFor="review-photos">사진 첨부 ({imageFiles.length}/4)</label><input id="review-photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImageChange} disabled={isSubmitting}/>
            <small className="pf-hint">JPG, PNG, WebP, GIF · 한 장당 최대 10MB</small>
            {previewUrls.length > 0 && <div className="pf-previews">{previewUrls.map((url, idx) => <div key={url} className="pf-preview"><img src={url} alt={`첨부 사진 ${idx + 1}`}/><button type="button" disabled={isSubmitting} aria-label={`첨부 사진 ${idx + 1} 삭제`} onClick={() => removeImage(idx)}>×</button></div>)}</div>}
          </div>
        </div>
        <div className="pf-form-actions"><button type="button" className="pf-button pf-button-secondary" disabled={isSubmitting} onClick={() => setShowModal(false)}>취소</button><button type="submit" className="pf-button" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '리뷰 등록하기'}</button></div>
      </form>
    </FeedbackDialog>}
  </section>;
}
