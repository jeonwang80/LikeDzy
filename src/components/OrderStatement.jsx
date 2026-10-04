import React from 'react';
import { formatMoney } from '../utils/market';
import { formatKoreanDateTime } from '../utils/commerce';
import './OrderStatement.css';

export default function OrderStatement({ order, language = 'ko', statusLabel }) {
  const text = (ko, en) => language === 'ko' ? ko : en;
  const money = (value) => formatMoney(value, order.currency || 'KRW');
  const date = (value) => value ? formatKoreanDateTime(value, language) : '—';
  const bank = order.bankSnapshot || order.bank;
  const address = order.address || [order.address1, order.address2, order.ward, order.province, order.postcode, order.country].filter(Boolean).join(', ');
  return <article className="order-statement">
    <header className="order-statement-heading"><span>LIKEDZY</span><div><h2>{text('주문 전표', 'Order statement')}</h2><b>{statusLabel || order.status || '—'}</b></div></header>
    {order.isTestOrder && <p className="order-statement-test">{text('테스트 주문 · 실제 입금하지 마세요.', 'Test order · Do not transfer money.')}</p>}
    <dl className="order-statement-meta"><div><dt>{text('주문번호', 'Order number')}</dt><dd>{order.orderNumber || order.id}</dd></div><div><dt>{text('주문일시', 'Order placed')}</dt><dd>{date(order.createdAt)}</dd></div></dl>
    <section className="order-statement-section"><h3>{text('주문 상품', 'Order items')}</h3>
      <ul className="order-statement-items">{(order.items || []).map((item, index) => <li key={item.variantId || index}><div><strong>{item.productName || text('상품', 'Item')}</strong><span>{[item.colorName, item.optionName].filter(Boolean).join(' / ')}{` · ${item.quantity ?? '—'}${text('개', ' items')}`}</span>{item.unitPrice != null && <span>{text('단가', 'Unit price')} {money(item.unitPrice)}</span>}</div><b>{money(item.lineAmount ?? (item.unitPrice != null && item.quantity != null ? item.unitPrice * item.quantity : null))}</b></li>)}</ul>
      <dl className="order-statement-amounts">
        <div><dt>{text('상품금액', 'Subtotal')}</dt><dd>{money(order.subtotal)}</dd></div>
        <div><dt>{text('배송비', 'Delivery')}</dt><dd>{money(order.shippingFee)}</dd></div>
        {order.discountAmount > 0 && <div><dt>{text('쿠폰 할인', 'Coupon discount')}{order.couponCode && <small>{order.couponCode}</small>}</dt><dd>−{money(order.discountAmount)}</dd></div>}
        <div className="order-statement-total"><dt>{text('최종 주문금액', 'Order total')}</dt><dd>{money(order.totalAmountNumber)}</dd></div>
      </dl>
    </section>
    <section className="order-statement-section"><h3>{text('입금 정보', 'Payment details')}</h3><dl className="order-statement-meta">
      <div><dt>{text('입금자명', 'Sender name')}</dt><dd>{order.depositName || order.name || '—'}</dd></div>
      {bank && <><div><dt>{text('입금 계좌', 'Bank account')}</dt><dd>{bank.bankName}<br />{bank.accountNumber}<br />{bank.accountHolder}</dd></div></>}
      {order.status === '입금 대기' && <div><dt>{text('입금기한', 'Payment deadline')}</dt><dd>{date(order.depositDeadlineAt || order.deadline)}</dd></div>}
      {order.paidAt && <div><dt>{text('입금 확인일', 'Payment confirmed')}</dt><dd>{date(order.paidAt)}</dd></div>}
    </dl></section>
    <section className="order-statement-section"><h3>{text('배송 정보', 'Delivery details')}</h3><dl className="order-statement-meta">
      <div><dt>{text('받는 분', 'Recipient')}</dt><dd>{order.recipientName || order.name || '—'}</dd></div>
      <div><dt>{text('연락처', 'Phone')}</dt><dd>{order.recipientPhone || order.phone || '—'}</dd></div>
      <div><dt>{text('배송지', 'Address')}</dt><dd>{address || '—'}</dd></div>
      {order.notes && <div><dt>{text('요청사항', 'Instructions')}</dt><dd>{order.notes}</dd></div>}
      {order.trackingNumber && <div><dt>{text('운송장', 'Tracking number')}</dt><dd>{order.courier} · {order.trackingNumber}</dd></div>}
    </dl></section>
  </article>;
}
