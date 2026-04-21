import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function BrandStory() {
  const { t } = useLanguage();

  return (
    <section id="about" className="story-section">
      <div className="container story-content">
        <h2 className="story-title">{t('story.title')}</h2>
        <p className="story-text">{t('story.content')}</p>
      </div>
    </section>
  );
}
