import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function BrandStory() {
  const { t } = useLanguage();
  const values = t('story.values');

  return (
    <section id="about" className="story-section">
      <div className="story-marquee" aria-hidden="true">
        <span>MOVE LIGHT · STAY READY · GO BEYOND ·&nbsp;</span>
        <span>MOVE LIGHT · STAY READY · GO BEYOND ·&nbsp;</span>
      </div>
      <div className="container story-content">
        <p className="outdoor-section-kicker story-kicker">{t('story.kicker')}</p>
        <h2 className="story-title">{t('story.title')}</h2>
        <p className="story-text">{t('story.content')}</p>
        {Array.isArray(values) && (
          <div className="story-values">
            {values.map((value, index) => (
              <div className="story-value" key={value}>
                <span>0{index + 1}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
