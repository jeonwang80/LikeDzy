import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const call = async (name, data) => (await httpsCallable(functions, name)(data)).data;

export const createBankTransferOrder = ({ cart, customer, expectedTotal, idempotencyKey, guestAccessToken }) => call('createBankTransferOrder', {
  cart: cart.map((item) => ({
    variantId: item.option?.variantId || '',
    productId: item.product.id,
    optionName: item.option?.name || '기본',
    colorName: item.product.cartColorName || '기본',
    quantity: item.quantity,
  })),
  customer, expectedTotal, idempotencyKey, guestAccessToken,
});
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
