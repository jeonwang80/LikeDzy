import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, MapPin, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { appCheckConfigured, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createBankTransferOrder, recoverOrderAttempt } from '../services/orderService';
import { checkoutAttempt, forgetAttempt, readAttempt, rememberOrder } from '../utils/checkoutSession';
import {
  calculateShippingFee,
  ADMIN_TEST_COMMERCE_SETTINGS,
  formatKRW,
  formatKoreanDateTime,
  isCommerceReady,
  normalizeCommerceSettings,
} from '../utils/commerce';
import './CheckoutPage.css';

const EMPTY_FORM = {
  buyerName: '',
  buyerPhone: '',
  sameRecipient: true,
  recipientName: '',
  recipientPhone: '',
  postcode: '',
  address1: '',
  address2: '',
  depositorName: '',
  notes: '',
  cashReceiptType: 'none',
  cashReceiptIdentity: '',
  agreeOrder: false,
  agreePrivacy: false,
};

function loadPostcodeScript() {
  if (window.daum?.Postcode) return Promise.resolve();
  const existing = document.querySelector('script[data-likedzy-postcode]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.dataset.likedzyPostcode = 'true';
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.appendChild(script);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { cart, clearCart, replaceCart } = useCart();
  const [settings, setSettings] = useState(() => normalizeCommerceSettings());
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [catalogChecked, setCatalogChecked] = useState(false);
  const [cartNotice, setCartNotice] = useState('');

  useEffect(() => {
    let mode = 'light';
    try {
      mode = window.localStorage.getItem('likedzy-storefront-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      mode = 'light';
    }
    document.body.classList.toggle('storefront-theme', mode === 'dark');
    document.body.classList.toggle('storefront-light', mode === 'light');
    document.documentElement.dataset.storefrontTheme = mode;
    document.documentElement.style.colorScheme = mode;
    return () => {
      document.body.classList.remove('storefront-theme', 'storefront-light');
      delete document.documentElement.dataset.storefrontTheme;
      document.documentElement.style.removeProperty('color-scheme');
    };
  }, []);

  useEffect(() => onSnapshot(
    doc(db, 'settings', 'commerce'),
    (snapshot) => {
      setSettings(normalizeCommerceSettings(snapshot.exists() ? snapshot.data() : {}));
      setSettingsLoading(false);
    },
    () => setSettingsLoading(false),
  ), []);

  const subtotal = useMemo(() => cart.reduce(
    (sum, item) => sum + (Number(item.product.prices?.KRW) || 0) * item.quantity,
    0,
  ), [cart]);
  const liveReady = isCommerceReady(settings);
  const testMode = !liveReady && isAdmin;
  const activeSettings = testMode ? ADMIN_TEST_COMMERCE_SETTINGS : settings;
  const shippingFee = calculateShippingFee(subtotal, activeSettings);
  const total = subtotal + shippingFee;
  const ready = (liveReady && appCheckConfigured) || testMode;

  const refreshCart = async () => {
    setRefreshing(true); setCatalogChecked(false); setError('');
    try {
      const productIds = [...new Set(cart.map((item) => item.product.id))];
      const entries = await Promise.all(productIds.map(async (id) => {
        const [product, stock] = await Promise.all([getDoc(doc(db, 'products', id)), getDocs(query(collection(db, 'stockAvailability'), where('productId', '==', id), limit(200)))]);
        return [id, { product: product.exists() ? product.data() : null, variants: stock.docs.map((entry) => ({ id: entry.id, ...entry.data() })) }];
      }));
      const current = new Map(entries);
      let blocked = false; let changed = false;
      const next = cart.map((item) => {
        const entry = current.get(item.product.id);
        const variant = entry.variants.find((row) => row.colorName === (item.product.cartColorName || '기본') && row.optionName === item.option.name);
        const price = Number(entry.product?.prices?.KRW ?? entry.product?.priceKRW) || 0;
        const available = Math.max(0, Number(variant?.available) || 0);
        if (!entry.product || entry.product.isActive === false || !price || !variant || available < item.quantity) blocked = true;
        if (price !== item.product.prices.KRW || variant?.id !== item.option.variantId) changed = true;
        return { ...item, product: { ...item.product, name: entry.product?.name || item.product.name, prices: { KRW: price } }, option: { ...item.option, variantId: variant?.id || '', stock: available } };
      });
      replaceCart(next);
      setForm((currentForm) => ({ ...currentForm, agreeOrder: false }));
      setCatalogChecked(!blocked);
      setCartNotice(blocked ? '품절·재고 미등록·판매 중지 상품이 있습니다. 장바구니에서 수량을 줄이거나 삭제해 주세요.' : changed ? '최신 가격·옵션으로 갱신했습니다. 금액을 다시 확인하고 동의해 주세요.' : '최신 가격과 재고를 확인했습니다. 주문 접수 시 서버에서 다시 검증합니다.');
    } catch { setError('최신 상품 정보를 확인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'); }
    finally { setRefreshing(false); }
  };

  const recoverAttempt = async () => {
    const attempt = readAttempt();
    if (!attempt) { setError('복구할 주문 요청이 없습니다.'); return; }
    setSubmitting(true); setError('');
    try {
      const result = await recoverOrderAttempt(attempt);
      if (result.attemptClosed) { forgetAttempt(); setError('이전 요청을 안전하게 종료했습니다. 상품 정보를 확인한 뒤 새 주문을 접수할 수 있습니다.'); return; }
      rememberOrder(result.id, attempt.guestAccessToken);
      forgetAttempt(); clearCart(); setRecoveryToken(attempt.guestAccessToken); setOrderResult(result);
    } catch (recoveryError) { setError(recoveryError.message || '요청 확인에 실패했습니다. 복구 코드는 유지됩니다.'); }
    finally { setSubmitting(false); }
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleAddressSearch = async () => {
    try {
      await loadPostcodeScript();
      new window.daum.Postcode({
        oncomplete: (data) => {
          const address = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          setForm((current) => ({ ...current, postcode: data.zonecode, address1: address }));
          window.setTimeout(() => document.getElementById('checkout-address-detail')?.focus(), 0);
        },
      }).open();
    } catch {
      setError('주소 검색을 불러오지 못했습니다. 우편번호와 주소를 직접 입력해 주세요.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!ready) {
      setError('현재 주문 접수를 준비 중입니다. 잠시 후 다시 이용해 주세요.');
      return;
    }
    if (!catalogChecked) { setError('최신 상품·재고 확인 버튼을 눌러 주세요.'); return; }
    if (!form.agreeOrder || !form.agreePrivacy) {
      setError('주문 내용과 개인정보 수집 안내를 확인해 주세요.');
      return;
    }
    if (form.cashReceiptType !== 'none' && !form.cashReceiptIdentity.trim()) {
      setError('현금영수증 발급 정보를 입력해 주세요.');
      return;
    }

    const recipientName = form.sameRecipient ? form.buyerName : form.recipientName;
    const recipientPhone = form.sameRecipient ? form.buyerPhone : form.recipientPhone;
    setSubmitting(true);
    try {
      const request = {
        cart,
        expectedTotal: total,
        customer: {
          buyerName: form.buyerName.trim(),
          buyerPhone: form.buyerPhone.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          postcode: form.postcode.trim(),
          address1: form.address1.trim(),
          address2: form.address2.trim(),
          depositorName: form.depositorName.trim(),
          notes: form.notes.trim(),
          cashReceipt: {
            type: form.cashReceiptType,
            identity: form.cashReceiptType === 'none' ? '' : form.cashReceiptIdentity.trim(),
          },
          agreements: {
            orderConfirmed: true,
            privacyAgreed: true,
          },
        },
      };
      const attempt = await checkoutAttempt({ ...request, cart: cart.map((item) => ({ productId: item.product.id, variantId: item.option.variantId, colorName: item.product.cartColorName, optionName: item.option.name, quantity: item.quantity })) });
      const result = await createBankTransferOrder({ ...request, ...attempt });
      // Keep the completed order reachable even if browser persistence is unavailable.
      setRecoveryToken(attempt.guestAccessToken);
      try { rememberOrder(result.id, attempt.guestAccessToken); forgetAttempt(); } catch { /* recovery code remains visible below */ }
      clearCart();
      setOrderResult(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError(submitError.message || '주문 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      window.prompt('아래 내용을 복사해 주세요.', String(value));
    }
  };

  if (orderResult) {
    return (
      <main className="checkout-page checkout-success-page">
        <section className="checkout-success-card">
          <span className="checkout-success-icon"><Check size={32} /></span>
          <p className="checkout-eyebrow">{orderResult.isTestOrder ? 'TEST ORDER RECEIVED' : 'ORDER RECEIVED'}</p>
          <h1>{orderResult.isTestOrder ? '테스트 주문이 접수되었습니다.' : '주문이 접수되었습니다.'}</h1>
          <p className="checkout-success-lead">{orderResult.isTestOrder ? '실제 입금하지 마세요. 관리자 주문 화면에서 테스트 결과를 확인할 수 있습니다.' : '입금이 확인되면 상품 준비를 시작합니다.'}</p>

          <div className="checkout-success-order">
            <div><span>주문번호</span><strong>{orderResult.orderNumber}</strong></div>
            <div><span>입금할 금액</span><strong>{formatKRW(orderResult.totalAmountNumber)}</strong></div>
            <div><span>입금기한</span><strong>{formatKoreanDateTime(orderResult.deadline)}</strong></div>
          </div>

          <div className="checkout-bank-card">
            <div>
              <span>입금 계좌</span>
              <strong>{orderResult.bank.bankName} {orderResult.bank.accountNumber}</strong>
              <small>예금주 {orderResult.bank.accountHolder}</small>
            </div>
            <button type="button" onClick={() => copyText(orderResult.bank.accountNumber)} disabled={orderResult.isTestOrder}>
              <Copy size={16} /> 계좌 복사
            </button>
          </div>

          <p className="checkout-success-notice">
            주문자명과 입금자명이 다르면 확인이 늦어질 수 있습니다. 주문번호를 함께 보관해 주세요.
          </p>
          <div className="checkout-bank-card"><div><strong>비회원 주문 조회·복구 코드</strong><small>다른 기기에서 조회하려면 주문 ID와 복구 코드를 안전하게 보관하세요. 타인에게 공유하지 마세요.</small><small>주문 ID: {orderResult.id}</small><code style={{ overflowWrap: 'anywhere' }}>{recoveryToken}</code></div><button type="button" onClick={() => copyText(`주문 ID: ${orderResult.id}\n복구 코드: ${recoveryToken}`)}>조회 정보 복사</button></div>
          <div className="checkout-success-actions">
            <button type="button" onClick={() => navigate(`/orders/${orderResult.id}`)}>주문·입금·배송 확인</button>
            <button type="button" onClick={() => window.print()}>주문서 인쇄·저장</button>
            <button type="button" className="checkout-primary-button" onClick={() => navigate('/')}>쇼핑 계속하기</button>
          </div>
        </section>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="checkout-page checkout-empty-page">
        <section>
          <PackageCheck size={38} />
          <h1>장바구니가 비어 있습니다.</h1>
          <button type="button" onClick={() => navigate('/orders/lookup')}>주문 조회</button>
          {readAttempt() && <button type="button" disabled={submitting} onClick={recoverAttempt}>이전 주문 요청 복구</button>}
          <button type="button" className="checkout-primary-button" onClick={() => navigate('/')}>상품 보러가기</button>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={18} /> 장바구니로</button>
        <button type="button" className="checkout-logo" onClick={() => navigate('/')}>LIKEDZY</button>
        <span>SECURE ORDER</span>
      </header>

      <div className="checkout-shell">
        <section className="checkout-form-column">
          <div className="checkout-title">
            <p className="checkout-eyebrow">BANK TRANSFER CHECKOUT</p>
            <h1>주문서 작성</h1>
            <p>입금 확인 후 택배 발송이 시작됩니다.</p>
          </div>

          {!settingsLoading && !ready && (
            <div className="checkout-disabled-notice">
              현재 주문 접수를 준비 중입니다. 운영 설정이 완료되면 주문할 수 있습니다.
            </div>
          )}

          {testMode && (
            <div className="checkout-test-notice">
              관리자 테스트 주문 모드입니다. 주문과 재고 예약은 기록되지만 실제 입금은 하지 마세요.
            </div>
          )}

          <form id="checkout-page-form" onSubmit={handleSubmit}>
            <fieldset className="checkout-section">
              <legend><span>01</span> 주문자 정보</legend>
              <div className="checkout-field-grid">
                <label>
                  <span>주문자 이름 *</span>
                  <input required autoComplete="name" value={form.buyerName} onChange={(event) => updateForm('buyerName', event.target.value)} placeholder="홍길동" />
                </label>
                <label>
                  <span>연락처 *</span>
                  <input required type="tel" autoComplete="tel" value={form.buyerPhone} onChange={(event) => updateForm('buyerPhone', event.target.value)} placeholder="010-1234-5678" />
                </label>
              </div>
            </fieldset>

            <fieldset className="checkout-section">
              <legend><span>02</span> 배송지 정보</legend>
              <label className="checkout-check-row">
                <input type="checkbox" checked={form.sameRecipient} onChange={(event) => updateForm('sameRecipient', event.target.checked)} />
                주문자 정보와 동일
              </label>
              {!form.sameRecipient && (
                <div className="checkout-field-grid">
                  <label>
                    <span>받는 분 *</span>
                    <input required value={form.recipientName} onChange={(event) => updateForm('recipientName', event.target.value)} />
                  </label>
                  <label>
                    <span>받는 분 연락처 *</span>
                    <input required type="tel" value={form.recipientPhone} onChange={(event) => updateForm('recipientPhone', event.target.value)} />
                  </label>
                </div>
              )}
              <div className="checkout-address-row">
                <label>
                  <span>우편번호 *</span>
                  <input required inputMode="numeric" value={form.postcode} onChange={(event) => updateForm('postcode', event.target.value)} placeholder="우편번호" />
                </label>
                <button type="button" onClick={handleAddressSearch}><MapPin size={16} /> 주소 검색</button>
              </div>
              <label>
                <span>기본주소 *</span>
                <input required value={form.address1} onChange={(event) => updateForm('address1', event.target.value)} placeholder="도로명 또는 지번 주소" />
              </label>
              <label>
                <span>상세주소 *</span>
                <input id="checkout-address-detail" required value={form.address2} onChange={(event) => updateForm('address2', event.target.value)} placeholder="동·호수 등 상세주소" />
              </label>
              <label>
                <span>배송 요청사항</span>
                <select value={form.notes} onChange={(event) => updateForm('notes', event.target.value)}>
                  <option value="">배송 요청사항을 선택해 주세요.</option>
                  <option value="부재 시 문 앞에 놓아주세요.">부재 시 문 앞에 놓아주세요.</option>
                  <option value="배송 전 연락해 주세요.">배송 전 연락해 주세요.</option>
                  <option value="경비실에 맡겨주세요.">경비실에 맡겨주세요.</option>
                  <option value="택배함에 넣어주세요.">택배함에 넣어주세요.</option>
                </select>
              </label>
            </fieldset>

            <fieldset className="checkout-section">
              <legend><span>03</span> 무통장 입금</legend>
              <div className="checkout-bank-card checkout-bank-preview">
                <div>
                  <span>입금 계좌</span>
                  <strong>{ready ? `${activeSettings.bankName} ${activeSettings.accountNumber}` : '운영 설정 준비 중'}</strong>
                  <small>{ready ? `예금주 ${activeSettings.accountHolder} · 주문 후 ${activeSettings.depositDeadlineHours}시간 이내 입금` : '계좌 설정 후 주문 접수가 활성화됩니다.'}</small>
                </div>
              </div>
              <label>
                <span>입금자명</span>
                <input value={form.depositorName} onChange={(event) => updateForm('depositorName', event.target.value)} placeholder="주문자와 다를 경우 입력" />
              </label>
              <div className="checkout-cash-receipt">
                <span>현금영수증</span>
                <div>
                  <label><input type="radio" name="receipt" checked={form.cashReceiptType === 'none'} onChange={() => updateForm('cashReceiptType', 'none')} /> 미신청</label>
                  <label><input type="radio" name="receipt" checked={form.cashReceiptType === 'personal'} onChange={() => updateForm('cashReceiptType', 'personal')} /> 소득공제</label>
                  <label><input type="radio" name="receipt" checked={form.cashReceiptType === 'business'} onChange={() => updateForm('cashReceiptType', 'business')} /> 지출증빙</label>
                </div>
              </div>
              {form.cashReceiptType !== 'none' && (
                <label>
                  <span>{form.cashReceiptType === 'business' ? '사업자등록번호 *' : '휴대전화번호 *'}</span>
                  <input required value={form.cashReceiptIdentity} onChange={(event) => updateForm('cashReceiptIdentity', event.target.value)} placeholder="숫자만 입력" />
                </label>
              )}
            </fieldset>

            <fieldset className="checkout-section checkout-agreements">
              <legend><span>04</span> 주문 확인</legend>
              <label><input type="checkbox" required checked={form.agreeOrder} onChange={(event) => updateForm('agreeOrder', event.target.checked)} /> 주문 상품, 배송비, 최종 결제금액을 확인했습니다. (필수)</label>
              <label><input type="checkbox" required checked={form.agreePrivacy} onChange={(event) => updateForm('agreePrivacy', event.target.checked)} /> 주문 처리와 배송을 위한 개인정보 수집·이용에 동의합니다. (필수)</label>
              <p>수집 항목: 이름, 연락처, 주소 · 이용 목적: 주문 처리 및 배송 · 보유 기간: 관련 법령에 따른 거래 기록 보관기간</p>
            </fieldset>
          </form>
        </section>

        <aside className="checkout-summary">
          <div className="checkout-summary-sticky">
            <h2>주문 상품 <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></h2>
            <div className="checkout-summary-items">
              {cart.map((item, index) => (
                <article key={`${item.product.id}-${item.option?.name}-${item.product.cartColorName || index}`}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>{item.product.cartColorName || '기본'} / {item.option?.name || '기본'} · {item.quantity}개</span>
                  </div>
                  <b>{formatKRW((Number(item.product.prices?.KRW) || 0) * item.quantity)}</b>
                </article>
              ))}
            </div>
            <dl className="checkout-amounts">
              <div><dt>상품금액</dt><dd>{formatKRW(subtotal)}</dd></div>
              <div><dt>배송비</dt><dd>{shippingFee === 0 ? '무료' : formatKRW(shippingFee)}</dd></div>
              <div className="checkout-grand-total"><dt>최종 입금액</dt><dd>{formatKRW(total)}</dd></div>
            </dl>
            {activeSettings.remoteAreaNotice && <p className="checkout-remote-note">{activeSettings.remoteAreaNotice}</p>}
            <button type="button" className="checkout-primary-button" disabled={refreshing || submitting} onClick={refreshCart}>{refreshing ? '확인 중…' : '최신 상품·재고 확인'}</button>
            {cartNotice && <p role="status">{cartNotice}</p>}
            {readAttempt() && <button type="button" disabled={submitting} onClick={recoverAttempt}>이전 주문 요청 복구</button>}
            {error && <div className="checkout-error" role="alert">{error}</div>}
            <button className="checkout-primary-button" type="submit" form="checkout-page-form" disabled={submitting || settingsLoading || !ready || !catalogChecked || refreshing}>
              {submitting ? '주문 접수 중…' : testMode ? '관리자 테스트 주문 접수' : '무통장 입금으로 주문 접수'}
            </button>
            <div className="checkout-trust-list">
              <span><ShieldCheck size={16} /> {testMode ? '관리자 테스트 모드' : '구매안전서비스 확인'}</span>
              <span><Truck size={16} /> 입금 확인 후 택배 발송</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
