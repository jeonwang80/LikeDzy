export const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('');
const ATTEMPT_KEY = 'likedzy-checkout-attempt-v2';
const ACCESS_KEY = 'likedzy-order-access-v2';

// Preserve credentials on uncertain network failures, including page reloads.
// Store only a hash of the request, never addresses or receipt identities.
export async function checkoutAttempt(payload) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const fingerprint = Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('');
  const existing = readAttempt();
  if (existing && existing.fingerprint !== fingerprint) {
    throw new Error('이전 주문 요청의 결과를 먼저 확인해 주세요. 주문 요청 복구 버튼을 이용해 주세요.');
  }
  if (existing) return existing;
  const attempt = { fingerprint, idempotencyKey: randomKey(), guestAccessToken: randomKey() };
  localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  return attempt;
}
export function readAttempt() {
  try { return JSON.parse(localStorage.getItem(ATTEMPT_KEY) || 'null'); } catch { return null; }
}
export function forgetAttempt() { localStorage.removeItem(ATTEMPT_KEY); }
export function rememberOrder(id, token) {
  const existing = JSON.parse(localStorage.getItem(ACCESS_KEY) || '{}');
  localStorage.setItem(ACCESS_KEY, JSON.stringify({ ...Object.fromEntries(Object.entries(existing).slice(-19)), [id]: token }));
}
export function orderAccess(id) {
  try { return JSON.parse(localStorage.getItem(ACCESS_KEY) || '{}')[id] || ''; } catch { return ''; }
}
export function compactCartItem({ product, option, quantity }) {
  return {
    product: { id: product.id, name: product.name, prices: { KRW: Number(product.prices?.KRW ?? product.priceKRW) || 0 },
      cartColorName: product.cartColorName || '기본', cartColorBackground: product.cartColorBackground || '',
      cartThumbnailUrl: product.cartThumbnailUrl || product.imageUrls?.[0] || '', cartImageUrl: product.cartImageUrl || '' },
    option: { name: option?.name || '기본', variantId: option?.variantId || '', stock: Math.max(0, Number(option?.stock) || 0) },
    quantity: Math.min(20, Math.max(1, Math.floor(Number(quantity) || 1))),
  };
}
