const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const { CommerceError, createCommerceService } = require("./commerce");

initializeApp();
const commerce = createCommerceService({
  db: getFirestore(),
  timestamp: (date) => Timestamp.fromDate(date),
  serverTimestamp: () => FieldValue.serverTimestamp(),
  isEmulator: process.env.FUNCTIONS_EMULATOR === "true",
});

const api = functions.region("us-central1").runWith({ maxInstances: 10, timeoutSeconds: 60, memory: "256MB" });
function callable(method) {
  return api.https.onCall(async (data, context) => {
    try { return await method(data, context); }
    catch (error) {
      if (error instanceof CommerceError) throw new functions.https.HttpsError(error.code, error.message);
      // Request bodies include customer details and recovery secrets. Never log them.
      functions.logger.error("Commerce operation failed", {
        code: error.code || "internal",
        // Local diagnostics keep only source frames, never error messages or payloads.
        ...(process.env.FUNCTIONS_EMULATOR === "true" ? { frames: String(error.stack || '').split('\n').filter((line) => /^\s+at /.test(line)).slice(0, 5) } : {}),
      });
      throw new functions.https.HttpsError("internal", "처리 중 오류가 발생했습니다. 기존 주문을 확인한 후 다시 시도해 주세요.");
    }
  });
}

exports.createBankTransferOrder = callable(commerce.createBankTransferOrder);
exports.getOrder = callable(commerce.getOrder);
exports.setVariantStock = callable(commerce.setVariantStock);
exports.updateOrder = callable(commerce.updateOrder);
exports.expireBankTransferOrders = functions.region("us-central1")
  .runWith({ maxInstances: 1, timeoutSeconds: 300, memory: "256MB" })
  .pubsub.schedule("every 5 minutes").timeZone("Asia/Seoul").onRun(async () => {
    const result = await commerce.expireBankTransferOrders();
    functions.logger.info("Order expiry run", result);
    return null;
  });
