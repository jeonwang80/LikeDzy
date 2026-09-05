const crypto = require("node:crypto");

class CommerceError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new CommerceError(code, message); };
const text = (value, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const variantIdFor = (productId, colorName, optionName) => hash(JSON.stringify([productId, colorName, optionName]));
const milliseconds = (value) => value?.toMillis?.() ?? (value instanceof Date ? value.getTime() : new Date(value).getTime());
const iso = (value) => { const date = milliseconds(value); return Number.isFinite(date) ? new Date(date).toISOString() : null; };
const integer = (value, name, min = 0, max = 1000000) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail("invalid-argument", `${name} 값을 확인해 주세요.`);
  return value;
};
const identifier = (value, name) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) fail("invalid-argument", `${name} 값을 확인해 주세요.`);
  return value;
};
const secret = (value, name) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(value)) fail("invalid-argument", `${name} 정보를 새로 생성해 주세요.`);
  return value;
};
const sameSecret = (storedHash, value) => {
  if (typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash) || typeof value !== "string") return false;
  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(hash(value), "hex"));
};
const OWNER_EMAIL = "jeonwang80@gmail.com";
const TEST_SETTINGS = {
  shippingFee: 3000, freeShippingThreshold: 50000, depositDeadlineHours: 48,
  defaultCarrier: "CJ대한통운", bankName: "테스트 전용", accountNumber: "실제 입금 금지", accountHolder: "LIKEDZY TEST",
};
const STATUS = {
  WAITING: "입금 대기", PAID: "입금 확인", PREPARING: "상품 준비중", SHIPPED: "발송 완료",
  DELIVERED: "배송완료", CANCELLED: "주문 취소", REFUND_REQUESTED: "환불요청",
  RETURN_REQUESTED: "반품요청", RETURN_RECEIVED: "반품입고", REFUNDED: "환불완료",
};
const TRANSITIONS = {
  [STATUS.WAITING]: [STATUS.PAID, STATUS.CANCELLED],
  [STATUS.PAID]: [STATUS.PREPARING, STATUS.REFUND_REQUESTED],
  [STATUS.PREPARING]: [STATUS.SHIPPED, STATUS.REFUND_REQUESTED],
  [STATUS.SHIPPED]: [STATUS.DELIVERED, STATUS.RETURN_REQUESTED],
  [STATUS.DELIVERED]: [STATUS.RETURN_REQUESTED],
  [STATUS.RETURN_REQUESTED]: [STATUS.RETURN_RECEIVED],
};

function normalizeCustomer(customer = {}) {
  if (customer.agreements?.orderConfirmed !== true || customer.agreements?.privacyAgreed !== true) fail("failed-precondition", "필수 주문 확인이 완료되지 않았습니다.");
  const result = {};
  for (const field of ["buyerName", "buyerPhone", "recipientName", "recipientPhone", "postcode", "address1"]) {
    result[field] = text(customer[field], field.includes("Phone") ? 30 : 200);
    if (!result[field]) fail("invalid-argument", "주문자와 배송지 필수 정보를 입력해 주세요.");
  }
  for (const field of ["buyerPhone", "recipientPhone"]) {
    if (!/^\+?[\d ()-]{8,30}$/.test(result[field]) || result[field].replace(/\D/g, "").length < 8) fail("invalid-argument", "연락처를 확인해 주세요.");
  }
  if (!/^\d{5}$/.test(result.postcode)) fail("invalid-argument", "우편번호 5자리를 확인해 주세요.");
  result.address2 = text(customer.address2);
  result.depositorName = text(customer.depositorName, 80) || result.buyerName;
  result.notes = text(customer.notes, 300);
  const type = customer.cashReceipt?.type || "none";
  if (!["none", "personal", "business"].includes(type)) fail("invalid-argument", "현금영수증 종류를 확인해 주세요.");
  const identity = type === "none" ? "" : text(customer.cashReceipt?.identity, 40).replace(/\D/g, "");
  if ((type === "personal" && !/^\d{10,11}$/.test(identity)) || (type === "business" && !/^\d{10}$/.test(identity))) fail("invalid-argument", "현금영수증 발급번호를 확인해 주세요.");
  result.cashReceipt = { type, identity };
  return result;
}

function normalizeCart(cart) {
  if (!Array.isArray(cart) || cart.length < 1 || cart.length > 20) fail("invalid-argument", "주문 상품은 1~20개 항목까지 가능합니다.");
  const grouped = new Map();
  for (const item of cart) {
    const productId = identifier(item.productId, "상품");
    const colorName = text(item.colorName, 80) || "기본";
    const optionName = text(item.optionName, 80) || "기본";
    const variantId = identifier(item.variantId, "색상·사이즈 재고");
    if (variantId !== variantIdFor(productId, colorName, optionName)) fail("invalid-argument", "색상·사이즈 정보를 다시 선택해 주세요.");
    const quantity = integer(item.quantity, "수량", 1, 20);
    const current = grouped.get(variantId) || { variantId, productId, colorName, optionName, quantity: 0 };
    current.quantity = integer(current.quantity + quantity, "옵션별 수량", 1, 20);
    grouped.set(variantId, current);
  }
  return [...grouped.values()].sort((a, b) => a.variantId.localeCompare(b.variantId));
}

function assertVariant(product, item) {
  const colors = product.colorSwatches?.length ? product.colorSwatches : (product.colors || []);
  const colorNames = colors.length ? colors.map((color) => text(color.name, 80)) : [text(product.colorName, 80) || "기본"];
  const sizes = product.sizeOptions || product.options || [];
  const optionNames = sizes.length ? sizes.map((option) => text(option.name, 80)) : ["기본"];
  if (colorNames.length * optionNames.length > 200) fail("failed-precondition", "한 상품의 색상·사이즈 조합은 200개까지 관리할 수 있습니다.");
  if (!colorNames.includes(item.colorName) || !optionNames.includes(item.optionName)) fail("failed-precondition", "현재 판매 중인 색상·사이즈가 아닙니다. 상품을 다시 선택해 주세요.");
  if (product.isActive === false || product.isPublished === false) fail("failed-precondition", "판매가 중지된 상품입니다.");
}

function liveReady(settings) {
  return settings.orderEnabled === true && settings.purchaseSafetyConfirmed === true && settings.businessInfoConfirmed === true && settings.policyConfirmed === true
    && ["businessName", "representativeName", "businessNumber", "customerServicePhone", "customerServiceEmail", "businessAddress", "bankName", "accountNumber", "accountHolder", "termsText", "privacyText", "returnsText"].every((field) => Boolean(text(settings[field])));
}

function createCommerceService({ db, now = () => Date.now(), timestamp = (date) => date, serverTimestamp = () => new Date(), isEmulator = false }) {
  const ref = (collection, id) => db.collection(collection).doc(id);
  async function isAdmin(context) {
    const auth = context?.auth;
    if (!auth?.uid || auth.token?.email_verified !== true) return false;
    if (auth.token.admin === true || text(auth.token.email).toLowerCase() === OWNER_EMAIL) return true;
    const settings = await ref("settings", "admin").get();
    return settings.exists && Array.isArray(settings.data().adminUids) && settings.data().adminUids.includes(auth.uid);
  }
  async function requireAdmin(context) {
    if (!await isAdmin(context)) fail("permission-denied", "관리자 권한이 필요합니다.");
  }
  async function consumeAttempt(operation, context, limit) {
    const currentTime = now();
    const actors = [{ kind: "ip", value: text(context?.rawRequest?.ip, 120) || "unknown" }];
    if (context?.auth?.uid) actors.push({ kind: "uid", value: context.auth.uid });
    const allowed = await db.runTransaction(async (transaction) => {
      const records = [];
      for (const actor of actors) {
        const reference = ref("orderRateLimits", hash(`${operation}:${actor.kind}:${actor.value}`));
        const snapshot = await transaction.get(reference);
        const previous = snapshot.exists ? snapshot.data() : {};
        const sameWindow = currentTime - (milliseconds(previous.windowStartedAt) || 0) < 3600000;
        records.push({ reference, actorKind: actor.kind, count: sameWindow ? Number(previous.count) || 0 : 0, startedAt: sameWindow ? previous.windowStartedAt : timestamp(new Date(currentTime)) });
      }
      // Once capped, do not keep writing counters on every rejected request.
      if (records.some((record) => record.count >= limit)) return false;
      for (const record of records) transaction.set(record.reference, {
        operation, actorKind: record.actorKind, count: record.count + 1, windowStartedAt: record.startedAt,
        updatedAt: serverTimestamp(), expiresAt: timestamp(new Date(currentTime + 7 * 86400000)),
      });
      return true;
    });
    if (!allowed) fail("resource-exhausted", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  }
  function publishStock(transaction, inventoryRef, inventory, movement) {
    const next = { ...inventory, version: inventory.version + 1, updatedAt: serverTimestamp() };
    for (const field of ["stock", "reserved", "sold"]) integer(next[field], `재고 ${field}`);
    transaction.set(inventoryRef, next);
    transaction.set(ref("stockAvailability", inventoryRef.id), {
      productId: next.productId, colorName: next.colorName, optionName: next.optionName,
      available: next.stock, updatedAt: serverTimestamp(),
    });
    transaction.set(db.collection("inventoryMovements").doc(), {
      variantId: inventoryRef.id, productId: next.productId, ...movement,
      stockAfter: next.stock, reservedAfter: next.reserved, soldAfter: next.sold,
      version: next.version, createdAt: serverTimestamp(),
    });
    return next;
  }

  async function setVariantStock(data, context) {
    await requireAdmin(context);
    const productId = identifier(data?.productId, "상품");
    const colorName = text(data.colorName, 80) || "기본";
    const optionName = text(data.optionName, 80) || "기본";
    const stock = integer(data.stock, "판매가능 재고");
    const expectedVersion = integer(data.expectedVersion, "재고 버전");
    const requestId = identifier(data.requestId, "저장 요청");
    if (requestId.length < 16) fail("invalid-argument", "저장 요청 정보를 다시 생성해 주세요.");
    const variantId = variantIdFor(productId, colorName, optionName);
    const requestHash = hash(JSON.stringify({ productId, colorName, optionName, stock, expectedVersion, uid: context.auth.uid }));
    const requestRef = ref("inventoryRequests", hash(`${context.auth.uid}:${requestId}`));
    return db.runTransaction(async (transaction) => {
      const previous = await transaction.get(requestRef);
      if (previous.exists) {
        if (previous.data().requestHash !== requestHash) fail("already-exists", "같은 저장 요청에 다른 내용이 전달되었습니다.");
        return previous.data().result;
      }
      const product = await transaction.get(ref("products", productId));
      if (!product.exists) fail("not-found", "상품을 찾을 수 없습니다.");
      assertVariant(product.data(), { colorName, optionName });
      const inventoryRef = ref("inventory", variantId);
      const snapshot = await transaction.get(inventoryRef);
      const current = snapshot.exists ? snapshot.data() : { productId, colorName, optionName, stock: 0, reserved: 0, sold: 0, version: 0 };
      if (current.version !== expectedVersion) fail("aborted", "주문 또는 다른 관리자가 재고를 변경했습니다. 최신 재고를 확인한 뒤 다시 저장해 주세요.");
      const next = publishStock(transaction, inventoryRef, { ...current, stock }, {
        type: "adjustment", stockDelta: stock - current.stock, reservedDelta: 0, soldDelta: 0, actorUid: context.auth.uid,
      });
      const result = { variantId, stock: next.stock, available: next.stock, reserved: next.reserved, sold: next.sold, version: next.version };
      transaction.set(requestRef, { requestHash, result, createdAt: serverTimestamp() });
      return result;
    });
  }

  function creationResult(orderId, order) {
    return {
      id: orderId, orderNumber: order.orderNumber, totalAmountNumber: order.totalAmountNumber,
      shippingFee: order.shippingFee, isTestOrder: order.isTestOrder, deadline: iso(order.depositDeadlineAt), bank: order.bankSnapshot,
    };
  }

  async function createBankTransferOrder(data, context = {}) {
    const adminUser = await isAdmin(context);
    if (!isEmulator && !adminUser && !context.app?.appId) fail("failed-precondition", "안전한 주문 연결을 확인할 수 없습니다. 페이지를 새로고침해 주세요.");
    // This separate transaction commits even if later validation/order creation fails.
    await consumeAttempt("create", context, 10);
    const idempotencyKey = secret(data?.idempotencyKey, "주문 요청");
    const accessToken = secret(data.guestAccessToken, "주문 조회");
    const cart = normalizeCart(data.cart);
    const customer = normalizeCustomer(data.customer);
    const expectedTotal = integer(data.expectedTotal, "주문 금액", 1, 1000000000);
    const actorUid = context.auth?.uid || null;
    const fingerprint = hash(JSON.stringify({ cart, customer, expectedTotal, actorUid, tokenHash: hash(accessToken) }));
    const requestId = hash(idempotencyKey);
    const requestRef = ref("orderRequests", requestId);
    const orderRef = ref("orders", requestId);
    const currentTime = now();
    return db.runTransaction(async (transaction) => {
      const existing = await transaction.get(requestRef);
      if (existing.exists) {
        if (existing.data().cancelled === true) fail("cancelled", "이미 종료된 주문 시도입니다. 새 주문을 시작해 주세요.");
        if (existing.data().fingerprint !== fingerprint) fail("already-exists", "이미 사용한 주문 요청입니다. 기존 주문을 확인하거나 새 주문을 시작해 주세요.");
        const saved = await transaction.get(orderRef);
        if (!saved.exists) fail("failed-precondition", "기존 주문 확인이 필요합니다. 고객센터에 문의해 주세요.");
        return creationResult(orderRef.id, saved.data());
      }
      const settingsSnapshot = await transaction.get(ref("settings", "commerce"));
      const savedSettings = settingsSnapshot.exists ? settingsSnapshot.data() : {};
      const ready = liveReady(savedSettings);
      const isTestOrder = !ready && adminUser;
      if (!ready && !isTestOrder) fail("failed-precondition", "현재 주문 접수를 준비 중입니다.");
      if (!isEmulator && !isTestOrder && !context.app?.appId) fail("failed-precondition", "안전한 주문 연결을 확인할 수 없습니다. 페이지를 새로고침해 주세요.");
      const settings = isTestOrder ? TEST_SETTINGS : savedSettings;
      const products = new Map();
      for (const productId of [...new Set(cart.map((item) => item.productId))]) {
        const snapshot = await transaction.get(ref("products", productId));
        if (!snapshot.exists) fail("not-found", "판매가 종료된 상품이 포함되어 있습니다.");
        products.set(productId, snapshot.data());
      }
      const inventory = new Map();
      for (const item of cart) {
        assertVariant(products.get(item.productId), item);
        const snapshot = await transaction.get(ref("inventory", item.variantId));
        if (!snapshot.exists) fail("failed-precondition", "선택한 색상·사이즈의 재고가 아직 등록되지 않았습니다.");
        const value = snapshot.data();
        if (value.productId !== item.productId || value.colorName !== item.colorName || value.optionName !== item.optionName) fail("failed-precondition", "상품 재고 정보가 일치하지 않습니다.");
        if (!Number.isSafeInteger(value.stock) || value.stock < item.quantity) fail("failed-precondition", `${products.get(item.productId).name || "상품"} ${item.colorName}/${item.optionName} 재고가 부족합니다.`);
        inventory.set(item.variantId, value);
      }
      const orderItems = cart.map((item) => {
        const product = products.get(item.productId);
        const unitPrice = integer(Number(product.prices?.KRW ?? product.priceKRW), "상품 판매가", 1, 100000000);
        return { ...item, productName: text(product.name), unitPrice, lineAmount: unitPrice * item.quantity };
      });
      const subtotal = orderItems.reduce((total, item) => total + item.lineAmount, 0);
      const fee = integer(Number(settings.shippingFee ?? 3000), "배송비");
      const threshold = integer(Number(settings.freeShippingThreshold ?? 50000), "무료배송 기준", 0, 1000000000);
      const shippingFee = threshold > 0 && subtotal >= threshold ? 0 : fee;
      const totalAmountNumber = subtotal + shippingFee;
      if (expectedTotal !== totalAmountNumber) fail("aborted", "상품 가격 또는 배송비가 변경되었습니다. 장바구니를 갱신한 뒤 다시 주문해 주세요.");
      const hours = integer(Number(settings.depositDeadlineHours ?? 48), "입금 기한", 1, 720);
      const orderNumber = `LD${new Date(currentTime).toISOString().slice(0, 10).replace(/-/g, "")}-${orderRef.id.slice(0, 12).toUpperCase()}`;
      const order = {
        schemaVersion: 2, orderNumber, userId: actorUid, items: orderItems, subtotal, shippingFee, totalAmountNumber,
        totalAmount: `₩${totalAmountNumber.toLocaleString("ko-KR")}`, paymentMethod: "bank_transfer", isTestOrder,
        status: STATUS.WAITING, inventoryState: "reserved", name: customer.buyerName, phone: customer.buyerPhone,
        depositName: customer.depositorName, recipientName: customer.recipientName, recipientPhone: customer.recipientPhone,
        postcode: customer.postcode, address1: customer.address1, address2: customer.address2,
        address: `[${customer.postcode}] ${customer.address1} ${customer.address2}`.trim(), notes: customer.notes,
        cashReceipt: customer.cashReceipt, cashReceiptStatus: customer.cashReceipt.type === "none" ? "미신청" : "발급 대기",
        agreements: { orderConfirmed: true, privacyAgreed: true, agreedAt: serverTimestamp() },
        bankSnapshot: { bankName: text(settings.bankName, 60), accountNumber: text(settings.accountNumber, 80), accountHolder: text(settings.accountHolder, 80) },
        depositDeadlineAt: timestamp(new Date(currentTime + hours * 3600000)), defaultCarrier: text(settings.defaultCarrier, 60),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      for (const item of cart) {
        const current = inventory.get(item.variantId);
        publishStock(transaction, ref("inventory", item.variantId), { ...current, stock: current.stock - item.quantity, reserved: current.reserved + item.quantity }, {
          type: "reserve", orderId: orderRef.id, orderNumber, stockDelta: -item.quantity, reservedDelta: item.quantity, soldDelta: 0,
        });
      }
      transaction.create(orderRef, order);
      transaction.create(ref("orderAccess", orderRef.id), { tokenHash: hash(accessToken), createdAt: serverTimestamp() });
      transaction.create(requestRef, { orderId: orderRef.id, fingerprint, createdAt: serverTimestamp() });
      transaction.create(db.collection("orderEvents").doc(), { orderId: orderRef.id, userId: actorUid, type: "created", toStatus: STATUS.WAITING, createdAt: serverTimestamp() });
      return creationResult(orderRef.id, order);
    });
  }

  async function getOrder(data, context = {}) {
    if (!isEmulator && !context.app?.appId) fail("failed-precondition", "안전한 주문 조회 연결을 확인할 수 없습니다. 페이지를 새로고침해 주세요.");
    await consumeAttempt("lookup", context, 120);
    let orderId;
    if (data?.orderId) orderId = identifier(data.orderId, "주문번호");
    else {
      const key = secret(data?.idempotencyKey, "주문 요청");
      const token = secret(data.guestAccessToken, "주문 조회");
      const requestRef = ref("orderRequests", hash(key));
      const recovery = await db.runTransaction(async (transaction) => {
        const request = await transaction.get(requestRef);
        if (!request.exists) {
          if (data.abortIfMissing !== true) fail("not-found", "주문을 확인할 수 없습니다.");
          // Fences a slow in-flight submission before the client starts a new attempt.
          transaction.create(requestRef, { cancelled: true, tokenHash: hash(token), createdAt: serverTimestamp() });
          return { attemptClosed: true };
        }
        if (request.data().cancelled === true) {
          if (!sameSecret(request.data().tokenHash, token)) fail("not-found", "주문을 확인할 수 없습니다.");
          return { attemptClosed: true };
        }
        return { orderId: request.data().orderId };
      });
      if (recovery.attemptClosed) return recovery;
      orderId = recovery.orderId;
    }
    const snapshot = await ref("orders", orderId).get();
    if (!snapshot.exists) fail("not-found", "주문을 확인할 수 없습니다.");
    const order = snapshot.data();
    let allowed = Boolean(context.auth?.uid && context.auth.uid === order.userId);
    if (!allowed) allowed = await isAdmin(context);
    if (!allowed) {
      const access = await ref("orderAccess", orderId).get();
      allowed = access.exists && sameSecret(access.data().tokenHash, data.guestAccessToken);
    }
    if (!allowed) fail("not-found", "주문을 확인할 수 없습니다.");
    return {
      ...creationResult(orderId, order), items: order.items || [], subtotal: order.subtotal || 0,
      status: order.status, inventoryState: order.inventoryState, createdAt: iso(order.createdAt),
      courier: order.courier || "", trackingNumber: order.trackingNumber || "",
      recipientName: text(order.recipientName || order.name).replace(/.(?=.)/gu, "*"),
      phone: `***${text(order.recipientPhone || order.phone).replace(/\D/g, "").slice(-4)}`,
    };
  }

  async function mutateOrder(orderId, { action, payload = {}, expectedStatus, actorUid, expiry = false }) {
    const orderRef = ref("orders", orderId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) { if (expiry) return { skipped: true }; fail("not-found", "주문을 찾을 수 없습니다."); }
      const order = snapshot.data();
      if (order.schemaVersion !== 2) { if (expiry) return { skipped: true }; fail("failed-precondition", "기존 주문은 색상별 재고 전환을 확인한 후 처리해야 합니다."); }
      if (expiry && (order.status !== STATUS.WAITING || milliseconds(order.depositDeadlineAt) > now())) return { skipped: true };
      if (expectedStatus !== order.status) fail("aborted", "주문 상태가 변경되었습니다. 최신 상태를 확인한 뒤 다시 처리해 주세요.");
      const updates = { updatedAt: serverTimestamp() };
      let movement = null;
      if (action === "status") {
        const next = text(payload.status, 40);
        if (!TRANSITIONS[order.status]?.includes(next)) fail("failed-precondition", "현재 주문 상태에서 가능한 처리가 아닙니다.");
        updates.status = next;
        if (next === STATUS.PAID) {
          if (milliseconds(order.depositDeadlineAt) <= now()) fail("failed-precondition", "입금 기한이 지났습니다. 늦은 입금은 별도 확인 후 처리해 주세요.");
          if (order.inventoryState !== "reserved") fail("failed-precondition", "예약 재고 상태를 확인해 주세요.");
          updates.paidAt = serverTimestamp(); updates.inventoryState = "sold"; movement = "confirm";
        }
        if (next === STATUS.CANCELLED) {
          if (order.inventoryState !== "reserved") fail("failed-precondition", "예약 재고 상태를 확인해 주세요.");
          updates.cancelledAt = serverTimestamp(); updates.inventoryState = "released"; movement = "release";
          if (expiry) updates.cancellationReason = "입금 기한 만료";
        }
        if (next === STATUS.SHIPPED) {
          if (!order.courier || !order.trackingNumber) fail("failed-precondition", "택배사와 송장번호를 먼저 저장해 주세요.");
          updates.shippedAt = serverTimestamp();
        }
        if (next === STATUS.DELIVERED) updates.deliveredAt = serverTimestamp();
        if (next === STATUS.RETURN_RECEIVED) {
          if (typeof payload.restock !== "boolean" || !text(payload.note)) fail("invalid-argument", "반품 검수 결과와 재입고 여부를 입력해 주세요.");
          updates.returnReceivedAt = serverTimestamp(); updates.returnInspection = { restock: payload.restock, note: text(payload.note), actorUid };
          updates.inventoryState = payload.restock ? "released" : "disposed"; movement = payload.restock ? "refund" : "dispose";
        }
      } else if (action === "shipment") {
        if (![STATUS.PAID, STATUS.PREPARING, STATUS.SHIPPED].includes(order.status)) fail("failed-precondition", "입금 확인 후에 배송정보를 등록할 수 있습니다.");
        const courier = text(payload.courier, 60); const trackingNumber = text(payload.trackingNumber, 80);
        if (!courier || !/^[A-Za-z0-9-]{4,80}$/.test(trackingNumber)) fail("invalid-argument", "택배사와 송장번호를 확인해 주세요.");
        updates.courier = courier; updates.trackingNumber = trackingNumber;
      } else if (action === "receipt") {
        if ([STATUS.WAITING, STATUS.CANCELLED].includes(order.status)) fail("failed-precondition", "입금 확인 이후 현금영수증을 처리해 주세요.");
        const status = text(payload.status, 40); const reference = text(payload.reference, 120);
        if (!["발급 완료", "자진발급 완료", "발급 취소"].includes(status) || !reference) fail("invalid-argument", "실제 발급·취소 확인번호를 입력해 주세요.");
        updates.cashReceiptStatus = status; updates.cashReceiptReference = reference; updates.cashReceiptUpdatedAt = serverTimestamp();
      } else if (action === "refund") {
        if (![STATUS.REFUND_REQUESTED, STATUS.RETURN_RECEIVED].includes(order.status)) fail("failed-precondition", "환불 요청 또는 반품 입고 확인 후 환불할 수 있습니다.");
        const amount = integer(payload.amount, "환불 금액", 1, 1000000000); const reference = text(payload.reference, 120);
        if (amount !== order.totalAmountNumber || !reference) fail("invalid-argument", "실제 전액 환불 금액과 은행 이체 확인번호를 입력해 주세요.");
        updates.status = STATUS.REFUNDED; updates.refundedAt = serverTimestamp(); updates.refund = { amount, reference, actorUid };
        if (order.status === STATUS.REFUND_REQUESTED) { movement = "refund"; updates.inventoryState = "released"; }
      } else fail("invalid-argument", "처리 항목을 확인해 주세요.");

      const inventories = [];
      if (movement) {
        for (const item of order.items) {
          const inventoryRef = ref("inventory", item.variantId); const current = await transaction.get(inventoryRef);
          if (!current.exists) fail("failed-precondition", "주문 재고 정보를 찾을 수 없습니다.");
          inventories.push({ ref: inventoryRef, value: current.data(), quantity: integer(item.quantity, "주문 수량", 1, 20) });
        }
      }
      for (const item of inventories) {
        let stockDelta = 0; let reservedDelta = 0; let soldDelta = 0;
        if (movement === "confirm") { reservedDelta = -item.quantity; soldDelta = item.quantity; }
        if (movement === "release") { reservedDelta = -item.quantity; stockDelta = item.quantity; }
        if (movement === "refund") { soldDelta = -item.quantity; stockDelta = item.quantity; }
        if (movement === "dispose") soldDelta = -item.quantity;
        publishStock(transaction, item.ref, {
          ...item.value, stock: item.value.stock + stockDelta, reserved: item.value.reserved + reservedDelta, sold: item.value.sold + soldDelta,
        }, { type: expiry ? "expired" : movement, orderId, orderNumber: order.orderNumber, actorUid, stockDelta, reservedDelta, soldDelta });
      }
      transaction.update(orderRef, updates);
      transaction.create(db.collection("orderEvents").doc(), {
        orderId, userId: order.userId || null, actorUid, type: expiry ? "expired" : action,
        fromStatus: order.status, toStatus: updates.status || order.status, note: text(payload.note), createdAt: serverTimestamp(),
      });
      return { id: orderId, status: updates.status || order.status, inventoryState: updates.inventoryState || order.inventoryState };
    });
  }

  async function updateOrder(data, context) {
    await requireAdmin(context);
    const orderId = identifier(data?.orderId, "주문번호");
    if (!text(data.expectedStatus, 40)) fail("invalid-argument", "주문 현재 상태를 확인해 주세요.");
    return mutateOrder(orderId, { action: data.action, payload: data.payload, expectedStatus: data.expectedStatus, actorUid: context.auth.uid });
  }

  async function expireOrder(orderId) {
    return mutateOrder(identifier(orderId, "주문번호"), { action: "status", payload: { status: STATUS.CANCELLED }, expectedStatus: STATUS.WAITING, actorUid: "system:expiry", expiry: true });
  }
  async function expireBankTransferOrders() {
    const snapshot = await db.collection("orders").where("schemaVersion", "==", 2).where("status", "==", STATUS.WAITING).where("depositDeadlineAt", "<=", timestamp(new Date(now()))).orderBy("depositDeadlineAt").limit(100).get();
    const results = [];
    for (const order of snapshot.docs) {
      try { results.push(await expireOrder(order.id)); }
      catch (error) { results.push({ id: order.id, failed: true, code: error.code || "internal" }); }
    }
    return { examined: results.length, expired: results.filter((result) => !result.skipped && !result.failed).length, failed: results.filter((result) => result.failed).map((result) => result.id) };
  }
  return { setVariantStock, createBankTransferOrder, getOrder, updateOrder, expireOrder, expireBankTransferOrders, isAdmin };
}

module.exports = { CommerceError, createCommerceService, variantIdFor, STATUS };
