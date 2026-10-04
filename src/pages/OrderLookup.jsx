import { useLanguage } from '../i18n/LanguageContext';
import { useStoreCopy } from '../i18n/storeCopy';
import { formatMoney } from '../utils/market';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrder, recoverOrderAttempt } from '../services/orderService';
import { forgetAttempt, orderAccess, readAttempt, rememberOrder } from '../utils/checkoutSession';
import { formatKoreanDateTime, getTrackingUrl } from '../utils/commerce';
import './CheckoutPage.css';
import VietnamPayment from '../components/VietnamPayment';

export default function OrderLookup() {
  const { orderId } = useParams();
  const { currentUser } = useAuth();
  return <OrderLookupContent key={`${orderId || ''}:${currentUser?.uid || ''}`} orderId={orderId} />;
}

function OrderLookupContent({ orderId }) {
  const copy = useStoreCopy();
  const { language } = useLanguage();
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
      .catch(() => { if (active) setError(copy("주문을 확인할 수 없습니다. 주문한 계정으로 로그인하거나 주문 ID와 복구 코드를 입력해 주세요.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, refresh, copy]);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(''); setOrder(null);
    try {
      const result = await getOrder(enteredId.trim(), token.trim());
      if (token.trim()) rememberOrder(result.id, token.trim());
      setToken(''); setOrder(result); navigate(`/orders/${result.id}`, { replace: true });
    } catch { setError(copy("주문 ID 또는 복구 코드를 확인해 주세요.")); }
    finally { setLoading(false); }
  };
  const recover = async () => {
    const attempt = readAttempt(); if (!attempt) return;
    setLoading(true); setError('');
    try {
      const result = await recoverOrderAttempt(attempt);
      if (result.attemptClosed) { forgetAttempt(); setError(copy("이전 요청을 안전하게 종료했습니다. 장바구니에서 다시 주문할 수 있습니다.")); }
      else { rememberOrder(result.id, attempt.guestAccessToken); forgetAttempt(); navigate(`/orders/${result.id}`); setOrder(result); }
    } catch { setError(copy("이전 요청 확인에 실패했습니다. 연결을 확인하고 다시 시도해 주세요.")); }
    finally { setLoading(false); }
  };
  return <main className="checkout-page"><section className="checkout-success-card" style={{ margin: '0 auto', maxWidth: 820 }}>
    <Link to="/">← LIKEDZY</Link><h1>{copy("주문·입금·배송 조회")}</h1>
    {loading && <p role="status">{copy("주문 확인 중…")}</p>}{error && <p className="checkout-error" role="alert">{error}</p>}
    {!order && <form onSubmit={submit} className="checkout-section">
      <p>{copy("회원은 주문한 계정으로 로그인해 주세요. 비회원은 완료 화면에서 보관한 주문 ID와 복구 코드를 입력해 주세요. 복구 코드를 타인에게 공유하지 마세요.")}</p>
      <label>{copy("주문 ID")}<input className="admin-input" autoComplete="off" required value={enteredId} onChange={(event) => setEnteredId(event.target.value)} /></label>
      <label>{copy("비회원 복구 코드")}<input className="admin-input" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} /></label>
      <button className="checkout-primary-button" disabled={loading}>{copy("주문 조회")}</button>
      <p><Link to="/login">{copy("회원 로그인")}</Link> · <Link to="/mypage">{copy("나의 주문 목록")}</Link></p>
      {readAttempt() && <button type="button" disabled={loading} onClick={recover}>{copy("응답을 받지 못한 이전 주문 복구")}</button>}
    </form>}
    {order && <>
      <p>{order.isTestOrder ? copy("테스트 주문 — 실제 입금하지 마세요") : copy("무통장 입금 주문")}</p>
      <div className="checkout-success-order"><div><span>{copy("주문번호")}</span><strong>{order.orderNumber}</strong></div><div><span>{copy("상태")}</span><strong>{copy(order.status)}</strong></div><div><span>{copy("접수일")}</span><strong>{formatKoreanDateTime(order.createdAt, language)}</strong></div><div><span>{copy("총 금액")}</span><strong>{formatMoney(order.totalAmountNumber, order.currency || 'KRW')}</strong></div></div>
      {order.items?.map((item, index) => <p key={index}>{item.productName} · {item.colorName} / {item.optionName} · {item.quantity}{copy("개 ·")}{formatMoney(item.lineAmount, order.currency || 'KRW')}</p>)}
      <p>{copy("상품")}{formatMoney(order.subtotal, order.currency || 'KRW')}{copy("+ 배송")}{formatMoney(order.shippingFee, order.currency || 'KRW')}{order.discountAmount > 0 && <> · {copy('쿠폰 할인')} −{formatMoney(order.discountAmount, order.currency || 'KRW')}</>}</p>
      {order.status === '입금 대기' && <div className="checkout-bank-card"><div><strong>{order.bank?.bankName} {order.bank?.accountNumber}</strong><p>{copy("예금주")}{order.bank?.accountHolder}</p><p>{copy("입금기한")}{formatKoreanDateTime(order.deadline, language)}</p><p>{copy("기한 후 입금은 고객센터에 먼저 문의해 주세요.")}</p></div></div>}
      {order.trackingNumber && <p><a href={getTrackingUrl(order.courier, order.trackingNumber)} target="_blank" rel="noreferrer">{order.courier} · {order.trackingNumber}{copy("배송 조회 ↗")}</a></p>}
      {order.status === '입금 대기' && order.currency === 'VND' && !order.isTestOrder && <VietnamPayment bank={order.bank} amount={order.totalAmountNumber} language={language} />}
      <p>{copy("취소·교환·반품은")}<Link to="/policies/returns">{copy("교환·반품 안내 및 고객센터")}</Link>{copy("를 확인해 주세요.")}</p>
      <div className="checkout-success-actions"><button disabled={loading} onClick={() => { setLoading(true); setError(''); setOrder(null); setRefresh((n) => n + 1); }}>{copy("현재 상태 새로고침")}</button><button onClick={() => window.print()}>{copy("주문서 인쇄·저장")}</button></div>
    </>}
  </section></main>;
}
