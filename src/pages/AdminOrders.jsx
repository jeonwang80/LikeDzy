import React, { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from '../firebase';
import { changeOrderStatus, completeOrderRefund, saveOrderReceipt, saveOrderShipment } from '../services/orderService';
import { DELIVERY_CARRIERS, formatKRW, formatKoreanDateTime, getTrackingUrl } from '../utils/commerce';
import { ORDER_TRANSITIONS, ORDER_STATUSES } from '../utils/orderWorkflow';

const PAGE_SIZE = 50;
export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [cursors, setCursors] = useState([null]);
  const [lastDoc, setLastDoc] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSnapshot, setSelectedOrder] = useState(null);
  const selectedOrder = selectedSnapshot?.id === selectedId ? selectedSnapshot : null;
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ courier: DELIVERY_CARRIERS[0], trackingNumber: '' });
  const [receipt, setReceipt] = useState({ status: '발급 완료', reference: '' });
  const [refund, setRefund] = useState({ amount: '', reference: '' });
  const cursor = cursors[cursors.length - 1];
  const loading = !loadedQuery || loadedQuery.statusFilter !== statusFilter || loadedQuery.cursor !== cursor;

  useEffect(() => {
    const constraints = [...(statusFilter === '전체' ? [] : [where('status', '==', statusFilter)]), orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE)];
    return onSnapshot(query(collection(db, 'orders'), ...constraints), (snapshot) => {
      setOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLastDoc(snapshot.docs.at(-1) || null); setError(''); setLoadedQuery({ statusFilter, cursor });
    }, () => { setError('주문 목록을 불러오지 못했습니다. 권한·연결·색인 배포 상태를 확인해 주세요.'); setOrders([]); setLoadedQuery({ statusFilter, cursor }); });
  }, [statusFilter, cursor]);
  useEffect(() => {
    if (!selectedId) return undefined;
    return onSnapshot(doc(db, 'orders', selectedId), (snapshot) => setSelectedOrder(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
      () => setError('선택한 주문을 조회하지 못했습니다.'));
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return undefined;
    const close = (event) => { if (event.key === 'Escape') setSelectedId(''); };
    window.addEventListener('keydown', close);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', close); document.body.style.overflow = previous; };
  }, [selectedId]);
  const open = (order) => {
    setSelectedId(order.id); setSelectedOrder(order);
    setDraft({ courier: order.courier || DELIVERY_CARRIERS[0], trackingNumber: order.trackingNumber || '' });
    setReceipt({ status: '발급 완료', reference: '' });
    setRefund({ amount: String(order.totalAmountNumber || ''), reference: '' });
    setError('');
  };
  const run = async (action) => {
    setBusy(true); setError('');
    try { await action(); }
    catch (failure) { setError(failure.message || '저장하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const statusChange = async (order, status) => {
    if (!status || status === order.status) return;
    const extra = {};
    if (status === '입금 확인' && !window.confirm('실제 은행 입금내역과 주문금액·입금자를 대조했습니까?')) return;
    if (status === '주문 취소' && !window.confirm('미입금 주문을 취소하고 예약 재고를 해제할까요?')) return;
    if (status === '반품입고') {
      extra.note = window.prompt('실제 반품을 받은 후 검수 결과를 입력하세요.');
      if (!extra.note?.trim()) return;
      extra.restock = window.confirm('재판매 가능한 정상 상품입니까? 확인은 재고 복원, 취소는 불량·폐기 처리입니다.');
    }
    await run(() => changeOrderStatus(order.id, status, order.status, extra));
  };
  const statusSelect = (order) => <select className="admin-select order-list-status-select" aria-label={`${order.orderNumber || order.id} 주문 상태`} value={order.status || ''} disabled={busy || order.schemaVersion !== 2} onClick={(event) => event.stopPropagation()} onChange={(event) => statusChange(order, event.target.value)}>
    <option value={order.status || ''}>{order.status || '상태 확인 필요'}</option>
    {(ORDER_TRANSITIONS[order.status] || []).map((status) => <option key={status}>{status}</option>)}
  </select>;
  const oldOrder = selectedOrder && selectedOrder.schemaVersion !== 2;
  return <div className="admin-page orders-admin-page">
    <div className="admin-page-header admin-orders-compact-header"><div><span className="admin-page-eyebrow">ORDER OPERATIONS</span><h1>주문 관리</h1><p>최신 발생일자순 · 페이지당 50건 · 입금과 환불은 실제 은행 처리 확인 후 기록하세요.</p></div><button className="admin-btn-secondary" onClick={() => setCursors([null])}>최신 주문으로</button></div>
    <nav className="order-status-filters" aria-label="주문 상태 필터">{['전체', ...ORDER_STATUSES].map((status) => <button key={status} className={statusFilter === status ? 'active' : ''} onClick={() => { setStatusFilter(status); setCursors([null]); }}>{status}</button>)}</nav>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    {loading ? <p role="status">주문 목록을 불러오는 중…</p> : !orders.length ? <div className="admin-card orders-empty">해당 페이지의 주문이 없습니다.</div> : <section className="admin-card order-table-card"><div className="order-table-scroll"><table className="order-management-table">
      <thead><tr><th>발생일자</th><th>주문번호</th><th>주문자</th><th>상품·옵션</th><th>결제금액</th><th>입금·증빙</th><th>배송</th><th>상태</th><th>상세</th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order.id} onClick={() => open(order)}>
        <td>{formatKoreanDateTime(order.createdAt)}</td><td><strong>{order.orderNumber || order.id}</strong>{order.isTestOrder && <span>TEST</span>}</td>
        <td><strong>{order.name || '-'}</strong><span>{order.phone || '-'}</span></td>
        <td><strong>{order.items?.[0]?.productName || '기존 상품'}</strong><span>{order.items?.[0]?.colorName} / {order.items?.[0]?.optionName} · {(order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}개{order.items?.length > 1 ? ` · 외 ${order.items.length - 1}종` : ''}</span></td>
        <td>{formatKRW(order.totalAmountNumber)}</td><td><strong>{order.depositName || order.name || '-'}</strong><span>{order.cashReceiptStatus || '미신청'}</span></td>
        <td><strong>{order.courier || '-'}</strong><span>{order.trackingNumber || '송장 미등록'}</span></td><td>{statusSelect(order)}</td>
        <td><button className="order-detail-open" onClick={(event) => { event.stopPropagation(); open(order); }}>상세</button></td>
      </tr>)}</tbody>
    </table></div></section>}
    <footer className="order-table-footer"><span>{cursors.length}페이지 · {orders.length}건</span><button className="admin-btn-secondary" disabled={loading || cursors.length === 1} onClick={() => setCursors((current) => current.slice(0, -1))}>이전</button><button className="admin-btn-secondary" disabled={loading || orders.length < PAGE_SIZE || !lastDoc} onClick={() => setCursors((current) => [...current, lastDoc])}>다음</button></footer>
    {selectedOrder && <div className="order-detail-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(''); }}>
      <aside className="order-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
        <header><div><span>{selectedOrder.orderNumber || selectedOrder.id}</span><h2 id="order-detail-title">{selectedOrder.name}님의 주문</h2><p>{formatKoreanDateTime(selectedOrder.createdAt)}</p></div><button onClick={() => setSelectedId('')} aria-label="주문 상세 닫기">×</button></header>
        <div className="order-detail-body">
          {error && <p className="checkout-error" role="alert">{error}</p>}
          {oldOrder && <p role="alert">이전 구조의 주문입니다. 색상별 재고·입금 이력을 대조하기 전에는 상태를 변경할 수 없습니다.</p>}
          <section className="order-detail-state-panel"><strong>{formatKRW(selectedOrder.totalAmountNumber)}</strong>{statusSelect(selectedOrder)}</section>
          <section className="order-detail-section"><h3>상품</h3><ul className="order-detail-items">{(selectedOrder.items || []).map((item, index) => <li key={index}><div><strong>{item.productName}</strong><span>{item.colorName} / {item.optionName} · {item.quantity}개</span></div><b>{formatKRW(item.lineAmount)}</b></li>)}</ul><p>상품 {formatKRW(selectedOrder.subtotal)} · 배송비 {formatKRW(selectedOrder.shippingFee)}</p></section>
          <section className="order-detail-section order-detail-info-grid"><div><h3>입금</h3><p>입금자 {selectedOrder.depositName || selectedOrder.name}</p><p>{selectedOrder.phone}</p><p>기한 {formatKoreanDateTime(selectedOrder.depositDeadlineAt)}</p><p>입금확인 {formatKoreanDateTime(selectedOrder.paidAt)}</p></div><div><h3>배송지</h3><p>{selectedOrder.recipientName} · {selectedOrder.recipientPhone}</p><p>{selectedOrder.address}</p><p>{selectedOrder.notes || '-'}</p></div></section>
          <section className="order-detail-section order-detail-shipment"><h3>송장 등록</h3><div><select className="admin-select" value={draft.courier} onChange={(event) => setDraft((value) => ({ ...value, courier: event.target.value }))}>{DELIVERY_CARRIERS.map((carrier) => <option key={carrier}>{carrier}</option>)}</select><input className="admin-input" aria-label="송장번호" placeholder="송장번호" value={draft.trackingNumber} onChange={(event) => setDraft((value) => ({ ...value, trackingNumber: event.target.value }))} /><button className="admin-btn-primary" disabled={busy || oldOrder || !['입금 확인', '상품 준비중', '발송 완료'].includes(selectedOrder.status)} onClick={() => run(() => saveOrderShipment(selectedId, draft, selectedOrder.status))}>송장 저장</button></div>{selectedOrder.trackingNumber && <a target="_blank" rel="noreferrer" href={getTrackingUrl(selectedOrder.courier, selectedOrder.trackingNumber)}>배송 조회 ↗</a>}</section>
          <section className="order-detail-section"><h3>현금영수증</h3><p>신청 유형: {selectedOrder.cashReceipt?.type || selectedOrder.cashReceiptType || 'none'} · 식별번호: {selectedOrder.cashReceipt?.identity || selectedOrder.cashReceiptIdentity || '-'}</p><p>현재: {selectedOrder.cashReceiptStatus || '미신청'} · 처리번호: {selectedOrder.cashReceiptReference || '-'}</p><p>외부 발급 시스템에서 실제 발급·취소 후 확인번호를 기록합니다. 이 버튼은 영수증을 발급하지 않습니다.</p><select className="admin-select" value={receipt.status} onChange={(event) => setReceipt((value) => ({ ...value, status: event.target.value }))}>{['발급 완료', '자진발급 완료', '발급 취소'].map((status) => <option key={status}>{status}</option>)}</select><input className="admin-input" placeholder="발급 또는 취소 확인번호" value={receipt.reference} onChange={(event) => setReceipt((value) => ({ ...value, reference: event.target.value }))} /><button className="admin-btn-primary" disabled={busy || oldOrder || !receipt.reference.trim()} onClick={() => run(() => saveOrderReceipt(selectedId, receipt, selectedOrder.status))}>실제 처리 결과 기록</button></section>
          {['환불요청', '반품입고', '환불완료'].includes(selectedOrder.status) && <section className="order-detail-section"><h3>전액 환불 기록</h3><p>반환 계좌는 고객 본인 확인 후 별도 확인하세요. 실제 은행 환불을 완료한 뒤 기록합니다. 이 버튼은 송금하지 않습니다.</p>{selectedOrder.status === '환불완료' ? <p>{formatKRW(selectedOrder.refund?.amount)} · 확인번호 {selectedOrder.refund?.reference}</p> : <><input className="admin-input" type="number" aria-label="실제 환불 금액" value={refund.amount} onChange={(event) => setRefund((value) => ({ ...value, amount: event.target.value }))} /><input className="admin-input" placeholder="은행 이체 확인번호" value={refund.reference} onChange={(event) => setRefund((value) => ({ ...value, reference: event.target.value }))} /><button className="admin-btn-primary" disabled={busy || oldOrder || !refund.reference.trim()} onClick={() => { if (window.confirm('실제 은행 환불을 완료했습니까? 금액과 확인번호를 기록합니다.')) run(() => completeOrderRefund(selectedId, { ...refund, amount: Number(refund.amount) }, selectedOrder.status)); }}>환불 완료 기록</button></>}</section>}
        </div>
      </aside>
    </div>}
  </div>;
}
