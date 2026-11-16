import { DEFAULT_COMMERCE_SETTINGS } from './commerce.js';
import { marketSettings } from './market.js';
export const COMMERCE_COUNTRIES = { KR: { name: '한국', currency: 'KRW' }, VN: { name: '베트남', currency: 'VND' }, HU: { name: '헝가리', currency: 'EUR' } };
export function countryCommerceSettings(source, country) {
  const blank = { ...DEFAULT_COMMERCE_SETTINGS, shippingFee: 0, freeShippingThreshold: 0, defaultCarrier: '', remoteAreaNotice: '' };
  const value = country === 'KR' ? { ...DEFAULT_COMMERCE_SETTINGS, ...source } : country === 'VN' ? { ...blank, ...marketSettings(source, 'VND') } : { ...blank, ...source.hungary };
  return Object.fromEntries([...Object.keys(DEFAULT_COMMERCE_SETTINGS), 'manualBankTransfer'].map(key => [key, value[key] ?? false]));
}
export function normalizeCountryCommerce(value, currency = 'KRW') {
  const result = { ...value };
  for (const key of ['shippingFee', 'freeShippingThreshold', 'depositDeadlineHours']) {
    const number = Number(value[key]);
    if (value[key] === '' || !(currency === 'EUR' && key !== 'depositDeadlineHours' ? Number.isFinite(number) && Math.abs(number * 100 - Math.round(number * 100)) < 1e-7 : Number.isSafeInteger(number)) || number < (key === 'depositDeadlineHours' ? 1 : 0) || number > 1000000000) throw new Error('배송비·무료배송 기준은 0 이상(유로는 소수점 2자리, 기타 통화는 정수), 입금기한은 1 이상의 정수로 입력해 주세요.');
    result[key] = number;
  }
  return result;
}
