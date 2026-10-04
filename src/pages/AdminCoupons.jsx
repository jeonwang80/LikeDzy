import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatMoney } from '../utils/market';
import { couponDate } from '../utils/couponDisplay';

const initial = { code: '', title: '', currency: 'VND', percent: 30, minSubtotal: 0, maxDiscount: 300000, usageLimit: 100000, autoIssue: true, startsAt: '', endsAt: '' };
const localDateTime = (value) => { const date = value?.toDate?.() || new Date(value); return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''; };
const couponList = (snapshot) => snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))
  .sort((a, b) => (Date.parse(b.startsAt) || 0) - (Date.parse(a.startsAt) || 0));
const errorMessage = (error, fallback) => {
  if (error.code === 'permission-denied') return '쿠폰 관리 권한이 없습니다. 이메일 인증 후 관리자 계정으로 다시 로그인해 주세요.';
  if (error.code === 'unauthenticated') return '로그인이 만료되었습니다. 관리자 계정으로 다시 로그인해 주세요.';
  if (error.code === 'unavailable') return '서버에 연결할 수 없습니다. 인터넷 연결을 확인한 후 다시 시도해 주세요.';
  return fallback;
};

export default function AdminCoupons() {
  const [form, setForm] = useState(initial);
  const [coupons, setCoupons] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [editing, setEditing] = useState('');
  useEffect(() => {
    return onSnapshot(collection(db, 'coupons'), (snapshot) => {
      setCoupons(couponList(snapshot));
      setListLoading(false); setListError('');
    }, (error) => { setListError(errorMessage(error, '쿠폰 목록을 불러오지 못했습니다. 새로고침해 주세요.')); setListLoading(false); });
  }, []);
  const edit = (coupon) => {
    setEditing(coupon.id); setMessage('');
    setForm({ ...initial, ...coupon, startsAt: localDateTime(coupon.startsAt), endsAt: localDateTime(coupon.endsAt) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const missing = [!code && '쿠폰 코드', !form.startsAt && '시작 일시', !form.endsAt && '종료 일시'].filter(Boolean);
    if (missing.length) { setMessage(`${missing.join(', ')}를 입력해 주세요. 회색 예시 문구는 입력된 값이 아닙니다.`); return; }
    const starts = Date.parse(form.startsAt);
    const ends = Date.parse(form.endsAt);
    if (!Number.isFinite(starts) || !Number.isFinite(ends)) { setMessage('행사 기간을 확인해 주세요.'); return; }
    const startsAt = new Date(starts).toISOString();
    const endsAt = new Date(ends).toISOString();
    if (!/^[A-Z0-9-]{4,32}$/.test(code)) { setMessage('쿠폰 코드는 영문·숫자·하이픈으로 4~32자를 입력해 주세요.'); return; }
    if (!editing && coupons.some((item) => item.id === code)) { setMessage('이미 사용 중인 쿠폰 코드입니다.'); return; }
    if (ends <= starts) { setMessage('종료 일시는 시작 일시보다 뒤로 설정해 주세요.'); return; }
    if (ends <= Date.now()) { setMessage('종료 일시가 지났습니다. 앞으로 사용할 행사 기간을 설정해 주세요.'); return; }
    if ([form.percent, form.minSubtotal, form.maxDiscount, form.usageLimit].some((value) => String(value).trim() === '')) { setMessage('할인율·금액·사용 횟수를 모두 입력해 주세요.'); return; }
    const percent = Number(form.percent); const minSubtotal = Number(form.minSubtotal); const maxDiscount = Number(form.maxDiscount); const usageLimit = Number(form.usageLimit);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90 || !Number.isInteger(minSubtotal) || minSubtotal < 0 || !Number.isInteger(maxDiscount) || maxDiscount < 1 || !Number.isInteger(usageLimit) || usageLimit < 1) { setMessage('할인율·금액·사용 횟수를 확인해 주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      await runTransaction(db, async transaction => {
        const ref = doc(db, 'coupons', code), current = await transaction.get(ref);
        if (editing && !current.exists()) throw new Error('수정할 쿠폰이 없습니다.');
        if (!editing && current.exists()) throw new Error('이미 사용 중인 쿠폰 코드입니다.');
        if (editing && usageLimit < (current.data().usedCount || 0)) throw new Error('전체 사용 한도는 이미 사용·예약된 횟수보다 작을 수 없습니다.');
        const values = { title: form.title.trim() || code, percent, minSubtotal, maxDiscount, usageLimit, autoIssue: form.autoIssue, startsAt, endsAt, updatedAt: serverTimestamp() };
        if (editing) transaction.update(ref, values);
        else transaction.set(ref, { ...values, code, currency: form.currency, usedCount: 0, active: true, createdAt: serverTimestamp() });
      });
      setMessage(editing ? `${code} 쿠폰을 수정했습니다. 기존 보유 쿠폰에도 반영되며, 이미 접수된 주문 금액은 유지됩니다.` : `${code} 쿠폰을 등록했습니다.${form.autoIssue ? ' 행사 기간에 새로 가입하는 회원에게 자동 발급됩니다.' : ''}`);
      setForm(initial); setEditing('');
    } catch (error) { setMessage(errorMessage(error, error.code ? '쿠폰 저장에 실패했습니다. 다시 시도해 주세요.' : error.message)); }
    finally { setBusy(false); }
  };
  const toggle = async (coupon) => {
    setBusy(true); setMessage('');
    try { await updateDoc(doc(db, 'coupons', coupon.id), { active: !coupon.active, updatedAt: serverTimestamp() }); }
    catch (error) { setMessage(errorMessage(error, '쿠폰 상태 변경에 실패했습니다.')); }
    finally { setBusy(false); }
  };
  return <div className="admin-page"><div className="admin-page-header"><div><span>CAMPAIGNS</span><h1>쿠폰 관리</h1><p>신규 가입자 자동 지급을 선택하면 행사 기간에 처음 가입한 회원에게 쿠폰이 발급됩니다.</p></div></div>
    <form className="admin-card" noValidate onSubmit={save} style={{ padding: 24, display: 'grid', gap: 14 }}><h2>{editing ? editing + ' 쿠폰 수정' : '새 할인 쿠폰'}</h2><p>{editing ? '기간과 할인 조건은 이미 지급된 쿠폰에도 반영됩니다. 사용 이력은 유지됩니다.' : '쿠폰 코드와 사용 기간을 입력해 주세요.'} 시간 기준: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><div className="commerce-settings-grid">
      <label className="admin-form-field"><span>쿠폰 코드 *</span><input className="admin-input" required disabled={Boolean(editing)} maxLength="32" value={form.code} onChange={(event) => update('code', event.target.value.toUpperCase())} placeholder="예: WELCOME30" /></label>
      <label className="admin-form-field"><span>이벤트 이름</span><input className="admin-input" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="오픈 30% 할인" /></label>
      <label className="admin-form-field"><span>적용 통화</span><select className="admin-input" disabled={Boolean(editing)} value={form.currency} onChange={(event) => update('currency', event.target.value)}><option value="VND">베트남 (VND)</option><option value="KRW">한국 (KRW)</option></select></label>
      <label className="admin-form-field"><span>할인율 (%)</span><input className="admin-input" required type="number" min="1" max="90" value={form.percent} onChange={(event) => update('percent', event.target.value)} /></label>
      <label className="admin-form-field"><span>최소 상품금액</span><input className="admin-input" required type="number" min="0" value={form.minSubtotal} onChange={(event) => update('minSubtotal', event.target.value)} /></label>
      <label className="admin-form-field"><span>최대 할인금액</span><input className="admin-input" required type="number" min="1" value={form.maxDiscount} onChange={(event) => update('maxDiscount', event.target.value)} /></label>
      <label className="admin-form-field"><span>총 사용 가능 횟수</span><input className="admin-input" required type="number" min="1" value={form.usageLimit} onChange={(event) => update('usageLimit', event.target.value)} /></label>
      <label className="admin-form-field"><span>시작 일시 *</span><input className="admin-input" required type="datetime-local" value={form.startsAt} onInput={(event) => update('startsAt', event.currentTarget.value)} onChange={(event) => update('startsAt', event.target.value)} /></label>
      <label className="admin-form-field"><span>종료 일시 *</span><input className="admin-input" required type="datetime-local" value={form.endsAt} onInput={(event) => update('endsAt', event.currentTarget.value)} onChange={(event) => update('endsAt', event.target.value)} /></label>
    </div><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}><input type="checkbox" checked={form.autoIssue} onChange={(event) => update('autoIssue', event.target.checked)} /> 신규 회원가입 시 자동 발급</label><p>등록된 행사 기간에 처음 가입한 회원만 자동 발급 대상입니다. 기존 회원에게는 소급 발급되지 않습니다.</p><p role="status" aria-live="polite" style={{ fontWeight: 700 }}>{message}</p><button className="admin-btn-primary" type="submit" disabled={busy}>{busy ? '저장 중…' : editing ? '수정 내용 저장' : '쿠폰 등록하기'}</button>{editing && <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => { setEditing(''); setForm(initial); setMessage(''); }}>수정 취소</button>}</form>
    <section className="admin-card" style={{ padding: 24, marginTop: 20 }}><h2>등록된 쿠폰 행사</h2>{listLoading ? <p role="status">목록을 불러오는 중…</p> : listError ? <p role="alert">{listError}</p> : coupons.length === 0 ? <p>등록된 쿠폰 행사가 없습니다. 위에서 쿠폰을 등록하면 여기에 표시됩니다.</p> : <div style={{ display: 'grid', gap: 12 }}>{coupons.map((coupon) => <article key={coupon.id} style={{ padding: 16, border: '1px solid #d5ded5', borderRadius: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}><div><strong>{coupon.code} · {coupon.title}</strong><p>{coupon.percent}% 할인 · 최대 {formatMoney(coupon.maxDiscount, coupon.currency)} · 최소 {formatMoney(coupon.minSubtotal, coupon.currency)}</p><small>{coupon.autoIssue ? '신규 가입자 자동 지급 · ' : '코드 직접 전달 · '}{couponDate(coupon.startsAt)} ~ {couponDate(coupon.endsAt)} · {coupon.usedCount || 0}/{coupon.usageLimit}회 (입금 대기 포함)</small></div><button type="button" disabled={busy} onClick={() => edit(coupon)}>수정</button><button type="button" disabled={busy} onClick={() => toggle(coupon)}>{coupon.active ? '중지' : '다시 활성화'}</button></article>)}</div>}</section>
  </div>;
}
