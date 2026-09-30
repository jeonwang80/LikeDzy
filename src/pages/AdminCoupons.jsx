import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatMoney } from '../utils/market';

const initial = { code: '', title: '', currency: 'VND', percent: 30, minSubtotal: 0, maxDiscount: 300000, usageLimit: 100000, autoIssue: true, startsAt: '', endsAt: '' };

export default function AdminCoupons() {
  const [form, setForm] = useState(initial);
  const [coupons, setCoupons] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const snapshot = await getDocs(collection(db, 'coupons'));
    setCoupons(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).sort((a, b) => b.startsAt.localeCompare(a.startsAt)));
  };
  useEffect(() => {
    getDocs(collection(db, 'coupons')).then((snapshot) => {
      setCoupons(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).sort((a, b) => b.startsAt.localeCompare(a.startsAt)));
    }).catch(() => setMessage('쿠폰 목록을 불러오지 못했습니다.'));
  }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const starts = Date.parse(form.startsAt);
    const ends = Date.parse(form.endsAt);
    if (!Number.isFinite(starts) || !Number.isFinite(ends)) { setMessage('행사 기간을 확인해 주세요.'); return; }
    const startsAt = new Date(starts).toISOString();
    const endsAt = new Date(ends).toISOString();
    if (!/^[A-Z0-9-]{4,32}$/.test(code) || coupons.some((item) => item.id === code) || Date.parse(endsAt) <= Date.parse(startsAt)) { setMessage('코드 중복·형식과 행사 기간을 확인해 주세요.'); return; }
    const percent = Number(form.percent); const minSubtotal = Number(form.minSubtotal); const maxDiscount = Number(form.maxDiscount); const usageLimit = Number(form.usageLimit);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90 || !Number.isInteger(minSubtotal) || minSubtotal < 0 || !Number.isInteger(maxDiscount) || maxDiscount < 1 || !Number.isInteger(usageLimit) || usageLimit < 1) { setMessage('할인율·금액·사용 횟수를 확인해 주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      if ((await getDoc(doc(db, 'coupons', code))).exists()) { setMessage('이미 사용 중인 쿠폰 코드입니다.'); return; }
      await setDoc(doc(db, 'coupons', code), { code, title: form.title.trim() || code, currency: form.currency, percent, minSubtotal, maxDiscount, usageLimit, usedCount: 0, autoIssue: form.autoIssue, startsAt, endsAt, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setMessage(`${code} 쿠폰을 만들었습니다.`); setForm(initial); await load();
    } catch { setMessage('쿠폰 저장에 실패했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const toggle = async (coupon) => {
    setBusy(true); setMessage('');
    try { await updateDoc(doc(db, 'coupons', coupon.id), { active: !coupon.active, updatedAt: serverTimestamp() }); await load(); }
    catch { setMessage('쿠폰 상태 변경에 실패했습니다.'); }
    finally { setBusy(false); }
  };
  return <div className="admin-page"><div className="admin-page-header"><div><span>CAMPAIGNS</span><h1>쿠폰 관리</h1><p>신규 가입자 자동 지급을 선택하면 행사 기간에 처음 가입한 회원에게 쿠폰이 발급됩니다.</p></div></div>
    <form className="admin-card" onSubmit={save} style={{ padding: 24, display: 'grid', gap: 14 }}><h2>새 할인 쿠폰</h2><div className="commerce-settings-grid">
      <label className="admin-form-field"><span>쿠폰 코드</span><input className="admin-input" required maxLength="32" value={form.code} onChange={(event) => update('code', event.target.value.toUpperCase())} placeholder="WELCOME30" /></label>
      <label className="admin-form-field"><span>이벤트 이름</span><input className="admin-input" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="오픈 30% 할인" /></label>
      <label className="admin-form-field"><span>적용 통화</span><select className="admin-input" value={form.currency} onChange={(event) => update('currency', event.target.value)}><option value="VND">베트남 (VND)</option><option value="KRW">한국 (KRW)</option></select></label>
      <label className="admin-form-field"><span>할인율 (%)</span><input className="admin-input" required type="number" min="1" max="90" value={form.percent} onChange={(event) => update('percent', event.target.value)} /></label>
      <label className="admin-form-field"><span>최소 상품금액</span><input className="admin-input" required type="number" min="0" value={form.minSubtotal} onChange={(event) => update('minSubtotal', event.target.value)} /></label>
      <label className="admin-form-field"><span>최대 할인금액</span><input className="admin-input" required type="number" min="1" value={form.maxDiscount} onChange={(event) => update('maxDiscount', event.target.value)} /></label>
      <label className="admin-form-field"><span>총 사용 가능 횟수</span><input className="admin-input" required type="number" min="1" value={form.usageLimit} onChange={(event) => update('usageLimit', event.target.value)} /></label>
      <label className="admin-form-field"><span>시작</span><input className="admin-input" required type="datetime-local" value={form.startsAt} onChange={(event) => update('startsAt', event.target.value)} /></label>
      <label className="admin-form-field"><span>종료</span><input className="admin-input" required type="datetime-local" value={form.endsAt} onChange={(event) => update('endsAt', event.target.value)} /></label>
    </div><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}><input type="checkbox" checked={form.autoIssue} onChange={(event) => update('autoIssue', event.target.checked)} /> 신규 회원가입 시 자동 발급</label><p role="status">{message}</p><button className="admin-btn-primary" type="submit" disabled={busy}>{busy ? '저장 중…' : '쿠폰 만들기'}</button></form>
    <section className="admin-card" style={{ padding: 24, marginTop: 20 }}><h2>발급된 쿠폰</h2>{coupons.length === 0 ? <p>아직 쿠폰이 없습니다.</p> : <div style={{ display: 'grid', gap: 12 }}>{coupons.map((coupon) => <article key={coupon.id} style={{ padding: 16, border: '1px solid #d5ded5', borderRadius: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}><div><strong>{coupon.code} · {coupon.title}</strong><p>{coupon.percent}% 할인 · 최대 {formatMoney(coupon.maxDiscount, coupon.currency)} · 최소 {formatMoney(coupon.minSubtotal, coupon.currency)}</p><small>{coupon.autoIssue ? '신규 가입자 자동 지급 · ' : '코드 직접 전달 · '}{new Date(coupon.startsAt).toLocaleString()} ~ {new Date(coupon.endsAt).toLocaleString()} · {coupon.usedCount || 0}/{coupon.usageLimit}회</small></div><button type="button" disabled={busy} onClick={() => toggle(coupon)}>{coupon.active ? '중지' : '다시 활성화'}</button></article>)}</div>}</section>
  </div>;
}
