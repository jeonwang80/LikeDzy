import { useStoreCopy } from '../i18n/storeCopy';
import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { marketSettings } from '../utils/market';
import './CheckoutPage.css';
const POLICIES = { terms: ['이용약관', 'termsText'], privacy: ['개인정보 처리방침', 'privacyText'], returns: ['배송·교환·반품 안내', 'returnsText'] };
export default function PolicyPage() {
  const copy = useStoreCopy();
  const { type } = useParams();
  const { language, currency } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => onSnapshot(doc(db, 'settings', 'commerce'), (snapshot) => setSettings(snapshot.data() || {}), () => setError(copy("정책을 불러오지 못했습니다. 다시 시도해 주세요."))), [copy]);
  const selectedSettings = settings ? marketSettings(settings, currency) : null;
  const [title, field] = POLICIES[type] || [copy("안내를 찾을 수 없습니다."), ''];
  return <main className="checkout-page"><article className="checkout-success-card" style={{ margin: '0 auto', maxWidth: 900, textAlign: 'left' }}><Link to="/">← LIKEDZY</Link><h1>{language === 'ko' ? title : ({terms:'Terms of service',privacy:'Privacy policy',returns:'Delivery and returns'}[type] || 'Page not found')}</h1><p role="status">{error || (!settings ? copy("안내를 불러오는 중…") : '')}</p><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.8 }}>{selectedSettings?.[field] || (settings ? copy("운영자가 정책을 확정 중입니다. 확정 전에는 일반 주문을 접수하지 않습니다.") : '')}</div>{settings && <p>{copy("고객센터:")}{settings.customerServicePhone || copy("등록 준비 중")} · {settings.customerServiceEmail || ''}</p>}</article></main>;
}
