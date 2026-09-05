const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '';
test('Storage rules: upload ownership, content restrictions and protected overwrite', { skip: !/^(localhost|127\.0\.0\.1):\d+$/.test(host), timeout: 30000 }, async (t) => {
  const { initializeApp, deleteApp } = require('firebase/app');
  const { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');
  const prefix = `storage-${randomBytes(6).toString('hex')}`;
  const apps = [];
  function client(uid, extra = {}) {
    const app = initializeApp({ projectId: 'demo-likedzy', apiKey: 'demo-only', storageBucket: 'demo-likedzy.appspot.com' }, `${prefix}-${apps.length}`);
    apps.push(app);
    const storage = getStorage(app);
    const [hostname, port] = host.split(':');
    connectStorageEmulator(storage, hostname, Number(port), uid ? { mockUserToken: { sub: uid, email: `${uid}@example.test`, email_verified: true, ...extra } } : undefined);
    return storage;
  }
  const buyer = client(prefix); const stranger = client(`${prefix}-other`);
  const guest = client(); const admin = client(`${prefix}-admin`, { admin: true });
  const unverified = client(`${prefix}-unverified`, { admin: true, email_verified: false });
  const photo = new Uint8Array([255, 216, 255, 217]);
  const upload = (storage, path, type = 'image/jpeg', bytes = photo) => uploadBytes(ref(storage, path), bytes, { contentType: type });
  const denied = (promise) => assert.rejects(promise, (error) => error.code === 'storage/unauthorized');
  const path = `users/${prefix}/reviews/test.jpg`;
  try {
    await t.test('review owner can upload; guests can read; other users cannot upload or delete', async () => {
      await upload(buyer, path); assert.equal((await getBytes(ref(guest, path))).byteLength, 4);
      await denied(upload(stranger, `users/${prefix}/reviews/other.jpg`));
      await denied(upload(guest, `users/${prefix}/reviews/guest.jpg`));
      await denied(deleteObject(ref(stranger, path)));
    });
    await t.test('review images are immutable and reject invalid types, names and excessive size', async () => {
      await denied(upload(buyer, path));
      await denied(upload(buyer, `users/${prefix}/reviews/test.svg`, 'image/svg+xml'));
      await denied(upload(buyer, `users/${prefix}/reviews/type.jpg`, 'text/html'));
      await denied(upload(buyer, `users/${prefix}/reviews/large.jpg`, 'image/jpeg', new Uint8Array(10 * 1024 * 1024 + 1)));
    });
    await t.test('only verified administrators can upload product media', async () => {
      const productPath = `products/${prefix}/photo.jpg`;
      await denied(upload(buyer, productPath)); await denied(upload(unverified, productPath));
      await upload(admin, productPath); await getBytes(ref(guest, productPath));
      await denied(upload(admin, `products/${prefix}/unsafe.svg`, 'image/svg+xml'));
      await deleteObject(ref(admin, productPath));
    });
    await t.test('review owner can remove their synthetic upload', async () => { await deleteObject(ref(buyer, path)); });
  } finally { await Promise.all(apps.map(deleteApp)); }
});
