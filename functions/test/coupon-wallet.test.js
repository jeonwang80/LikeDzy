const test = require('node:test');
const assert = require('node:assert/strict');
const { createCommerceService } = require('../commerce');
const { createCouponGrantService } = require('../couponGrants');
const { createMemberService } = require('../members');
const { entitlementId, couponTime } = require('../couponWallet');
const { FakeFirestore } = require('./fake-firestore');
const time = Date.parse('2026-10-04T11:00:00Z');
const admin = { auth: { uid: 'admin', token: { admin: true, email_verified: true } } };
const member = { auth: { uid: 'member', token: {} } };
function fixture() {
  const db = new FakeFirestore();
  const service = createCommerceService({ db, now: () => time });
  const auth = { getUser: async uid => ({ uid }), listUsers: async () => ({ users: [{ uid: 'member' }] }) };
  const grant = createCouponGrantService({ db, auth, isAdmin: service.isAdmin, now: () => time, serverTimestamp: () => new Date(time) });
  const campaign = (code, changes={}) => db.data.set(`coupons/${code}`, { code, currency:'VND', title:code, active:true, autoIssue:true, percent:30, minSubtotal:30000, maxDiscount:100000, usageLimit:500, usedCount:0, startsAt:'2026-10-01T00:00:00Z', endsAt:'2026-10-31T10:30:00Z', ...changes });
  return { db, service, auth, grant, campaign };
}
test('future WELCOME is not exhausted; editing issued dates updates wallet and yields 790000 - 100000 = 690000', async () => {
  const f=fixture(); f.campaign('WELCOME',{ startsAt:'2026-10-05T10:30:00Z' });
  await f.grant({ code:'WELCOME', userIds:['member'] },admin);
  assert.equal((await f.service.listMyCoupons({},member)).coupons[0].status,'scheduled');
  await assert.rejects(f.service.quoteCoupon({ couponCode:'WELCOME',currency:'VND',subtotal:790000 },member), /시작일/);
  const campaign=f.db.read('coupons/WELCOME'); f.db.data.set('coupons/WELCOME',{...campaign, startsAt:'2026-10-01T00:00:00Z'});
  const quote=await f.service.quoteCoupon({couponCode:'WELCOME',currency:'VND',subtotal:790000},member);
  assert.equal(quote.discountAmount,100000); assert.equal(790000-quote.discountAmount,690000);
  assert.equal((await f.service.listMyCoupons({},member)).availableCount,1);
  assert.equal(f.db.read('coupons/WELCOME').usedCount,0);
  assert.equal(f.db.count('couponUses'),0);
  f.db.data.set('coupons/WELCOME',{...campaign,endsAt:'2026-10-03T00:00:00Z',startsAt:'2026-10-01T00:00:00Z'});
  assert.equal((await f.service.listMyCoupons({},member)).coupons[0].status,'expired');
});
test('concurrent grants of different campaigns respect three held coupons and permit other recipients', async () => {
  const f=fixture(); const codes=['CODE1','CODE2','CODE3','CODE4']; codes.forEach(code=>f.campaign(code));
  const results=await Promise.all(codes.map(code=>f.grant({code,userIds:['member']},admin)));
  assert.equal(results.reduce((sum,result)=>sum+result.issued,0),3);
  assert.equal(results.reduce((sum,result)=>sum+result.limited,0),1);
  const result=await f.grant({code:'CODE4',userIds:['member','second']},admin);
  assert.equal(result.issued,1); assert.equal(result.limited,1);
});
test('automatic signup and manual issuance share the same three-slot limit', async () => {
  const f=fixture(); ['AUTO1','AUTO2','AUTO3','AUTO4'].forEach(code=>f.campaign(code));
  const user={uid:'member',metadata:{creationTime:new Date(time).toISOString()}};
  await Promise.all([f.service.issueWelcomeCoupons(user),f.grant({code:'AUTO4',userIds:['member']},admin)]);
  assert.equal((await f.service.listMyCoupons({},member)).heldCount,3);
  assert.equal(f.db.count('userCoupons'),3);
});
test('pending payment reserves a slot, paid usage frees it, history stays visible and private', async () => {
  const f=fixture(); ['HELD1','HELD2','HELD3','NEXT1'].forEach(code=>f.campaign(code));
  for(const code of ['HELD1','HELD2','HELD3']) await f.grant({code,userIds:['member']},admin);
  const id=entitlementId('HELD1','member');
  f.db.data.set(`couponUses/${id}`,{code:'HELD1',userId:'member',orderId:'order',released:false});
  f.db.data.set('orders/order',{status:'입금 대기'});
  assert.equal((await f.service.listMyCoupons({},member)).reservedCount,1);
  assert.equal((await f.grant({code:'NEXT1',userIds:['member']},admin)).limited,1);
  await assert.rejects(f.service.quoteCoupon({couponCode:'HELD1',currency:'VND',subtotal:790000},member), /입금 대기/);
  f.db.data.set('orders/order',{status:'입금 확인'});
  assert.equal((await f.grant({code:'NEXT1',userIds:['member']},admin)).issued,1);
  const wallet=await f.service.listMyCoupons({},member); assert.equal(wallet.heldCount,3); assert.equal(wallet.usedCount,1); assert.equal(wallet.coupons.length,4);
  const list=createMemberService({db:f.db,auth:f.auth,isAdmin:f.service.isAdmin,now:()=>time});
  assert.equal((await list({},admin)).members[0].couponWallet.usedCount,1);
  await assert.rejects(list({},member),{code:'permission-denied'});
  await assert.rejects(f.service.listMyCoupons({},{}),{code:'unauthenticated'});
  assert.equal((await f.service.listMyCoupons({userId:'member'},{auth:{uid:'stranger'}})).coupons.length,0);
});
test('dates accept Firestore Timestamp and exhausted or expired have distinct messages',async()=>{
  assert.equal(couponTime({seconds:time/1000}),time);
  assert.equal(couponTime({toMillis:()=>time}),time);
  const f=fixture(); f.campaign('LIMIT',{usedCount:500});
  await assert.rejects(f.service.quoteCoupon({couponCode:'LIMIT',currency:'VND',subtotal:790000},member), /발급받은/);
  f.campaign('LIMIT',{autoIssue:false,usedCount:500});
  await assert.rejects(f.service.quoteCoupon({couponCode:'LIMIT',currency:'VND',subtotal:790000},member), /전체 사용 한도/);
  f.campaign('LIMIT',{autoIssue:false,endsAt:'2026-10-03T00:00:00Z'});
  await assert.rejects(f.service.quoteCoupon({couponCode:'LIMIT',currency:'VND',subtotal:790000},member), /만료/);
});
