import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function HeroSection() {
  const { t } = useLanguage();
  const [heroImages, setHeroImages] = useState(['./ghibli_golf_hero.png', './hero_woven_golf_likedzy.png']);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  useEffect(() => {
    if (heroImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000); // 4초마다 변경
    
    return () => clearInterval(interval);
  }, [heroImages]);

  return (
    <section className="hero">
      <div className="hero-image-container">
        {heroImages.map((src, idx) => (
          <img 
            key={idx}
            src={src} 
            alt={`LikeDzy Main Banner ${idx}`} 
            className="hero-image" 
            style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: idx === currentIndex ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
              zIndex: idx === currentIndex ? 1 : 0
            }}
          />
        ))}
      </div>
      <div className="hero-content-container">
        <div className="hero-content">
          <h1 className="hero-title fade-in delay-1">{t('hero.title')}</h1>
          <p className="hero-subtitle fade-in delay-2">{t('hero.subtitle')}</p>
          <button 
            className="btn-primary fade-in delay-2"
            onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('hero.cta')}
          </button>
        </div>
      </div>
    </section>
  );
}
