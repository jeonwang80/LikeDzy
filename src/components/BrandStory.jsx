import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function BrandStory() {
  const { t } = useLanguage();

  return (
    <section id="about" className="story-section">
      <div className="container story-content">
        <h2 className="story-title">{t('story.title')}</h2>
        <div className="story-manifesto">
          <p className="story-text">{t('story.content')}</p>
          <strong className="story-signature">{t('story.signature')}</strong>
        </div>
      </div>
    </section>
  );
}
