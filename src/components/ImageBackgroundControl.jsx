import React, { useState } from 'react';
import { detectImageBackground, loadBackgroundCanvas, sampleCanvasColor } from '../utils/imageBackground';
import './ImageBackgroundControl.css';

export default function ImageBackgroundControl({ imageUrl, value, onChange, onBusyChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(null);
  const openPicker = async () => {
    setBusy(true); onBusyChange(1); setError('');
    try { setPicker(await loadBackgroundCanvas(imageUrl)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); onBusyChange(-1); }
  };
  const pickColor = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? .5 : (event.clientX - rect.left) / rect.width;
    const y = event.detail === 0 ? .5 : (event.clientY - rect.top) / rect.height;
    const color = sampleCanvasColor(picker, x * picker.width, y * picker.height);
    if (!color) { setError('투명한 부분입니다. 색이 있는 지점을 선택해 주세요.'); return; }
    onChange({ imageUrl, mode: 'manual', color }); setError(''); setPicker(null);
  };
  const automatic = async () => {
    setBusy(true); onBusyChange(1); setError(''); setPicker(null);
    try { onChange({ imageUrl, mode: 'auto', color: await detectImageBackground(imageUrl) }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); onBusyChange(-1); }
  };
  return <fieldset className="image-background-control" disabled={busy}>
    <legend>사진 영역 배경색</legend>
    <div className="image-background-actions">
      <button type="button" aria-pressed={value?.mode === 'auto'} onClick={automatic}>{busy ? '색상 추출 중…' : '자동 배경색'}</button>
      <button type="button" aria-expanded={Boolean(picker)} onClick={openPicker}>사진에서 색 선택</button>
      <label>직접 지정 <input type="color" aria-label="배경색 직접 지정" value={value?.color || '#fafafa'} onInput={e => { setError(''); setPicker(null); onChange({ imageUrl, mode: 'manual', color: e.target.value }); }}/></label>
      {value && <button type="button" onClick={() => { setError(''); setPicker(null); onChange(null); }}>초기화</button>}
    </div>
    <small>{value ? `${value.mode === 'auto' ? '자동' : '직접 지정'} · ${value.color.toUpperCase()}` : '기본 배경'} · 상품 저장 시 반영</small>
    <p>사진 크기는 유지하고 사진 주변의 빈 공간에 적용합니다.</p>
    {error && <p role="alert">{error}</p>}
    {picker && <div className="image-background-picker">
      <p>아래 사진에서 원하는 색을 클릭하거나 터치해 주세요.</p>
      <button type="button" className="image-background-pick-surface" aria-label="사진에서 배경색 선택 (키보드로 누르면 중앙 색 선택)" onClick={pickColor}>
        <canvas ref={node => { if (node) { node.width = picker.width; node.height = picker.height; node.getContext('2d').drawImage(picker, 0, 0); } }}/>
      </button>
      <button type="button" onClick={() => setPicker(null)}>색 선택 취소</button>
    </div>}
  </fieldset>;
}
