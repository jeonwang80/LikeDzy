export const MEASUREMENTS = [
  { key: 'length', ko: '총장', en: 'Body length', helpKo: '목 옆 어깨점에서 밑단까지 수직으로 측정합니다.', helpEn: 'Measure from the highest shoulder point beside the neck to the hem.' },
  { key: 'shoulder', ko: '어깨너비', en: 'Shoulder width', helpKo: '양쪽 어깨 봉제선 사이를 직선으로 측정합니다.', helpEn: 'Measure straight across between the shoulder seams.' },
  { key: 'chest', ko: '가슴둘레', en: 'Chest circumference', helpKo: '겨드랑이 바로 아래 가슴 단면을 측정한 뒤 2배 합니다.', helpEn: 'Measure flat from armpit to armpit, then double the measurement.' },
  { key: 'sleeve', ko: '소매길이', en: 'Sleeve length', helpKo: '어깨 봉제선에서 소매 끝까지 측정합니다.', helpEn: 'Measure from the shoulder seam to the sleeve edge.' },
  { key: 'hem', ko: '밑단둘레', en: 'Hem circumference', helpKo: '밑단의 좌우 단면을 측정한 뒤 2배 합니다.', helpEn: 'Measure flat across the bottom hem, then double the measurement.' },
];

export function createPoloGuide() {
  return { version: 1, rows: ['XS', 'S', 'M', 'L', 'XL', '2XL'].map((size, i) => ({
    size, length: 70 + i, shoulder: 49 + i, chest: 105 + i * 5, sleeve: i < 4 ? 25 : 26, hem: 105 + i * 5,
  })) };
}

export function validateGuide(guide) {
  if (!guide) return '';
  if (!Array.isArray(guide.rows) || !guide.rows.length) return '사이즈를 하나 이상 입력해 주세요.';
  const names = guide.rows.map(row => row.size.trim().toUpperCase().replace(/^XXL$/, '2XL'));
  if (names.some(name => !name) || new Set(names).size !== names.length) return '사이즈 이름은 비워 두거나 중복할 수 없습니다.';
  if (guide.rows.some(row => MEASUREMENTS.some(({ key }) => row[key] === '' || !Number.isFinite(Number(row[key])) || Number(row[key]) <= 0 || Number(row[key]) > 500))) return '모든 치수를 0보다 크고 500 이하인 cm 값으로 입력해 주세요.';
  return '';
}

export function displayMeasurement(value, unit) {
  return Number((Number(value) / (unit === 'in' ? 2.54 : 1)).toFixed(1)).toString();
}
