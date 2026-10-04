import React, { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db, functions } from '../firebase';
import { couponDate, couponStatusText } from '../utils/couponDisplay';
import { formatMoney } from '../utils/market';

const getMembers = httpsCallable(functions, 'listMembers');
const grantCoupon = httpsCallable(functions, 'grantMemberCoupon');
const dateText = (value) => value ? new Date(value).toLocaleString('ko-KR') : '—';
const providerText = (providers) => providers.map((provider) => ({ 'password': '이메일', 'google.com': 'Google', 'phone': '전화번호' })[provider] || provider).join(', ') || '—';

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [queryEmail, setQueryEmail] = useState('');
  const [pageTokens, setPageTokens] = useState(['']);
  const [nextToken, setNextToken] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);
  const currentToken = pageTokens.at(-1);
  const [selected, setSelected] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(true);
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'coupons'), (snapshot) => {
      setCoupons(snapshot.docs.map((entry) => ({ ...entry.data(), code: entry.id }))
        .filter((coupon) => coupon.active === true && Date.parse(coupon.endsAt) > Date.now() && (coupon.usedCount || 0) < coupon.usageLimit));
      setCouponLoading(false);
    }, () => { setCouponError('지급 가능한 쿠폰을 불러오지 못했습니다. 새로고침해 주세요.'); setCouponLoading(false); });
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    getMembers({ pageSize: 50, pageToken: currentToken, email: queryEmail }).then(({ data }) => {
      if (id !== requestId.current) return;
      setMembers(data.members); setNextToken(data.nextPageToken);
    }).catch((failure) => {
      if (id !== requestId.current) return;
      setError(failure.code === 'functions/permission-denied' || failure.code === 'functions/unauthenticated'
        ? '관리자 권한을 확인할 수 없습니다. 이메일 인증 후 다시 로그인해 주세요.'
        : failure.code === 'functions/not-found' ? '가입자 조회 기능이 서버에 배포되지 않았습니다.'
          : failure.code === 'functions/invalid-argument' ? failure.message
            : '가입자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }).finally(() => { if (id === requestId.current) setBusy(false); });
    return () => { requestId.current += 1; };
  }, [currentToken, queryEmail, refresh]);

  const beginLoad = () => { setBusy(true); setError(''); setMembers([]); setNextToken(''); setSelected([]); setGrantMessage(''); };
  const search = (event) => {
    event.preventDefault(); beginLoad(); setPageTokens(['']); setQueryEmail(email.trim()); setRefresh((value) => value + 1);
  };
  const reset = () => { beginLoad(); setEmail(''); setQueryEmail(''); setPageTokens(['']); setRefresh((value) => value + 1); };
  const toggleMember = (uid) => setSelected((users) => users.includes(uid) ? users.filter((id) => id !== uid) : [...users, uid]);
  const issue = async () => {
    if (!couponCode || !selected.length || grantBusy) return;
    setGrantBusy(true); setGrantMessage('');
    try {
      const { data } = await grantCoupon({ code: couponCode, userIds: selected });
      setGrantMessage(`${data.code}: ${data.issued}명 지급 완료${data.skipped ? ` · 이미 보유·사용한 ${data.skipped}명 제외` : ''}${data.limited ? ` · 보유 한도(3개)에 도달한 ${data.limited}명 제외` : ''}.`);
      setSelected([]);
      setRefresh(value => value + 1);
    } catch (failure) {
      setGrantMessage(['functions/invalid-argument', 'functions/failed-precondition', 'functions/not-found', 'functions/permission-denied', 'functions/unauthenticated'].includes(failure.code)
        ? failure.message : '쿠폰 지급 결과를 확인하지 못했습니다. 다시 시도해 주세요. 같은 쿠폰은 중복 지급되지 않습니다.');
    } finally { setGrantBusy(false); }
  };

  return <div className="admin-page">
    <div className="admin-page-header"><div><span>MEMBERS</span><h1>가입자 현황</h1><p>가입 계정과 이메일 인증 상태를 확인합니다.</p></div></div>
    <section className="admin-card admin-members-panel">
      <form className="admin-members-search" onSubmit={search}>
        <label className="admin-form-field"><span>이메일 검색 (정확히 일치)</span><input className="admin-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" /></label>
        <button className="admin-btn-primary" disabled={busy || grantBusy} type="submit">조회</button>
        <button className="admin-btn-secondary" disabled={busy || grantBusy} type="button" onClick={reset}>전체 목록 / 새로고침</button>
      </form>
      <p className="admin-members-summary">{busy ? '조회 중…' : error ? '조회 실패' : `현재 조회 ${members.length}명 · 이메일 인증 ${members.filter((member) => member.emailVerified).length}명 · 계정 사용 중 ${members.filter((member) => !member.disabled).length}명`}</p>
      <p>목록은 50명씩 표시됩니다. 위 숫자는 현재 페이지 기준입니다.</p>
    </section>
    <section className="admin-card admin-members-panel" aria-label="회원 쿠폰 지급">
      <h2>선택 회원에게 쿠폰 지급</h2><p>회원당 최대 3개를 보유할 수 있습니다. 입금 대기 주문에 적용한 쿠폰도 포함되며, 사용 완료·만료 쿠폰은 제외합니다. 같은 쿠폰은 한 번만 지급됩니다.</p>
      <div className="admin-members-search">
        <label className="admin-form-field"><span>지급할 쿠폰</span><select className="admin-input" value={couponCode} disabled={couponLoading || grantBusy} onChange={(event) => { setCouponCode(event.target.value); setGrantMessage(''); }}>
          <option value="">{couponLoading ? '쿠폰을 불러오는 중…' : '쿠폰 선택'}</option>{coupons.map((coupon) => <option key={coupon.code} value={coupon.code}>{coupon.code} · {coupon.title} · {coupon.percent}% · {coupon.currency}</option>)}
        </select></label>
        <button type="button" className="admin-btn-primary" disabled={busy || grantBusy || !couponCode || !selected.length} onClick={issue}>{grantBusy ? '지급 중…' : `선택 ${selected.length}명에게 지급`}</button>
      </div>
      {couponError ? <p role="alert">{couponError}</p> : !couponLoading && !coupons.length ? <p>지급 가능한 쿠폰이 없습니다. <Link to="/admin/coupons">쿠폰 행사 등록하기</Link></p> : null}
      <p role="status" aria-live="polite">{grantMessage}</p>
    </section>
    <section className="admin-card" aria-label="가입자 목록" aria-busy={busy}>
      {busy ? <p className="admin-members-panel" role="status">가입자 목록을 불러오는 중…</p>
        : error ? <p className="admin-members-panel" role="alert">{error}</p>
          : members.length === 0 ? <p className="admin-members-panel">{queryEmail ? '해당 이메일로 가입한 회원이 없습니다.' : '가입자가 없습니다.'}</p>
            : <div className="admin-table-container"><table className="admin-table admin-members-table"><thead><tr><th scope="col"><input type="checkbox" aria-label="현재 페이지 사용 중인 회원 모두 선택" disabled={grantBusy || !members.some((member) => !member.disabled)} checked={members.some((member) => !member.disabled) && selected.length === members.filter((member) => !member.disabled).length} onChange={(event) => setSelected(event.target.checked ? members.filter((member) => !member.disabled).map((member) => member.uid) : [])} /></th><th scope="col">회원</th><th scope="col">가입 방법</th><th scope="col">가입일</th><th scope="col">최근 로그인</th><th scope="col">이메일 인증</th><th scope="col">계정 상태</th><th scope="col">쿠폰 보유 현황</th></tr></thead><tbody>{members.map((member) => <tr key={member.uid}>
              <td><input type="checkbox" aria-label={`${member.email || member.displayName || member.uid} 선택`} disabled={grantBusy || member.disabled} checked={selected.includes(member.uid)} onChange={() => toggleMember(member.uid)} /></td><td><strong>{member.displayName || '이름 미등록'}</strong><div>{member.email || '이메일 없음'}</div><small>회원 ID: {member.uid}</small>{member.phoneNumber && <div>{member.phoneNumber}</div>}</td>
              <td>{providerText(member.providers)}</td><td>{dateText(member.createdAt)}</td><td>{dateText(member.lastSignInAt)}</td><td>{member.emailVerified ? '인증 완료' : '미인증'}</td><td>{member.disabled ? '사용 중지' : '사용 중'}</td>
              <td className="admin-member-wallet"><strong>보유 {member.couponWallet?.heldCount ?? '—'}/3</strong><div>사용 가능 {member.couponWallet?.availableCount ?? '—'} · 사용 완료 {member.couponWallet?.usedCount ?? '—'}</div>
                <details><summary>쿠폰 상세 ({member.couponWallet?.coupons.length ?? 0})</summary>{member.couponWallet?.coupons.map(coupon => <article key={coupon.code}><strong>{coupon.code} · {coupon.percent}%</strong><b>{couponStatusText(coupon.status)}</b><small>{couponDate(coupon.startsAt)} ~ {couponDate(coupon.endsAt)}</small><small>최대 {formatMoney(coupon.maxDiscount, coupon.currency)} · 최소 주문 {formatMoney(coupon.minSubtotal, coupon.currency)}</small>{coupon.orderId && <small>적용 주문: {coupon.orderId}</small>}</article>)}</details>
              </td>
            </tr>)}</tbody></table></div>}
    </section>
    <nav className="admin-members-pagination" aria-label="가입자 목록 페이지">
      <button type="button" className="admin-btn-secondary" disabled={busy || grantBusy || pageTokens.length === 1} onClick={() => { beginLoad(); setPageTokens((tokens) => tokens.slice(0, -1)); }}>이전</button>
      <span>{pageTokens.length} 페이지</span>
      <button type="button" className="admin-btn-secondary" disabled={busy || grantBusy || !nextToken} onClick={() => { beginLoad(); setPageTokens((tokens) => [...tokens, nextToken]); }}>다음</button>
    </nav>
  </div>;
}
