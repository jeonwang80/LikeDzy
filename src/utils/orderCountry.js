const NAMES = { KR: '한국', VN: '베트남', HU: '헝가리' };
export const orderCountryLabel = code => typeof code === 'string' && /^[A-Z]{2}$/.test(code)
  ? `${NAMES[code] || code} (${code})` : '미기록';

export function orderCountryFilters(basis, country) {
  if (country === 'ALL') return [];
  if (!['KR', 'VN', 'HU'].includes(country)) return [];
  return [[basis === 'shipping' ? 'country' : 'salesCountry', '==', country]];
}
