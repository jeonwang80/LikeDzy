import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { setVariantStock } from '../services/orderService';
import { randomKey } from '../utils/checkoutSession';
import { getInventoryAxes } from '../utils/inventorySummary';
import './VariantInventory.css';
const cellKey = (color, size) => JSON.stringify([color, size]);

export function InventoryGrid({ product, records, loading, readError, onSave, onClose }) {
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const { colors, sizes } = useMemo(() => getInventoryAxes(product), [product]);
  const byKey = useMemo(() => new Map(records.map(r => [cellKey(r.colorName, r.optionName), r])), [records]);
  const reset = key => {
    setDrafts(current => { const next = { ...current }; delete next[key]; return next; });
    setErrors(current => { const next = { ...current }; delete next[key]; return next; });
  };
  const close = () => { if (!busy && (!Object.keys(drafts).length || window.confirm('저장하지 않은 재고 입력을 버리고 닫을까요?'))) onClose(); };
  const save = async () => {
    const entries = Object.entries(drafts);
    const invalid = Object.fromEntries(entries.filter(([,d]) => !/^\d+$/.test(d.stock) || !Number.isSafeInteger(Number(d.stock)) || Number(d.stock) > 1000000).map(([key]) => [key, '0~1,000,000의 정수를 입력하세요.']));
    if (Object.keys(invalid).length) { setErrors(invalid); setMessage('표시된 수량을 확인해 주세요.'); return; }
    setBusy(true); setErrors({}); setMessage('저장 중…');
    let success = 0; const failed = {};
    for (const [key, draft] of entries) {
      const [colorName, optionName] = JSON.parse(key);
      try {
        await onSave({ productId: product.id, colorName, optionName, stock: Number(draft.stock), expectedVersion: draft.version, requestId: draft.requestId });
        reset(key); success++;
      } catch (error) { failed[key] = error.message || '저장 실패. 다시 시도해 주세요.'; }
    }
    setErrors(failed); setMessage(`${success}개 저장 완료${Object.keys(failed).length ? ` · ${Object.keys(failed).length}개 실패: 표시된 칸을 확인해 주세요.` : ''}`); setBusy(false);
  };
  const count = Object.keys(drafts).length;
  return <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="색상·사이즈별 재고 관리">
    <section className="admin-drawer inventory-grid-drawer">
      <header className="admin-drawer-header"><div><span>SKU INVENTORY</span><h2>색상·사이즈별 재고</h2><p>{product.name}</p></div><button type="button" className="admin-icon-btn" disabled={busy} onClick={close} aria-label="닫기">×</button></header>
      <div className="inventory-grid-content">
        <p className="inventory-grid-hint">색상 × 사이즈별 <strong>판매가능 수량</strong>을 입력하세요. 변경한 칸만 저장됩니다.</p>
        {readError && <p role="alert">재고 조회 실패: 관리자 권한과 연결을 확인해 주세요.</p>}
        {message && <p role="status">{message}</p>}
        {loading ? <p>재고 확인 중…</p> : <div className="inventory-table-scroll" tabIndex={0} aria-label="재고 입력 표, 가로 스크롤 가능"><table className="inventory-matrix"><thead><tr><th scope="col">색상 / 사이즈</th>{sizes.map(size => <th scope="col" key={size}>{size}</th>)}</tr></thead><tbody>{colors.map(color => <tr key={color}><th scope="row">{color}</th>{sizes.map(size => {
          const key = cellKey(color,size); const record = byKey.get(key); const draft = drafts[key];
          const stale = draft && draft.version !== (record?.version || 0);
          const error = errors[key] || (stale ? '재고가 변경됐습니다. 최신값으로 초기화 후 입력하세요.' : '');
          return <td key={size} className={`${draft ? 'is-edited' : ''} ${error ? 'has-error' : ''}`}>
            <input aria-label={`${color} / ${size} 판매가능 수량`} aria-invalid={!!error} type="number" inputMode="numeric" min="0" max="1000000" step="1" disabled={busy || readError} value={draft?.stock ?? record?.stock ?? ''} placeholder="미등록" onChange={e => { const stock=e.target.value; setDrafts(current => ({...current,[key]:{stock,version:current[key]?.version ?? record?.version ?? 0,requestId:randomKey()}})); setErrors(current=>({...current,[key]:''})); }} />
            <small>예약 {record?.reserved || 0} · 판매 {record?.sold || 0}</small>
            {error && <span className="inventory-cell-error" role="alert">{error}</span>}
            {draft && <button type="button" disabled={busy} onClick={()=>reset(key)}>입력 초기화</button>}
          </td>;
        })}</tr>)}</tbody></table></div>}
        <p className="inventory-grid-hint">빈칸은 미등록, 0은 품절입니다. 예약 수량은 제외하고 입력하세요.</p>
        <details className="inventory-grid-help"><summary>기존 재고 및 입력 안내</summary><p>주문 중 바뀐 재고는 덮어쓰지 않습니다. 저장에 실패한 칸만 다시 확인해 주세요. 기존 재고는 색상별로 자동 배분하지 않습니다.</p>{(product.options || []).map(option => <span key={option.name}>{option.name}: {Number(option.stock)||0}개 / </span>)}</details>
      </div>
      <footer className="admin-drawer-footer"><span className="inventory-change-count">변경 {count}개</span><button type="button" className="admin-btn-secondary" disabled={busy || !count} onClick={()=>{setDrafts({});setErrors({});setMessage('');}}>전체 입력 초기화</button><button type="button" className="admin-btn-primary" disabled={busy || loading || readError || !count} onClick={save}>{busy ? '저장 중…' : '변경사항 저장'}</button><button type="button" className="admin-btn-secondary" disabled={busy} onClick={close}>닫기</button></footer>
    </section>
  </div>;
}

export default function VariantInventory({ product, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);
  useEffect(() => onSnapshot(query(collection(db, 'inventory'), where('productId', '==', product.id), limit(200)), snapshot => {
    setRecords(snapshot.docs.map(entry => ({id:entry.id,...entry.data()}))); setLoading(false); setReadError(false);
  }, () => {setReadError(true);setLoading(false);}), [product.id]);
  return <InventoryGrid key={product.id} product={product} records={records} loading={loading} readError={readError} onSave={setVariantStock} onClose={onClose}/>;
}
