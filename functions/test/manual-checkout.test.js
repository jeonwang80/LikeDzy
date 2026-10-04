const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { createCommerceService, STATUS } = require('../commerce');
const { FakeFirestore } = require('./fake-firestore');
const defaults = require('../manual-vietnam-settings.json');
const secret = () => randomBytes(32).toString('base64url');
const guest = { rawRequest: { ip: '127.0.0.1' } };
const admin = { auth: { uid: 'admin', token: { admin: true, email_verified: true } } };

async function fixture(savedSettings) {
  const db = new FakeFirestore({ 'products/shirt': { name: 'TEST SHIRT', prices: { VND: 700000 }, colorSwatches: [{ name: 'Black' }], sizeOptions: [{ name: 'M' }] } });
  if (savedSettings !== undefined) db.data.set('settings/commerce', savedSettings);
  const service = createCommerceService({ db, now: () => Date.parse('2026-10-04T00:00:00Z') });
  const variant = await service.setVariantStock({ productId: 'shirt', colorName: 'Black', optionName: 'M', stock: 2, expectedVersion: 0, requestId: secret() }, admin);
  const request = () => ({ currency: 'VND', idempotencyKey: secret(), guestAccessToken: secret(), expectedTotal: 700000,
    cart: [{ productId: 'shirt', colorName: 'Black', optionName: 'M', variantId: variant.variantId, quantity: 1 }],
    customer: { country: 'VN', buyerName: 'Test buyer', buyerPhone: '0901234567', recipientName: 'Test buyer', recipientPhone: '0901234567', province: 'Test city', ward: 'Test ward', address1: 'TEST ADDRESS', postcode: '', agreements: { orderConfirmed: true, privacyAgreed: true }, cashReceipt: { type: 'none' } } });
  return { db, service, request, variant };
}

test('startup Vietnam order is real, awaiting manual payment, free delivery and protected by a guest secret', async () => {
  const f = await fixture(); const request = f.request();
  const order = await f.service.createBankTransferOrder(request, guest);
  const saved = f.db.read(`orders/${order.id}`);
  assert.equal(order.isTestOrder, false);
  assert.equal(saved.manualBankTransfer, true);
  assert.equal(saved.status, STATUS.WAITING);
  assert.equal(saved.shippingFee, 0);
  assert.equal(order.bank.accountNumber, defaults.accountNumber);
  assert.equal(order.bank.accountHolder, defaults.accountHolder);
  assert.equal((await f.service.getOrder({ orderId: order.id, guestAccessToken: request.guestAccessToken }, guest)).id, order.id);
  await assert.rejects(f.service.getOrder({ orderId: order.id, guestAccessToken: secret() }, guest), { code: 'not-found' });
  await f.service.updateOrder({ orderId: order.id, expectedStatus: STATUS.WAITING, action: 'status', payload: { status: STATUS.PAID } }, admin);
  assert.equal(f.db.read(`orders/${order.id}`).status, STATUS.PAID);
});

test('manual checkout honors an explicit pause, missing bank details, and strict mode', async () => {
  for (const vietnam of [{ ...defaults, orderEnabled: false }, { ...defaults, accountNumber: '' }, { ...defaults, manualBankTransfer: false }]) {
    const f = await fixture({ vietnam });
    await assert.rejects(f.service.createBankTransferOrder(f.request(), guest), { code: 'failed-precondition' });
    assert.equal(f.db.count('orders'), 0);
    assert.equal(f.db.read(`inventory/${f.variant.variantId}`).reserved, 0);
  }
});

test('manual checkout recalculates VND coupons, rejects forged totals and cannot oversell', async () => {
  const f = await fixture();
  f.db.data.set('coupons/MANUAL30', { code: 'MANUAL30', active: true, currency: 'VND', percent: 30, minSubtotal: 0, maxDiscount: 300000, usageLimit: 10, usedCount: 0, startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' });
  const member = { ...guest, auth: { uid: 'member', token: {} } };
  await assert.rejects(f.service.createBankTransferOrder({ ...f.request(), expectedTotal: 1 }, guest), { code: 'aborted' });
  const discounted = await f.service.createBankTransferOrder({ ...f.request(), couponCode: 'MANUAL30', expectedTotal: 490000 }, member);
  assert.equal(discounted.discountAmount, 210000);
  const competing = await Promise.allSettled([f.service.createBankTransferOrder(f.request(), guest), f.service.createBankTransferOrder(f.request(), guest)]);
  assert.equal(competing.filter((entry) => entry.status === 'fulfilled').length, 1);
  assert.equal(f.db.count('orders'), 2);
  assert.equal(f.db.read(`inventory/${f.variant.variantId}`).reserved, 2);
});

test('client matches server manual defaults without fabricating business or policy confirmations', async () => {
  const { normalizeCommerceSettings, isCommerceReady } = await import('../../src/utils/commerce.js');
  const { marketSettings } = await import('../../src/utils/market.js');
  const settings = normalizeCommerceSettings();
  assert.equal(settings.businessName, '');
  assert.equal(settings.businessInfoConfirmed, false);
  assert.equal(settings.policyConfirmed, false);
  assert.equal(isCommerceReady(marketSettings(settings, 'VND')), true);
  assert.equal(isCommerceReady(marketSettings(settings, 'KRW')), false);
  assert.equal(isCommerceReady(marketSettings({ vietnam: { ...defaults, orderEnabled: false } }, 'VND')), false);
  assert.equal(isCommerceReady(marketSettings({ vietnam: { ...defaults, accountHolder: '' } }, 'VND')), false);
  assert.equal(isCommerceReady(marketSettings({ vietnam: { ...defaults, manualBankTransfer: false } }, 'VND')), false);
});

test('Vietnam launch blocks Korean orders even for administrators and with Korean sales enabled', async () => {
  const f = await fixture({ orderEnabled: true, vietnam: defaults });
  for (const context of [guest, admin]) {
    await assert.rejects(f.service.createBankTransferOrder({ ...f.request(), currency: 'KRW', customer: { ...f.request().customer, country: 'KR' } }, context), { code: 'failed-precondition' });
  }
  assert.equal(f.db.count('orders'), 0);
  assert.equal(f.db.read(`inventory/${f.variant.variantId}`).reserved, 0);
  await assert.rejects(f.service.createBankTransferOrder({ ...f.request(), customer: { ...f.request().customer, country: 'KR' } }, guest), { code: 'invalid-argument' });
  assert.equal((await f.service.createBankTransferOrder(f.request(), guest)).currency, 'VND');
});
