import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './HeroSection.css'; // 새로 만들 스타일 파일

export default function HeroSection() {
  const { t } = useLanguage();
  const [heroImages, setHeroImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'main'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.heroImageUrls && data.heroImageUrls.length > 0) {
            setHeroImages(data.heroImageUrls);
          } else if (data.heroImageUrl) {
            setHeroImages([data.heroImageUrl]);
          }
        }
      } catch (error) {
        console.error("Error fetching hero image:", error);
      }
    };
    fetchHero();
  }, []);

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const scrollTo = (index) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-swipeable">
      <div 
        className="hero-swipe-container" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {heroImages.length > 0 ? (
          heroImages.map((src, idx) => (
            <div key={idx} className="hero-swipe-slide">
              <img 
                src={src} 
                alt={`LikeDzy Main Banner ${idx + 1}`} 
                className="hero-image"
              />
            </div>
          ))
        ) : (
          <div className="hero-swipe-slide" style={{ backgroundColor: '#0f172a' }}></div>
        )}

        {heroImages.length > 1 && (
          <div className="hero-dots">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hero-content-area">
        <h1 className="hero-title">{t('hero.title')}</h1>
        <p className="hero-subtitle">{t('hero.subtitle')}</p>
      </div>
    </section>
  );
}
