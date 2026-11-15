const { createHmac, timingSafeEqual } = require('node:crypto');

// The country is signed by our Vercel endpoint, never supplied as a trusted
// plaintext field by the browser. Short-lived and bound to one checkout attempt.
function signCountryProof(country, orderKey, secret, now = Date.now()) {
  if (!secret || secret.length < 32 || !['KR', 'VN', 'HU'].includes(country)
      || typeof orderKey !== 'string' || orderKey.length < 32 || orderKey.length > 128) throw new Error('Country verification unavailable');
  const payload = Buffer.from(JSON.stringify({ country, orderKey, expires: now + 300000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

function verifyCountryProof(token, orderKey, secret, now = Date.now()) {
  try {
    if (!secret || secret.length < 32 || typeof token !== 'string' || token.length > 2048) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return ['KR', 'VN', 'HU'].includes(data.country) && data.orderKey === orderKey
      && Number.isFinite(data.expires) && data.expires > now && data.expires <= now + 300000 ? data.country : null;
  } catch { return null; }
}
module.exports = { signCountryProof, verifyCountryProof };
