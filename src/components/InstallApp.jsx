import { useState, useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getInstallState, promptInstall, subscribeInstall } from '../utils/pwa';
import './InstallApp.css';

export default function InstallApp() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const state = useSyncExternalStore(subscribeInstall, getInstallState);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  if (state === 'installed') return null;
  const install = async () => {
    if (state !== 'available') { setHelp(value => !value); return; }
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    setHelp(outcome === 'unavailable');
  };
  return <div className="install-app">
    <button type="button" className="install-app-button" onClick={install} disabled={busy} aria-expanded={help} aria-controls="install-app-help">
      <Download size={18} aria-hidden="true" />{ko ? 'LIKEDZY 앱 설치' : 'Install LIKEDZY'}
    </button>
    {help && <div id="install-app-help" className="install-app-help" role="status">
      <p><strong>{ko ? '아이폰 · 아이패드' : 'iPhone · iPad'}</strong><br />{ko ? 'Safari에서 열고 공유 → 홈 화면에 추가를 선택해 주세요.' : 'Open in Safari, then choose Share → Add to Home Screen.'}</p>
      <p><strong>{ko ? '안드로이드 · PC' : 'Android · Desktop'}</strong><br />{ko ? 'Chrome 또는 Edge 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해 주세요. 이미 설치했다면 홈 화면의 LIKEDZY 아이콘으로 열 수 있습니다.' : 'In Chrome or Edge, choose Install app or Add to Home Screen from the menu. If already installed, open LIKEDZY from your home screen.'}</p>
      <button type="button" onClick={() => setHelp(false)}>{ko ? '닫기' : 'Close'}</button>
    </div>}
  </div>;
}
