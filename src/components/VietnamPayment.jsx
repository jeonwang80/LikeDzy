import React, { useState } from 'react';
import { formatMoney } from '../utils/market';

export default function VietnamPayment({ bank, amount, language = 'ko', compact = false }) {
  const [copied, setCopied] = useState(false);
  const ko = language === 'ko';
  const hasSavedBank = Boolean(bank?.accountNumber || bank?.accountHolder || bank?.bankName);
  const accountNumber = hasSavedBank ? bank.accountNumber || '' : '700-010-577080';
  const accountHolder = hasSavedBank ? bank.accountHolder || '' : 'JUN HONG';
  const bankName = hasSavedBank ? bank.bankName || '' : 'Shinhan Bank Vietnam';
  const knownAccount = accountNumber.replace(/\D/g, '') === '700010577080' && accountHolder.trim().toUpperCase() === 'JUN HONG';
  const copyAccount = async () => {
    try { await navigator.clipboard.writeText(accountNumber.replace(/\D/g, '')); setCopied(true); }
    catch { window.prompt(ko ? '계좌번호를 복사해 주세요.' : 'Copy the account number.', accountNumber); }
  };
  return <section className={`checkout-vietnam-payment ${compact ? 'compact' : ''}`} aria-label={ko ? '베트남 입금 안내' : 'Vietnam bank transfer'}>
    <h3>{ko ? '베트남 입금 계좌' : 'Vietnam bank transfer'}</h3>
    <strong>{bankName}</strong><p className="checkout-payment-account">{accountNumber}</p><p>{ko ? '예금주' : 'Account holder'}: <b>{accountHolder}</b></p>
    {amount !== null && amount !== undefined && <p>{ko ? '입금할 금액' : 'Amount to transfer'}: <b>{formatMoney(amount, 'VND')}</b></p>}
    <button type="button" onClick={copyAccount}>{copied ? (ko ? '복사됨' : 'Copied') : (ko ? '계좌번호 복사' : 'Copy account number')}</button>
    {knownAccount && <details open={!compact}><summary>{ko ? 'VietQR 보기 · 저장' : 'View / save VietQR'}</summary><a href="/payments/shinhan-vietnam-vietqr.png" target="_blank" rel="noreferrer"><img src="/payments/shinhan-vietnam-vietqr.png" alt="VietQR — Shinhan Bank Vietnam, JUN HONG, 700-010-577080" /><span>{ko ? 'QR 이미지 크게 보기' : 'Open QR image'}</span></a></details>}
    <small>{ko ? '주문 접수 후 확정된 최종 금액으로 입금해 주세요. QR 스캔 후 수취인과 금액을 확인해 주세요.' : 'Transfer the final amount after placing your order. Check the recipient and amount after scanning the QR.'}</small>
  </section>;
}
