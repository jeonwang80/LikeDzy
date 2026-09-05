import React, { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DELIVERY_CARRIERS, normalizeCommerceSettings } from '../utils/commerce';

export default function AdminCommerceSettings() {
  const [settings, setSettings] = useState(() => normalizeCommerceSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'settings', 'commerce')).then((snapshot) => {
      if (snapshot.exists()) setSettings(normalizeCommerceSettings(snapshot.data()));
    }).catch((error) => {
      console.error('Commerce settings load error:', error);
      setMessage('판매·배송 설정을 불러오지 못했습니다.');
    }).finally(() => setLoading(false));
  }, []);

  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const requiredBusinessFields = ['businessName', 'representativeName', 'businessNumber', 'customerServicePhone', 'customerServiceEmail', 'businessAddress'];
    if (settings.orderEnabled && (
      !settings.bankName.trim()
      || !settings.accountNumber.trim()
      || !settings.accountHolder.trim()
      || !settings.purchaseSafetyConfirmed
      || !settings.businessInfoConfirmed
      || !settings.policyConfirmed
      || ['termsText', 'privacyText', 'returnsText'].some((field) => !String(settings[field] || '').trim())
      || requiredBusinessFields.some((field) => !String(settings[field] || '').trim())
    )) {
      setMessage('주문 접수를 켜려면 계좌·사업자 정보와 운영 확인 항목을 모두 완료해 주세요.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const normalized = normalizeCommerceSettings(settings);
      await setDoc(doc(db, 'settings', 'commerce'), {
        ...normalized,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSettings(normalized);
      setMessage('판매·배송 기준정보를 저장했습니다.');
    } catch (error) {
      console.error('Commerce settings save error:', error);
      setMessage('설정을 저장하지 못했습니다. 관리자 권한을 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-card commerce-settings-card" onSubmit={handleSubmit}>
      <div className="commerce-settings-heading">
        <div>
          <span>STORE PAYMENT & DELIVERY MASTER</span>
          <h2>판매·배송 기준정보</h2>
          <p>입금 계좌, 배송 정책과 사업자 정보를 관리합니다.</p>
        </div>
        <label className="commerce-enabled-switch">
          <span><strong>주문 접수</strong><small>{settings.orderEnabled ? '고객 주문 가능' : '주문 일시 중지'}</small></span>
          <input type="checkbox" checked={settings.orderEnabled} onChange={(event) => updateSetting('orderEnabled', event.target.checked)} disabled={loading} />
        </label>
      </div>

      <div className="commerce-settings-grid">
        <label className="admin-form-field"><span>은행명 *</span><input className="admin-input" value={settings.bankName} onChange={(event) => updateSetting('bankName', event.target.value)} placeholder="예: 국민은행" /></label>
        <label className="admin-form-field"><span>계좌번호 *</span><input className="admin-input" value={settings.accountNumber} onChange={(event) => updateSetting('accountNumber', event.target.value)} placeholder="실제 입금 계좌" /></label>
        <label className="admin-form-field"><span>예금주 *</span><input className="admin-input" value={settings.accountHolder} onChange={(event) => updateSetting('accountHolder', event.target.value)} placeholder="사업자 또는 대표자명" /></label>
        <label className="admin-form-field"><span>기본 택배사</span><select className="admin-select" value={settings.defaultCarrier} onChange={(event) => updateSetting('defaultCarrier', event.target.value)}>{DELIVERY_CARRIERS.map((carrier) => <option key={carrier}>{carrier}</option>)}</select></label>
        <label className="admin-form-field"><span>기본 배송비</span><input className="admin-input" type="number" min="0" value={settings.shippingFee} onChange={(event) => updateSetting('shippingFee', event.target.value)} /></label>
        <label className="admin-form-field"><span>무료배송 기준</span><input className="admin-input" type="number" min="0" value={settings.freeShippingThreshold} onChange={(event) => updateSetting('freeShippingThreshold', event.target.value)} /></label>
        <label className="admin-form-field"><span>입금기한(시간)</span><input className="admin-input" type="number" min="1" value={settings.depositDeadlineHours} onChange={(event) => updateSetting('depositDeadlineHours', event.target.value)} /></label>
        <label className="admin-form-field"><span>반품 주소</span><input className="admin-input" value={settings.returnAddress} onChange={(event) => updateSetting('returnAddress', event.target.value)} placeholder="교환·반품 수거지" /></label>
        <label className="admin-form-field commerce-span-2"><span>지역 추가 배송비 안내</span><input className="admin-input" value={settings.remoteAreaNotice} onChange={(event) => updateSetting('remoteAreaNotice', event.target.value)} /></label>
        <label className="admin-form-field"><span>상호 *</span><input className="admin-input" value={settings.businessName} onChange={(event) => updateSetting('businessName', event.target.value)} /></label>
        <label className="admin-form-field"><span>대표자명 *</span><input className="admin-input" value={settings.representativeName} onChange={(event) => updateSetting('representativeName', event.target.value)} /></label>
        <label className="admin-form-field"><span>사업자등록번호 *</span><input className="admin-input" value={settings.businessNumber} onChange={(event) => updateSetting('businessNumber', event.target.value)} placeholder="000-00-00000" /></label>
        <label className="admin-form-field"><span>통신판매업 신고번호</span><input className="admin-input" value={settings.ecommerceNumber} onChange={(event) => updateSetting('ecommerceNumber', event.target.value)} placeholder="신고 면제 대상이면 비워둘 수 있습니다." /></label>
        <label className="admin-form-field"><span>고객센터 전화 *</span><input className="admin-input" value={settings.customerServicePhone} onChange={(event) => updateSetting('customerServicePhone', event.target.value)} /></label>
        <label className="admin-form-field"><span>고객센터 이메일 *</span><input className="admin-input" type="email" value={settings.customerServiceEmail} onChange={(event) => updateSetting('customerServiceEmail', event.target.value)} /></label>
        <label className="admin-form-field commerce-span-2"><span>사업장 주소 *</span><input className="admin-input" value={settings.businessAddress} onChange={(event) => updateSetting('businessAddress', event.target.value)} /></label>
      </div>
      <label className="commerce-safety-check">
        <input type="checkbox" checked={settings.purchaseSafetyConfirmed} onChange={(event) => updateSetting('purchaseSafetyConfirmed', event.target.checked)} />
        <span><strong>구매안전서비스 계약을 확인했습니다.</strong><small>에스크로 또는 소비자피해보상보험 등 실제 계약을 완료한 뒤 선택해 주세요.</small></span>
      </label>
      <label className="commerce-safety-check">
        <input type="checkbox" checked={settings.businessInfoConfirmed} onChange={(event) => updateSetting('businessInfoConfirmed', event.target.checked)} />
        <span><strong>사업자 정보와 판매·교환·반품 정책을 확인했습니다.</strong><small>입력한 정보는 스토어 하단에 고객에게 공개됩니다.</small></span>
      </label>
        <div className="commerce-settings-grid" style={{ width: '100%' }}>
          {['termsText', 'privacyText', 'returnsText'].map((field, index) => <label key={field} className="admin-form-field commerce-span-2"><span>{['이용약관', '개인정보 처리방침', '배송·교환·반품 안내'][index]}</span><textarea className="admin-input" rows="8" maxLength="20000" value={settings[field] || ''} onChange={(event) => { updateSetting(field, event.target.value); updateSetting('policyConfirmed', false); }} placeholder="실제 운영 정책과 개인정보 처리 내용을 확인한 문구를 입력하세요. 미확정 상태에서는 일반 주문이 차단됩니다." /></label>)}
          <label className="commerce-safety-check"><input type="checkbox" checked={settings.policyConfirmed === true} onChange={(event) => updateSetting('policyConfirmed', event.target.checked)} /><span>위 약관·개인정보·배송 및 반품 정책을 실제 운영 기준으로 검토·확정했습니다.</span></label>
        </div>
      <div className="commerce-settings-footer">
        <span role="status" className={message.includes('저장했습니다') ? 'success' : ''}>{loading ? '설정을 불러오는 중입니다.' : message}</span>
        <button type="submit" className="admin-btn-primary" disabled={saving || loading}>{saving ? '저장 중…' : '기준정보 저장'}</button>
      </div>
    </form>
  );
}
