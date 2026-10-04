const test = require('node:test');
const assert = require('node:assert/strict');
const { createCouponGrantService } = require('../couponGrants');
const { createCommerceService } = require('../commerce');
const { FakeFirestore } = require('./fake-firestore');
const admin = { auth: { uid: 'admin', token: { admin: true, email_verified: true } } };
function fixture(overrides = {}) {
  const coupon = { code: 'HELLO30', title: 'Welcome', active: true, autoIssue: true, currency: 'VND', percent: 30, minSubtotal: 0, maxDiscount: 300000, usageLimit: 100, usedCount: 0, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z', ...overrides };
  const db = new FakeFirestore({ 'coupons/HELLO30': coupon });
  const commerce = createCommerceService({ db });
  const calls = [];
  const auth = { getUser: async (uid) => { calls.push(uid); if (uid === 'missing') throw { code: 'auth/user-not-found' }; return { uid, disabled: uid === 'disabled' }; } };
  const grant = createCouponGrantService({ db, auth, isAdmin: commerce.isAdmin, now: () => Date.parse('2026-10-04T00:00:00Z'), serverTimestamp: () => 'TEST TIME' });
  return { db, grant, calls };
}
test('manual grants require verified admin authorization before reading users', async () => {
  const f = fixture();
  for (const context of [{}, { auth: { uid: 'buyer', token: { email_verified: true } } }, { auth: { uid: 'admin', token: { admin: true } } }]) {
    await assert.rejects(f.grant({ code: 'HELLO30', userIds: ['member'] }, context), (e) => ['unauthenticated', 'permission-denied'].includes(e.code));
  }
  assert.equal(f.calls.length, 0); assert.equal(f.db.count('userCoupons'), 0);
});
test('concurrent admin grants create one entitlement per member and preserve existing redemption', async () => {
  const f = fixture();
  const request = { code: 'hello30', userIds: ['older-member', 'new-member'] };
  const results = await Promise.all([f.grant(request, admin), f.grant(request, admin)]);
  assert.equal(results.reduce((sum, r) => sum + r.issued, 0), 2);
  assert.equal(results.reduce((sum, r) => sum + r.skipped, 0), 2);
  assert.equal(f.db.count('userCoupons'), 2);
  const [key, value] = [...f.db.data.entries()].find(([path]) => path.startsWith('userCoupons/'));
  f.db.data.set(key, { ...value, redeemedAt: 'USED', orderId: 'order' });
  assert.equal((await f.grant(request, admin)).issued, 0);
  assert.equal(f.db.read(key).redeemedAt, 'USED');
  assert.equal(f.db.read(key).issuedBy, 'admin');
  assert.equal(f.db.read('coupons/HELLO30').usedCount, 0);
});
test('expired, inactive and exhausted coupons cannot be granted', async () => {
  for (const changes of [{ active: false }, { endsAt: '2026-09-30T00:00:00Z' }, { usedCount: 100 }]) {
    const f = fixture(changes);
    await assert.rejects(f.grant({ code: 'HELLO30', userIds: ['member'] }, admin), (e) => e.code === 'failed-precondition');
    assert.equal(f.db.count('userCoupons'), 0);
  }
});
test('invalid batches, missing users and disabled users cannot cause partial grants', async () => {
  const f = fixture();
  for (const users of [[], ['member', 'member'], Array.from({ length: 51 }, (_, i) => `member${i}`), ['member', 'missing'], ['member', 'disabled']]) {
    await assert.rejects(f.grant({ code: 'HELLO30', userIds: users }, admin));
    assert.equal(f.db.count('userCoupons'), 0);
  }
});
