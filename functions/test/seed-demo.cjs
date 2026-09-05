/*
 * Synthetic local UI fixtures only. This script never discovers credentials or
 * uses the configured Firebase project. Run only after starting both emulators.
 */
"use strict";

const PROJECT_ID = "demo-likedzy";
const FIXTURE = "likedzy-local-commerce-v1";
const LOCAL_PASSWORD = "LocalTest-only-2026";
const ACCOUNTS = [
  { uid: "demo-likedzy-admin", email: "admin@example.test", displayName: "TEST ONLY 관리자", admin: true },
  { uid: "demo-likedzy-customer", email: "customer@example.test", displayName: "TEST ONLY 고객", admin: false },
];

function requireLoopbackEmulators(environment = process.env) {
  const loopback = /^(localhost|127\.0\.0\.1):([1-9]\d{0,4})$/;
  for (const name of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]) {
    const match = loopback.exec(environment[name] || "");
    if (!match || Number(match[2]) > 65535) throw new Error(`${name} must point to localhost or 127.0.0.1 with a valid port. No Firebase connection was opened.`);
  }
}

async function main() {
  requireLoopbackEmulators();
  process.env.METADATA_SERVER_DETECTION = 'none';
  // These modules are intentionally loaded only after the loopback-only guard.
  const { initializeApp, deleteApp } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  const { Firestore, FieldValue, Timestamp } = require("@google-cloud/firestore");
  const { createCommerceService, variantIdFor } = require("../commerce");
  const app = initializeApp({
    projectId: PROJECT_ID,
    credential: { getAccessToken: async () => ({ access_token: "owner", expires_in: 3600 }) },
  }, `${FIXTURE}-seed`);
  const db = new Firestore({ projectId: PROJECT_ID, host: process.env.FIRESTORE_EMULATOR_HOST, ssl: false });
  const auth = getAuth(app);
  const summary = { projectId: PROJECT_ID, accounts: [], products: [], initializedVariants: 0, preservedVariants: 0 };
  try {
    for (const account of ACCOUNTS) {
      let existing;
      try { existing = await auth.getUser(account.uid); }
      catch (error) { if (error.code !== "auth/user-not-found") throw error; }
      if (existing && existing.email !== account.email) throw new Error(`Reserved demo UID ${account.uid} belongs to another synthetic account; it was not modified.`);
      const properties = { email: account.email, password: LOCAL_PASSWORD, emailVerified: true, displayName: account.displayName, disabled: false };
      if (existing) await auth.updateUser(account.uid, properties);
      else await auth.createUser({ uid: account.uid, ...properties });
      await auth.setCustomUserClaims(account.uid, account.admin ? { admin: true } : {});
      summary.accounts.push({ uid: account.uid, email: account.email, admin: account.admin });
    }

    async function saveFixture(collection, id, data) {
      const reference = db.collection(collection).doc(id);
      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(reference);
        if (existing.exists && existing.data()._fixture !== FIXTURE) throw new Error(`${collection}/${id} is not owned by this demo seed; it was not modified.`);
        transaction.set(reference, {
          ...data, _fixture: FIXTURE,
          createdAt: existing.exists ? existing.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    }

    await saveFixture("settings", "commerce", {
      orderEnabled: true, purchaseSafetyConfirmed: true, businessInfoConfirmed: true, policyConfirmed: true,
      businessName: "TEST ONLY LIKEDZY", representativeName: "TEST ONLY 대표", businessNumber: "TEST-ONLY-NOT-A-BUSINESS",
      ecommerceNumber: "TEST ONLY", customerServicePhone: "010-0000-0000", customerServiceEmail: "support@example.test",
      businessAddress: "TEST ONLY 테스트 주소 — 실제 사업장 아님", bankName: "TEST ONLY 은행", accountNumber: "TEST ONLY 실제 입금 금지",
      accountHolder: "TEST ONLY LIKEDZY", shippingFee: 3000, freeShippingThreshold: 50000, depositDeadlineHours: 48,
      defaultCarrier: "CJ대한통운", remoteAreaNotice: "TEST ONLY 배송비 계산 테스트입니다. 실제 배송은 진행되지 않습니다.",
      returnAddress: "TEST ONLY 반품 테스트 주소", termsText: "TEST ONLY. 로컬 기능 검증용 약관 예시이며 실제 판매 약관이 아닙니다.",
      privacyText: "TEST ONLY. 이름·전화·주소는 합성 테스트 값만 입력하세요. 실제 개인정보를 입력하지 마세요.",
      returnsText: "TEST ONLY. 반품·환불 상태 전이를 확인하는 로컬 테스트 정책입니다. 실제 송금·배송을 하지 않습니다.",
    });
    await saveFixture("settings", "main", { splashEnabled: false, splashImageUrl: "" });
    // settings/catalog is deliberately not created, changed, or deleted. The
    // storefront exercises its compatibility defaults when the document is absent.

    const context = { auth: { uid: ACCOUNTS[0].uid, token: { email: ACCOUNTS[0].email, email_verified: true, admin: true } } };
    const commerce = createCommerceService({ db, timestamp: (date) => Timestamp.fromDate(date), serverTimestamp: () => FieldValue.serverTimestamp(), isEmulator: true });
    const definitions = [
      { id: "demo-shirt-001", name: "TEST ONLY 모션 반팔", price: 39000 },
      { id: "demo-shirt-002", name: "TEST ONLY 브이넥 반팔", price: 29000 },
      { id: "demo-shirt-003", name: "TEST ONLY 폴로 반팔", price: 49000 },
    ];
    for (const [index, definition] of definitions.entries()) {
      const language = {
        name: definition.name, category: "MAN-TOP-SS", description: "<p>TEST ONLY — 로컬 주문 테스트용 합성 상품입니다.</p>",
        fabric: "TEST ONLY 소재", sizeGuide: "TEST ONLY S / M", perk1: "TEST ONLY 5만원 이상 무료배송", perk2: "TEST ONLY 실제 판매되지 않는 상품",
      };
      const colors = [
        { name: "Black", colorHex: "#111111", imageUrl: "/likedzy-logo.png", hoverImageUrl: "/likedzy-logo.png", imageUrls: ["/likedzy-logo.png"] },
        { name: "Navy", colorHex: "#102039", imageUrl: "/likedzy-logo.png", hoverImageUrl: "/likedzy-logo.png", imageUrls: ["/likedzy-logo.png"] },
      ];
      await saveFixture("products", definition.id, {
        ...language, ko: language, en: language, vi: language, prices: { KRW: definition.price, USD: 30, VND: 700000 },
        price: `₩${definition.price.toLocaleString("ko-KR")}`, orderIndex: index, isActive: true, isPublished: true,
        isFeatured: index === 0, isNew: index !== 0, isBestSeller: index === 2, categoryCode: "MAN-TOP-SS",
        colorSwatches: colors, sizeOptions: [{ name: "S" }, { name: "M" }], imageUrls: ["/likedzy-logo.png"],
        imageUrl: "/likedzy-logo.png", imageVariants: [{ imageUrl: "/likedzy-logo.png", thumbnailUrl: "/likedzy-logo.png" }],
      });
      for (const color of colors) for (const optionName of ["S", "M"]) {
        const variantId = variantIdFor(definition.id, color.name, optionName);
        const current = await db.collection("inventory").doc(variantId).get();
        // A rerun must not change stock associated with prior synthetic orders.
        if (current.exists) { summary.preservedVariants += 1; continue; }
        await commerce.setVariantStock({
          productId: definition.id, colorName: color.name, optionName, stock: 10, expectedVersion: 0,
          requestId: `demo-seed-${variantId}`,
        }, context);
        summary.initializedVariants += 1;
      }
      summary.products.push({ id: definition.id, name: definition.name });
    }
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write("Synthetic fixtures only. Local password: LocalTest-only-2026. No production service was contacted.\n");
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`Demo seed stopped: ${error.message}\n`);
  process.exitCode = 1;
});

module.exports = { requireLoopbackEmulators };
