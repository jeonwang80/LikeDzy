import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="footer-logo">LikeDzy</div>
      <p className="footer-rights">{t('footer.rights')}</p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('footer.company')}</p>
    </footer>
  );
}
