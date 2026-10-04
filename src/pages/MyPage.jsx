import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, startAfter, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useStoreCopy } from '../i18n/storeCopy';
import { formatMoney } from '../utils/market';
import { getTrackingUrl } from '../utils/commerce';
import { cleanProfile, EMPTY_PROFILE, validateProfile } from '../utils/customerProfile';
import './MyPage.css';
import OrderStatementDialog from '../components/OrderStatementDialog';
import { useCouponWallet } from '../hooks/useCouponWallet';
import { couponDate, couponStatusText } from '../utils/couponDisplay';

export default function MyPage() {
  const copy = useStoreCopy();
  const { language } = useLanguage();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const wallet = useCouponWallet(currentUser?.uid);
  const { coupons, loading: couponsLoading } = wallet;
  const [orders, setOrders] = useState([]);
  const [statementId, setStatementId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursors, setCursors] = useState([null]);
  const [lastDoc, setLastDoc] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const cursor = cursors[cursors.length - 1];

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return undefined; }
    let active = true;
    getDoc(doc(db, 'users', currentUser.uid)).then((snapshot) => {
      if (active && snapshot.exists()) setProfile(cleanProfile(snapshot.data()));
    }).catch(() => { if (active) setProfileMessage(language === 'ko' ? '내 정보를 불러오지 못했습니다.' : 'Could not load your details.'); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [currentUser, navigate, language]);

  useEffect(() => {
    if (!currentUser) return undefined;
    let active = true;
    async function fetchOrders() {
      setLoading(true); setError('');
      try {
        const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(20));
        const snapshot = await getDocs(q);
        if (!active) return;
        setOrders(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data(), createdAt: entry.data().createdAt?.toDate() })));
        setLastDoc(snapshot.docs.at(-1) || null);
      } catch {
        if (active) setError(copy('주문 내역을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요. 문제가 계속되면 고객센터에 문의해 주세요.'));
      } finally { if (active) setLoading(false); }
    }
    fetchOrders();
    return () => { active = false; };
  }, [currentUser, cursor, refresh, copy]);

  if (!currentUser) return null;
  const ko = language === 'ko';
  const label = (korean, english) => ko ? korean : english;
  const update = (field, value) => setProfile((current) => ({ ...current, [field]: value }));
  const saveProfile = async (event) => {
    event.preventDefault();
    const cleaned = cleanProfile(profile);
    const issue = validateProfile(cleaned);
    if (issue) { setProfileMessage(ko ? issue : 'Check your name, phone and delivery address.'); return; }
    setSaving(true); setProfileMessage('');
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { ...cleaned, schemaVersion: 1, updatedAt: serverTimestamp() });
      setProfile(cleaned); setEditing(false);
      setProfileMessage(label('기본 배송지를 저장했습니다.', 'Default delivery address saved.'));
    } catch { setProfileMessage(label('저장하지 못했습니다. 다시 시도해 주세요.', 'Could not save. Please try again.')); }
    finally { setSaving(false); }
  };
  const signOut = async () => { await logout(); navigate('/'); };

  return <main className="account-page"><div className="account-shell">
    <header className="account-heading"><div><span>{label('내 계정', 'ACCOUNT')}</span><h1>{label('마이페이지', 'My account')}</h1></div><button type="button" onClick={signOut}>{label('로그아웃', 'Sign out')}</button></header>
    <section className="account-panel" aria-labelledby="account-details-title">
      <div className="account-section-heading"><div><span>01</span><h2 id="account-details-title">{label('내 정보', 'My details')}</h2></div><button type="button" onClick={() => { setEditing((value) => !value); setProfileMessage(''); }}>{editing ? label('닫기', 'Close') : label('수정', 'Edit')}</button></div>
      <p className="account-email"><strong>{label('이메일', 'Email')}</strong><span>{currentUser.email}</span></p>
      {profileLoading ? <p role="status">{label('정보를 불러오는 중…', 'Loading details…')}</p> : editing ? <form className="account-profile-form" onSubmit={saveProfile}>
        <div className="account-form-grid"><label>{label('이름', 'Name')}<input required maxLength="80" autoComplete="name" value={profile.buyerName} onChange={(event) => update('buyerName', event.target.value)} /></label><label>{label('연락처', 'Phone')}<input required type="tel" maxLength="30" autoComplete="tel" value={profile.buyerPhone} onChange={(event) => update('buyerPhone', event.target.value)} /></label></div>
        <h3>{label('기본 배송지', 'Default delivery address')}</h3>
        <label>{label('국가', 'Country')}<select value={profile.country} onChange={(event) => setProfile((current) => ({ ...current, country: event.target.value, postcode: '', province: '', ward: '', address1: '', address2: '' }))}><option value="VN">Vietnam</option><option value="KR">대한민국</option></select></label>
        <div className="account-form-grid"><label>{label('받는 분', 'Recipient')}<input required maxLength="80" value={profile.recipientName} onChange={(event) => update('recipientName', event.target.value)} /></label><label>{label('받는 분 연락처', 'Recipient phone')}<input required type="tel" maxLength="30" value={profile.recipientPhone} onChange={(event) => update('recipientPhone', event.target.value)} /></label></div>
        {profile.country === 'VN' && <div className="account-form-grid"><label>{label('시·성', 'Province / City')}<input required maxLength="100" value={profile.province} onChange={(event) => update('province', event.target.value)} /></label><label>{label('동·면', 'Ward / Commune')}<input required maxLength="100" value={profile.ward} onChange={(event) => update('ward', event.target.value)} /></label></div>}
        <label>{label('우편번호', 'Postal code')} {profile.country === 'VN' && <small>{label('(선택)', '(optional)')}</small>}<input required={profile.country === 'KR'} inputMode="numeric" maxLength="10" value={profile.postcode} onChange={(event) => update('postcode', event.target.value)} /></label>
        <label>{label('주소', 'Street address')}<input required maxLength="200" autoComplete="address-line1" value={profile.address1} onChange={(event) => update('address1', event.target.value)} /></label>
        <label>{label('상세주소', 'Address line 2')}<input maxLength="200" autoComplete="address-line2" value={profile.address2} onChange={(event) => update('address2', event.target.value)} /></label>
        <button className="account-save" type="submit" disabled={saving}>{saving ? label('저장 중…', 'Saving…') : label('기본 배송지 저장', 'Save address')}</button>
      </form> : <div className="account-profile-summary"><p><strong>{label('이름·연락처', 'Name & phone')}</strong><span>{profile.buyerName || label('등록되지 않음', 'Not added')}{profile.buyerPhone && ` · ${profile.buyerPhone}`}</span></p><p><strong>{label('기본 배송지', 'Default address')}</strong><span>{profile.address1 ? `${profile.recipientName} · ${profile.recipientPhone}\n${[profile.address1, profile.address2, profile.ward, profile.province, profile.postcode, profile.country].filter(Boolean).join(', ')}` : label('아직 등록되지 않았습니다.', 'No address saved yet.')}</span></p></div>}
      {profileMessage && <p role="status" className="account-message">{profileMessage}</p>}
    </section>
    <section className="account-coupons" aria-labelledby="account-coupons-title"><div className="account-section-heading"><div><span>02</span><h2 id="account-coupons-title">{label('내 쿠폰', 'My coupons')}</h2></div></div>
      <p>{label('보유', 'Held')} {wallet.heldCount}/3 · {label('사용 가능', 'Available')} {wallet.availableCount} · {label('주문당 1개 사용', 'One per order')}</p>
      {wallet.error ? <p role="alert">{label('쿠폰을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.', 'Could not load coupons. Please try again shortly.')}</p> : couponsLoading ? <p role="status">{label('쿠폰을 불러오는 중…', 'Loading coupons…')}</p> : coupons.length === 0 ? <div className="account-empty">{label('보유한 쿠폰이 없습니다.', 'No coupons yet.')}</div> : <div className="account-coupon-list">{coupons.map((coupon) => <article className="account-coupon-card" key={coupon.code}><div><span>{coupon.currency}</span><strong>{coupon.percent}% OFF</strong><p>{coupon.title}</p><small>{label('최대 할인', 'Up to')} {formatMoney(coupon.maxDiscount, coupon.currency)} · {label('쿠폰 코드', 'Code')} {coupon.code}</small><small>{label('시작', 'Starts')} {couponDate(coupon.startsAt, language)}</small><small>{label('만료', 'Expires')} {couponDate(coupon.endsAt, language)}</small></div><b>{couponStatusText(coupon.status, language)}</b></article>)}</div>}
    </section>
    <section className="account-orders" aria-labelledby="account-orders-title"><div className="account-section-heading"><div><span>03</span><h2 id="account-orders-title">{label('주문 내역', 'My orders')}</h2></div></div>
      <button className="account-guest-link" type="button" onClick={() => navigate('/orders/lookup')}>{label('비회원 주문 조회', 'Guest order tracking')} →</button>
      {error && <p role="alert">{error} <button onClick={() => setRefresh((value) => value + 1)}>{copy('다시 시도')}</button></p>}
      {loading ? <p role="status">{label('주문 내역을 불러오는 중…', 'Loading orders…')}</p> : error ? null : orders.length === 0 ? <div className="account-empty">{label('아직 주문 내역이 없습니다.', 'No orders yet.')}</div> : <div className="account-order-list">{orders.map((order) => <article className="account-order-card" key={order.id}><div className="account-order-top"><span>{order.createdAt?.toLocaleDateString(ko ? 'ko-KR' : 'en-US') || '—'}</span><strong>{copy(order.status)}</strong></div><h3>{order.items?.map((item) => item.productName).join(', ')}</h3><p>{label('주문번호', 'Order no.')} {order.orderNumber || order.id}</p><div className="account-order-total"><span>{label('결제 금액', 'Order total')}</span><strong>{formatMoney(order.totalAmountNumber, order.currency || 'KRW')}</strong></div><div className="account-order-actions"><button type="button" onClick={() => setStatementId(order.id)} aria-label={`${label('전표 보기', 'View statement')} · ${order.orderNumber || order.id}`}>{label('전표 보기', 'View statement')}</button>{order.trackingNumber && <a href={getTrackingUrl(order.courier, order.trackingNumber)} target="_blank" rel="noreferrer">{label('배송 조회', 'Track shipment')} →</a>}</div></article>)}</div>}
      {(cursors.length > 1 || (!loading && orders.length === 20 && lastDoc)) && <nav className="account-pagination" aria-label={label('주문 페이지', 'Order pages')}><button disabled={loading || cursors.length === 1} onClick={() => setCursors((value) => value.slice(0, -1))}>{label('이전', 'Previous')}</button><span>{cursors.length}</span><button disabled={loading || orders.length < 20 || !lastDoc} onClick={() => setCursors((value) => [...value, lastDoc])}>{label('다음', 'Next')}</button></nav>}
    </section>
  </div>
    {statementId && <OrderStatementDialog key={`${currentUser.uid}:${statementId}`} orderId={statementId} userId={currentUser.uid} language={language} onClose={() => setStatementId('')} />}
  </main>;
}
