const { createHash } = require('node:crypto');
const MAX_HELD_COUPONS = 3;
const entitlementId = (code, uid) => createHash('sha256').update(`${code}:${uid}`).digest('hex');
const couponTime = (value) => value?.toMillis?.() ?? (value instanceof Date ? value.getTime() : typeof value === 'object' && value !== null && Number.isFinite(value.seconds ?? value._seconds) ? (value.seconds ?? value._seconds) * 1000 : typeof value === 'number' ? value : Date.parse(value));
const dateString = (value) => Number.isFinite(couponTime(value)) ? new Date(couponTime(value)).toISOString() : null;
function campaignStatus(coupon, time) {
  if (!coupon) return 'unavailable';
  const starts = couponTime(coupon.startsAt), ends = couponTime(coupon.endsAt);
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts) return 'invalid';
  if (time > ends) return 'expired';
  if (coupon.active !== true) return 'paused';
  if (time < starts) return 'scheduled';
  if ((coupon.usedCount || 0) >= coupon.usageLimit) return 'exhausted';
  return 'available';
}
async function readCouponWallet(db, uid, time, transaction) {
  const read = (ref) => transaction ? transaction.get(ref) : ref.get();
  const entries = await read(db.collection('userCoupons').where('userId', '==', uid));
  const coupons = await Promise.all(entries.docs.map(async (entry) => {
    const entitlement = entry.data(), code = entitlement.code;
    const [campaign, use] = await Promise.all([
      read(db.collection('coupons').doc(code)),
      read(db.collection('couponUses').doc(entitlementId(code, uid))),
    ]);
    const current = campaign.exists ? campaign.data() : null;
    const redemption = use.exists && use.data().released !== true ? use.data() : null;
    const orderId = redemption?.orderId || (entitlement.redeemedAt ? entitlement.orderId : '');
    const order = orderId ? await read(db.collection('orders').doc(orderId)) : null;
    let status = campaignStatus(current, time);
    if (redemption || entitlement.redeemedAt) status = order?.exists && order.data().status === '입금 대기' ? 'reserved' : 'used';
    return { code, title: current?.title || entitlement.title || code, currency: current?.currency || entitlement.currency,
      percent: current?.percent ?? entitlement.percent, minSubtotal: current?.minSubtotal ?? entitlement.minSubtotal,
      maxDiscount: current?.maxDiscount ?? entitlement.maxDiscount, startsAt: dateString(current?.startsAt), endsAt: dateString(current?.endsAt || entitlement.endsAt),
      status, orderId: orderId || '', issuedAt: dateString(entitlement.createdAt) };
  }));
  coupons.sort((a,b) => (a.endsAt || '').localeCompare(b.endsAt || '') || a.code.localeCompare(b.code));
  // Pending payment keeps its slot so cancelling restores the coupon without exceeding the limit.
  const heldCount = coupons.filter((coupon) => ['available', 'scheduled', 'paused', 'reserved'].includes(coupon.status)).length;
  return { coupons, heldCount, availableCount: coupons.filter(c => c.status === 'available').length,
    usedCount: coupons.filter(c => c.status === 'used').length, reservedCount: coupons.filter(c => c.status === 'reserved').length,
    maxCoupons: MAX_HELD_COUPONS, serverTime: new Date(time).toISOString() };
}
module.exports = { MAX_HELD_COUPONS, entitlementId, couponTime, campaignStatus, readCouponWallet };
