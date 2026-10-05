import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ProductFeedback.css';

export default function FeedbackDialog({ title, children, onClose, busy = false }) {
  const titleId = useId();
  const dialog = useRef(null);
  const close = useRef(onClose);
  const locked = useRef(busy);
  useEffect(() => { close.current = onClose; locked.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const viewport = window.visualViewport;
    const resize = () => {
      const overlay = dialog.current?.parentElement;
      if (!overlay) return;
      overlay.style.height = `${viewport?.height ?? window.innerHeight}px`;
      overlay.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    const keydown = (event) => {
      if (event.key === 'Escape' && !locked.current) { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...dialog.current.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && [first, dialog.current].includes(document.activeElement)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && [last, dialog.current].includes(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      previous?.focus();
    };
  }, []);
  return createPortal(<div className="pf-overlay">
    <section className="pf-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1} ref={dialog}>
      <header className="pf-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="pf-close" aria-label="닫기" disabled={busy} onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>, document.body);
}
