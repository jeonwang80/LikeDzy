const test = require('node:test');
const assert = require('node:assert/strict');

test('product readiness uses published available stock, ignoring legacy stock and deleted variants', async () => {
  const { hasAvailableProductStock } = await import('../../src/utils/productStock.js');
  const product = { colorSwatches: [{ name: 'Black' }], sizeOptions: [{ name: 'M', stock: 99 }] };
  assert.equal(hasAvailableProductStock(product, []), false);
  assert.equal(hasAvailableProductStock(product, [{ colorName: 'Black', optionName: 'M', available: 0, stock: 99 }]), false);
  assert.equal(hasAvailableProductStock(product, [{ colorName: 'Deleted', optionName: 'M', available: 5 }]), false);
  assert.equal(hasAvailableProductStock(product, [{ colorName: 'Black', optionName: 'Deleted', available: 5 }]), false);
  assert.equal(hasAvailableProductStock(product, [{ colorName: 'Black', optionName: 'M', available: 1 }]), true);
});
test('one available color-size keeps the overall product available', async () => {
  const { hasAvailableProductStock } = await import('../../src/utils/productStock.js');
  const product = { colorSwatches: [{ name: 'Black' }, { name: 'White' }], sizeOptions: [{ name: 'M' }, { name: 'L' }] };
  assert.equal(hasAvailableProductStock(product, [{ colorName: 'Black', optionName: 'M', available: 0 }, { colorName: 'White', optionName: 'L', available: 2 }]), true);
});
test('products without options use the default variant', async () => {
  const { hasAvailableProductStock } = await import('../../src/utils/productStock.js');
  assert.equal(hasAvailableProductStock({}, [{ colorName: '기본', optionName: '기본', available: 1 }]), true);
  assert.equal(hasAvailableProductStock({}, [{ colorName: '기본', optionName: '기본', available: -1 }]), false);
});
