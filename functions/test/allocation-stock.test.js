const test = require('node:test');
const assert = require('node:assert/strict');
const { initialize, operate } = require('../allocationStock');
test('receipt and allocation conserve quantity and never sell MAIN inventory', () => {
  let stock = initialize({ stock: 0, reserved: 0, sold: 0 }, 'MAIN');
  stock = operate(stock, { type: 'receipt', quantity: 100 });
  assert.equal(stock.stock, 0);
  stock = operate(stock, { type: 'dispatch', country: 'VN', quantity: 40 });
  stock = operate(stock, { type: 'dispatch', country: 'HU', quantity: 30 });
  assert.equal(stock.mainStock, 30); assert.equal(stock.stock, 0);
  stock = operate(stock, { type: 'receive', country: 'VN', quantity: 40 });
  assert.equal(stock.stock, 40);
  assert.throws(() => operate(stock, { type: 'dispatch', country: 'KR', quantity: 31 }));
  assert.throws(() => operate(stock, { type: 'reserve', country: 'KR', quantity: 1 }));
  assert.equal(stock.mainStock, 30);
});
test('orders reserve, confirm, cancel and return only their allocated country', () => {
  let stock = initialize({ stock: 10, reserved: 0, sold: 0 }, 'VN');
  stock = operate(stock, { type: 'reserve', country: 'VN', quantity: 3 });
  assert.throws(() => operate(stock, { type: 'recall', country: 'VN', quantity: 8 }));
  stock = operate(stock, { type: 'confirm', country: 'VN', quantity: 3 });
  stock = operate(stock, { type: 'refund', country: 'VN', quantity: 2 });
  assert.deepEqual(stock.countries.VN, { stock: 9, reserved: 0, sold: 1 });
  assert.deepEqual(stock.countries.HU, { stock: 0, reserved: 0, sold: 0 });
  stock = operate(stock, { type: 'reserve', country: 'VN', quantity: 1 });
  stock = operate(stock, { type: 'release', country: 'VN', quantity: 1 });
  assert.equal(stock.stock, 9);
});
test('legacy allocation requires an explicit destination and preserves commitments', () => {
  assert.throws(() => initialize({ stock: 10 }));
  const record = { stock: 8, reserved: 2, sold: 3 };
  assert.deepEqual(initialize(record, 'MAIN').countries.VN, {stock:0,reserved:2,sold:3});
  const migrated = initialize(record, 'VN');
  assert.deepEqual(migrated.countries.VN, record);
  assert.deepEqual(initialize(migrated, 'KR'), migrated);
});
