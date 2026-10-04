import React, { useState } from 'react';
import { Check, Copy, ChevronDown } from 'lucide-react';
import { formatKoreanDateTime } from '../utils/commerce';
import { formatMoney } from '../utils/market';
import VietnamPayment from './VietnamPayment';

export default function CheckoutSuccess({ order, recoveryToken, language = 'ko', onNavigate }) {
  const [copied, setCopied] = useState('');
  const text = (ko, en) => language === 'ko' ? ko : en;
  const copy = async (value, name) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(name);
    } catch {
      window.prompt(text('아래 내용을 복사해 주세요.', 'Copy the information below.'), value);
    }
  };

  return <main className="checkout-page checkout-success-page">
    <section className="checkout-success-card" aria-labelledby="order-success-title">
      <header className="checkout-success-heading">
        <span className="checkout-success-icon" aria-hidden="true"><Check size={26} /></span>
        <h1 id="order-success-title">{order.isTestOrder ? text('테스트 주문 접수 완료', 'Test order received') : text('주문 접수 완료', 'Order received')}</h1>
        <p className="checkout-success-lead">{order.isTestOrder
          ? text('실제 입금하지 마세요. 관리자 화면에서 결과를 확인해 주세요.', 'Do not transfer money. Review the test in the admin page.')
          : text('입금 확인 후 상품을 준비해 드립니다.', 'We will prepare your items once payment is confirmed.')}</p>
      </header>

      <dl className="checkout-success-order">
        <div className="checkout-success-total"><dt>{text('입금할 금액', 'Amount to transfer')}</dt><dd>{formatMoney(order.totalAmountNumber, order.currency || 'KRW')}</dd></div>
        <div><dt>{text('주문번호', 'Order number')}</dt><dd>{order.orderNumber}</dd></div>
        <div><dt>{text('입금기한', 'Payment deadline')}</dt><dd>{formatKoreanDateTime(order.deadline, language)}</dd></div>
      </dl>

      {order.currency === 'VND' && !order.isTestOrder
        ? <VietnamPayment bank={order.bank} language={language} orderReceived />
        : <div className="checkout-bank-card">
          <div><span>{text('입금 계좌', 'Bank account')}</span><strong>{order.bank.bankName}</strong><strong>{order.bank.accountNumber}</strong><small>{text('예금주', 'Account holder')}: {order.bank.accountHolder}</small></div>
          <button type="button" disabled={order.isTestOrder} onClick={() => copy(order.bank.accountNumber, 'bank')}><Copy size={16} aria-hidden="true" />{copied === 'bank' ? text('복사됨', 'Copied') : text('계좌 복사', 'Copy account')}</button>
        </div>}
      <p className="checkout-success-notice">{text('주문자명과 입금자명이 다르면 입금 확인이 늦어질 수 있습니다.', 'Payment confirmation may take longer if the sender name differs from the order name.')}</p>

      {recoveryToken && <details className="checkout-recovery">
        <summary>{text('비회원 주문 조회 정보', 'Guest order access')}<ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="checkout-recovery-content">
          <p>{text('다른 기기에서 주문을 조회할 때 필요합니다. 복사해 보관하고 타인에게 공유하지 마세요.', 'Save a copy to access your order on another device. Keep this information private.')}</p>
          <dl><div><dt>{text('주문 ID', 'Order ID')}</dt><dd><code>{order.id}</code></dd></div><div><dt>{text('복구 코드', 'Recovery code')}</dt><dd><code>{recoveryToken}</code></dd></div></dl>
          <button type="button" onClick={() => copy(`주문 ID: ${order.id}\n복구 코드: ${recoveryToken}`, 'recovery')}><Copy size={16} aria-hidden="true" />{copied === 'recovery' ? text('복사됨', 'Copied') : text('조회 정보 복사', 'Copy access details')}</button>
        </div>
      </details>}
      <span className="checkout-copy-status" role="status">{copied ? text('복사했습니다.', 'Copied to clipboard.') : ''}</span>

      <div className="checkout-success-actions">
        <button type="button" className="checkout-primary-button" onClick={() => onNavigate(`/orders/${order.id}`)}>{text('주문 내역 확인', 'View order')}</button>
        <button type="button" onClick={() => window.print()}>{text('인쇄 · 저장', 'Print / Save')}</button>
        <button type="button" onClick={() => onNavigate('/')}>{text('쇼핑 계속하기', 'Continue shopping')}</button>
      </div>
    </section>
  </main>;
}
