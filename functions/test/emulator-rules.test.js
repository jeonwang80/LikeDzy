const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

const host = process.env.FIRESTORE_EMULATOR_HOST || '';
test('Firestore rules: privacy, ownership, admin verification and server-only writes', { skip: !/^(localhost|127\.0\.0\.1):\d+$/.test(host) }, async (t) => {
  process.env.METADATA_SERVER_DETECTION = 'none';
  const { Firestore } = require('@google-cloud/firestore');
  const { initializeApp, deleteApp } = require('firebase/app');
  const { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp, terminate } = require('firebase/firestore');
  const projectId = 'demo-likedzy-commerce';
  const seed = new Firestore({ projectId, host, ssl: false });
  const prefix = `rules-${randomBytes(6).toString('hex')}`;
  const clients = [];
  function client(uid, extra = {}) {
    const app = initializeApp({ projectId, apiKey: 'demo-only' }, `${prefix}-${uid || 'guest'}-${clients.length}`);
    const db = getFirestore(app);
    const [hostname, port] = host.split(':');
    connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid, email: `${uid}@example.test`, email_verified: true, ...extra } } : undefined);
    clients.push({ app, db });
    return db;
  }
  const guest = client();
  const buyer = client(`${prefix}-buyer`);
  const stranger = client(`${prefix}-stranger`);
  const admin = client(`${prefix}-admin`, { admin: true });
  const unverified = client(`${prefix}-unverified`, { admin: true, email_verified: false });
  const denied = (promise) => assert.rejects(promise, (error) => error.code === 'permission-denied');
  const read = (db, path) => getDoc(doc(db, path));
  const qna = (secret = false) => ({ schemaVersion: 2, productId: prefix, userId: `${prefix}-buyer`, author: 'TEST ONLY', content: 'Synthetic question', isSecret: secret, status: '답변 대기', reply: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  try {
    const data = {
      [`products/${prefix}`]: { name: 'TEST ONLY' },
      [`orders/${prefix}`]: { userId: `${prefix}-buyer`, status: '입금 대기' },
      [`inventory/${prefix}`]: { stock: 2 },
      [`stockAvailability/${prefix}`]: { available: 2 },
      [`orderAccess/${prefix}`]: { synthetic: true },
      [`orderRequests/${prefix}`]: { synthetic: true },
      [`qna/${prefix}`]: { password: 'SYNTHETIC', content: 'Legacy private' },
      [`reviews/${prefix}`]: { password: 'SYNTHETIC' },
    };
    const batch = seed.batch();
    for (const [path, value] of Object.entries(data)) batch.set(seed.doc(path), value);
    await batch.commit();
    await t.test('public catalog and availability are readable; private inventory is admin-only', async () => {
      await read(guest, `products/${prefix}`); await read(guest, `stockAvailability/${prefix}`);
      await denied(read(guest, `inventory/${prefix}`)); await denied(read(buyer, `inventory/${prefix}`));
      await read(admin, `inventory/${prefix}`); await denied(read(unverified, `inventory/${prefix}`));
    });
    await t.test('orders are accessible only to their buyer or verified administrator', async () => {
      await read(buyer, `orders/${prefix}`); await read(admin, `orders/${prefix}`);
      await denied(read(guest, `orders/${prefix}`)); await denied(read(stranger, `orders/${prefix}`));
      await denied(read(unverified, `orders/${prefix}`));
    });
    await t.test('even administrators cannot directly write inventory, orders or recovery secrets', async () => {
      for (const group of ['orders', 'inventory', 'stockAvailability', 'orderAccess', 'orderRequests', 'inventoryMovements', 'inventoryRequests', 'orderRateLimits']) {
        await denied(setDoc(doc(admin, group, `${prefix}-write`), { synthetic: true }));
      }
      await denied(read(admin, `orderAccess/${prefix}`)); await denied(read(buyer, `orderRequests/${prefix}`));
    });
    await t.test('unverified administrator claims cannot change products', async () => {
      await denied(updateDoc(doc(unverified, 'products', prefix), { name: 'Blocked' }));
      await denied(updateDoc(doc(buyer, 'products', prefix), { name: 'Blocked' }));
      await updateDoc(doc(admin, 'products', prefix), { name: 'TEST ONLY updated' });
    });
    await t.test('legacy question and review passwords stay administrator-only', async () => {
      for (const group of ['qna', 'reviews']) {
        await denied(read(guest, `${group}/${prefix}`)); await denied(read(buyer, `${group}/${prefix}`));
        await read(admin, `${group}/${prefix}`);
      }
    });
    await t.test('new secret questions allow only owner/admin reads and public filtered queries work', async () => {
      await setDoc(doc(buyer, 'qnaV2', `${prefix}-secret`), qna(true));
      await setDoc(doc(buyer, 'qnaV2', `${prefix}-public`), qna(false));
      await read(guest, `qnaV2/${prefix}-public`);
      await denied(read(guest, `qnaV2/${prefix}-secret`)); await denied(read(stranger, `qnaV2/${prefix}-secret`));
      await read(buyer, `qnaV2/${prefix}-secret`); await read(admin, `qnaV2/${prefix}-secret`);
      assert.equal((await getDocs(query(collection(guest, 'qnaV2'), where('productId', '==', prefix), where('isSecret', '==', false)))).size, 1);
      await denied(getDocs(query(collection(guest, 'qnaV2'), where('productId', '==', prefix))));
    });
    await t.test('anonymous, forged-owner and password-bearing questions are rejected', async () => {
      await denied(setDoc(doc(guest, 'qnaV2', `${prefix}-anon`), qna()));
      await denied(setDoc(doc(stranger, 'qnaV2', `${prefix}-forged`), qna()));
      await denied(setDoc(doc(buyer, 'qnaV2', `${prefix}-password`), { ...qna(), password: 'bad' }));
      await denied(deleteDoc(doc(stranger, 'qnaV2', `${prefix}-secret`)));
    });
    await t.test('admin replies cannot rewrite authors or question content', async () => {
      await updateDoc(doc(admin, 'qnaV2', `${prefix}-secret`), { reply: 'TEST ONLY reply', status: '답변 완료', updatedAt: serverTimestamp() });
      await denied(updateDoc(doc(admin, 'qnaV2', `${prefix}-secret`), { content: 'Changed' }));
      await denied(updateDoc(doc(buyer, 'qnaV2', `${prefix}-secret`), { reply: 'Forged' }));
    });
    await t.test('reviews cannot forge purchase verification or another user image path', async () => {
      const review = { schemaVersion: 2, productId: prefix, userId: `${prefix}-buyer`, author: 'TEST ONLY', content: 'Synthetic review', rating: 5, imagePaths: [], purchaseVerified: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      await setDoc(doc(buyer, 'reviewsV2', prefix), review);
      await read(guest, `reviewsV2/${prefix}`);
      await denied(setDoc(doc(buyer, 'reviewsV2', `${prefix}-forged`), { ...review, purchaseVerified: true }));
      await denied(setDoc(doc(buyer, 'reviewsV2', `${prefix}-image`), { ...review, imagePaths: ['users/another-user/reviews/a.jpg'] }));
      await denied(deleteDoc(doc(stranger, 'reviewsV2', prefix)));
      await deleteDoc(doc(buyer, 'reviewsV2', prefix));
    });
  } finally {
    await Promise.all(clients.map(async ({ app, db }) => { await terminate(db); await deleteApp(app); }));
    await seed.terminate();
  }
});
