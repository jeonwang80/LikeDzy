import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrder, recoverOrderAttempt } from '../services/orderService';
import { forgetAttempt, orderAccess, readAttempt, rememberOrder } from '../utils/checkoutSession';
import { formatKRW, formatKoreanDateTime, getTrackingUrl } from '../utils/commerce';
import './CheckoutPage.css';

export default function OrderLookup() {
  const { orderId } = useParams();
  const { currentUser } = useAuth();
  return <OrderLookupContent key={`${orderId || ''}:${currentUser?.uid || ''}`} orderId={orderId} />;
}

function OrderLookupContent({ orderId }) {
  const navigate = useNavigate();
  const [enteredId, setEnteredId] = useState(orderId || '');
  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(orderId));
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!orderId) return undefined;
    let active = true;
    getOrder(orderId, orderAccess(orderId)).then((value) => { if (active) setOrder(value); })
      .catch(() => { if (active) setError('주문을 확인할 수 없습니다. 주문한 계정으로 로그인하거나 주문 ID와 복구 코드를 입력해 주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, refresh]);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setOrder(null);
    try {
      const result = await getOrder(enteredId.trim(), token.trim());
      if (token.trim()) rememberOrder(result.id, token.trim());
      setToken(''); setOrder(result); navigate(`/orders/${result.id}`, { replace: true });
    } catch { setError('주문 ID 또는 복구 코드를 확인해 주세요.'); }
    finally { setLoading(false); }
  };
  const recover = async () => {
    const attempt = readAttempt(); if (!attempt) return;
    setLoading(true); setError('');
    try {
      const result = await recoverOrderAttempt(attempt);
      if (result.attemptClosed) { forgetAttempt(); setError('이전 요청을 안전하게 종료했습니다. 장바구니에서 다시 주문할 수 있습니다.'); }
      else { rememberOrder(result.id, attempt.guestAccessToken); forgetAttempt(); navigate(`/orders/${result.id}`); setOrder(result); }
    } catch { setError('이전 요청 확인에 실패했습니다. 연결을 확인하고 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  };
  return <main className="checkout-page"><section className="checkout-success-card" style={{ margin: '0 auto', maxWidth: 820 }}>
    <Link to="/">← LIKEDZY</Link><h1>주문·입금·배송 조회</h1>
    {loading && <p role="status">주문 확인 중…</p>}{error && <p className="checkout-error" role="alert">{error}</p>}
    {!order && <form onSubmit={submit} className="checkout-section">
      <p>회원은 주문한 계정으로 로그인해 주세요. 비회원은 완료 화면에서 보관한 주문 ID와 복구 코드를 입력해 주세요. 복구 코드를 타인에게 공유하지 마세요.</p>
      <label>주문 ID<input className="admin-input" autoComplete="off" required value={enteredId} onChange={(event) => setEnteredId(event.target.value)} /></label>
      <label>비회원 복구 코드<input className="admin-input" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} /></label>
      <button className="checkout-primary-button" disabled={loading}>주문 조회</button>
      <p><Link to="/login">회원 로그인</Link> · <Link to="/mypage">나의 주문 목록</Link></p>
      {readAttempt() && <button type="button" disabled={loading} onClick={recover}>응답을 받지 못한 이전 주문 복구</button>}
    </form>}
    {order && <>
      <p>{order.isTestOrder ? '테스트 주문 — 실제 입금하지 마세요' : '무통장 입금 주문'}</p>
      <div className="checkout-success-order"><div><span>주문번호</span><strong>{order.orderNumber}</strong></div><div><span>상태</span><strong>{order.status}</strong></div><div><span>접수일</span><strong>{formatKoreanDateTime(order.createdAt)}</strong></div><div><span>총 금액</span><strong>{formatKRW(order.totalAmountNumber)}</strong></div></div>
      {order.items?.map((item, index) => <p key={index}>{item.productName} · {item.colorName} / {item.optionName} · {item.quantity}개 · {formatKRW(item.lineAmount)}</p>)}
      <p>상품 {formatKRW(order.subtotal)} + 배송 {formatKRW(order.shippingFee)}</p>
      {order.status === '입금 대기' && <div className="checkout-bank-card"><div><strong>{order.bank?.bankName} {order.bank?.accountNumber}</strong><p>예금주 {order.bank?.accountHolder}</p><p>입금기한 {formatKoreanDateTime(order.deadline)}</p><p>기한 후 입금은 고객센터에 먼저 문의해 주세요.</p></div></div>}
      {order.trackingNumber && <p><a href={getTrackingUrl(order.courier, order.trackingNumber)} target="_blank" rel="noreferrer">{order.courier} · {order.trackingNumber} 배송 조회 ↗</a></p>}
      <p>취소·교환·반품은 <Link to="/policies/returns">교환·반품 안내 및 고객센터</Link>를 확인해 주세요.</p>
      <div className="checkout-success-actions"><button disabled={loading} onClick={() => { setLoading(true); setError(''); setOrder(null); setRefresh((n) => n + 1); }}>현재 상태 새로고침</button><button onClick={() => window.print()}>주문서 인쇄·저장</button></div>
    </>}
  </section></main>;
}
