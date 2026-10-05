import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase';
import { normalizePromotion, safePromotionLink } from '../utils/launchPromotion';
import LaunchPromotionDialog from './LaunchPromotionDialog';

function localDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AdminLaunchPromotion() {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState('');
  const dirty = useRef(false);
  useEffect(() => onSnapshot(doc(db, 'settings', 'launchPopup'), snapshot => {
    if (!dirty.current) setDraft(normalizePromotion(snapshot.exists() ? snapshot.data() : {}));
  }, () => setMessage('팝업 설정을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.')), []);
  const change = (key, value) => {
    dirty.current = true;
    setMessage('');
    setDraft(current => ({ ...current, [key]: value }));
  };
  const upload = async (event, index) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('10MB 이하 JPG, PNG, WebP 사진을 선택해 주세요.'); return;
    }
    setBusy(true);
    setMessage('사진을 업로드하고 있습니다.');
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.65, maxWidthOrHeight: 1600, useWebWorker: true });
      const result = await uploadBytes(ref(storage, `settings/launch/${crypto.randomUUID()}`), compressed, { contentType: compressed.type });
      const url = await getDownloadURL(result.ref);
      dirty.current = true;
      setDraft(current => ({ ...current, images: current.images.map((src, i) => i === index ? url : src) }));
      setMessage('사진이 준비되었습니다. 팝업 저장을 누르면 스토어에 반영됩니다.');
    } catch { setMessage('사진 업로드에 실패했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    const fields = ['titleKo', 'titleEn', 'offerKo', 'offerEn', 'buttonKo', 'buttonEn'];
    if (fields.some(key => !draft[key].trim())) { setMessage('제목, 할인 안내와 버튼 문구를 한국어·영어 모두 입력해 주세요.'); return; }
    if (safePromotionLink(draft.href) !== draft.href) { setMessage('이동 주소는 / 또는 /?view=collection 형태의 스토어 주소를 입력해 주세요.'); return; }
    if (draft.startsAt && draft.endsAt && Date.parse(draft.startsAt) >= Date.parse(draft.endsAt)) {
      setMessage('종료 일시는 시작 일시보다 뒤여야 합니다.'); return;
    }
    setBusy(true); setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'launchPopup'), { ...normalizePromotion(draft), updatedAt: serverTimestamp() });
      dirty.current = false;
      setMessage('팝업 설정을 저장했습니다. 스토어에 바로 반영됩니다.');
    } catch { setMessage('저장에 실패했습니다. 관리자 로그인과 연결 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const fields = [['title', '제목', 70], ['description', '상품 소개', 120], ['offer', '할인 안내', 60], ['note', '쿠폰 적용 안내', 180], ['button', '버튼 문구', 40]];
  return <section className="admin-card">
    <h2 className="admin-card-title">신상품 · 이벤트 팝업</h2>
    <p className="launch-admin-help">스토어 홈 진입 시 표시됩니다. 닫으면 이번 방문 동안, ‘오늘 하루 보지 않기’를 누르면 오늘 자정까지 숨겨집니다.</p>
    {draft && <>
      <label><input type="checkbox" checked={draft.enabled} disabled={busy} onChange={e => change('enabled', e.target.checked)} /> 팝업 노출</label>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="launch-admin-grid">
          <label>시작 일시 (선택)<input className="admin-input" type="datetime-local" value={localDate(draft.startsAt)} onChange={e => change('startsAt', e.target.value ? new Date(e.target.value).toISOString() : '')} /></label>
          <label>종료 일시 (선택)<input className="admin-input" type="datetime-local" value={localDate(draft.endsAt)} onChange={e => change('endsAt', e.target.value ? new Date(e.target.value).toISOString() : '')} /></label>
        </div>
        <p className="launch-admin-help">접속한 기기의 시간대 기준입니다. 날짜를 비우면 기간 제한 없이 노출됩니다. 할인 안내와 실제 쿠폰 기간은 각각 관리됩니다.</p>
        <div className="launch-admin-photos">{draft.images.map((src, index) => <label key={index}><span>사진 {index + 1}</span><img src={src} alt={`팝업 사진 ${index + 1}`} /><input aria-label={`사진 ${index + 1} 교체`} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e, index)} /></label>)}</div>
        <div className="launch-admin-grid">{fields.flatMap(([key, label, maxLength]) => ['Ko', 'En'].map(locale => <label key={`${key}${locale}`}>{label} · {locale === 'Ko' ? '한국어' : 'English'}<input className="admin-input" maxLength={maxLength} value={draft[`${key}${locale}`]} onChange={e => change(`${key}${locale}`, e.target.value)} /></label>))}
          <label>상품 보기 이동 주소<input className="admin-input" value={draft.href} onChange={e => change('href', e.target.value)} /></label>
        </div>
      </fieldset>
      <div className="launch-admin-actions">
        <button type="button" className="admin-btn-secondary" onClick={() => setPreview('ko')}>한국어 미리보기</button>
        <button type="button" className="admin-btn-secondary" onClick={() => setPreview('en')}>English 미리보기</button>
        <button type="button" className="admin-btn-primary" disabled={busy} onClick={save}>{busy ? '처리 중…' : '팝업 저장'}</button>
      </div>
    </>}
    <p role="status" className="launch-admin-help">{message || (!draft ? '설정을 불러오는 중입니다.' : '')}</p>
    {preview && <LaunchPromotionDialog config={draft} language={preview} onClose={() => setPreview('')} onShop={() => setPreview('')} />}
  </section>;
}
