const test = require('node:test');
const assert = require('node:assert/strict');
test('customer languages use independent KRW and VND prices and sort by the visible currency', async () => {
  const { currencyForLanguage, productPrice, marketSettings, formatMoney } = await import('../../src/utils/market.js');
  const { getCatalogOrdering, sortCatalogProducts } = await import('../../src/utils/catalogQuery.js');
  const { formatProductPrice } = await import('../../src/utils/productPresentation.js');
  assert.equal(currencyForLanguage('ko'), 'KRW'); assert.equal(currencyForLanguage('en'), 'VND');
  const a = { id: 'a', prices: { KRW: 2000, USD: 1, VND: 90000 } };
  const b = { id: 'b', prices: { KRW: 3000, USD: 2, VND: 80000 } };
  assert.deepEqual(sortCatalogProducts([a,b], 'price-asc', 'en').map(p=>p.id), ['b','a']);
  assert.deepEqual(getCatalogOrdering('price-desc','en'), [['priceVND','desc']]);
  assert.equal(formatProductPrice(a,'en'), '90,000 ₫');
  assert.equal(productPrice({ prices: { KRW: 2000, USD: 2 } },'VND'), null);
  assert.equal(formatProductPrice({ prices: { KRW: 2000 } }, 'en'), 'Price unavailable');
  assert.equal(marketSettings({ shippingFee: 3000, orderEnabled: true }, 'VND').shippingFee, null);
  assert.equal(marketSettings({ orderEnabled: true },'VND').orderEnabled, false);
  assert.equal(formatMoney(42000, 'KRW'), '₩42,000');
});
