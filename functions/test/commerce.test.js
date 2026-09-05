const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { createCommerceService, variantIdFor, STATUS } = require("../commerce");
const { FakeFirestore } = require("./fake-firestore");

const admin = { auth: { uid: "test-admin", token: { admin: true, email: "admin@example.test", email_verified: true } } };
const guest = { rawRequest: { ip: "127.0.0.1" } };
const secret = () => randomBytes(32).toString("base64url");
const settings = {
  orderEnabled: true, purchaseSafetyConfirmed: true, businessInfoConfirmed: true, policyConfirmed: true,
  businessName: "TEST ONLY", representativeName: "TEST ONLY", businessNumber: "TEST ONLY", customerServicePhone: "TEST ONLY",
  customerServiceEmail: "test@example.test", businessAddress: "TEST ONLY", bankName: "TEST ONLY", accountNumber: "TEST ONLY", accountHolder: "TEST ONLY",
  termsText: "TEST ONLY", privacyText: "TEST ONLY", returnsText: "TEST ONLY", shippingFee: 3000, freeShippingThreshold: 50000, depositDeadlineHours: 48,
};
const customer = {
  buyerName: "테스트주문자", buyerPhone: "010-0000-0000", recipientName: "테스트수령인", recipientPhone: "010-0000-0001",
  postcode: "00000", address1: "TEST ONLY", address2: "", notes: "TEST ONLY", agreements: { orderConfirmed: true, privacyAgreed: true }, cashReceipt: { type: "none" },
};
async function fixture(stock = 3, options = {}) {
  const db = new FakeFirestore({
    "products/shirt": { name: "TEST ONLY SHIRT", prices: { KRW: 39000 }, colorSwatches: [{ name: "Black" }, { name: "Navy" }], sizeOptions: [{ name: "M" }, { name: "L" }], options: [{ name: "M", stock: 999, history: ["legacy untouched"] }] },
    "settings/commerce": settings,
  });
  let current = Date.parse("2026-09-05T00:00:00Z");
  const service = createCommerceService({ db, now: () => current, timestamp: (date) => date, serverTimestamp: () => new Date(current), isEmulator: options.isEmulator ?? true });
  const variant = await service.setVariantStock({ productId: "shirt", colorName: "Black", optionName: "M", stock, expectedVersion: 0, requestId: secret() }, admin);
  function order(overrides = {}) {
    return { idempotencyKey: secret(), guestAccessToken: secret(), cart: [{ productId: "shirt", colorName: "Black", optionName: "M", variantId: variant.variantId, quantity: 1 }], customer, expectedTotal: 42000, ...overrides };
  }
  const inventory = () => db.read(`inventory/${variant.variantId}`);
  const action = (id, expectedStatus, status, payload = {}) => service.updateOrder({ orderId: id, expectedStatus, action: "status", payload: { status, ...payload } }, admin);
  return { db, service, variant, order, inventory, action, advance: (duration) => { current += duration; } };
}
const rejectsCode = (operation, code) => assert.rejects(operation, (error) => error.code === code);

test("concurrent retries and a lost success response create exactly one order and reservation", async () => {
  const f = await fixture(); const request = f.order();
  const results = await Promise.all([f.service.createBankTransferOrder(request, guest), f.service.createBankTransferOrder(request, guest)]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(f.db.count("orders"), 1); assert.equal(f.inventory().stock, 2); assert.equal(f.inventory().reserved, 1);
  const recovered = await f.service.getOrder({ idempotencyKey: request.idempotencyKey, guestAccessToken: request.guestAccessToken });
  assert.equal(recovered.id, results[0].id); assert.equal(recovered.bank.accountNumber, "TEST ONLY");
  assert.equal(f.db.count("orderEvents"), 1);
  assert.equal(JSON.stringify([...f.db.data.values()]).includes(request.guestAccessToken), false);
});

test("idempotency keys reject changed addresses, quantities and access tokens without extra reservation", async () => {
  const f = await fixture(); const request = f.order(); await f.service.createBankTransferOrder(request, guest);
  for (const changes of [{ customer: { ...customer, address1: "CHANGED" } }, { guestAccessToken: secret() }, { cart: [{ ...request.cart[0], quantity: 2 }], expectedTotal: 78000 }]) {
    await rejectsCode(f.service.createBankTransferOrder({ ...request, ...changes }, guest), "already-exists");
  }
  assert.equal(f.db.count("orders"), 1); assert.equal(f.inventory().stock, 2);
});

test("two buyers competing for last unit cannot oversell", async () => {
  const f = await fixture(1);
  const results = await Promise.allSettled([f.service.createBankTransferOrder(f.order(), guest), f.service.createBankTransferOrder(f.order(), guest)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(f.db.count("orders"), 1); assert.equal(f.inventory().stock, 0); assert.equal(f.inventory().reserved, 1);
  assert.equal(f.db.read(`stockAvailability/${f.variant.variantId}`).available, 0);
});

test("stock is separate from product edits and stale admin saves are rejected", async () => {
  const f = await fixture(2); const before = f.db.read("products/shirt");
  await f.service.createBankTransferOrder(f.order(), guest);
  assert.deepEqual(f.db.read("products/shirt"), before);
  f.db.data.set("products/shirt", { ...before, name: "CHANGED PHOTO/TEXT", options: [{ name: "M", stock: 999 }] });
  assert.equal(f.inventory().stock, 1);
  await rejectsCode(f.service.setVariantStock({ productId: "shirt", colorName: "Black", optionName: "M", stock: 10, expectedVersion: 1, requestId: secret() }, admin), "aborted");
  assert.equal(f.inventory().stock, 1);
});

test("color-size stocks are independent and legacy stock is never auto-migrated", async () => {
  const f = await fixture(1);
  const navyId = variantIdFor("shirt", "Navy", "M");
  const navyOrder = () => f.order({ cart: [{ productId: "shirt", colorName: "Navy", optionName: "M", variantId: navyId, quantity: 1 }] });
  await rejectsCode(f.service.createBankTransferOrder(navyOrder(), guest), "failed-precondition");
  await f.service.setVariantStock({ productId: "shirt", colorName: "Navy", optionName: "M", stock: 2, expectedVersion: 0, requestId: secret() }, admin);
  await f.service.createBankTransferOrder(navyOrder(), guest);
  assert.equal(f.inventory().stock, 1); assert.equal(f.db.read(`inventory/${navyId}`).stock, 1);
  await rejectsCode(f.service.setVariantStock({ productId: "shirt", colorName: "Pink", optionName: "M", stock: 2, expectedVersion: 0, requestId: secret() }, admin), "failed-precondition");
});

test("guest recovery is secret-protected and signed-in order belongs only to that buyer", async () => {
  const f = await fixture(); const request = f.order();
  const owner = { auth: { uid: "buyer-1", token: { email: "buyer@example.test" } }, ...guest };
  const created = await f.service.createBankTransferOrder(request, owner);
  for (const context of [{}, { auth: { uid: "buyer-2", token: { email_verified: true } } }]) {
    await rejectsCode(f.service.getOrder({ orderId: created.id }, context), "not-found");
  }
  await rejectsCode(f.service.getOrder({ orderId: created.id, guestAccessToken: secret() }), "not-found");
  const recovered = await f.service.getOrder({ orderId: created.id }, owner);
  assert.equal(recovered.id, created.id); assert.equal(recovered.phone, "***0001");
  assert.equal(recovered.address1, undefined); assert.equal(recovered.cashReceipt, undefined);
  await rejectsCode(f.service.getOrder({ idempotencyKey: secret(), guestAccessToken: secret() }), "not-found");
});

test("unpaid orders expire once; confirmed orders cannot be released by scheduler", async () => {
  const f = await fixture();
  const unpaid = await f.service.createBankTransferOrder(f.order(), guest);
  const paid = await f.service.createBankTransferOrder(f.order(), guest);
  await f.action(paid.id, STATUS.WAITING, STATUS.PAID);
  f.advance(49 * 3600000);
  const result = await f.service.expireBankTransferOrders();
  assert.equal(result.expired, 1); assert.equal(f.inventory().stock, 2); assert.equal(f.inventory().sold, 1); assert.equal(f.inventory().reserved, 0);
  assert.equal((await f.service.expireOrder(unpaid.id)).skipped, true);
  assert.equal((await f.service.expireOrder(paid.id)).skipped, true);
  assert.equal(f.inventory().stock, 2);
});

test("at the deposit deadline confirmation loses safely to expiry with one release", async () => {
  const f = await fixture(1); const created = await f.service.createBankTransferOrder(f.order(), guest);
  f.advance(48 * 3600000);
  const results = await Promise.allSettled([f.action(created.id, STATUS.WAITING, STATUS.PAID), f.service.expireOrder(created.id)]);
  assert.equal(results[0].status, "rejected"); assert.equal(results[1].status, "fulfilled");
  assert.equal(f.inventory().stock, 1); assert.equal(f.inventory().sold, 0); assert.equal(f.inventory().reserved, 0);
});

test("strict order graph requires confirmation, preparation and saved shipment; paid cancellation forbidden", async () => {
  const f = await fixture(); const created = await f.service.createBankTransferOrder(f.order(), guest);
  await rejectsCode(f.action(created.id, STATUS.WAITING, STATUS.SHIPPED), "failed-precondition");
  await f.action(created.id, STATUS.WAITING, STATUS.PAID);
  await rejectsCode(f.action(created.id, STATUS.PAID, STATUS.CANCELLED), "failed-precondition");
  await rejectsCode(f.action(created.id, STATUS.WAITING, STATUS.PREPARING), "aborted");
  await f.action(created.id, STATUS.PAID, STATUS.PREPARING);
  await rejectsCode(f.action(created.id, STATUS.PREPARING, STATUS.SHIPPED), "failed-precondition");
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.PREPARING, action: "shipment", payload: { courier: "TEST CARRIER", trackingNumber: "TEST1234" } }, admin);
  await f.action(created.id, STATUS.PREPARING, STATUS.SHIPPED);
  assert.equal(f.inventory().stock, 2); assert.equal(f.inventory().sold, 1);
});

test("shipped returns are not restocked until inspection and refund needs actual transfer reference", async () => {
  const f = await fixture(1); const created = await f.service.createBankTransferOrder(f.order(), guest);
  await f.action(created.id, STATUS.WAITING, STATUS.PAID); await f.action(created.id, STATUS.PAID, STATUS.PREPARING);
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.PREPARING, action: "shipment", payload: { courier: "TEST", trackingNumber: "TEST1234" } }, admin);
  await f.action(created.id, STATUS.PREPARING, STATUS.SHIPPED); await f.action(created.id, STATUS.SHIPPED, STATUS.RETURN_REQUESTED);
  assert.equal(f.inventory().stock, 0);
  await rejectsCode(f.action(created.id, STATUS.RETURN_REQUESTED, STATUS.RETURN_RECEIVED), "invalid-argument");
  await f.action(created.id, STATUS.RETURN_REQUESTED, STATUS.RETURN_RECEIVED, { restock: true, note: "TEST ONLY inspected" });
  assert.equal(f.inventory().stock, 1); assert.equal(f.inventory().sold, 0);
  await rejectsCode(f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.RETURN_RECEIVED, action: "refund", payload: { amount: 42000 } }, admin), "invalid-argument");
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.RETURN_RECEIVED, action: "refund", payload: { amount: 42000, reference: "TEST ONLY BANK REF" } }, admin);
  assert.equal(f.inventory().stock, 1); assert.equal(f.db.read(`orders/${created.id}`).status, STATUS.REFUNDED);
});

test("pre-shipment refund returns stock once and receipt completion requires reference", async () => {
  const f = await fixture(1); const created = await f.service.createBankTransferOrder(f.order(), guest);
  await f.action(created.id, STATUS.WAITING, STATUS.PAID);
  await rejectsCode(f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.PAID, action: "receipt", payload: { status: "발급 완료" } }, admin), "invalid-argument");
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.PAID, action: "receipt", payload: { status: "자진발급 완료", reference: "TEST ONLY RECEIPT" } }, admin);
  await f.action(created.id, STATUS.PAID, STATUS.REFUND_REQUESTED);
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.REFUND_REQUESTED, action: "refund", payload: { amount: 42000, reference: "TEST ONLY BANK" } }, admin);
  await rejectsCode(f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.REFUND_REQUESTED, action: "refund", payload: { amount: 42000, reference: "TEST ONLY BANK" } }, admin), "aborted");
  assert.equal(f.inventory().stock, 1); assert.equal(f.inventory().sold, 0);
});

test("malformed orders and tampered prices fail before any order or stock write", async () => {
  const f = await fixture(2); const initial = f.inventory();
  for (const request of [f.order({ expectedTotal: 1 }), f.order({ cart: [] }), f.order({ customer: { ...customer, buyerPhone: "1" } }), f.order({ guestAccessToken: "short" })]) {
    await assert.rejects(f.service.createBankTransferOrder(request, guest));
  }
  assert.deepEqual(f.inventory(), initial); assert.equal(f.db.count("orders"), 0);
});

test("admin email must be verified and claim or UID list is required", async () => {
  const f = await fixture();
  const request = { productId: "shirt", colorName: "Black", optionName: "M", stock: 2, expectedVersion: 1, requestId: secret() };
  await rejectsCode(f.service.setVariantStock(request, {}), "permission-denied");
  await rejectsCode(f.service.setVariantStock(request, { auth: { uid: "owner", token: { email: "jeonwang80@gmail.com", email_verified: false } } }), "permission-denied");
  await rejectsCode(f.service.setVariantStock(request, { auth: { uid: "staff", token: { email: "staff@example.test", email_verified: true } } }), "permission-denied");
  f.db.data.set("settings/admin", { adminUids: ["staff"] });
  await f.service.setVariantStock(request, { auth: { uid: "staff", token: { email_verified: true, email: "staff@example.test" } } });
  assert.equal(f.inventory().stock, 2);
});

test("live order is blocked without App Check; policy text is a required release gate", async () => {
  const f = await fixture(2, { isEmulator: false });
  await rejectsCode(f.service.createBankTransferOrder(f.order(), guest), "failed-precondition");
  await f.service.createBankTransferOrder(f.order(), { ...guest, app: { appId: "test-app" } });
  f.db.data.set("settings/commerce", { ...settings, termsText: "" });
  await rejectsCode(f.service.createBankTransferOrder(f.order(), { ...guest, app: { appId: "test-app" } }), "failed-precondition");
  const testOrder = await f.service.createBankTransferOrder(f.order(), admin);
  assert.equal(testOrder.isTestOrder, true); assert.equal(testOrder.bank.accountNumber, "실제 입금 금지");
});

test("inventory adjustment retries are idempotent and cannot reuse a request for different stock", async () => {
  const f = await fixture(); const data = { productId: "shirt", colorName: "Black", optionName: "M", stock: 5, expectedVersion: 1, requestId: secret() };
  const first = await f.service.setVariantStock(data, admin); const second = await f.service.setVariantStock(data, admin);
  assert.deepEqual(first, second); assert.equal(f.inventory().version, 2);
  await rejectsCode(f.service.setVariantStock({ ...data, stock: 8 }, admin), "already-exists");
});

test("old orders cannot trigger unverified color stock migration or cancellation", async () => {
  const f = await fixture(); f.db.data.set("orders/legacy-order", { status: STATUS.WAITING, items: [{ productId: "shirt", optionName: "M", quantity: 1 }], depositDeadlineAt: new Date(0) });
  await rejectsCode(f.action("legacy-order", STATUS.WAITING, STATUS.CANCELLED), "failed-precondition");
  assert.equal((await f.service.expireOrder("legacy-order")).skipped, true); assert.equal(f.inventory().stock, 3);
});

test("closing an unknown attempt fences a delayed submission so retry cannot duplicate", async () => {
  const f = await fixture(); const request = f.order();
  const recovery = await f.service.getOrder({ idempotencyKey: request.idempotencyKey, guestAccessToken: request.guestAccessToken, abortIfMissing: true });
  assert.equal(recovery.attemptClosed, true);
  await rejectsCode(f.service.createBankTransferOrder(request, guest), "cancelled");
  const second = await f.service.createBankTransferOrder(f.order(), guest);
  assert.ok(second.id); assert.equal(f.db.count("orders"), 1); assert.equal(f.inventory().stock, 2);
  await rejectsCode(f.service.getOrder({ idempotencyKey: request.idempotencyKey, guestAccessToken: secret(), abortIfMissing: true }), "not-found");
});

test("a committed order wins recovery fence and its reservation is never cleared", async () => {
  const f = await fixture(); const request = f.order(); const created = await f.service.createBankTransferOrder(request, guest);
  const recovered = await f.service.getOrder({ idempotencyKey: request.idempotencyKey, guestAccessToken: request.guestAccessToken, abortIfMissing: true });
  assert.equal(recovered.id, created.id); assert.equal(recovered.attemptClosed, undefined); assert.equal(f.inventory().stock, 2);
});

test("damaged returns never become available stock when refund completes", async () => {
  const f = await fixture(1); const created = await f.service.createBankTransferOrder(f.order(), guest);
  await f.action(created.id, STATUS.WAITING, STATUS.PAID); await f.action(created.id, STATUS.PAID, STATUS.PREPARING);
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.PREPARING, action: "shipment", payload: { courier: "TEST", trackingNumber: "TEST1234" } }, admin);
  await f.action(created.id, STATUS.PREPARING, STATUS.SHIPPED); await f.action(created.id, STATUS.SHIPPED, STATUS.RETURN_REQUESTED);
  await f.action(created.id, STATUS.RETURN_REQUESTED, STATUS.RETURN_RECEIVED, { restock: false, note: "TEST ONLY damaged" });
  await f.service.updateOrder({ orderId: created.id, expectedStatus: STATUS.RETURN_RECEIVED, action: "refund", payload: { amount: 42000, reference: "TEST ONLY BANK" } }, admin);
  assert.equal(f.inventory().stock, 0); assert.equal(f.inventory().sold, 0); assert.equal(f.db.read(`orders/${created.id}`).inventoryState, "disposed");
});

test("expiry is bounded to 100 orders and repeated batches finish without blocking on legacy", async () => {
  const f = await fixture(101);
  for (let index = 0; index < 101; index += 1) await f.service.createBankTransferOrder(f.order(), { rawRequest: { ip: `TEST-IP-${index}` } });
  f.db.data.set("orders/legacy-expired", { status: STATUS.WAITING, depositDeadlineAt: new Date(0) });
  f.advance(49 * 3600000);
  const first = await f.service.expireBankTransferOrders(); const second = await f.service.expireBankTransferOrders();
  assert.equal(first.examined, 100); assert.equal(first.expired, 100); assert.equal(second.expired, 1);
  assert.equal(f.inventory().stock, 101); assert.equal(f.inventory().reserved, 0);
});

test("production lookup requires App Check even with a correct guest token or member session", async () => {
  const f = await fixture(2, { isEmulator: false }); const request = f.order();
  const owner = { ...guest, app: { appId: "test-app" }, auth: { uid: "test-buyer", token: { email: "buyer@example.test" } } };
  const created = await f.service.createBankTransferOrder(request, owner);
  await rejectsCode(f.service.getOrder({ orderId: created.id, guestAccessToken: request.guestAccessToken }, guest), "failed-precondition");
  await rejectsCode(f.service.getOrder({ orderId: created.id }, { auth: owner.auth, ...guest }), "failed-precondition");
  assert.equal((await f.service.getOrder({ orderId: created.id }, owner)).id, created.id);
  assert.equal((await f.service.getOrder({ orderId: created.id, guestAccessToken: request.guestAccessToken }, { ...guest, app: { appId: "test-app" } })).id, created.id);
});

test("lookup failures consume the IP budget and capped requests cannot write extra tombstones", async () => {
  const f = await fixture();
  for (let index = 0; index < 119; index += 1) {
    await rejectsCode(f.service.getOrder({ orderId: "missing-order" }, { ...guest, auth: { uid: `rotating-user-${index}`, token: {} } }), "not-found");
  }
  const attempt = { idempotencyKey: secret(), guestAccessToken: secret(), abortIfMissing: true };
  assert.equal((await f.service.getOrder(attempt, guest)).attemptClosed, true);
  assert.equal(f.db.count("orderRequests"), 1);
  await rejectsCode(f.service.getOrder({ ...attempt, idempotencyKey: secret() }, guest), "resource-exhausted");
  assert.equal(f.db.count("orderRequests"), 1);
  f.advance(3600001);
  assert.equal((await f.service.getOrder({ ...attempt, idempotencyKey: secret() }, guest)).attemptClosed, true);
});

test("lookup UID budget survives IP changes and wrong recovery secrets", async () => {
  const f = await fixture(); const request = f.order(); const created = await f.service.createBankTransferOrder(request, guest);
  for (let index = 0; index < 120; index += 1) {
    await rejectsCode(f.service.getOrder({ orderId: created.id, guestAccessToken: secret() }, { rawRequest: { ip: `ROTATING-IP-${index}` }, auth: { uid: "same-user", token: {} } }), "not-found");
  }
  await rejectsCode(f.service.getOrder({ orderId: created.id, guestAccessToken: request.guestAccessToken }, { rawRequest: { ip: "NEW-IP" }, auth: { uid: "same-user", token: {} } }), "resource-exhausted");
});

test("failed order validation consumes create limits instead of rolling counters back", async () => {
  const f = await fixture();
  for (let index = 0; index < 10; index += 1) await rejectsCode(f.service.createBankTransferOrder(f.order({ expectedTotal: 1 }), guest), "aborted");
  await rejectsCode(f.service.createBankTransferOrder(f.order(), guest), "resource-exhausted");
  assert.equal(f.db.count("orders"), 0); assert.equal(f.inventory().stock, 3);
  f.advance(3600001);
  await f.service.createBankTransferOrder(f.order(), guest);
  assert.equal(f.db.count("orders"), 1);
});

test("create UID limit prevents rotating IPs from bypassing failed-attempt cap", async () => {
  const f = await fixture();
  for (let index = 0; index < 10; index += 1) await rejectsCode(f.service.createBankTransferOrder(f.order({ expectedTotal: 1 }), { rawRequest: { ip: `CREATE-IP-${index}` }, auth: { uid: "buyer", token: {} } }), "aborted");
  await rejectsCode(f.service.createBankTransferOrder(f.order(), { rawRequest: { ip: "CREATE-NEW-IP" }, auth: { uid: "buyer", token: {} } }), "resource-exhausted");
  assert.equal(f.db.count("orders"), 0);
});
