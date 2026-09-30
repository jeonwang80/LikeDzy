export const EMPTY_PROFILE = {
  buyerName: '', buyerPhone: '', country: 'VN', recipientName: '', recipientPhone: '',
  postcode: '', province: '', ward: '', address1: '', address2: '',
};

export function cleanProfile(value = {}) {
  return Object.fromEntries(Object.entries(EMPTY_PROFILE).map(([key, fallback]) => [
    key, key === 'country' ? (value.country === 'KR' ? 'KR' : 'VN') : String(value[key] ?? fallback).trim(),
  ]));
}

export function validateProfile(profile) {
  if (!profile.buyerName || !profile.recipientName || !profile.address1) return '이름과 기본 배송지를 입력해 주세요.';
  if ([profile.buyerPhone, profile.recipientPhone].some((phone) => !/^\+?[\d ()-]{8,30}$/.test(phone) || phone.replace(/\D/g, '').length < 8)) return '연락처를 확인해 주세요.';
  if (profile.country === 'KR' && !/^\d{5}$/.test(profile.postcode)) return '한국 우편번호 5자리를 입력해 주세요.';
  if (profile.country === 'VN' && (!profile.province || !profile.ward || (profile.postcode && !/^\d{5}$/.test(profile.postcode)))) return '베트남 시·성과 동·면을 입력해 주세요.';
  return '';
}
