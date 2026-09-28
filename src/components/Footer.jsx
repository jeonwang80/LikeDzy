import { useStoreCopy } from '../i18n/storeCopy';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../i18n/LanguageContext';
import { db } from '../firebase';
import { normalizeCommerceSettings } from '../utils/commerce';

export default function Footer() {
  const copy = useStoreCopy();
  const { t } = useLanguage();
  const [commerce, setCommerce] = useState(() => normalizeCommerceSettings());

  useEffect(() => onSnapshot(
    doc(db, 'settings', 'commerce'),
    (snapshot) => setCommerce(normalizeCommerceSettings(snapshot.exists() ? snapshot.data() : {})),
    () => {},
  ), []);

  return (
    <footer className="footer">
      <div className="footer-logo">
        <img src="/likedzy-logo.png" alt="LIKEDZY" />
      </div>
      <p className="footer-rights">{t('footer.rights')}</p>
      <nav aria-label={copy("쇼핑 안내")} style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', padding: '12px 0' }}><Link to="/orders/lookup">{copy("주문 조회")}</Link><Link to="/policies/terms">{copy("이용약관")}</Link><Link to="/policies/privacy">{copy("개인정보 처리방침")}</Link><Link to="/policies/returns">{copy("교환·반품 안내")}</Link></nav>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('footer.company')}</p>
      {commerce.businessName && (
        <div className="footer-business-info">
          <span>{commerce.businessName}{copy("· 대표")}{commerce.representativeName}</span>
          <span>{copy("사업자등록번호")}{commerce.businessNumber}{commerce.ecommerceNumber ? ` ${copy("· 통신판매업")} ${commerce.ecommerceNumber}` : ''}</span>
          <span>{commerce.businessAddress}</span>
          <span>{copy("고객센터")}{commerce.customerServicePhone} · {commerce.customerServiceEmail}</span>
          <a href="https://www.ftc.go.kr/www/selectBizCommList.do?key=254" target="_blank" rel="noreferrer">{copy("사업자정보 확인 ↗")}</a>
        </div>
      )}
    </footer>
  );
}
