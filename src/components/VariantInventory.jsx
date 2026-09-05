import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { setVariantStock } from '../services/orderService';
import { randomKey } from '../utils/checkoutSession';

export default function VariantInventory({ product, onClose }) {
  const [records, setRecords] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => onSnapshot(query(collection(db, 'inventory'), where('productId', '==', product.id), limit(200)), (snapshot) => {
    setRecords(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    setLoading(false);
  }, () => { setMessage('재고 조회 실패: 관리자 권한과 연결을 확인해 주세요.'); setLoading(false); }), [product.id]);
  const combinations = useMemo(() => {
    const colors = product.colorSwatches?.length ? product.colorSwatches : product.colors?.length ? product.colors : [{ name: '기본' }];
    const savedSizes = product.sizeOptions || product.options;
    const sizes = savedSizes?.length ? savedSizes : [{ name: '기본' }];
    return colors.flatMap((color) => sizes.map((size) => ({ colorName: color.name || '기본', optionName: size.name || '기본' })));
  }, [product]);
  const save = async (combination, key, record) => {
    const draft = drafts[key];
    if (!draft || !Number.isInteger(Number(draft.stock)) || Number(draft.stock) < 0) return setMessage('0 이상의 정수 재고를 입력해 주세요.');
    setBusy(key); setMessage('');
    try {
      await setVariantStock({ productId: product.id, ...combination, stock: Number(draft.stock), expectedVersion: draft.version, requestId: draft.requestId });
      setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      setMessage(`${combination.colorName} / ${combination.optionName} 저장 완료`);
    } catch (error) { setMessage(`${error.message || '재고 저장 실패'} 현재 서버 재고: ${record?.stock ?? '미등록'}. 충돌 시 입력 초기화 후 다시 확인해 주세요.`); }
    finally { setBusy(''); }
  };
  return <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="색상·사이즈별 재고 관리">
    <section className="admin-drawer">
      <header className="admin-drawer-header"><div><span>SKU INVENTORY</span><h2>색상·사이즈별 재고</h2><p>{product.name}</p></div><button className="admin-icon-btn" onClick={onClose} aria-label="닫기">×</button></header>
      <div className="admin-option-list">
        <p>판매가능 수량은 예약 수량을 제외한 재고입니다. 주문과 동시에 바뀐 재고는 덮어쓰지 않고 충돌을 안내합니다.</p>
        <p>기존 사이즈 재고는 색상별로 자동 배분하지 않습니다. 실재고를 확인한 뒤 조합별로 등록해 주세요. 미등록 조합은 판매되지 않습니다.</p>
        <details><summary>기존 재고 참고 (새 SKU에 자동 합산되지 않음)</summary>{(product.options || []).map((option) => <p key={option.name}>{option.name}: {Number(option.stock) || 0}개</p>)}</details>
        {message && <p role="status">{message}</p>}
        {loading ? <p>재고 확인 중…</p> : combinations.map((combination) => {
          const key = JSON.stringify([combination.colorName, combination.optionName]);
          const record = records.find((item) => item.colorName === combination.colorName && item.optionName === combination.optionName);
          const draft = drafts[key];
          const stale = draft && draft.version !== (record?.version || 0);
          return <article className="admin-option-card" key={key}>
            <strong>{combination.colorName} / {combination.optionName}</strong>
            <p>현재 판매가능 {record?.stock ?? '미등록'} · 예약 {record?.reserved || 0} · 판매 {record?.sold || 0}</p>
            <label>판매가능 수량<input className="admin-input" type="number" min="0" step="1" value={draft?.stock ?? record?.stock ?? ''} placeholder="실재고 확인 후 입력" onChange={(event) => setDrafts((current) => ({ ...current, [key]: { stock: event.target.value, version: current[key]?.version ?? record?.version ?? 0, requestId: randomKey() } }))} /></label>
            {stale && <p role="alert">주문 또는 다른 관리자가 재고를 변경했습니다. 입력 초기화 후 다시 입력해 주세요.</p>}
            <button className="admin-btn-primary" disabled={!!busy || !draft || stale} onClick={() => save(combination, key, record)}>{busy === key ? '저장 중…' : '이 조합 저장'}</button>
            <button className="admin-btn-secondary" disabled={!!busy} onClick={() => setDrafts((current) => { const next = { ...current }; delete next[key]; return next; })}>입력 초기화</button>
          </article>;
        })}
      </div>
      <footer className="admin-drawer-footer"><button className="admin-btn-secondary" onClick={onClose}>닫기</button></footer>
    </section>
  </div>;
}
