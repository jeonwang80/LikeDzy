import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { MEASUREMENTS, createPoloGuide, displayMeasurement, validateGuide } from '../utils/measurementGuide';
import './SizeGuideDrawer.css';

function MeasuringDiagram({ ko }) {
  const marker = useId().replace(/:/g, '');
  return <svg className="sg-diagram" viewBox="0 0 600 570" role="img" aria-label={ko ? '티셔츠 측정 위치: 총장, 어깨너비, 가슴둘레, 소매길이, 밑단둘레' : 'T-shirt measurement positions: length, shoulders, chest, sleeve and hem'}>
    <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill="#b32632" /></marker></defs>
    <path d="M240 70Q300 108 360 70L420 94L525 224L446 278L405 220L417 485Q300 506 183 485L195 220L154 278L75 224L180 94Z" fill="#f2f4f5" stroke="#87929c" strokeWidth="2" />
    <path d="M240 70Q300 160 360 70M180 94L195 220M420 94L405 220M183 474Q300 493 417 474" fill="none" stroke="#b4bdc4" strokeWidth="2" />
    <g fill="none" stroke="#b32632" strokeWidth="2.5" markerStart={`url(#${marker})`} markerEnd={`url(#${marker})`}>
      <path d="M180 48H420" /><path d="M225 86V482" /><path d="M445 97L546 224" />
    </g>
    <g fill="none" stroke="#b32632" strokeWidth="2.5">
      <path d="M195 254A105 21 0 0 1 405 254M183 470A117 23 0 0 1 417 470" strokeDasharray="7 6" />
      <path d="M405 254A105 21 0 0 1 195 254M417 470A117 23 0 0 1 183 470" markerEnd={`url(#${marker})`} />
    </g>
    {[[206,370,'1'],[300,25,'2'],[300,298,'3'],[527,130,'4'],[300,525,'5']].map(([x,y,n]) => <g key={n}><circle cx={x} cy={y} r="15" fill="#b32632"/><text x={x} y={y+5} textAnchor="middle" fill="white" fontSize="16" fontWeight="700">{n}</text></g>)}
  </svg>;
}

export default function SizeGuideDrawer({ guide, name, language = 'ko', editable = false, onApply, onClose }) {
  const ko = language === 'ko';
  const [draft, setDraft] = useState(() => structuredClone(guide || { version: 1, rows: [] }));
  const [unit, setUnit] = useState('cm');
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const headingId = useId();
  const shown = editable ? draft : guide;
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
    onApply({ version: 1, rows: draft.rows.map(row => ({ size: row.size.trim(), ...Object.fromEntries(MEASUREMENTS.map(({ key }) => [key, Number(row[key])])) })) });
    onClose();
  };
  return createPortal(<div className="sg-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sg-drawer" role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1} ref={dialog}>
      <header className="sg-header"><h2 id={headingId}>{editable ? '스타일 사이즈 가이드' : ko ? '사이즈 가이드' : 'SIZE GUIDE'}</h2><button type="button" onClick={onClose} aria-label={ko ? '닫기' : 'Close'}>×</button></header>
      <div className="sg-content">
        <p className="sg-product">{name}</p>
        <p>{ko ? '제품 실측 치수입니다. 가슴과 밑단은 전체 둘레 기준입니다.' : 'Actual garment measurements. Chest and hem values are full circumferences.'}</p>
        {editable ? <div className="sg-tools"><span>입력 단위: cm</span><button type="button" onClick={() => { setDraft(createPoloGuide()); setError(''); }}>첨부 표 수치 불러오기</button><button type="button" onClick={() => setDraft(prev => ({ ...prev, rows: [...prev.rows, { size: '', length: '', shoulder: '', chest: '', sleeve: '', hem: '' }] }))}>+ 사이즈 추가</button></div> : <div className="sg-tools" aria-label={ko ? '측정 단위' : 'Measurement unit'}>{['cm','in'].map(value => <button key={value} type="button" aria-pressed={unit === value} onClick={() => setUnit(value)}>{value}</button>)}</div>}
        {shown?.rows?.length ? <div className="sg-table-scroll" tabIndex={0} aria-label={ko ? '사이즈 치수 표, 가로 스크롤 가능' : 'Size chart, horizontally scrollable'}><table className="sg-table"><thead><tr><th scope="col">{ko ? '측정 항목' : 'Measurement'} ({unit})</th>{shown.rows.map((row,index) => <th scope="col" key={index}>{editable ? <><input aria-label={`사이즈 ${index+1} 이름`} value={row.size} onChange={e => change(index,'size',e.target.value)} maxLength={15}/><button type="button" className="sg-remove" aria-label={`${row.size || index+1} 사이즈 삭제`} onClick={() => setDraft(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }))}>삭제</button></> : row.size}</th>)}</tr></thead><tbody>{MEASUREMENTS.map((measurement,index) => <tr key={measurement.key}><th scope="row">{index+1}. {ko ? measurement.ko : measurement.en}</th>{shown.rows.map((row,i) => <td key={i}>{editable ? <input type="number" min="0.1" max="500" step="0.1" aria-label={`${row.size} ${measurement.ko} cm`} value={row[measurement.key] ?? ''} onChange={e => change(i,measurement.key,e.target.value)}/> : displayMeasurement(row[measurement.key],unit)}</td>)}</tr>)}</tbody></table></div> : <p>{ko ? '등록된 치수가 없습니다.' : 'Measurements have not been added yet.'}</p>}
        <p className="sg-note">{ko ? '측정 방법에 따라 1–2cm 오차가 있을 수 있습니다. 평소 잘 맞는 옷과 비교해 주세요.' : 'Measurements may vary by 1–2 cm. Compare with a garment that fits you well.'}</p>
        <h3>{ko ? '측정 방법' : 'HOW TO MEASURE'}</h3>
        <MeasuringDiagram ko={ko}/>
        <ol className="sg-instructions">{MEASUREMENTS.map(m => <li key={m.key}><strong>{ko ? m.ko : m.en}</strong><p>{ko ? m.helpKo : m.helpEn}</p></li>)}</ol>
        {editable && <p className="sg-note">이 스타일의 모든 색상에 공통으로 적용됩니다. 패널에서 적용한 뒤 상단 ‘저장 및 반영’을 눌러야 운영에 저장됩니다.</p>}
      </div>
      {editable && <footer className="sg-footer">{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>취소</button><button type="button" onClick={apply}>상품에 적용</button></footer>}
    </section>
  </div>, document.body);
}
