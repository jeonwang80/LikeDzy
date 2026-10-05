const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

function worker({ offline = false } = {}) {
  const events = {}, saved = [], deleted = [], fetched = [];
  let skipped = false, claimed = false;
  const fallback = new Response('offline');
  const context = {
    URL, Request, Response,
    self: { location: { origin: 'https://likedzy.com' }, addEventListener: (type, fn) => { events[type] = fn; }, skipWaiting: async () => { skipped = true; }, clients: { claim: async () => { claimed = true; } } },
    caches: {
      open: async () => ({ add: async request => saved.push(request.url) }),
      keys: async () => ['likedzy-pwa-old', 'likedzy-pwa-offline-v1', 'other-app'],
      delete: async name => deleted.push(name),
      match: async () => fallback,
    },
    fetch: async (request, options) => { fetched.push({ request, options }); if (offline) throw new Error('offline'); return new Response('fresh'); },
  };
  // Node's Request requires an absolute URL; browsers resolve against worker origin.
  context.Request = class extends Request { constructor(url, init) { super(new URL(url, context.self.location.origin), init); } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8'), context);
  return { events, saved, deleted, fetched, fallback, get skipped() { return skipped; }, get claimed() { return claimed; } };
}

test('PWA caches only offline information and cleans up only its own prior caches', async () => {
  const w = worker(); let pending;
  w.events.install({ waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.saved, ['https://likedzy.com/offline.html']);
  assert.equal(w.skipped, true);
  w.events.activate({ waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.deleted, ['likedzy-pwa-old']);
  assert.equal(w.claimed, true);
});

test('online navigation is fresh; failed navigation shows generic offline information', async () => {
  for (const offline of [false, true]) {
    const w = worker({ offline }); let pending;
    w.events.fetch({ request: { url: 'https://likedzy.com/', method: 'GET', mode: 'navigate' }, respondWith: promise => { pending = promise; } });
    assert.equal(await (await pending).text(), offline ? 'offline' : 'fresh');
    assert.equal(w.fetched[0].options.cache, 'no-store');
  }
});

test('orders, APIs, auth, assets and cross-origin requests are never intercepted', () => {
  const w = worker();
  for (const request of [
    { url: 'https://likedzy.com/order', method: 'POST', mode: 'navigate' },
    { url: 'https://likedzy.com/api/orders', method: 'GET', mode: 'cors' },
    { url: 'https://likedzy.com/assets/app.js', method: 'GET', mode: 'cors' },
    { url: 'https://likedzy.com/__/auth/handler', method: 'GET', mode: 'navigate' },
    { url: 'https://firestore.googleapis.com/data', method: 'GET', mode: 'navigate' },
  ]) w.events.fetch({ request, respondWith: () => assert.fail('Sensitive request intercepted') });
});

test('install manifest has valid PNG sizes, safe scope and hosting routes', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest')));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/#/');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(path.join(root, 'public', icon.src));
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json')));
  const rewrite = new RegExp('^' + config.rewrites[0].source + '$');
  for (const url of ['/sw.js', '/offline.html', '/manifest.webmanifest', '/pwa/icon-192.png']) assert.equal(rewrite.test(url), false, url);
  assert.equal(rewrite.test('/orders/lookup'), true);
});

test('install prompts are captured early, used once, and hidden after installation', async () => {
  const events = {};
  const context = { window: { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener: (type, fn) => { events[type] = fn; } }, navigator: {} };
  const source = fs.readFileSync(path.join(root, 'src/utils/pwa.js'), 'utf8').replaceAll('export ', '').replace('import.meta.env.PROD', 'false');
  vm.runInNewContext(source + '\nthis.api = { initializePwa, promptInstall, getInstallState };', context);
  const api = context.api;
  api.initializePwa();
  assert.equal(api.getInstallState(), 'help');
  let prompted = 0, prevented = false;
  events.beforeinstallprompt({ preventDefault: () => { prevented = true; }, prompt: async () => { prompted++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
  assert.equal(prevented, true);
  assert.equal(api.getInstallState(), 'available');
  assert.equal(await api.promptInstall(), 'dismissed');
  assert.equal(await api.promptInstall(), 'unavailable');
  assert.equal(prompted, 1);
  events.appinstalled();
  assert.equal(api.getInstallState(), 'installed');
});
