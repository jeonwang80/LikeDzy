export const MEASUREMENTS = [
  { key: 'length', ko: '총장', en: 'Body length', helpKo: '목 옆 어깨점에서 밑단까지 수직으로 측정합니다.', helpEn: 'Measure from the highest shoulder point beside the neck to the hem.' },
  { key: 'shoulder', ko: '어깨너비', en: 'Shoulder width', helpKo: '양쪽 어깨 봉제선 사이를 직선으로 측정합니다.', helpEn: 'Measure straight across between the shoulder seams.' },
  { key: 'chest', ko: '가슴둘레', en: 'Chest circumference', helpKo: '겨드랑이 바로 아래 가슴 단면을 측정한 뒤 2배 합니다.', helpEn: 'Measure flat from armpit to armpit, then double the measurement.' },
  { key: 'sleeve', ko: '소매길이', en: 'Sleeve length', helpKo: '어깨 봉제선에서 소매 끝까지 측정합니다.', helpEn: 'Measure from the shoulder seam to the sleeve edge.' },
  { key: 'hem', ko: '밑단둘레', en: 'Hem circumference', helpKo: '밑단의 좌우 단면을 측정한 뒤 2배 합니다.', helpEn: 'Measure flat across the bottom hem, then double the measurement.' },
];

export const GUIDE_TYPES = {
  tops: { ko: '상의', en: 'Tops', sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], measurements: MEASUREMENTS,
    noteKo: '제품 실측 치수입니다. 가슴과 밑단은 전체 둘레 기준입니다.',
    noteEn: 'Actual garment measurements. Chest and hem values are full circumferences.' },
  pants: { ko: '바지', en: 'Pants', sizes: ['S', 'M', 'L', 'XL'],
    noteKo: '제품 실측 치수입니다. 허리·엉덩이·허벅지·밑단은 전체 둘레 기준입니다.',
    noteEn: 'Actual garment measurements. Waist, hip, thigh and leg opening values are full circumferences.',
    measurements: [
      { key: 'outseam', ko: '총장', en: 'Outseam length', helpKo: '허리 밴드 위에서 바지 밑단까지 옆선을 따라 측정합니다.', helpEn: 'Measure along the outer seam from the top of the waistband to the hem.' },
      { key: 'waist', ko: '허리둘레', en: 'Waist circumference', helpKo: '허리를 편 상태에서 밴드를 늘리지 않고 단면을 측정한 뒤 2배 합니다.', helpEn: 'Lay the waistband flat without stretching, measure across it, then double the measurement.' },
      { key: 'hip', ko: '엉덩이둘레', en: 'Hip circumference', helpKo: '엉덩이의 가장 넓은 부분을 평평하게 측정한 뒤 2배 합니다.', helpEn: 'Measure flat across the widest part of the hips, then double the measurement.' },
      { key: 'thigh', ko: '허벅지둘레', en: 'Thigh circumference', helpKo: '가랑이 바로 아래 한쪽 다리의 단면을 측정한 뒤 2배 합니다.', helpEn: 'Measure across one leg just below the crotch, then double the measurement.' },
      { key: 'rise', ko: '앞밑위', en: 'Front rise', helpKo: '앞 중심의 허리 밴드 위에서 가랑이 봉제선까지 측정합니다.', helpEn: 'Measure down the front from the top of the waistband to the crotch seam.' },
      { key: 'legOpening', ko: '밑단둘레', en: 'Leg opening circumference', helpKo: '한쪽 바지 밑단의 단면을 측정한 뒤 2배 합니다.', helpEn: 'Measure across one leg opening, then double the measurement.' },
    ] },
  hats: { ko: '모자', en: 'Hats', sizes: ['FREE'],
    noteKo: '제품 실측 치수입니다. 머리둘레는 모자 안쪽 밴드의 전체 둘레 기준입니다.',
    noteEn: 'Actual product measurements. Head circumference is measured around the inside band.',
    measurements: [
      { key: 'headCircumference', ko: '머리둘레', en: 'Head circumference', helpKo: '줄자를 모자 안쪽 밴드를 따라 한 바퀴 둘러 측정합니다. 조절형은 기본 설정 상태에서 측정합니다.', helpEn: 'Measure all the way around the inside band. For adjustable hats, use the standard strap setting.' },
      { key: 'height', ko: '모자 높이', en: 'Crown height', helpKo: '챙을 제외하고 모자 밑단에서 정수리까지 옆면을 따라 측정합니다.', helpEn: 'Measure along the side from the bottom of the crown to the top, excluding the brim.' },
      { key: 'brimLength', ko: '챙 길이', en: 'Brim length', helpKo: '챙의 앞 중심에서 모자와 연결된 지점부터 챙 끝까지 측정합니다.', helpEn: 'Measure at the front center from the crown seam to the edge of the brim.' },
    ] },
};

// Existing version 1 guides have no type and remain tops.
export const guideType = (guide) => Object.hasOwn(GUIDE_TYPES, guide?.type) ? guide.type : 'tops';
export const guideMeasurements = (guide) => GUIDE_TYPES[guideType(guide)].measurements;
export const emptyMeasurementRow = (type, size = '') => ({ size, ...Object.fromEntries(GUIDE_TYPES[type].measurements.map(({ key }) => [key, ''])) });
export const createBlankGuide = (type = 'tops') => ({ version: 2, type, rows: GUIDE_TYPES[type].sizes.map(size => emptyMeasurementRow(type, size)) });
export const serializeGuide = (guide) => ({ version: 2, type: guideType(guide), rows: guide.rows.map(row => ({ size: String(row.size).trim(), ...Object.fromEntries(guideMeasurements(guide).map(({ key }) => [key, Number(row[key])])) })) });

export function createPoloGuide() {
  return { version: 1, rows: ['XS', 'S', 'M', 'L', 'XL', '2XL'].map((size, i) => ({
    size, length: 70 + i, shoulder: 49 + i, chest: 105 + i * 5, sleeve: i < 4 ? 25 : 26, hem: 105 + i * 5,
  })) };
}

export function validateGuide(guide) {
  if (!guide) return '';
  if (guide.type != null && !Object.hasOwn(GUIDE_TYPES, guide.type)) return '사이즈 가이드 종류를 선택해 주세요.';
  if (!Array.isArray(guide.rows) || !guide.rows.length) return '사이즈를 하나 이상 입력해 주세요.';
  const names = guide.rows.map(row => String(row?.size ?? '').trim().toUpperCase().replace(/^XXL$/, '2XL'));
  if (names.some(name => !name) || new Set(names).size !== names.length) return '사이즈 이름은 비워 두거나 중복할 수 없습니다.';
  if (guide.rows.some(row => guideMeasurements(guide).some(({ key }) => !['number', 'string'].includes(typeof row[key]) || String(row[key]).trim() === '' || !Number.isFinite(Number(row[key])) || Number(row[key]) <= 0 || Number(row[key]) > 500))) return '모든 치수를 0보다 크고 500 이하인 cm 값으로 입력해 주세요.';
  return '';
}

export function displayMeasurement(value, unit) {
  if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) return '—';
  return Number((Number(value) / (unit === 'in' ? 2.54 : 1)).toFixed(1)).toString();
}
