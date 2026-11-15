import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const call = async (name, data) => (await httpsCallable(functions, name)(data)).data;

export const createBankTransferOrder = async ({ cart, customer, expectedTotal, idempotencyKey, guestAccessToken, currency = 'KRW', couponCode = '' }) => {
  const response = await fetch('/api/visitor-country', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ orderKey: idempotencyKey }), signal: AbortSignal.timeout(10000),
  });
  const verification = response.ok ? await response.json() : null;
  if (!verification?.proof) throw new Error('접속 국가 확인에 실패했습니다. 연결을 확인하고 다시 시도해 주세요.');
  return call('createBankTransferOrder', {
  countryProof: verification.proof,
  cart: cart.map((item) => ({
    variantId: item.option?.variantId || '',
    productId: item.product.id,
    optionName: item.option?.name || '기본',
    colorName: item.product.cartColorName || '기본',
    quantity: item.quantity,
  })),
  customer, expectedTotal, idempotencyKey, guestAccessToken, currency, couponCode,
  });
};
export const quoteCoupon = (couponCode, currency, subtotal) => call('quoteCoupon', { couponCode, currency, subtotal });
export const getOrder = (orderId, guestAccessToken = '') => call('getOrder', { orderId, guestAccessToken });
export const recoverOrderAttempt = (attempt) => call('getOrder', { idempotencyKey: attempt.idempotencyKey, guestAccessToken: attempt.guestAccessToken, abortIfMissing: true });
export const setVariantStock = (data) => call('setVariantStock', data);
export const changeOrderStatus = (orderId, status, expectedStatus, extra = {}) => call('updateOrder', {
  orderId, action: 'status', expectedStatus, payload: { status, ...extra },
});
export const saveOrderShipment = (orderId, payload, expectedStatus) => call('updateOrder', {
  orderId, action: 'shipment', payload, expectedStatus,
});
export const saveOrderReceipt = (orderId, payload, expectedStatus) => call('updateOrder', {
  orderId, action: 'receipt', payload, expectedStatus,
});
export const completeOrderRefund = (orderId, payload, expectedStatus) => call('updateOrder', {
  orderId, action: 'refund', payload, expectedStatus,
});

export const processWarehouse = data => call('processWarehouse', data);
