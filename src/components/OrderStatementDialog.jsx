import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { X, Printer } from 'lucide-react';
import { db } from '../firebase';
import { useStoreCopy } from '../i18n/storeCopy';
import OrderStatement from './OrderStatement';

export default function OrderStatementDialog({ orderId, userId, language, onClose }) {
  const copy = useStoreCopy();
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const closeCallback = useRef(onClose);
  useEffect(() => { closeCallback.current = onClose; }, [onClose]);
  const text = (ko, en) => language === 'ko' ? ko : en;
  useEffect(() => onSnapshot(doc(db, 'orders', orderId), (snapshot) => {
    // Keep the statement scoped to the signed-in owner, including admin accounts.
    if (!snapshot.exists() || snapshot.data().userId !== userId) { setResult(null); setFailed(true); return; }
    setResult({ ...snapshot.data(), id: snapshot.id }); setFailed(false);
  }, () => { setResult(null); setFailed(true); }), [orderId, userId, retry]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('order-statement-open');
    const background = Array.from(document.body.children).filter((element) => element !== dialogRef.current?.parentElement);
    const inertStates = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    closeRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeCallback.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]'));
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('order-statement-open');
      background.forEach((element, index) => { element.inert = inertStates[index]; });
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(<div className="order-statement-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="order-statement-dialog" role="dialog" aria-modal="true" aria-label={text('주문 전표', 'Order statement')}>
      <div className="order-statement-toolbar"><button type="button" disabled={!result || failed} onClick={() => window.print()}><Printer size={17} aria-hidden="true" />{text('인쇄 · PDF 저장', 'Print / Save PDF')}</button><button type="button" ref={closeRef} onClick={onClose} aria-label={text('전표 닫기', 'Close statement')}><X size={22} aria-hidden="true" /></button></div>
      {failed ? <div className="order-statement-feedback" role="alert"><p>{text('전표를 불러오지 못했습니다. 로그인 상태와 연결을 확인해 주세요.', 'Could not load this statement. Check your sign-in and connection.')}</p><button type="button" onClick={() => { setFailed(false); setRetry((n) => n + 1); }}>{text('다시 시도', 'Try again')}</button></div> : result ? <OrderStatement order={result} language={language} statusLabel={copy(result.status)} /> : <p className="order-statement-feedback" role="status">{text('전표를 불러오는 중…', 'Loading statement…')}</p>}
    </section>
  </div>, document.body);
}
