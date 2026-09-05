import React, { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './IntroSplash.css';

const SESSION_KEY = 'likedzy-intro-seen';
const MAX_SPLASH_MS = 3500;

export default function IntroSplash({ onComplete }) {
  const [stage, setStage] = useState('loading');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const completeRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Optional session preference. */ }
    setStage('hidden');
    completeRef.current?.();
  }, []);

  useEffect(() => {
    let disposed = false;
    let animationTimer;
    let image;
    const maxTimer = window.setTimeout(finish, MAX_SPLASH_MS);
    const start = () => {
      if (disposed || completedRef.current) return;
      setStage('entering');
      animationTimer = window.setTimeout(finish, 1200);
    };
    const load = async () => {
      try {
        if (sessionStorage.getItem(SESSION_KEY)) { finish(); return; }
      } catch { /* Still provide the skip button when session storage is blocked. */ }
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
      try {
        const snapshot = await getDoc(doc(db, 'settings', 'main'));
        if (disposed || completedRef.current) return;
        const data = snapshot.exists() ? snapshot.data() : {};
        if (data.splashEnabled === false) { finish(); return; }
        if (!data.splashImageUrl) { start(); return; }
        image = new Image();
        image.onload = () => { setBgImageUrl(data.splashImageUrl); start(); };
        image.onerror = start;
        image.src = data.splashImageUrl;
      } catch {
        if (!disposed) finish();
      }
    };
    load();
    return () => {
      disposed = true;
      window.clearTimeout(maxTimer);
      window.clearTimeout(animationTimer);
      if (image) { image.onload = null; image.onerror = null; }
    };
  }, [finish]);

  if (stage === 'hidden') return null;
  return (
    <div className="intro-splash-overlay" aria-label="LIKEDZY 소개">
      <button type="button" onClick={finish} style={{ position: 'absolute', right: 24, top: 24, zIndex: 1, padding: '12px 18px', color: '#fff', background: '#222', border: '1px solid #fff', borderRadius: 24 }}>
        건너뛰기
      </button>
      {stage !== 'loading' && (
        <div className="intro-splash-background" style={bgImageUrl ? { backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
          <div className="intro-splash-content">
            <h1 className="intro-splash-logo">LIKEDZY</h1>
            <p className="intro-splash-text">프리미엄을 경험하다</p>
          </div>
        </div>
      )}
    </div>
  );
}
