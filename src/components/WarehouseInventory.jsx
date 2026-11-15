import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { processWarehouse } from '../services/orderService';
import { randomKey } from '../utils/checkoutSession';
import { getInventoryAxes } from '../utils/inventorySummary';
import { formatKoreanDateTime } from '../utils/commerce';
import './VariantInventory.css';
const COUNTRIES = { KR:'한국', VN:'베트남', HU:'헝가리' };
const TYPES = { migrate:'기존 재고 → 메인 이관', receipt:'생산 완료 입고', dispatch:'국가 창고 출고', receive:'도착 국가 입고', transit_loss:'운송 손실 확정', return_main:'운송 물량 메인 반송 입고', receipt_reversal:'생산 입고 정정(차감)' };
const HISTORY = { ...TYPES, reserve:'주문 예약', confirm:'입금·판매 확정', release:'주문 취소 복원', expired:'예약 만료 복원', refund:'검수 반품 복원', dispose:'반품 폐기', adjustment:'기존 재고 조정', sale_shipment:'고객 배송 출고' };
const keyOf = (color,size) => JSON.stringify([color,size]);
export default function WarehouseInventory({product,onClose}) {
  const [records,setRecords]=useState([]); const [movements,setMovements]=useState([]); const [transfers,setTransfers]=useState([]); const [receipts,setReceipts]=useState([]);
  const [loaded,setLoaded]=useState({}); const [errors,setErrors]=useState({}); const [count,setCount]=useState(50);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const axes=useMemo(()=>getInventoryAxes(product),[product]);
  const [draft,setDraft]=useState({type:'receipt',colorName:axes.colors[0],optionName:axes.sizes[0],country:'VN',quantity:'',reference:'',note:'',transferId:'',receiptId:'',requestId:randomKey(),expectedVersion:null});
  useEffect(()=>{
    const subscriptions = [['inventory',setRecords],['inventoryMovements',setMovements],['warehouseTransfers',setTransfers],['warehouseReceipts',setReceipts]].map(([name,set]) =>
      onSnapshot(query(collection(db,name), where('productId','==',product.id), ...(name==='inventory' ? [] : [orderBy('createdAt','desc')]), limit(name==='inventory' ? 1000 : count)), snapshot => {
        set(snapshot.docs.map(doc => ({id:doc.id,...doc.data()})));
        setLoaded(v => ({...v,[name]:true}));
        setErrors(v => ({...v,[name]:''}));
      }, () => setErrors(v => ({...v,[name]:'조회 실패. 권한·연결·색인을 확인하세요.'})))
    );
    return ()=>subscriptions.forEach(stop=>stop());
  },[product.id,count]);
  const byKey=useMemo(()=>new Map(records.map(r=>[keyOf(r.colorName,r.optionName),r])),[records]);
  const selected=byKey.get(keyOf(draft.colorName,draft.optionName));
  const update=patch=>setDraft(v=>({...v,...patch,expectedVersion:null,requestId:randomKey()}));
  const readError=Object.values(errors).some(Boolean); const loading=Object.keys(loaded).length<4;
  const submit=async e=>{
    e.preventDefault(); if(busy)return;
    const request={...draft,productId:product.id,quantity:Number(draft.quantity),expectedVersion:draft.expectedVersion??selected?.version??0};
    if(request.type!=='migrate'&&(!/^\d+$/.test(draft.quantity)||request.quantity<1)){setMessage('1 이상의 정수 수량을 입력하세요.');return;}
    if(!window.confirm(`${TYPES[request.type]}: ${draft.colorName} / ${draft.optionName}${draft.type==='migrate'?'':` · ${request.quantity}개`}를 처리할까요? 원본 이력은 삭제되지 않습니다.`))return;
    setDraft(v=>({...v,expectedVersion:request.expectedVersion}));setBusy(true);setMessage('처리 중…');
    try{await processWarehouse(request);setMessage('처리 완료. 이력과 잔량을 확인하세요.');setDraft(v=>({...v,quantity:'',reference:'',note:'',transferId:'',receiptId:'',expectedVersion:null,requestId:randomKey()}));}
    catch(error){setMessage(error.message||'처리 실패. 같은 입력으로 재시도하면 중복 처리되지 않습니다.');}
    finally{setBusy(false);}
  };
  const totals=records.reduce((sum,r)=>({main:sum.main+(r.mainStock||0),transit:sum.transit+Object.values(r.inTransit||{}).reduce((a,b)=>a+b,0),available:sum.available+(r.stock||0),reserved:sum.reserved+(r.reserved||0)}),{main:0,transit:0,available:0,reserved:0});
  const chooseTransfer=id=>{const t=transfers.find(t=>t.id===id);update({transferId:id,...(t?{colorName:t.colorName,optionName:t.optionName,country:t.country}:{})});};
  const chooseReceipt=id=>{const r=receipts.find(r=>r.id===id);update({receiptId:id,...(r?{colorName:r.colorName,optionName:r.optionName}:{})});};
  const transport=['receive','transit_loss','return_main'].includes(draft.type);
  return <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="메인 및 국가별 재고 관리"><section className="admin-drawer inventory-grid-drawer warehouse-drawer">
    <header className="admin-drawer-header"><div><span>WAREHOUSE INVENTORY</span><h2>입고 · 국가 출고 · 판매 이력</h2><p>{product.name}</p></div><button className="admin-icon-btn" disabled={busy} onClick={onClose} aria-label="닫기">×</button></header>
    <div className="inventory-grid-content">
      <p className="inventory-grid-hint">생산 입고 → 메인 창고 → 국가 출고(운송 중) → 도착 입고 → 판매. 메인·운송 중 수량은 판매할 수 없습니다.</p>
      <div className="warehouse-totals"><span>메인 {totals.main}</span><span>운송 중 {totals.transit}</span><span>판매 가능 {totals.available}</span><span>주문 예약 {totals.reserved}</span></div>
      {records.some(r=>r.allocationVersion!==1)&&<p className="warehouse-warning">기존 재고가 있습니다. 각 색상·사이즈에서 ‘메인 이관’을 먼저 처리하세요. 판매 가능 수량만 메인으로 이동하며 예약·기존 판매 이력은 베트남에 보존합니다.</p>}
      {readError&&<p role="alert">일부 데이터를 조회하지 못했습니다. 처리 버튼을 잠갔습니다. {Object.entries(errors).filter(([,e])=>e).map(([name])=>name).join(', ')}</p>}
      {message&&<p role="status">{message}</p>}
      <div className="inventory-table-scroll"><table className="inventory-matrix"><thead><tr><th>색상 / 사이즈</th><th>메인</th><th>운송 중</th>{Object.values(COUNTRIES).map(c=><th key={c}>{c}<small>가능 / 예약 / 판매확정</small></th>)}<th>처리</th></tr></thead><tbody>{[...new Map([...axes.colors.flatMap(c=>axes.sizes.map(s=>[keyOf(c,s),{colorName:c,optionName:s}])),...records.map(r=>[keyOf(r.colorName,r.optionName),r])]).values()].map(row=>{const r=byKey.get(keyOf(row.colorName,row.optionName));return <tr key={keyOf(row.colorName,row.optionName)}><th>{row.colorName} / {row.optionName}{r&&r.allocationVersion!==1&&<small>미전환: 가능 {r.stock} / 예약 {r.reserved}</small>}</th><td>{r?.mainStock||0}</td><td>{Object.values(r?.inTransit||{}).reduce((a,b)=>a+b,0)}</td>{Object.keys(COUNTRIES).map(c=><td key={c}>{r?.countries?.[c]?.stock||0} / {r?.countries?.[c]?.reserved||0} / {r?.countries?.[c]?.sold||0}</td>)}<td><button disabled={busy} onClick={()=>update({colorName:row.colorName,optionName:row.optionName,type:r&&r.allocationVersion!==1?'migrate':'receipt',transferId:'',receiptId:''})}>{r&&r.allocationVersion!==1?'메인 이관':'선택'}</button></td></tr>;})}</tbody></table></div>
      <form className="warehouse-form" onSubmit={submit}><h3>재고 전표 처리</h3><fieldset disabled={busy||loading||readError}>
        <label>처리 종류<select value={draft.type} onChange={e=>update({type:e.target.value,transferId:'',receiptId:''})}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label>색상<input readOnly value={draft.colorName}/></label><label>사이즈<input readOnly value={draft.optionName}/></label>
        <p>위 재고 표에서 색상·사이즈를 선택하세요. 도착 입고·손실·반송은 원출고 전표를 선택하면 자동 지정됩니다.</p>
        {draft.type==='dispatch'&&<label>도착 국가<select value={draft.country} onChange={e=>update({country:e.target.value})}>{Object.entries(COUNTRIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>}
        {transport&&<label>원출고 전표<select required value={draft.transferId} onChange={e=>chooseTransfer(e.target.value)}><option value="">전표 선택</option>{transfers.filter(t=>t.status==='in_transit').map(t=><option key={t.id} value={t.id}>{t.reference} · {COUNTRIES[t.country]} · {t.colorName}/{t.optionName} · 잔여 {t.quantity-t.received-t.lost-t.returned}</option>)}</select></label>}
        {draft.type==='receipt_reversal'&&<label>원입고 전표<select required value={draft.receiptId} onChange={e=>chooseReceipt(e.target.value)}><option value="">전표 선택</option>{receipts.filter(r=>r.quantity>r.reversed).map(r=><option key={r.id} value={r.id}>{r.reference} · {r.colorName}/{r.optionName} · 정정 잔여 {r.quantity-r.reversed}</option>)}</select></label>}
        {draft.type!=='migrate'&&<label>이번 처리 수량<input required type="number" min="1" max="1000000" step="1" value={draft.quantity} onChange={e=>update({quantity:e.target.value})}/></label>}
        <label>전표번호<input required maxLength="100" placeholder="생산번호 / 송장번호 / 입고확인번호" value={draft.reference} onChange={e=>update({reference:e.target.value})}/></label>
        <label>처리 사유·메모<input required maxLength="500" value={draft.note} onChange={e=>update({note:e.target.value})}/></label>
        {draft.expectedVersion!==null&&draft.expectedVersion!==(selected?.version||0)&&<p>처리 결과가 불확실하면 먼저 이력을 확인하세요. 동일 요청 재시도는 중복 처리되지 않습니다. 실패가 확실하면 <button type="button" onClick={()=>update({})}>최신 재고로 다시 입력</button>하세요.</p>}
        <button className="admin-btn-primary" type="submit">{busy?'처리 중…':TYPES[draft.type]}</button>
      </fieldset></form>
      <h3>국가 출고 전표</h3><div className="inventory-table-scroll"><table className="inventory-matrix"><thead><tr><th>출고번호 / 일시</th><th>옵션 / 도착</th><th>출고</th><th>입고</th><th>손실</th><th>반송</th><th>운송 잔여</th></tr></thead><tbody>{transfers.map(t=><tr key={t.id}><th>{t.reference}<small>{formatKoreanDateTime(t.createdAt)}</small></th><td>{t.colorName}/{t.optionName}<small>{COUNTRIES[t.country]}</small></td><td>{t.quantity}</td><td>{t.received}</td><td>{t.lost}</td><td>{t.returned}</td><td>{t.quantity-t.received-t.lost-t.returned}</td></tr>)}</tbody></table></div>
      <h3>전체 처리 이력</h3><p>처리 시각 기준 최신순. 원본 이력은 수정·삭제하지 않습니다. 판매 확정은 입금 확인 기준이며 실제 배송 완료와는 별개입니다.</p>
      {movements.map(m=><details className="warehouse-history" key={m.id}><summary>{formatKoreanDateTime(m.createdAt)} · {HISTORY[m.type]||m.type} · {m.colorName||records.find(r=>r.id===m.variantId)?.colorName||'기존 옵션'} / {m.optionName||records.find(r=>r.id===m.variantId)?.optionName||'—'} · {m.quantity??Math.max(Math.abs(m.stockDelta||0),Math.abs(m.reservedDelta||0),Math.abs(m.soldDelta||0))}개 · {COUNTRIES[m.country]||m.country||'기존 기록'}</summary><p>전표: {m.reference||m.orderNumber||m.orderId||m.id} · 처리자: {m.actorEmail||m.actorUid||'기존 기록 없음'} · 버전 {m.version}</p><p>{m.note||''} {m.courier||''} {m.trackingNumber||''}</p><p>원입고: {m.receiptId||'—'} / 원출고: {m.transferId||'—'}</p><pre>{JSON.stringify({before:m.before||'과거 기록 없음',after:m.after||{stock:m.stockAfter,reserved:m.reservedAfter,sold:m.soldAfter}},null,2)}</pre></details>)}
      <button type="button" className="admin-btn-secondary" onClick={()=>setCount(v=>v+50)} disabled={busy||[movements,transfers,receipts].every(list=>list.length<count)}>이전 이력·전표 더 불러오기 ({count}건씩 조회 중)</button>
    </div><footer className="admin-drawer-footer"><button type="button" className="admin-btn-secondary" disabled={busy} onClick={onClose}>닫기</button></footer>
  </section></div>;
}
