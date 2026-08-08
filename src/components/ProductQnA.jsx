import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ProductQnA({ productId }) {
  const [qnas, setQnas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ author: '', password: '', content: '', isSecret: false });
  const [viewPassword, setViewPassword] = useState({});

  useEffect(() => {
    if (!productId) return;
    const q = query(
      collection(db, 'qna'), 
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQnas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.author || !form.password || !form.content) return alert('모든 항목을 입력해주세요.');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'qna'), {
        productId,
        ...form,
        status: '답변 대기',
        reply: '',
        createdAt: new Date()
      });
      alert('문의가 등록되었습니다.');
      setShowModal(false);
      setForm({ author: '', password: '', content: '', isSecret: false });
    } catch (error) {
      console.error(error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = (qnaId, correctPassword) => {
    const input = prompt('비밀번호를 입력해주세요:');
    if (input === null) return;
    if (input === correctPassword) {
      setViewPassword(prev => ({ ...prev, [qnaId]: true }));
    } else {
      alert('비밀번호가 일치하지 않습니다.');
    }
  };

  const handleDeleteClick = async (qna) => {
    const pwd = window.prompt("문의 작성 시 입력한 비밀번호를 입력하세요.");
    if (pwd === null) return; // 취소 누름
    if (pwd !== qna.password) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (window.confirm("정말 이 문의를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'qna', qna.id));
        alert("문의가 삭제되었습니다.");
      } catch (error) {
        console.error("Delete error:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>상품 Q&A ({qnas.length})</h3>
        <button onClick={() => setShowModal(true)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          문의하기
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>문의 내역을 불러오는 중...</p>
      ) : qnas.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '2rem 0', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '8px' }}>등록된 문의가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {qnas.map(qna => {
            const isLocked = qna.isSecret && !viewPassword[qna.id];
            
            return (
              <div key={qna.id} style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      background: qna.status === '답변 완료' ? '#16a34a' : '#475569',
                      color: 'white'
                    }}>
                      {qna.status || '답변 대기'}
                    </span>
                    {qna.isSecret && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🔒 비밀글</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {qna.createdAt ? qna.createdAt.toLocaleDateString() : ''}
                    </span>
                    <button 
                      onClick={() => handleDeleteClick(qna)}
                      style={{ border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                
                {isLocked ? (
                  <div style={{ margin: '1rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>비밀글입니다. 작성자와 관리자만 볼 수 있습니다.</p>
                    <button onClick={() => handleUnlock(qna.id, qna.password)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '4px', cursor: 'pointer' }}>
                      비밀번호 입력
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '1rem 0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{qna.content}</p>
                    
                    {qna.reply && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #3b82f6', borderRadius: '0 4px 4px 0' }}>
                        <div style={{ fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem', fontSize: '0.9rem' }}>↳ 관리자 답변</div>
                        <p style={{ margin: 0, lineHeight: '1.5', color: '#e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{qna.reply}</p>
                      </div>
                    )}
                  </>
                )}
                
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'bold', marginTop: '1rem' }}>
                  작성자: {qna.author}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && createPortal(
        <div className="admin-modal-overlay" style={{ zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-modal-content" style={{ maxWidth: '500px', width: '90%', background: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>상품 문의하기</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>이름</label>
                  <input required value={form.author} onChange={e => setForm({...form, author: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="홍길동" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>비밀번호</label>
                  <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="4자리 이상" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>문의 내용</label>
                <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '100px', fontFamily: 'inherit' }} placeholder="궁금한 점을 남겨주세요." />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="isSecret" 
                  checked={form.isSecret} 
                  onChange={e => setForm({...form, isSecret: e.target.checked})} 
                  style={{ width: '1rem', height: '1rem' }}
                />
                <label htmlFor="isSecret" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>비밀글로 작성하기 (작성자와 관리자만 볼 수 있습니다)</label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isSubmitting ? '등록 중...' : '문의 등록하기'}
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
