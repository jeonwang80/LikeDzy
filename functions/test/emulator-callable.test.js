const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const host = process.env.FUNCTIONS_EMULATOR_HOST || '';

test('callable adapter: real SDK timestamps support retry-safe recovery fencing', { skip: !/^(localhost|127\.0\.0\.1):\d+$/.test(host), timeout: 20000 }, async () => {
  const data = { idempotencyKey: randomBytes(32).toString('hex'), guestAccessToken: randomBytes(32).toString('hex'), abortIfMissing: true };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`http://${host}/demo-likedzy/us-central1/getOrder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }), signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.result.attemptClosed, true);
  }
});
