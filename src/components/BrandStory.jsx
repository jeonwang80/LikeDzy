import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function BrandStory() {
  const { t } = useLanguage();
  const storyTitleLabel = t('story.title').replace(/\n/g, ' ');

  return (
    <section id="about" className="story-section">
      <div className="container story-content">
        <h2 className="story-title" aria-label={storyTitleLabel}>
          <span>WE <span className="story-brand-accent">LIKE</span></span>
          <span><span className="story-brand-accent">D</span>RIVING</span>
          <span>THE <span className="story-brand-accent">Z</span>ENITH</span>
          <span>IN <span className="story-brand-accent">Y</span>OU</span>
        </h2>
        <div className="story-manifesto">
          <p className="story-text">{t('story.content')}</p>
          <strong className="story-signature">{t('story.signature')}</strong>
        </div>
      </div>
    </section>
  );
}
