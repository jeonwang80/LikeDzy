import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './LaunchPromotion.css';

export default function LaunchPromotionDialog({ config, language = 'ko', onClose, onShop }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  const titleId = useId();
  const ko = language === 'ko';
  const copy = (key) => config[`${key}${ko ? 'Ko' : 'En'}`];
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const siblings = [...document.body.children].filter(el => !el.contains(dialog.current));
    const inertStates = siblings.map(el => el.inert);
    siblings.forEach(el => { el.inert = true; });
    dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(false); }
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.current.querySelectorAll('button')].filter(el => !el.disabled);
      const first = buttons[0]; const last = buttons.at(-1);
      if (event.shiftKey && [first, dialog.current].includes(document.activeElement)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && [last, dialog.current].includes(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      siblings.forEach((el, i) => { el.inert = inertStates[i]; });
      document.removeEventListener('keydown', keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(<div className="launch-overlay">
    <section className="launch-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialog}>
      <header className="launch-topline"><span>LIKEDZY</span><span>THE MOTION EDIT</span><button type="button" className="launch-close" aria-label={ko ? '팝업 닫기' : 'Close popup'} onClick={() => onClose(false)}>×</button></header>
      <div className="launch-photos">{config.images.map((src, index) => <img key={`${index}-${src}`} src={src} alt={ko ? `신상품 스타일 ${index + 1}` : `New arrival look ${index + 1}`} width="1122" height="1402" />)}</div>
      <div className="launch-content">
        <div className="launch-intro"><p className="launch-eyebrow">NEW ARRIVALS</p><h2 id={titleId}>{copy('title')}</h2><p className="launch-description">{copy('description')}</p></div>
        <div className="launch-offer"><p>{copy('offer')}</p><button type="button" className="launch-shop" onClick={onShop}>{copy('button')}<span aria-hidden="true">↗</span></button></div>
        <p className="launch-note">{copy('note')}</p>
      </div>
      <footer className="launch-footer"><button type="button" onClick={() => onClose(true)}>{ko ? '오늘 하루 보지 않기' : 'Hide for today'}</button><button type="button" onClick={() => onClose(false)}>{ko ? '닫기' : 'Close'}</button></footer>
    </section>
  </div>, document.body);
}
