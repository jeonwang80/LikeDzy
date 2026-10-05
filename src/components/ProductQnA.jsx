import React, { useState, useEffect } from 'react';
import FeedbackDialog from './FeedbackDialog';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, deleteDoc, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toSafeDate } from '../utils/boardPresentation';

export default function ProductQnA({ productId }) {
  const { currentUser, isAdmin } = useAuth();
  const [qnas, setQnas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ author: '', content: '', isSecret: true });
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Re-check visibility during render as well, so logout cannot expose stale private content.
  const visibleQnas = qnas.filter((entry) => entry.productId === productId && (entry.isSecret === false || isAdmin || entry.userId === currentUser?.uid));

  useEffect(() => {
    if (!productId) return;
    const results = new Map();
    const queries = [query(collection(db, 'qnaV2'), where('productId', '==', productId), ...(isAdmin ? [] : [where('isSecret', '==', false)]), orderBy('createdAt', 'desc'), limit(pageSize))];
    if (currentUser && !isAdmin) queries.push(query(collection(db, 'qnaV2'), where('productId', '==', productId), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(pageSize)));
    const unsubscribes = queries.map((q, index) => onSnapshot(q, (snapshot) => {
      results.set(index, snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data(), createdAt: toSafeDate(entry.data().createdAt) })));
      const unique = new Map([...results.values()].flat().map((entry) => [entry.id, entry]));
      setQnas([...unique.values()].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)));
      setHasMore([...results.values()].some((entries) => entries.length >= pageSize));
      setErrorMsg('');
      setLoading(false);
    }, () => { setErrorMsg('문의 목록을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.'); setLoading(false); }));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [productId, currentUser, isAdmin, pageSize]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('로그인 후 문의를 작성해 주세요.');
    if (!form.author.trim() || !form.content.trim()) return alert('닉네임과 문의 내용을 입력해 주세요.');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'qnaV2'), {
        productId,
        schemaVersion: 2,
        userId: currentUser.uid,
        author: form.author.trim(),
        content: form.content.trim(),
        isSecret: form.isSecret,
        status: '답변 대기',
        reply: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert('문의가 등록되었습니다.');
      setShowModal(false);
      setForm({ author: '', content: '', isSecret: true });
    } catch (error) {
      console.error(error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (qna) => {
    if (!currentUser || (!isAdmin && qna.userId !== currentUser.uid)) return;
    if (window.confirm("정말 이 문의를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'qnaV2', qna.id));
        alert("문의가 삭제되었습니다.");
      } catch (error) {
        console.error("Delete error:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  return <section className="pf-section">
    <div className="pf-heading"><h3>상품 Q&A ({visibleQnas.length})</h3><button className="pf-button" onClick={() => currentUser ? setShowModal(true) : window.location.assign('#/login')}>문의하기</button></div>
    <p className="pf-hint">비밀 문의와 답변은 작성자와 관리자만 볼 수 있습니다. 이전 비밀번호 방식의 문의는 고객센터로 문의해 주세요.</p>
    {errorMsg && <p className="pf-error" role="alert">{errorMsg}</p>}
    {loading ? <p className="pf-empty">문의 내역을 불러오는 중...</p> : !visibleQnas.length ? <p className="pf-empty">등록된 문의가 없습니다.</p> : <div className="pf-list">
      {visibleQnas.map(qna => <article key={qna.id} className="pf-card">
        <div className="pf-card-header">
          <div className="pf-badges"><span className={`pf-status ${qna.reply ? 'pf-status-answered' : ''}`}>{qna.reply ? '답변 완료' : '답변 대기'}</span>{qna.isSecret && <span className="pf-secret">비밀글</span>}</div>
          <div className="pf-card-meta"><time>{qna.createdAt?.toLocaleDateString()}</time>{(isAdmin || currentUser?.uid === qna.userId) && <button className="pf-delete" onClick={() => handleDeleteClick(qna)}>삭제</button>}</div>
        </div>
        <p className="pf-content">{qna.content}</p>
        {qna.reply && <div className="pf-reply"><strong>관리자 답변</strong><p>{qna.reply}</p></div>}
        <p className="pf-author">작성자: {qna.author}</p>
      </article>)}
    </div>}
    {hasMore && <button type="button" className="pf-button pf-button-secondary pf-more" onClick={() => setPageSize(size => size + 20)}>문의 더 보기</button>}
    {showModal && <FeedbackDialog title="상품 문의하기" onClose={() => setShowModal(false)} busy={isSubmitting}>
      <form className="pf-form" onSubmit={handleSubmit}>
        <div className="pf-form-body">
          <div className="pf-field"><label htmlFor="qna-author">닉네임</label><input id="qna-author" required maxLength={40} value={form.author} onChange={e => setForm({...form, author: e.target.value})} placeholder="공개할 닉네임" disabled={isSubmitting}/></div>
          <div className="pf-field"><label htmlFor="qna-content">문의 내용</label><textarea id="qna-content" required maxLength={3000} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="궁금한 내용을 입력해 주세요." disabled={isSubmitting}/><small className="pf-hint">공개 문의에는 전화번호나 주소를 입력하지 마세요.</small></div>
          <label className="pf-check"><input type="checkbox" checked={form.isSecret} onChange={e => setForm({...form, isSecret: e.target.checked})} disabled={isSubmitting}/><span>비밀글로 작성<small>작성자와 관리자만 볼 수 있습니다.</small></span></label>
        </div>
        <div className="pf-form-actions"><button type="button" className="pf-button pf-button-secondary" disabled={isSubmitting} onClick={() => setShowModal(false)}>취소</button><button type="submit" className="pf-button" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '문의 등록하기'}</button></div>
      </form>
    </FeedbackDialog>}
  </section>;
}
