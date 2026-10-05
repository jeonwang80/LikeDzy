import React, { useState } from 'react';
import { detectImageBackground } from '../utils/imageBackground';
import './ImageBackgroundControl.css';

export default function ImageBackgroundControl({ imageUrl, value, onChange, onBusyChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const automatic = async () => {
    setBusy(true); onBusyChange(1); setError('');
    try { onChange({ imageUrl, mode: 'auto', color: await detectImageBackground(imageUrl) }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); onBusyChange(-1); }
  };
  return <fieldset className="image-background-control" disabled={busy}>
    <legend>사진 영역 배경색</legend>
    <div className="image-background-actions">
      <button type="button" aria-pressed={value?.mode === 'auto'} onClick={automatic}>{busy ? '색상 추출 중…' : '자동 배경색'}</button>
      <label>직접 지정 <input type="color" aria-label="배경색 직접 지정" value={value?.color || '#fafafa'} onInput={e => { setError(''); onChange({ imageUrl, mode: 'manual', color: e.target.value }); }}/></label>
      {value && <button type="button" onClick={() => { setError(''); onChange(null); }}>초기화</button>}
    </div>
    <small>{value ? `${value.mode === 'auto' ? '자동' : '직접 지정'} · ${value.color.toUpperCase()}` : '기본 배경'} · 상품 저장 시 반영</small>
    <p>사진 크기는 유지하고 사진 주변의 빈 공간에 적용합니다.</p>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
