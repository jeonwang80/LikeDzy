import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './IntroSplash.css'; // 별도 CSS 파일 사용

export default function IntroSplash({ onComplete }) {
  const [stage, setStage] = useState('loading'); // 'loading', 'entering', 'zooming', 'hidden'
  const [bgImageUrl, setBgImageUrl] = useState(null); 
  const [isCustomImage, setIsCustomImage] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let zoomTimer;
    let hideTimer;
    
    const startAnimations = () => {
      if (!isMounted) return;
      setStage('entering');
      
      zoomTimer = setTimeout(() => {
        if (isMounted) setStage('zooming');
      }, 1000); // 1초 대기 후 줌인

      hideTimer = setTimeout(() => {
        if (isMounted) {
          setStage('hidden');
          if (onComplete) onComplete();
        }
      }, 2000); // 총 2초 후 완료
    };

    const fetchSplashImage = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'main'));
        if (docSnap.exists() && docSnap.data().splashImageUrl) {
          const url = docSnap.data().splashImageUrl;
          setBgImageUrl(url);
          setIsCustomImage(true);
          
          // 이미지 프리로딩
          const img = new Image();
          img.src = url;
          img.onload = startAnimations;
          img.onerror = startAnimations; // 에러나도 진행
        } else {
          // 커스텀 이미지 없을 때
          setBgImageUrl('/favicon.png');
          setIsCustomImage(false);
          startAnimations();
        }
      } catch (error) {
        console.error("Error fetching splash image:", error);
        setBgImageUrl('/favicon.png');
        setIsCustomImage(false);
        startAnimations();
      }
    };

    fetchSplashImage();

    return () => {
      isMounted = false;
      clearTimeout(zoomTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (stage === 'hidden') return null;

  return (
    <div className={`intro-splash-overlay ${stage === 'zooming' ? 'zoom-out' : ''}`}>
      {stage !== 'loading' && (
        <div 
          className="intro-splash-background"
          style={isCustomImage ? {
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {}}
        >
          <div className="intro-splash-content" style={{ marginTop: '0' }}>
            <h1 className="intro-splash-logo">LikeDzy</h1>
            <p className="intro-splash-text">프리미엄을 경험하다</p>
          </div>
        </div>
      )}
    </div>
  );
}
