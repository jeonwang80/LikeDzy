const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { signCountryProof, verifyCountryProof } = require('../countryProof');
const { createCommerceService } = require('../commerce');
const { FakeFirestore } = require('./fake-firestore');
const key = 'test-signing-key-at-least-32-characters';
const attempt = 'a'.repeat(64);

test('country proof rejects forgery, expiration, wrong attempt, missing configuration', () => {
  const proof = signCountryProof('VN', attempt, key, 1000);
  assert.equal(verifyCountryProof(proof, attempt, key, 1001), 'VN');
  assert.equal(verifyCountryProof(proof, attempt, key, 301000), null);
  assert.equal(verifyCountryProof(proof, 'b'.repeat(64), key, 1001), null);
  assert.equal(verifyCountryProof(proof, attempt, '', 1001), null);
  const [body, signature] = proof.split('.');
  const forged = Buffer.from(Buffer.from(body, 'base64url').toString().replace('VN', 'HU')).toString('base64url');
  assert.equal(verifyCountryProof(`${forged}.${signature}`, attempt, key, 1001), null);
});

async function fixture(countries, country, proofEnabled = true) {
  const db = new FakeFirestore({ 'products/shirt': { name: 'Test', prices: { VND: 700000 }, colorSwatches: [{ name: 'Black' }], sizeOptions: [{ name: 'M' }], ...(countries === undefined ? {} : { salesCountries: countries }) } });
  const service = createCommerceService({ db, ...(proofEnabled ? { verifySalesCountry: (proof, orderKey) => verifyCountryProof(proof, orderKey, key) } : {}) });
  const admin = { auth: { uid: 'admin', token: { admin: true, email_verified: true } } };
  const variant = await service.setVariantStock({ productId: 'shirt', colorName: 'Black', optionName: 'M', stock: 2, expectedVersion: 0, requestId: randomBytes(32).toString('hex') }, admin);
  const request = { currency: 'VND', idempotencyKey: attempt, guestAccessToken: randomBytes(32).toString('hex'), expectedTotal: 700000,
    countryProof: signCountryProof(country, attempt, key),
    cart: [{ productId: 'shirt', colorName: 'Black', optionName: 'M', variantId: variant.variantId, quantity: 1 }],
    customer: { country: 'VN', buyerName: 'Test', buyerPhone: '0901234567', recipientName: 'Test', recipientPhone: '0901234567', province: 'Test', ward: 'Test', address1: 'Test', agreements: { orderConfirmed: true, privacyAgreed: true }, cashReceipt: { type: 'none' } } };
  return { db, service, request, variant };
}

test('legacy products default to VN, not language or shipping address', async () => {
  const allowed = await fixture(undefined, 'VN');
  const order = await allowed.service.createBankTransferOrder(allowed.request);
  assert.equal(allowed.db.read(`orders/${order.id}`).salesCountry, 'VN');
  const blocked = await fixture(undefined, 'KR');
  await assert.rejects(blocked.service.createBankTransferOrder(blocked.request), { code: 'permission-denied' });
  assert.equal(blocked.db.count('orders'), 0);
  assert.equal(blocked.db.read(`inventory/${blocked.variant.variantId}`).reserved, 0);
});

test('selected countries permit orders; empty/malformed lists and missing verifier deny them', async () => {
  for (const countries of [[], ['VN'], null, 'HU']) {
    const f = await fixture(countries, 'HU');
    await assert.rejects(f.service.createBankTransferOrder(f.request), { code: 'permission-denied' });
    assert.equal(f.db.count('orders'), 0);
  }
  const allowed = await fixture(['KR', 'HU'], 'HU');
  await allowed.service.createBankTransferOrder(allowed.request);
  const noVerifier = await fixture(['VN'], 'VN', false);
  await assert.rejects(noVerifier.service.createBankTransferOrder(noVerifier.request), { code: 'permission-denied' });
});

test('storefront and server agree on missing, empty and explicit countries', async () => {
  const { isSoldInCountry } = await import('../../src/utils/salesCountries.js');
  assert.equal(isSoldInCountry({}, 'VN'), true);
  assert.equal(isSoldInCountry({}, 'KR'), false);
  assert.equal(isSoldInCountry({ salesCountries: [] }, 'VN'), false);
  assert.equal(isSoldInCountry({ salesCountries: ['KR', 'HU'] }, 'HU'), true);
  assert.equal(isSoldInCountry({ salesCountries: ['KR'] }, null), false);
});

test('country endpoint signs the edge country, ignores client country, and never caches', async () => {
  const { default: handler } = await import('../../api/visitor-country.js');
  const previous = process.env.COUNTRY_TOKEN_SECRET;
  process.env.COUNTRY_TOKEN_SECRET = key;
  try {
    let result; let status; const headers = {};
    const response = { setHeader: (name, value) => { headers[name] = value; }, status: value => { status = value; return response; }, json: body => { result = body; } };
    handler({ method: 'POST', headers: { 'x-vercel-ip-country': 'VN' }, body: { orderKey: attempt, country: 'HU' } }, response);
    assert.equal(status, 200);
    assert.equal(verifyCountryProof(result.proof, attempt, key), 'VN');
    assert.match(headers['Cache-Control'], /no-store/);
    handler({ method: 'POST', headers: {}, body: { orderKey: attempt, country: 'VN' } }, response);
    assert.equal(status, 403);
    delete process.env.COUNTRY_TOKEN_SECRET;
    handler({ method: 'POST', headers: { 'x-vercel-ip-country': 'VN' }, body: { orderKey: attempt } }, response);
    assert.equal(status, 503);
  } finally {
    if (previous === undefined) delete process.env.COUNTRY_TOKEN_SECRET;
    else process.env.COUNTRY_TOKEN_SECRET = previous;
  }
});

test('country changes after cart creation are rechecked before reserving stock', async () => {
  const f = await fixture(['VN'], 'VN');
  f.db.data.set('products/shirt', { ...f.db.read('products/shirt'), salesCountries: ['HU'] });
  await assert.rejects(f.service.createBankTransferOrder(f.request), { code: 'permission-denied' });
  assert.equal(f.db.read(`inventory/${f.variant.variantId}`).reserved, 0);
});
