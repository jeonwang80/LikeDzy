const test = require('node:test');
const assert = require('node:assert/strict');
test('both customer languages use Vietnam prices while historical KRW amounts stay readable', async () => {
  const { currencyForLanguage, productPrice, marketSettings, formatMoney } = await import('../../src/utils/market.js');
  const { getCatalogOrdering, sortCatalogProducts } = await import('../../src/utils/catalogQuery.js');
  const { formatProductPrice } = await import('../../src/utils/productPresentation.js');
  assert.equal(currencyForLanguage('ko'), 'VND'); assert.equal(currencyForLanguage('en'), 'VND');
  const a = { id: 'a', prices: { KRW: 2000, USD: 1, VND: 90000 } };
  const b = { id: 'b', prices: { KRW: 3000, USD: 2, VND: 80000 } };
  assert.deepEqual(sortCatalogProducts([a,b], 'price-asc', 'en').map(p=>p.id), ['b','a']);
  assert.deepEqual(getCatalogOrdering('price-desc','en'), [['priceVND','desc']]);
  assert.deepEqual(getCatalogOrdering('price-desc','ko'), [['priceVND','desc']]);
  assert.equal(formatProductPrice(a,'ko'), '90,000 ₫');
  assert.equal(formatProductPrice(a,'en'), '90,000 ₫');
  assert.equal(productPrice({ prices: { KRW: 2000, USD: 2 } },'VND'), null);
  assert.equal(formatProductPrice({ prices: { KRW: 2000 } }, 'en'), 'Price unavailable');
  assert.equal(marketSettings({ shippingFee: 3000, orderEnabled: true }, 'VND').shippingFee, 0);
  assert.equal(marketSettings({ orderEnabled: true },'VND').orderEnabled, false);
  assert.equal(formatMoney(42000, 'KRW'), '₩42,000');
});

test('country settings isolate drafts and honor legacy free delivery until configured', async () => {
  const { countryCommerceSettings, normalizeCountryCommerce } = await import('../../src/utils/countryCommerce.js');
  const { marketSettings } = await import('../../src/utils/market.js');
  const { calculateShippingFee } = await import('../../src/utils/commerce.js');
  const source = { bankName: 'KR bank', vietnam: { bankName: 'VN bank', shippingFee: 30000 }, hungary: { bankName: 'HU bank' } };
  assert.equal(countryCommerceSettings(source,'KR').bankName,'KR bank');
  assert.equal(countryCommerceSettings(source,'VN').bankName,'VN bank');
  assert.equal(countryCommerceSettings(source,'HU').bankName,'HU bank');
  assert.equal(countryCommerceSettings(source,'VN').shippingFee,0);
  assert.equal(countryCommerceSettings(source,'HU').orderEnabled,false);
  assert.equal(countryCommerceSettings(source,'KR').vietnam,undefined);
  source.vietnam = { ...source.vietnam, shippingPolicyConfigured: true, freeShippingThreshold: 700000 };
  const active = marketSettings(source,'VND');
  assert.equal(calculateShippingFee(600000,active),30000);
  assert.equal(calculateShippingFee(700000,active),0);
  assert.throws(()=>normalizeCountryCommerce({shippingFee:-1}),/정수/);
});
