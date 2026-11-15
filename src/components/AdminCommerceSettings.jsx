import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isCommerceReady } from '../utils/commerce';
import { marketSettings, vietnamSettings } from '../utils/market';
import { countryCommerceSettings, normalizeCountryCommerce, COMMERCE_COUNTRIES } from '../utils/countryCommerce';

const fields = [
  ['bankName', '은행명'], ['accountNumber', '계좌번호 / IBAN'], ['accountHolder', '예금주'], ['defaultCarrier', '기본 배송사'],
  ['shippingFee', '기본 배송비', 'number'], ['freeShippingThreshold', '무료배송 기준', 'number'], ['depositDeadlineHours', '입금기한(시간)', 'number'], ['returnAddress', '반품 주소'],
  ['remoteAreaNotice', '지역 추가 배송비 안내'], ['businessName', '상호'], ['representativeName', '대표자명'], ['businessNumber', '사업자 / 세금 등록번호'], ['ecommerceNumber', '판매업 신고번호(해당 시)'],
  ['customerServicePhone', '고객센터 전화'], ['customerServiceEmail', '고객센터 이메일', 'email'], ['businessAddress', '사업장 주소'],
];
export default function AdminCommerceSettings() {
  const [source, setSource] = useState({});
  const [drafts, setDrafts] = useState({});
  const [country, setCountry] = useState('VN');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => onSnapshot(doc(db, 'settings', 'commerce'), snapshot => {
    setSource(snapshot.exists() ? snapshot.data() : {}); setLoading(false); setLoadError(false);
  }, () => { setLoading(false); setLoadError(true); setMessage('설정을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); }), []);
  const settings = drafts[country] || countryCommerceSettings(source, country);
  const meta = COMMERCE_COUNTRIES[country];
  const update = (key, value) => setDrafts(current => ({ ...current, [country]: { ...(current[country] || countryCommerceSettings(source, country)), [key]: value, ...(['termsText', 'privacyText', 'returnsText'].includes(key) ? { policyConfirmed: false } : {}) } }));
  const submit = async event => {
    event.preventDefault(); setMessage('');
    let normalized;
    try { normalized = normalizeCountryCommerce(settings); } catch (error) { setMessage(error.message); return; }
    if (country === 'VN' && normalized.orderEnabled && !isCommerceReady(marketSettings({ ...source, vietnam: normalized }, 'VND'))) {
      setMessage('베트남 주문 접수에 필요한 계좌 정보와 선택한 운영 방식의 사업자·정책 확인을 완료해 주세요.'); return;
    }
    if (country !== 'VN') normalized.orderEnabled = false;
    else normalized.shippingPolicyConfigured = true;
    setSaving(true);
    try {
      const patch = country === 'KR' ? normalized : { [country === 'VN' ? 'vietnam' : 'hungary']: normalized };
      if (country !== 'VN' && Object.keys(source).length === 0) patch.vietnam = { ...vietnamSettings(source) };
      await setDoc(doc(db, 'settings', 'commerce'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      setSource(current => ({ ...current, ...patch }));
      setDrafts(current => { const next = { ...current }; delete next[country]; return next; });
      setMessage(`${meta.name} 기준정보를 저장했습니다.`);
    } catch { setMessage('저장하지 못했습니다. 관리자 권한과 연결을 확인해 주세요.'); }
    finally { setSaving(false); }
  };
  return <form className="admin-card commerce-settings-card" onSubmit={submit}>
    <div className="commerce-settings-heading"><div><span>STORE PAYMENT & DELIVERY MASTER</span><h2>판매·배송 기준정보</h2><p>배송 국가별 계좌·배송비·사업자·정책을 독립적으로 관리합니다. 화면 언어와는 별개입니다.</p></div></div>
    <div className="commerce-country-tabs" role="group" aria-label="판매 배송 국가">
      {Object.entries(COMMERCE_COUNTRIES).map(([code, item]) => <button key={code} type="button" aria-pressed={country === code} className={country === code ? 'admin-btn-primary' : 'admin-btn-secondary'} disabled={saving} onClick={() => { setCountry(code); setMessage(''); }}>{item.name} · {item.currency}{drafts[code] ? ' •' : ''}</button>)}
    </div>
    <p className="commerce-country-notice">{meta.name} / {meta.currency} · {country === 'VN' ? '현재 운영 중인 배송 시장입니다. 저장한 배송비는 이후 신규 주문부터 적용됩니다.' : '출시 준비용 설정입니다. 저장해도 주문 접수가 시작되지 않으며 결제·배송 연동 후 별도 개통합니다.'} 무료배송 기준 0은 금액 조건을 사용하지 않음을 뜻합니다.</p>
    <fieldset className="commerce-country-fields" disabled={loading || saving || loadError}>
      {country === 'VN' && <><label className="commerce-safety-check"><input type="checkbox" checked={settings.orderEnabled === true} onChange={e => update('orderEnabled', e.target.checked)} />베트남 주문 접수</label><label className="commerce-safety-check"><input type="checkbox" checked={settings.manualBankTransfer === true} onChange={e => update('manualBankTransfer', e.target.checked)} /><span>수기 입금 확인 운영 · 기존 방식 유지 (은행명·계좌번호·예금주 필수)</span></label></>}
      <div className="commerce-settings-grid">{fields.map(([key, label, type = 'text']) => <label className="admin-form-field" key={key}><span>{label}{['shippingFee', 'freeShippingThreshold'].includes(key) ? ` (${meta.currency})` : ''}</span><input className="admin-input" type={type} min={type === 'number' ? (key === 'depositDeadlineHours' ? 1 : 0) : undefined} step={type === 'number' ? 1 : undefined} value={settings[key] ?? ''} onChange={e => update(key, e.target.value)} /></label>)}</div>
      {['purchaseSafetyConfirmed', 'businessInfoConfirmed'].map((key, index) => <label className="commerce-safety-check" key={key}><input type="checkbox" checked={settings[key] === true} onChange={e => update(key, e.target.checked)} />{['해당 국가의 구매안전·결제 운영 조건을 확인했습니다.', '해당 국가의 사업자 정보를 확인했습니다.'][index]}</label>)}
      <div className="commerce-settings-grid">{['termsText', 'privacyText', 'returnsText'].map((key, index) => <label className="admin-form-field commerce-span-2" key={key}><span>{meta.name} {['이용약관', '개인정보 처리방침', '배송·교환·반품 안내'][index]}</span><textarea className="admin-input" rows="5" maxLength="20000" value={settings[key] || ''} onChange={e => update(key, e.target.value)} /></label>)}</div>
      <label className="commerce-safety-check"><input type="checkbox" checked={settings.policyConfirmed === true} onChange={e => update('policyConfirmed', e.target.checked)} />선택한 국가의 운영 정책을 검토·확정했습니다.</label>
    </fieldset>
    <div className="commerce-settings-footer"><span role="status">{loading ? '설정을 불러오는 중입니다.' : message || '탭을 바꿔도 입력은 유지됩니다. 선택한 국가만 저장합니다.'}</span><button className="admin-btn-primary" type="submit" disabled={saving || loading || loadError}>{saving ? '저장 중…' : `${meta.name} 기준정보 저장`}</button></div>
  </form>;
}
