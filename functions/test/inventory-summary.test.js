const test = require('node:test');
const assert = require('node:assert/strict');

test('current inventory excludes the 35 units under previous color names', async () => {
  const { getCurrentInventoryStock } = await import('../../src/utils/inventorySummary.js');
  const rows = {
    'DUSK NAVY': [0, 3, 4, 2, 0, 0],
    'STARBUCKS GREEN': [0, 2, 3, 1, 0, 0],
    'SMOKE BROWN': [0, 3, 2, 3, 0, 0],
    'ZENITH BLUE': [0, 2, 4, 2, 0, 0],
    'OFF WHITE&INK BLACK': [5, 5, 5, 5, 5, 2],
    'INK BLACK': [10, 10, 10, 10, 10, 3],
  };
  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
  const product = { id: 'p', colorSwatches: Object.keys(rows).map(name => ({ name })), sizeOptions: sizes.map(name => ({ name })) };
  const records = Object.entries({ ...rows, 'COFFEE BROWN': [0, 3, 2, 3, 0, 0], 'OFF WHITE&FROST BLACK': [5, 5, 5, 5, 5, 2] })
    .flatMap(([colorName, values]) => values.map((stock, i) => ({ productId: 'p', colorName, optionName: sizes[i], stock })));
  assert.equal(records.reduce((sum, record) => sum + record.stock, 0), 146);
  assert.equal(getCurrentInventoryStock(product, records), 111);
  assert.equal(getCurrentInventoryStock({ ...product, sizeOptions: [{ name: 'S' }] }, records), 25);
  assert.equal(getCurrentInventoryStock({ ...product, id: 'other' }, records), 0);
});

test('current options override legacy options; defaults match the inventory table', async () => {
  const { getInventoryAxes, getCurrentInventoryStock } = await import('../../src/utils/inventorySummary.js');
  const product = { id: 'p', colors: [{ name: 'Black' }], sizeOptions: [{ name: 'M' }], options: [{ name: 'L', stock: 99 }] };
  const records = [{ productId: 'p', colorName: 'Black', optionName: 'M', stock: 2, reserved: 3, sold: 4 }, { productId: 'p', colorName: 'Black', optionName: 'L', stock: 99 }];
  assert.equal(getCurrentInventoryStock(product, records), 2);
  assert.deepEqual(getInventoryAxes({}), { colors: ['기본'], sizes: ['기본'] });
  assert.equal(getCurrentInventoryStock({ id: 'p' }, [{ productId: 'p', colorName: '기본', optionName: '기본', stock: 7 }]), 7);
  assert.equal(getCurrentInventoryStock(product, []), 0);
});
