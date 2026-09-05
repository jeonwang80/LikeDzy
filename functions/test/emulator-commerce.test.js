const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { createCommerceService, STATUS } = require("../commerce");

// This file cannot connect to production, even if a developer has ADC configured.
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "";
const emulatorAvailable = /^(127\.0\.0\.1|localhost):\d+$/.test(emulatorHost);
test("Firestore emulator: concurrent stock, lost response, expiry and recovery fences", { skip: !emulatorAvailable }, async (t) => {
  process.env.METADATA_SERVER_DETECTION = 'none';
  const { Firestore, Timestamp, FieldValue } = require("@google-cloud/firestore");
  // ssl:false uses the SDK's emulator owner header, without credential discovery.
  const db = new Firestore({ projectId: "demo-likedzy-commerce", host: emulatorHost, ssl: false });
  let current = Date.now();
  const service = createCommerceService({ db, now: () => current, timestamp: (date) => Timestamp.fromDate(date), serverTimestamp: () => FieldValue.serverTimestamp(), isEmulator: true });
  const admin = { auth: { uid: `test-only-admin-${randomBytes(8).toString('hex')}`, token: { email_verified: true, admin: true, email: "admin@example.test" } } };
  const secret = () => randomBytes(32).toString("base64url");
  const productId = `test-only-${randomBytes(8).toString("hex")}`;
  admin.rawRequest = { ip: productId };
  await db.collection("products").doc(productId).set({ name: "TEST ONLY", prices: { KRW: 39000 }, colorSwatches: [{ name: "Black" }], sizeOptions: [{ name: "M" }] });
  const variant = await service.setVariantStock({ productId, colorName: "Black", optionName: "M", stock: 2, expectedVersion: 0, requestId: secret() }, admin);
  const makeOrder = () => ({
    idempotencyKey: secret(), guestAccessToken: secret(), expectedTotal: 42000,
    cart: [{ productId, colorName: "Black", optionName: "M", variantId: variant.variantId, quantity: 1 }],
    customer: { buyerName: "TEST ONLY", buyerPhone: "01000000000", recipientName: "TEST ONLY", recipientPhone: "01000000000", postcode: "00000", address1: "TEST ONLY", agreements: { orderConfirmed: true, privacyAgreed: true }, cashReceipt: { type: "none" } },
  });
  try {
    const request = makeOrder();
    const concurrent = await Promise.all(Array.from({ length: 4 }, () => service.createBankTransferOrder(request, admin)));
    assert.equal(new Set(concurrent.map((value) => value.id)).size, 1);
    let inventory = (await db.collection("inventory").doc(variant.variantId).get()).data();
    assert.equal(inventory.stock, 1); assert.equal(inventory.reserved, 1);
    const recovered = await service.getOrder({ idempotencyKey: request.idempotencyKey, guestAccessToken: request.guestAccessToken, abortIfMissing: true });
    assert.equal(recovered.id, concurrent[0].id);
    const buyers = await Promise.allSettled([service.createBankTransferOrder(makeOrder(), admin), service.createBankTransferOrder(makeOrder(), admin)]);
    assert.equal(buyers.filter((result) => result.status === "fulfilled").length, 1);
    await service.updateOrder({ orderId: concurrent[0].id, action: "status", expectedStatus: STATUS.WAITING, payload: { status: STATUS.PAID } }, admin);
    current += 49 * 3600000;
    for (const result of buyers) if (result.status === "fulfilled") await service.expireOrder(result.value.id);
    assert.equal((await service.expireOrder(concurrent[0].id)).skipped, true);
    inventory = (await db.collection("inventory").doc(variant.variantId).get()).data();
    assert.equal(inventory.stock, 1); assert.equal(inventory.sold, 1); assert.equal(inventory.reserved, 0);
    const abandoned = makeOrder();
    assert.equal((await service.getOrder({ idempotencyKey: abandoned.idempotencyKey, guestAccessToken: abandoned.guestAccessToken, abortIfMissing: true })).attemptClosed, true);
    await assert.rejects(service.createBankTransferOrder(abandoned, admin), (error) => error.code === "cancelled");
    t.diagnostic("Only demo-likedzy-commerce on a loopback Firestore emulator was used. Synthetic TEST ONLY records are left in this ephemeral demo namespace.");
  } finally {
    await db.terminate();
  }
});
