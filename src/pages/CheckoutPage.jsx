import { useStoreCopy } from '../i18n/storeCopy';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, MapPin, PackageCheck } from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createBankTransferOrder, quoteCoupon, recoverOrderAttempt } from '../services/orderService';
import { checkoutAttempt, forgetAttempt, readAttempt, rememberOrder } from '../utils/checkoutSession';
import {
  calculateShippingFee,
  ADMIN_TEST_COMMERCE_SETTINGS,
  formatKoreanDateTime,
  isCommerceReady,
  normalizeCommerceSettings,
} from '../utils/commerce';
import { useLanguage } from '../i18n/LanguageContext';
import { cleanProfile } from '../utils/customerProfile';
import { formatMoney, marketSettings, productPrice } from '../utils/market';
import './CheckoutPage.css';
import { useCheckoutCatalog } from '../hooks/useCheckoutCatalog';
import VietnamPayment from '../components/VietnamPayment';
import { useCouponWallet } from '../hooks/useCouponWallet';
import { couponDate, couponStatusText } from '../utils/couponDisplay';

const EMPTY_FORM = {
  country: 'VN',
  buyerName: '',
  buyerPhone: '',
  sameRecipient: true,
  recipientName: '',
  recipientPhone: '',
  postcode: '',
  province: '',
  ward: '',
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
  const copy = useStoreCopy();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const currency = form.country === 'VN' ? 'VND' : 'KRW';
  const money = (value) => formatMoney(value, currency);
  const { isAdmin, currentUser } = useAuth();
  const { cart, clearCart, replaceCart } = useCart();
  const [settings, setSettings] = useState(() => normalizeCommerceSettings());
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [recoveryToken, setRecoveryToken] = useState('');
  const couponRequest = useRef(0);
  const [profileNotice, setProfileNotice] = useState('');
  const [savedProfile, setSavedProfile] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponQuote, setCouponQuote] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const wallet = useCouponWallet(currentUser?.uid);
  const onPriceChange = useCallback(() => {
    couponRequest.current += 1;
    setCouponQuote(null); setCouponMessage(''); setCouponLoading(false);
    setForm((current) => ({ ...current, agreeOrder: false }));
  }, []);
  const { checked: catalogChecked, loading: refreshing, error: cartNotice } = useCheckoutCatalog(cart, currency, language, replaceCart, onPriceChange);

  useEffect(() => {
    if (!currentUser) return undefined;
    let active = true;
    getDoc(doc(db, 'users', currentUser.uid)).then((snapshot) => {
      if (!active || !snapshot.exists()) return;
      const saved = cleanProfile(snapshot.data());
      setSavedProfile(saved);
      setForm((current) => {
        const next = { ...current, buyerName: current.buyerName || saved.buyerName, buyerPhone: current.buyerPhone || saved.buyerPhone };
        if (current.country !== saved.country || !saved.address1) return next;
        for (const key of ['recipientName', 'recipientPhone', 'postcode', 'province', 'ward', 'address1', 'address2']) next[key] = current[key] || saved[key];
        next.sameRecipient = saved.recipientName === saved.buyerName && saved.recipientPhone === saved.buyerPhone;
        return next;
      });
      if (saved.address1) setProfileNotice(saved.country === 'VN' ? copy('기본 배송지를 불러왔습니다.') : copy('기본 배송지가 현재 주문 국가와 달라 주소는 입력하지 않았습니다.'));
    }).catch(() => { /* Checkout remains available without a saved profile. */ });
    return () => { active = false; };
  }, [currentUser, language, copy]);

  useEffect(() => {
    document.body.classList.remove('storefront-theme');
    document.body.classList.add('storefront-light');
    document.documentElement.dataset.storefrontTheme = 'light';
    document.documentElement.style.colorScheme = 'light';
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

  const subtotal = useMemo(() => cart.some((item) => productPrice(item.product, currency) === null) ? null : cart.reduce(
    (sum, item) => sum + (productPrice(item.product, currency) || 0) * item.quantity,
    0,
  ), [cart, currency]);
  const selectedSettings = marketSettings(settings, currency);
  const liveReady = isCommerceReady(selectedSettings);
  const testMode = currency === 'KRW' && !liveReady && isAdmin;
  const activeSettings = testMode ? ADMIN_TEST_COMMERCE_SETTINGS : selectedSettings;
  const shippingFee = calculateShippingFee(subtotal, activeSettings);
  const discountAmount = couponQuote?.userId === currentUser?.uid && couponQuote?.currency === currency && couponQuote?.subtotal === subtotal ? couponQuote.discountAmount : 0;
  const total = subtotal === null || shippingFee === null ? null : subtotal + shippingFee - discountAmount;
  const ready = liveReady || testMode;

  const recoverAttempt = async () => {
    const attempt = readAttempt();
    if (!attempt) { setError(copy("복구할 주문 요청이 없습니다.")); return; }
    setSubmitting(true); setError('');
    try {
      const result = await recoverOrderAttempt(attempt);
      if (result.attemptClosed) { forgetAttempt(); setError(copy("이전 요청을 안전하게 종료했습니다. 상품 정보를 확인한 뒤 새 주문을 접수할 수 있습니다.")); return; }
      rememberOrder(result.id, attempt.guestAccessToken);
      forgetAttempt(); clearCart(); setRecoveryToken(attempt.guestAccessToken); setOrderResult(result);
    } catch (recoveryError) { setError(recoveryError.message || copy("요청 확인에 실패했습니다. 복구 코드는 유지됩니다.")); }
    finally { setSubmitting(false); }
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const applyCoupon = async (selectedCode = couponInput) => {
    if (!currentUser) { setCouponMessage(copy('쿠폰 사용은 로그인이 필요합니다.')); return; }
    if (!subtotal) { setCouponMessage(copy('상품금액을 확인해 주세요.')); return; }
    const requestId = ++couponRequest.current;
    setCouponLoading(true); setCouponMessage(''); setCouponQuote(null);
    try {
      const quote = await quoteCoupon(selectedCode.trim().toUpperCase(), currency, subtotal);
      if (requestId !== couponRequest.current) return;
      setCouponInput(quote.code);
      setCouponQuote({ ...quote, userId: currentUser.uid, currency, subtotal });
      setCouponMessage(copy('쿠폰 할인이 적용되었습니다.'));
      setForm((current) => ({ ...current, agreeOrder: false }));
    } catch (couponError) { if (requestId === couponRequest.current) setCouponMessage((language === 'ko' ? couponError.message : '') || copy('쿠폰을 사용할 수 없습니다.')); }
    finally { if (requestId === couponRequest.current) setCouponLoading(false); }
  };

  const applySavedProfile = () => {
    if (!savedProfile || savedProfile.country !== 'VN') return;
    couponRequest.current += 1;
    setCouponLoading(false);
    setCouponMessage('');
    setForm((current) => ({ ...current, ...savedProfile, sameRecipient: savedProfile.recipientName === savedProfile.buyerName && savedProfile.recipientPhone === savedProfile.buyerPhone, agreeOrder: false }));
    setCouponQuote(null);
    setProfileNotice(language === 'ko' ? '기본 배송지를 적용했습니다.' : 'Default delivery address applied.');
  };

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
      setError(copy("주소 검색을 불러오지 못했습니다. 우편번호와 주소를 직접 입력해 주세요."));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (couponLoading) return;
    if (!ready) {
      setError(copy("현재 주문 접수를 준비 중입니다. 잠시 후 다시 이용해 주세요."));
      return;
    }
    if (!catalogChecked) { setError(cartNotice || (language === 'ko' ? '상품 정보를 확인하고 있습니다. 잠시만 기다려 주세요.' : 'Checking your items. Please wait.')); return; }
    if (!form.agreeOrder || !form.agreePrivacy) {
      setError(copy("주문 내용과 개인정보 수집 안내를 확인해 주세요."));
      return;
    }
    if (currency === 'KRW' && form.cashReceiptType !== 'none' && !form.cashReceiptIdentity.trim()) {
      setError(copy("현금영수증 발급 정보를 입력해 주세요."));
      return;
    }

    const recipientName = form.sameRecipient ? form.buyerName : form.recipientName;
    const recipientPhone = form.sameRecipient ? form.buyerPhone : form.recipientPhone;
    setSubmitting(true);
    try {
      if (discountAmount > 0) {
        let latest;
        try { latest = await quoteCoupon(couponQuote.code, currency, subtotal); }
        catch (failure) {
          setCouponQuote(null); setCouponMessage((language === 'ko' ? failure.message : '') || copy('쿠폰을 사용할 수 없습니다.'));
          setForm(current => ({ ...current, agreeOrder: false }));
          return;
        }
        if (latest.discountAmount !== discountAmount) {
          setCouponQuote({ ...latest, userId: currentUser.uid, currency, subtotal });
          setCouponMessage(language === 'ko' ? '쿠폰 조건이 변경되었습니다. 최종 금액을 다시 확인해 주세요.' : 'Coupon terms changed. Please review the updated total.');
          setForm(current => ({ ...current, agreeOrder: false }));
          return;
        }
      }
      const request = {
        cart,
        expectedTotal: total, currency, couponCode: discountAmount ? couponQuote.code : '',
        customer: {
          country: form.country,
          buyerName: form.buyerName.trim(),
          buyerPhone: form.buyerPhone.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          postcode: form.postcode.trim(),
          province: form.province.trim(),
          ward: form.ward.trim(),
          address1: form.address1.trim(),
          address2: form.address2.trim(),
          depositorName: form.depositorName.trim(),
          notes: form.notes.trim(),
          cashReceipt: {
            type: currency === 'KRW' ? form.cashReceiptType : 'none',
            identity: currency !== 'KRW' || form.cashReceiptType === 'none' ? '' : form.cashReceiptIdentity.trim(),
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
      setError((language === 'ko' ? submitError.message : '') || copy("주문 접수에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      window.prompt(copy("아래 내용을 복사해 주세요."), String(value));
    }
  };

  if (orderResult) {
    return (
      <main className="checkout-page checkout-success-page">
        <section className="checkout-success-card">
          <span className="checkout-success-icon"><Check size={32} /></span>
          <p className="checkout-eyebrow">{orderResult.isTestOrder ? 'TEST ORDER RECEIVED' : 'ORDER RECEIVED'}</p>
          <h1>{orderResult.isTestOrder ? copy("테스트 주문이 접수되었습니다.") : copy("주문이 접수되었습니다.")}</h1>
          <p className="checkout-success-lead">{orderResult.isTestOrder ? copy("실제 입금하지 마세요. 관리자 주문 화면에서 테스트 결과를 확인할 수 있습니다.") : copy("입금이 확인되면 상품 준비를 시작합니다.")}</p>

          <div className="checkout-success-order">
            <div><span>{copy("주문번호")}</span><strong>{orderResult.orderNumber}</strong></div>
            <div><span>{copy("입금할 금액")}</span><strong>{formatMoney(orderResult.totalAmountNumber, orderResult.currency || 'KRW')}</strong></div>
            <div><span>{copy("입금기한")}</span><strong>{formatKoreanDateTime(orderResult.deadline, language)}</strong></div>
          </div>

          {(orderResult.currency !== 'VND' || orderResult.isTestOrder) && <div className="checkout-bank-card">
            <div>
              <span>{copy("입금 계좌")}</span>
              <strong>{orderResult.bank.bankName} {orderResult.bank.accountNumber}</strong>
              <small>{copy("예금주")}{orderResult.bank.accountHolder}</small>
            </div>
            <button type="button" onClick={() => copyText(orderResult.bank.accountNumber)} disabled={orderResult.isTestOrder}>
              <Copy size={16} />{copy("계좌 복사")}</button>
          </div>}

          {orderResult.currency === 'VND' && !orderResult.isTestOrder && <VietnamPayment bank={orderResult.bank} language={language} />}
          <p className="checkout-success-notice">{copy("주문자명과 입금자명이 다르면 확인이 늦어질 수 있습니다. 주문번호를 함께 보관해 주세요.")}</p>
          <div className="checkout-bank-card"><div><strong>{copy("비회원 주문 조회·복구 코드")}</strong><small>{copy("다른 기기에서 조회하려면 주문 ID와 복구 코드를 안전하게 보관하세요. 타인에게 공유하지 마세요.")}</small><small>{copy("주문 ID:")}{orderResult.id}</small><code style={{ overflowWrap: 'anywhere' }}>{recoveryToken}</code></div><button type="button" onClick={() => copyText(`주문 ID: ${orderResult.id}\n복구 코드: ${recoveryToken}`)}>{copy("조회 정보 복사")}</button></div>
          <div className="checkout-success-actions">
            <button type="button" onClick={() => navigate(`/orders/${orderResult.id}`)}>{copy("주문·입금·배송 확인")}</button>
            <button type="button" onClick={() => window.print()}>{copy("주문서 인쇄·저장")}</button>
            <button type="button" className="checkout-primary-button" onClick={() => navigate('/')}>{copy("쇼핑 계속하기")}</button>
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
          <h1>{copy("장바구니가 비어 있습니다.")}</h1>
          <button type="button" onClick={() => navigate('/orders/lookup')}>{copy("주문 조회")}</button>
          {readAttempt() && <button type="button" disabled={submitting} onClick={recoverAttempt}>{copy("이전 주문 요청 복구")}</button>}
          <button type="button" className="checkout-primary-button" onClick={() => navigate('/')}>{copy("상품 보러가기")}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={18} />{copy("장바구니로")}</button>
        <button type="button" className="checkout-logo" onClick={() => navigate('/')}>LIKEDZY</button>
      </header>

      <div className="checkout-shell">
        <section className="checkout-form-column">
          <div className="checkout-title">
            <h1>{copy("주문서 작성")}</h1>
            <p>{copy("입금 확인 후 택배 발송이 시작됩니다.")}</p>
          </div>

          {savedProfile?.address1 && savedProfile.country === 'VN' && <div className="checkout-saved-profile"><span>{profileNotice}</span><button type="button" onClick={applySavedProfile}>{copy('기본 배송지 사용')}</button></div>}

          {!settingsLoading && !ready && (
            <div className="checkout-disabled-notice">{copy("현재 주문 접수를 준비 중입니다. 운영 설정이 완료되면 주문할 수 있습니다.")}</div>
          )}

          {testMode && (
            <div className="checkout-test-notice">{copy("관리자 테스트 주문 모드입니다. 주문과 재고 예약은 기록되지만 실제 입금은 하지 마세요.")}</div>
          )}

          <form id="checkout-page-form" onSubmit={handleSubmit}>
            <fieldset className="checkout-section">
              <legend><span>01</span>{copy("주문자 정보")}</legend>
              <div className="checkout-field-grid">
                <label>
                  <span>{copy("주문자 이름 *")}</span>
                  <input required autoComplete="name" value={form.buyerName} onChange={(event) => updateForm('buyerName', event.target.value)} placeholder={copy("홍길동")} />
                </label>
                <label>
                  <span>{copy("연락처 *")}</span>
                  <input required type="tel" autoComplete="tel" value={form.buyerPhone} onChange={(event) => updateForm('buyerPhone', event.target.value)} placeholder="090 123 4567" />
                </label>
              </div>
            </fieldset>

            <fieldset className="checkout-section">
              <legend><span>02</span>{copy("배송지 정보")}</legend>
              <p className="checkout-destination">{language === 'ko' ? '베트남 배송 · 무료배송' : 'Delivery in Vietnam · Free shipping'}</p>
              <label className="checkout-check-row">
                <input type="checkbox" checked={form.sameRecipient} onChange={(event) => updateForm('sameRecipient', event.target.checked)} />{copy("주문자 정보와 동일")}</label>
              {!form.sameRecipient && (
                <div className="checkout-field-grid">
                  <label>
                    <span>{copy("받는 분 *")}</span>
                    <input required value={form.recipientName} onChange={(event) => updateForm('recipientName', event.target.value)} />
                  </label>
                  <label>
                    <span>{copy("받는 분 연락처 *")}</span>
                    <input required type="tel" value={form.recipientPhone} onChange={(event) => updateForm('recipientPhone', event.target.value)} />
                  </label>
                </div>
              )}
              {form.country === 'KR' ? <>
              <div className="checkout-address-row">
                <label>
                  <span>{copy("우편번호 *")}</span>
                  <input required inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" value={form.postcode} onChange={(event) => updateForm('postcode', event.target.value)} placeholder={copy("우편번호")} />
                </label>
                <button type="button" onClick={handleAddressSearch}><MapPin size={16} />{copy("주소 검색")}</button>
              </div>
              <label>
                <span>{copy("기본주소 *")}</span>
                <input required autoComplete="address-line1" value={form.address1} onChange={(event) => updateForm('address1', event.target.value)} placeholder={copy("도로명 또는 지번 주소")} />
              </label>
              <label>
                <span>{copy("상세주소 (선택)")}</span>
                <input id="checkout-address-detail" autoComplete="address-line2" value={form.address2} onChange={(event) => updateForm('address2', event.target.value)} placeholder={copy("동·호수 등 상세주소")} />
              </label>
              </> : <>
              <div className="checkout-field-grid checkout-vietnam-region">
                <label>
                  <span>{copy("시·성 (Province / City) *")}</span>
                  <input required autoComplete="address-level1" value={form.province} onChange={(event) => updateForm('province', event.target.value)} placeholder={copy("예: Hồ Chí Minh")}/>
                </label>
                <label>
                  <span>{copy("동·면 (Ward / Commune) *")}</span>
                  <input required autoComplete="address-level3" value={form.ward} onChange={(event) => updateForm('ward', event.target.value)} placeholder={copy("예: Phường Sài Gòn")}/>
                </label>
              </div>
              <label>
                <span>{copy("집 번호·도로명 *")}</span>
                <input required autoComplete="address-line1" value={form.address1} onChange={(event) => updateForm('address1', event.target.value)} placeholder={copy("예: 123 Nguyễn Huệ")}/>
              </label>
              <div className="checkout-field-grid checkout-vietnam-extra">
                <label>
                  <span>{copy("건물·아파트·호수 (선택)")}</span>
                  <input autoComplete="address-line2" value={form.address2} onChange={(event) => updateForm('address2', event.target.value)} placeholder={copy("건물명·호수")}/>
                </label>
                <label>
                  <span>{copy("우편번호 (선택)")}</span>
                  <input inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" value={form.postcode} onChange={(event) => updateForm('postcode', event.target.value)} placeholder={language === 'ko' ? '숫자 5자리' : '5 digits'}/>
                </label>
              </div>
              </>}
              <label>
                <span>{copy("배송 요청사항")}</span>
                <select value={form.notes} onChange={(event) => updateForm('notes', event.target.value)}>
                  <option value="">{copy("배송 요청사항을 선택해 주세요.")}</option>
                  <option value={copy("부재 시 문 앞에 놓아주세요.")}>{copy("부재 시 문 앞에 놓아주세요.")}</option>
                  <option value={copy("배송 전 연락해 주세요.")}>{copy("배송 전 연락해 주세요.")}</option>
                  <option value={copy("경비실에 맡겨주세요.")}>{copy("경비실에 맡겨주세요.")}</option>
                  <option value={copy("택배함에 넣어주세요.")}>{copy("택배함에 넣어주세요.")}</option>
                </select>
              </label>
            </fieldset>

            <fieldset className="checkout-section">
              <legend><span>03</span>{copy("무통장 입금")}</legend>
              {currency === 'VND' ? <VietnamPayment bank={selectedSettings} language={language} /> : <div className="checkout-bank-card checkout-bank-preview">
                <div>
                  <span>{copy("입금 계좌")}</span>
                  <strong>{ready ? `${activeSettings.bankName} ${activeSettings.accountNumber}` : copy("운영 설정 준비 중")}</strong>
                  <small>{ready ? (language === 'ko' ? `예금주 ${activeSettings.accountHolder} · 주문 후 ${activeSettings.depositDeadlineHours}시간 이내 입금` : `${activeSettings.accountHolder} · Pay within ${activeSettings.depositDeadlineHours} hours`) : copy("계좌 설정 후 주문 접수가 활성화됩니다.")}</small>
                </div>
              </div>
              }
              <label>
                <span>{copy("입금자명")}</span>
                <input value={form.depositorName} onChange={(event) => updateForm('depositorName', event.target.value)} placeholder={copy("주문자와 다를 경우 입력")} />
              </label>
              {currency === 'KRW' && <div className="checkout-cash-receipt">
                <span>{copy("현금영수증")}</span>
                <div>
                  <label><input type="radio" name="receipt" checked={form.cashReceiptType === 'none'} onChange={() => updateForm('cashReceiptType', 'none')} />{copy("미신청")}</label>
                  <label><input type="radio" name="receipt" checked={form.cashReceiptType === 'personal'} onChange={() => updateForm('cashReceiptType', 'personal')} />{copy("소득공제")}</label>
                  <label><input type="radio" name="receipt" checked={form.cashReceiptType === 'business'} onChange={() => updateForm('cashReceiptType', 'business')} />{copy("지출증빙")}</label>
                </div>
              </div>}
              {currency === 'KRW' && form.cashReceiptType !== 'none' && (
                <label>
                  <span>{form.cashReceiptType === 'business' ? copy("사업자등록번호 *") : copy("휴대전화번호 *")}</span>
                  <input required value={form.cashReceiptIdentity} onChange={(event) => updateForm('cashReceiptIdentity', event.target.value)} placeholder={copy("숫자만 입력")} />
                </label>
              )}
            </fieldset>

            <fieldset className="checkout-section checkout-agreements">
              <legend><span>04</span>{copy("주문 확인")}</legend>
              <label><input type="checkbox" required checked={form.agreeOrder} onChange={(event) => updateForm('agreeOrder', event.target.checked)} />{copy("주문 상품, 배송비, 최종 결제금액을 확인했습니다. (필수)")}</label>
              <label><input type="checkbox" required checked={form.agreePrivacy} onChange={(event) => updateForm('agreePrivacy', event.target.checked)} />{copy("주문 처리와 배송을 위한 개인정보 수집·이용에 동의합니다. (필수)")}</label>
              <p>{copy("수집 항목: 이름, 연락처, 주소 · 이용 목적: 주문 처리 및 배송 · 보유 기간: 관련 법령에 따른 거래 기록 보관기간")}</p>
            </fieldset>
          </form>
        </section>

        <aside className="checkout-summary">
          <div className="checkout-summary-sticky">
            <h2>{copy("주문 상품")}<span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></h2>
            <div className="checkout-summary-items">
              {cart.map((item, index) => (
                <article key={`${item.product.id}-${item.option?.name}-${item.product.cartColorName || index}`}>
                  <div>
                    <strong>{item.product[language]?.name || item.product.name}</strong>
                    <span>{item.product.cartColorName || '기본'} / {item.option?.name || '기본'} · {item.quantity}{copy("개")}</span>
                  </div>
                  <b>{money(productPrice(item.product, currency) === null ? null : productPrice(item.product, currency) * item.quantity)}</b>
                </article>
              ))}
            </div>
            <dl className="checkout-amounts" aria-live="polite" aria-atomic="true">
              <div><dt>{copy("상품금액")}</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>{copy("배송비")}</dt><dd>{shippingFee === 0 ? copy("무료") : money(shippingFee)}</dd></div>
              {discountAmount > 0 && <div><dt>{copy('쿠폰 할인')} ({couponQuote.code})</dt><dd>−{money(discountAmount)}</dd></div>}
              <div className="checkout-grand-total"><dt>{copy("최종 입금액")}</dt><dd>{money(total)}</dd></div>
            </dl>
            <div className="checkout-coupon">
              <label htmlFor="checkout-coupon-code">{copy('쿠폰 코드')}</label>
              <div className="checkout-coupon-entry"><input id="checkout-coupon-code" value={couponInput} maxLength="32" disabled={couponLoading} onChange={(event) => { couponRequest.current += 1; setCouponInput(event.target.value.toUpperCase()); setCouponQuote(null); setCouponMessage(''); setForm((current) => ({ ...current, agreeOrder: false })); }} placeholder={language === 'ko' ? '쿠폰 코드 입력' : 'Enter code'} /><button type="button" onClick={() => applyCoupon()} disabled={couponLoading || refreshing || !currentUser || !couponInput.trim()}>{couponLoading ? copy('확인 중…') : copy('적용')}</button></div>
              {!currentUser ? <p>{language === 'ko' ? '로그인 후 쿠폰을 사용할 수 있습니다.' : 'Sign in to use coupons.'}</p> : <>
                {!wallet.error && <p>{wallet.loading ? (language === 'ko' ? '보유 쿠폰 확인 중…' : 'Loading coupons…') : language === 'ko' ? `보유 ${wallet.heldCount}/3 · 주문당 1개 사용` : `${wallet.heldCount}/3 held · One per order`}</p>}
                {wallet.error && <p role="alert">{language === 'ko' ? '보유 쿠폰을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.' : 'Could not load your coupons. Please try again shortly.'}</p>}
                {wallet.coupons.filter(coupon => coupon.currency === currency && !['used', 'expired', 'unavailable'].includes(coupon.status)).map(coupon => <div className="checkout-wallet-coupon" key={coupon.code}>
                  <button className="checkout-member-coupon" type="button" onClick={() => { setCouponInput(coupon.code); applyCoupon(coupon.code); }} disabled={couponLoading || refreshing || coupon.status !== 'available' || coupon.minSubtotal > subtotal}>
                    <strong>{coupon.percent}% · {coupon.code}</strong><span>{coupon.status === 'available' ? coupon.minSubtotal > subtotal ? (language === 'ko' ? '최소 주문금액 미달' : 'Minimum spend not met') : (discountAmount > 0 && couponQuote.code === coupon.code ? (language === 'ko' ? '적용됨' : 'Applied') : (language === 'ko' ? '선택' : 'Select')) : couponStatusText(coupon.status, language)}</span>
                  </button>
                  <small>{language === 'ko' ? '최대 할인' : 'Up to'} {money(coupon.maxDiscount)} · {language === 'ko' ? '최소 주문' : 'Min. spend'} {money(coupon.minSubtotal)}{coupon.status === 'scheduled' && <><br />{couponDate(coupon.startsAt, language)} {language === 'ko' ? '시작' : 'starts'}</>}</small>
                </div>)}
              </>}
              {couponMessage && (!couponQuote || discountAmount > 0) && <p className={discountAmount > 0 ? 'coupon-success' : 'coupon-error'} role="status">{couponMessage}</p>}
              {discountAmount > 0 && <button type="button" onClick={() => { couponRequest.current += 1; setCouponQuote(null); setCouponInput(''); setCouponMessage(''); setForm((current) => ({ ...current, agreeOrder: false })); }}>{language === 'ko' ? '쿠폰 적용 취소' : 'Remove coupon'}</button>}
            </div>
            {activeSettings.remoteAreaNotice && <p className="checkout-remote-note">{activeSettings.remoteAreaNotice}</p>}
            {refreshing && <p role="status">{language === 'ko' ? '주문 상품을 확인하고 있습니다…' : 'Checking your items…'}</p>}
            {cartNotice && <p role="alert">{cartNotice}</p>}
            {readAttempt() && <button type="button" disabled={submitting} onClick={recoverAttempt}>{copy("이전 주문 요청 복구")}</button>}
            {error && <div className="checkout-error" role="alert">{error}</div>}
            <button className="checkout-primary-button" type="submit" form="checkout-page-form" disabled={submitting || couponLoading || settingsLoading || !ready || !catalogChecked || refreshing}>
              {submitting ? copy("주문 접수 중…") : testMode ? copy("관리자 테스트 주문 접수") : copy("무통장 입금으로 주문 접수")}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
