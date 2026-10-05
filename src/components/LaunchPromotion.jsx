import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { normalizePromotion, promotionIsActive, promotionDismissed, dismissPromotion } from '../utils/launchPromotion';
import LaunchPromotionDialog from './LaunchPromotionDialog';

export default function LaunchPromotion({ ready = true }) {
  const [config, setConfig] = useState(null);
  const [dismissed, setDismissed] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const { language } = useLanguage();
  const navigate = useNavigate();
  useEffect(() => onSnapshot(doc(db, 'settings', 'launchPopup'), snapshot => {
    setConfig(normalizePromotion(snapshot.exists() ? snapshot.data() : {}));
  }, () => setConfig(null)), []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!ready || !config || !promotionIsActive(config, now) || dismissed === config.campaignId || promotionDismissed(config.campaignId)) return null;
  const close = today => {
    dismissPromotion(config.campaignId, today);
    setDismissed(config.campaignId);
  };
  return <LaunchPromotionDialog config={config} language={language} onClose={close} onShop={() => { close(false); navigate(config.href); }} />;
}
