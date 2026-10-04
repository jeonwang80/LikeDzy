const { CommerceError } = require('./commerce');
const { entitlementId, couponTime, readCouponWallet, MAX_HELD_COUPONS } = require('./couponWallet');

function createCouponGrantService({ db, auth, isAdmin, now = () => Date.now(), serverTimestamp }) {
  return async function grantMemberCoupon(data, context = {}) {
    if (!context.auth?.uid) throw new CommerceError('unauthenticated', '관리자 로그인이 필요합니다.');
    if (!await isAdmin(context)) throw new CommerceError('permission-denied', '쿠폰 지급은 관리자만 가능합니다.');
    const code = typeof data?.code === 'string' ? data.code.trim().toUpperCase() : '';
    const userIds = data?.userIds;
    if (!/^[A-Z0-9-]{4,32}$/.test(code) || !Array.isArray(userIds) || userIds.length < 1 || userIds.length > 50
      || userIds.some((uid) => typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/'))
      || new Set(userIds).size !== userIds.length) throw new CommerceError('invalid-argument', '쿠폰과 지급할 회원을 선택해 주세요. 한 번에 최대 50명까지 지급할 수 있습니다.');
    for (const uid of userIds) {
      let user;
      try { user = await auth.getUser(uid); }
      catch (error) {
        if (error.code === 'auth/user-not-found') throw new CommerceError('not-found', '탈퇴한 회원이 포함되어 있습니다. 목록을 새로고침해 주세요.');
        throw error;
      }
      if (user.disabled) throw new CommerceError('failed-precondition', '사용 중지된 회원에게는 쿠폰을 지급할 수 없습니다.');
    }
    return db.runTransaction(async (transaction) => {
      const couponRef = db.collection('coupons').doc(code);
      const snapshot = await transaction.get(couponRef);
      if (!snapshot.exists) throw new CommerceError('not-found', '등록된 쿠폰을 찾을 수 없습니다.');
      const coupon = snapshot.data();
      if (coupon.code !== code || !['KRW', 'VND'].includes(coupon.currency) || coupon.active !== true
        || !Number.isFinite(couponTime(coupon.startsAt)) || !Number.isFinite(couponTime(coupon.endsAt))
        || couponTime(coupon.endsAt) <= now() || couponTime(coupon.endsAt) <= couponTime(coupon.startsAt)
        || !Number.isInteger(coupon.percent) || coupon.percent < 1 || coupon.percent > 90
        || !Number.isSafeInteger(coupon.minSubtotal) || coupon.minSubtotal < 0
        || !Number.isSafeInteger(coupon.maxDiscount) || coupon.maxDiscount < 1
        || !Number.isSafeInteger(coupon.usageLimit) || coupon.usageLimit < 1
        || (coupon.usedCount || 0) >= coupon.usageLimit) throw new CommerceError('failed-precondition', '중지·만료되었거나 사용할 수 없는 쿠폰입니다. 쿠폰 설정을 확인해 주세요.');
      const targets = [];
      for (const uid of userIds) {
        const lock = db.collection('couponWalletLocks').doc(uid);
        await transaction.get(lock);
        const ref = db.collection('userCoupons').doc(entitlementId(code, uid));
        const existing = await transaction.get(ref);
        const used = await transaction.get(db.collection('couponUses').doc(entitlementId(code, uid)));
        const skip = existing.exists || (used.exists && used.data().released !== true);
        const wallet = skip ? null : await readCouponWallet(db, uid, now(), transaction);
        targets.push({ uid, ref, lock, skip, limited: !skip && wallet.heldCount >= MAX_HELD_COUPONS });
      }
      for (const target of targets.filter((entry) => !entry.skip && !entry.limited)) {
        transaction.set(target.lock, { updatedAt: serverTimestamp() });
        transaction.create(target.ref, {
          userId: target.uid, code, title: coupon.title || code, currency: coupon.currency,
          percent: coupon.percent, minSubtotal: coupon.minSubtotal, maxDiscount: coupon.maxDiscount, endsAt: coupon.endsAt,
          orderId: '', redeemedAt: null, createdAt: serverTimestamp(), issuedBy: context.auth.uid, issuanceType: 'admin',
        });
      }
      return { code, issued: targets.filter((entry) => !entry.skip && !entry.limited).length, skipped: targets.filter((entry) => entry.skip).length, limited: targets.filter((entry) => entry.limited).length };
    });
  };
}
module.exports = { createCouponGrantService };
