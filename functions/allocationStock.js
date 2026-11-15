// Pure inventory operations: persistence, authorization and idempotency belong
// to the transaction boundary. MAIN is never customer-orderable.
const COUNTRIES = ['KR', 'VN', 'HU'];
const count = value => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000000) throw new Error('재고 수량은 0 이상의 정수여야 합니다.');
  return value;
};
const empty = () => ({ stock: 0, reserved: 0, sold: 0 });
function validate(record) {
  if (record.allocationVersion !== 1) throw new Error('국가별 재고 전환이 필요합니다.');
  count(record.mainStock);
  for (const country of COUNTRIES) count(record.inTransit?.[country] || 0);
  for (const country of COUNTRIES) for (const key of ['stock', 'reserved', 'sold']) count(record.countries?.[country]?.[key]);
  return record;
}
function totals(record) {
  validate(record);
  return { ...record, ...Object.fromEntries(['stock', 'reserved', 'sold'].map(key => [key, COUNTRIES.reduce((sum, country) => sum + record.countries[country][key], 0)])) };
}
function initialize(record, destination) {
  if (record.allocationVersion === 1) return totals(record);
  if (!['MAIN', ...COUNTRIES].includes(destination)) throw new Error('기존 재고의 이관 위치를 선택해 주세요.');
  const countries = Object.fromEntries(COUNTRIES.map(country => [country, empty()]));
  const stock = count(record.stock || 0);
  if (destination !== 'MAIN') countries[destination] = { stock, reserved: count(record.reserved || 0), sold: count(record.sold || 0) };
  if (destination === 'MAIN') countries.VN = { stock: 0, reserved: count(record.reserved || 0), sold: count(record.sold || 0) };
  return totals({ ...record, inTransit: { KR: 0, VN: 0, HU: 0 }, allocationVersion: 1, mainStock: destination === 'MAIN' ? stock : 0, countries });
}
function operate(record, operation) {
  validate(record);
  const next = { ...record, inTransit: { KR: 0, VN: 0, HU: 0, ...record.inTransit }, countries: Object.fromEntries(COUNTRIES.map(country => [country, { ...record.countries[country] }])) };
  const quantity = count(operation.quantity);
  if (quantity === 0) throw new Error('처리 수량은 1개 이상이어야 합니다.');
  if (operation.type === 'receipt') next.mainStock += quantity;
  else if (operation.type === 'receipt_reversal') next.mainStock -= quantity;
  else {
    const bucket = next.countries[operation.country];
    if (!bucket) throw new Error('처리 국가를 선택해 주세요.');
    if (operation.type === 'dispatch') { next.mainStock -= quantity; next.inTransit[operation.country] += quantity; }
    else if (operation.type === 'receive') { next.inTransit[operation.country] -= quantity; bucket.stock += quantity; }
    else if (operation.type === 'transit_loss') { next.inTransit[operation.country] -= quantity; }
    else if (operation.type === 'return_main') { next.inTransit[operation.country] -= quantity; next.mainStock += quantity; }
    else if (operation.type === 'recall') { bucket.stock -= quantity; next.mainStock += quantity; }
    else if (operation.type === 'reserve') { bucket.stock -= quantity; bucket.reserved += quantity; }
    else if (operation.type === 'release') { bucket.reserved -= quantity; bucket.stock += quantity; }
    else if (operation.type === 'confirm') { bucket.reserved -= quantity; bucket.sold += quantity; }
    else if (operation.type === 'refund') { bucket.sold -= quantity; bucket.stock += quantity; }
    else if (operation.type === 'dispose') bucket.sold -= quantity;
    else throw new Error('지원하지 않는 재고 처리입니다.');
  }
  return totals(next);
}
module.exports = { COUNTRIES, initialize, operate, totals };
