import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { GUIDE_TYPES, guideType, guideMeasurements, createBlankGuide, emptyMeasurementRow, serializeGuide, createPoloGuide, displayMeasurement, validateGuide } from '../utils/measurementGuide';
import './SizeGuideDrawer.css';
import MeasuringDiagram from './MeasuringDiagram';

export default function SizeGuideDrawer({ guide, name, language = 'ko', editable = false, onApply, onClose }) {
  const ko = language === 'ko';
  const [draft, setDraft] = useState(() => structuredClone(guide || createBlankGuide('tops')));
  const [unit, setUnit] = useState('cm');
  const [error, setError] = useState('');
  const draftsByType = useRef({});
  const dialog = useRef(null);
  const headingId = useId();
  const shown = editable ? draft : guide;
  const type = guideType(shown);
  const config = GUIDE_TYPES[type];
  const measurements = guideMeasurements(shown);
  const changeType = (nextType) => {
    draftsByType.current[type] = structuredClone(draft);
    setDraft(structuredClone(draftsByType.current[nextType] || createBlankGuide(nextType)));
    setError('');
  };
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.current.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el => !el.disabled);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  const change = (index, key, value) => { setError(''); setDraft(prev => ({ ...prev, rows: prev.rows.map((row, i) => i === index ? { ...row, [key]: value } : row) })); };
  const apply = () => {
    const message = validateGuide(draft);
    if (message) { setError(message); return; }
    onApply(serializeGuide(draft));
    onClose();
  };
  return createPortal(<div className="sg-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sg-drawer" role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1} ref={dialog}>
      <header className="sg-header"><h2 id={headingId}>{editable ? '스타일 사이즈 가이드' : ko ? '사이즈 가이드' : 'SIZE GUIDE'}</h2><button type="button" onClick={onClose} aria-label={ko ? '닫기' : 'Close'}>×</button></header>
      <div className="sg-content">
        <p className="sg-product">{name}</p>
        {editable && <label className="sg-type-select">가이드 종류<select value={type} onChange={event => changeType(event.target.value)}>{Object.entries(GUIDE_TYPES).map(([key, value]) => <option key={key} value={key}>{value.ko}</option>)}</select></label>}
        <p>{ko ? config.noteKo : config.noteEn}</p>
        {editable ? <div className="sg-tools"><span>입력 단위: cm</span><>{type === 'tops' && <button type="button" onClick={() => { setDraft({ ...createPoloGuide(), type: 'tops' }); setError(''); }}>폴로 표 수치 불러오기</button>}</><button type="button" onClick={() => setDraft(prev => ({ ...prev, rows: [...prev.rows, emptyMeasurementRow(type)] }))}>+ 사이즈 추가</button></div> : <div className="sg-tools" aria-label={ko ? '측정 단위' : 'Measurement unit'}>{['cm','in'].map(value => <button key={value} type="button" aria-pressed={unit === value} onClick={() => setUnit(value)}>{value}</button>)}</div>}
        {shown?.rows?.length ? <div className="sg-table-scroll" tabIndex={0} aria-label={ko ? '사이즈 치수 표, 가로 스크롤 가능' : 'Size chart, horizontally scrollable'}><table className="sg-table"><thead><tr><th scope="col">{ko ? '측정 항목' : 'Measurement'} ({unit})</th>{shown.rows.map((row,index) => <th scope="col" key={index}>{editable ? <><input aria-label={`사이즈 ${index+1} 이름`} value={row.size} onChange={e => change(index,'size',e.target.value)} maxLength={15}/><button type="button" className="sg-remove" aria-label={`${row.size || index+1} 사이즈 삭제`} onClick={() => setDraft(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }))}>삭제</button></> : row.size}</th>)}</tr></thead><tbody>{measurements.map((measurement,index) => <tr key={measurement.key}><th scope="row">{index+1}. {ko ? measurement.ko : measurement.en}</th>{shown.rows.map((row,i) => <td key={i}>{editable ? <input type="number" min="0.1" max="500" step="0.1" aria-label={`${row.size} ${measurement.ko} cm`} value={row[measurement.key] ?? ''} onChange={e => change(i,measurement.key,e.target.value)}/> : displayMeasurement(row[measurement.key],unit)}</td>)}</tr>)}</tbody></table></div> : <p>{ko ? '등록된 치수가 없습니다.' : 'Measurements have not been added yet.'}</p>}
        <p className="sg-note">{type === 'hats'
          ? (ko ? '측정 방법에 따라 오차가 있을 수 있습니다. 평소 잘 맞는 모자와 비교해 주세요.' : 'Measurements may vary. Compare with a hat that fits you well.')
          : (ko ? '측정 방법에 따라 1–2cm 오차가 있을 수 있습니다. 평소 잘 맞는 옷과 비교해 주세요.' : 'Measurements may vary by 1–2 cm. Compare with a garment that fits you well.')}</p>
        <h3>{ko ? '측정 방법' : 'HOW TO MEASURE'}</h3>
        <MeasuringDiagram ko={ko} type={type}/>
        <ol className="sg-instructions">{measurements.map(m => <li key={m.key}><strong>{ko ? m.ko : m.en}</strong><p>{ko ? m.helpKo : m.helpEn}</p></li>)}</ol>
        {editable && <p className="sg-note">이 스타일의 모든 색상에 공통으로 적용됩니다. 패널에서 적용한 뒤 상단 ‘저장 및 반영’을 눌러야 운영에 저장됩니다.</p>}
      </div>
      {editable && <footer className="sg-footer">{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>취소</button><button type="button" onClick={apply}>상품에 적용</button></footer>}
    </section>
  </div>, document.body);
}
