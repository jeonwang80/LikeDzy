import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="hero">
      <img 
        src="./hero_woven_golf_1776726365621.png" 
        alt="LikeDzy Woven Golf Apparel" 
        className="hero-image fade-in" 
      />
      <div className="hero-content">
        <h1 className="hero-title fade-in delay-1">{t('hero.title')}</h1>
        <p className="hero-subtitle fade-in delay-2">{t('hero.subtitle')}</p>
        <button className="btn-primary fade-in delay-2">{t('hero.cta')}</button>
      </div>
    </section>
  );
}
