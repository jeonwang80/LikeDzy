import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { processWarehouseBatch } from '../services/orderService';
import { randomKey } from '../utils/checkoutSession';
const names={receipt:'공장입고',dispatch:'국가출고',receive:'도착입고'};
const countries={KR:'한국',VN:'베트남',HU:'헝가리'};
export default function WarehouseBatch({type,product,axes,records,onClose,onComplete}) {
  const [country,setCountry]=useState('VN');
  const [quantities,setQuantities]=useState({});
  const [chosen,setChosen]=useState({});
  const [reference,setReference]=useState('');
  const [note,setNote]=useState('');
  const [transfers,setTransfers]=useState([]);
  const [ready,setReady]=useState(type!=='receive');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [pending,setPending]=useState(null);
  useEffect(()=>{
    if(type!=='receive')return;
    return onSnapshot(query(collection(db,'warehouseTransfers'),where('productId','==',product.id)),snapshot=>{
      setTransfers(snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.status==='in_transit'));
      setReady(true);
    },()=>{setReady(false);setError('운송 목록을 불러오지 못했습니다. 다시 열어 주세요.');});
  },[type,product.id]);
  const rows=axes.colors.flatMap(colorName=>axes.sizes.map(optionName=>{
    const key=JSON.stringify([colorName,optionName]);
    const record=records.find(r=>r.colorName===colorName&&r.optionName===optionName);
    const options=transfers.filter(t=>t.country===country&&t.colorName===colorName&&t.optionName===optionName);
    const transfer=options.find(t=>t.id===chosen[key]) || (options.length===1?options[0]:null);
    const available=type==='receive'?(transfer?transfer.quantity-transfer.received-transfer.lost-transfer.returned:0):(record?.mainStock||0);
    return {key,colorName,optionName,record,options,transfer,available};
  }));
  const entered=rows.filter(r=>Number(quantities[r.key])>0);
  const total=entered.reduce((sum,r)=>sum+Number(quantities[r.key]),0);
  async function submit(e){
    e.preventDefault();if(busy||!ready)return;
    let request=pending;
    if(!request){
      if(!entered.length){setError('처리할 수량을 입력하세요.');return;}
      if(entered.length>80){setError('한 번에 최대 80개 행까지 처리할 수 있습니다.');return;}
      for(const row of rows){const value=quantities[row.key];if(value&&!/^\d+$/.test(value)){setError('수량은 0 이상의 정수로 입력하세요.');return;}}
      if(type!=='receipt'&&entered.some(r=>Number(quantities[r.key])>r.available)){setError('입력 수량이 현재 처리 가능 수량을 초과합니다.');return;}
      request={type,productId:product.id,country,reference,note,requestId:randomKey(),items:entered.map(r=>({colorName:r.colorName,optionName:r.optionName,quantity:Number(quantities[r.key]),expectedVersion:r.record?.version||0,...(type==='receive'?{transferId:r.transfer.id}:{})}))};
      setPending(request);
    }
    setBusy(true);setError('');
    try{const result=await processWarehouseBatch(request);onComplete(`${names[type]} 완료: ${result.count}개 행 · ${result.quantity}개`);}
    catch(e){setError(e.message||'응답을 확인하지 못했습니다. 동일 요청으로 다시 시도하세요.');}
    finally{setBusy(false);}
  }
  return <div className="warehouse-batch-overlay"><section role="dialog" aria-modal="true" aria-label={`${names[type]} 수량 입력`} className="warehouse-batch-dialog">
    <header><div><h2>{names[type]}</h2><p>{product.name} · 전체 옵션에서 필요한 수량만 입력하세요. 빈칸과 0은 처리하지 않습니다.</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="팝업 닫기">×</button></header>
    <form onSubmit={submit}><fieldset disabled={busy||!!pending}>
      <div className="warehouse-batch-fields">{type!=='receipt'&&<label>국가<select value={country} onChange={e=>{setCountry(e.target.value);setQuantities({});setChosen({});}}>{Object.entries(countries).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>}
      <label>전표번호<input required maxLength={100} value={reference} onChange={e=>setReference(e.target.value)} placeholder={type==='receipt'?'생산 입고번호':'출고 / 입고 확인번호'}/></label>
      <label>메모<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="선택 입력"/></label></div>
      <div className="warehouse-batch-table"><table className="inventory-matrix"><thead><tr><th>색상</th><th>사이즈</th><th>{type==='receive'?'입고 가능':'공장재고'}</th>{type==='receive'&&<th>원출고 전표</th>}<th>이번 {names[type]} 수량</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><th>{row.colorName}</th><td>{row.optionName}</td><td>{row.available}</td>{type==='receive'&&<td>{row.options.length===0?'운송 중 없음':<select aria-label={`${row.colorName} ${row.optionName} 원출고`} value={row.transfer?.id||''} onChange={e=>{setChosen(v=>({...v,[row.key]:e.target.value}));setQuantities(v=>({...v,[row.key]:''}));}}><option value="">출고 전표 선택</option>{row.options.map(t=><option key={t.id} value={t.id}>{t.reference} · 잔여 {t.quantity-t.received-t.lost-t.returned}</option>)}</select>}</td>}<td><input aria-label={`${row.colorName} ${row.optionName} 처리 수량`} type="number" min="0" max={type==='receipt'?1000000:row.available} step="1" placeholder="0" disabled={type!=='receipt'&&row.available===0} value={quantities[row.key]||''} onChange={e=>setQuantities(v=>({...v,[row.key]:e.target.value}))}/></td></tr>)}</tbody></table></div>
    </fieldset>
    {error&&<p role="alert">{error}</p>}
    {pending&&!busy&&<p>입력 내용이 잠겼습니다. 재시도는 같은 요청으로 처리되어 중복 반영되지 않습니다. 변경이 필요하면 먼저 이력을 확인한 뒤 <button type="button" onClick={()=>setPending(null)}>입력 수정</button>하세요.</p>}
    <footer><strong>{entered.length}개 행 · 합계 {total}개</strong><button type="button" disabled={busy} onClick={onClose}>닫기</button><button type="submit" className="admin-btn-primary" disabled={busy||!ready}>{busy?'처리 중…':pending?'동일 요청 재시도':`${names[type]} 일괄 처리`}</button></footer>
    </form>
  </section></div>;
}
