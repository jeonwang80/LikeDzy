const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// 환경변수 또는 직접 하드코딩 (실제 운영시에는 하드코딩 피하고 .env 파일 사용 권장)
const IAMPORT_API_KEY = "포트원_REST_API_KEY_입력"; 
const IAMPORT_API_SECRET = "포트원_REST_API_SECRET_입력";

exports.verifyPayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const { imp_uid, merchant_uid, orderData, expectedAmount } = req.body;

      // 1. 포트원 API에서 액세스 토큰 발급
      const getTokenResponse = await axios.post("https://api.iamport.kr/users/getToken", {
        imp_key: IAMPORT_API_KEY,
        imp_secret: IAMPORT_API_SECRET
      });
      const { access_token } = getTokenResponse.data.response;

      // 2. 포트원 서버에서 결제 정보 조회
      const getPaymentResponse = await axios.get(`https://api.iamport.kr/payments/${imp_uid}`, {
        headers: { Authorization: access_token }
      });
      const paymentData = getPaymentResponse.data.response;

      // 3. 결제 금액 검증
      if (paymentData.amount !== expectedAmount) {
        return res.status(400).json({ 
          success: false, 
          message: `위조된 결제 시도: 예상금액 ${expectedAmount}, 실제결제 ${paymentData.amount}` 
        });
      }

      if (paymentData.status !== "paid") {
        return res.status(400).json({ 
          success: false, 
          message: "결제가 완료되지 않았습니다." 
        });
      }

      // 4. 결제가 정상이면 Firestore에 주문 정보 저장 및 재고 차감 로직 수행
      // orderData는 프론트엔드에서 전달받은 장바구니/배송지 정보
      
      const orderRef = db.collection("orders").doc(merchant_uid);
      await orderRef.set({
        ...orderData,
        imp_uid,
        merchant_uid,
        paymentMethod: paymentData.pay_method,
        status: "결제 완료",
        totalAmount: `₩${paymentData.amount.toLocaleString()}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 재고 차감 처리 (cart 정보가 orderData.items 에 있다고 가정)
      if (orderData.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (!item.productId) continue;
          const productRef = db.collection("products").doc(item.productId);
          const productSnap = await productRef.get();
          
          if (productSnap.exists) {
            const productData = productSnap.data();
            if (productData.options) {
              const updatedOptions = productData.options.map(opt => {
                if (opt.name === item.optionName) {
                  const newStock = Math.max(0, opt.stock - item.quantity);
                  const newSales = (opt.sales || 0) + item.quantity;
                  const historyEntry = {
                    date: new Date().toISOString(),
                    type: "카드 결제 (자동 차감)",
                    amount: -item.quantity
                  };
                  const newHistory = [historyEntry, ...(opt.history || [])];
                  return { ...opt, stock: newStock, sales: newSales, history: newHistory };
                }
                return opt;
              });
              await productRef.update({ options: updatedOptions });
            }
          }
        }
      }

      // 5. 클라이언트에 성공 응답 반환
      return res.status(200).json({ success: true, message: "결제 및 주문 저장 완료" });

    } catch (error) {
      console.error("Payment Verification Error:", error);
      return res.status(500).json({ success: false, message: "서버 결제 검증 중 오류 발생" });
    }
  });
});
