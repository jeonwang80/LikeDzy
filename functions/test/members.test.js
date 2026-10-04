const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemberService } = require('../members');
const { createCommerceService } = require('../commerce');
const { FakeFirestore } = require('./fake-firestore');

const admin = { auth: { uid: 'admin', token: { admin: true, email_verified: true } } };
function fixture() {
  const calls = [];
  const user = { uid: 'member', email: 'member@example.test', displayName: 'Member', emailVerified: true,
    metadata: { creationTime: '2026-10-04T00:00:00Z', lastSignInTime: '2026-10-04T01:00:00Z' },
    providerData: [{ providerId: 'password' }], passwordHash: 'PRIVATE', passwordSalt: 'PRIVATE', customClaims: { secret: 'PRIVATE' } };
  const auth = {
    listUsers: async (...args) => { calls.push(args); return { users: [user], pageToken: 'next-page' }; },
    getUserByEmail: async (email) => { calls.push(email); if (email !== user.email) throw { code: 'auth/user-not-found' }; return user; },
  };
  const commerce = createCommerceService({ db: new FakeFirestore() });
  return { list: createMemberService({ auth, isAdmin: commerce.isAdmin }), calls };
}
test('member directory rejects guests, regular members and unverified admins before reading Auth', async () => {
  const f = fixture();
  for (const context of [{}, { auth: { uid: 'buyer', token: { email_verified: true } } }, { auth: { uid: 'admin', token: { admin: true, email_verified: false } } }]) {
    await assert.rejects(f.list({}, context), (error) => ['unauthenticated', 'permission-denied'].includes(error.code));
  }
  assert.equal(f.calls.length, 0);
});
test('member directory is paginated and never returns hashes, salts or custom claims', async () => {
  const f = fixture();
  const result = await f.list({ pageSize: 50, pageToken: 'previous-page' }, admin);
  assert.deepEqual(f.calls, [[50, 'previous-page']]);
  assert.equal(result.nextPageToken, 'next-page');
  assert.equal(result.members[0].createdAt, '2026-10-04T00:00:00Z');
  assert.deepEqual(result.members[0].providers, ['password']);
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
});
test('exact email search handles matches and missing users without reading full directory', async () => {
  const f = fixture();
  assert.equal((await f.list({ email: ' member@example.test ' }, admin)).members.length, 1);
  assert.deepEqual(await f.list({ email: 'missing@example.test' }, admin), { members: [], nextPageToken: '' });
  assert.deepEqual(f.calls, ['member@example.test', 'missing@example.test']);
});
test('member directory rejects invalid and excessive query parameters', async () => {
  const f = fixture();
  for (const data of [{ pageSize: 1000 }, { pageSize: 0 }, { pageToken: 4 }, { email: 5 }, { email: 'invalid' }]) {
    await assert.rejects(f.list(data, admin), (error) => error.code === 'invalid-argument');
  }
  assert.equal(f.calls.length, 0);
});
