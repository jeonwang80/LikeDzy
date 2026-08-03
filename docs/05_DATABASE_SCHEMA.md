# 🗄️ 05. 데이터베이스 스키마 (Database Schema)

본 문서는 **LikeDzy** 웹 서비스에서 사용되는 Firebase Firestore NoSQL 데이터베이스의 컬렉션(Collection) 구조, 문서(Document) 필드 스키마, 데이터 관계 및 백엔드 CRUD 매핑 규칙을 정의합니다.

---

## 1. Firestore 컬렉션 목록 요약

| 컬렉션 명 (Collection) | 식별자 규칙 (Doc ID) | 주요 용도 |
| :--- | :--- | :--- |
| `products` | Auto ID (Firestore 생성) | 상품 마스터 데이터, 이미지, 가격, 옵션별 재고/히스토리 |
| `orders` | `merchant_uid` 또는 Auto ID | 사용자 주문 내역, 수령인 주소, 결제 수단, 배송 상태 |
| `reviews` | Auto ID | 상품 후기 (별점, 후기 내용, 사진 URL, 작성자 정보) |
| `qna` | Auto ID | 상품 문의사항 (질문 내용, 비밀글 여부, 관리자 답변) |
| `settings` | 고정 문서: `main` | 사이트 글로벌 비주얼 설정 (히어로 배너, 스플래시 이미지) |
| `visitorStats` | 날짜 형식: `YYYY-MM-DD` | 일별 사이트 방문자 수 카운터 |

---

## 2. 컬렉션별 세부 스키마 (Field Definitions)

### 2.1 `products` (상품 마스터)

```json
{
  "id": "abc123XYZ",
  "name": "Air Max Dzy 2026",
  "price": 189000,
  "category": "SHOES", // "SHOES" | "CLOTHING" | "ACCESSORIES"
  "description": "<p>프리미엄 쿠셔닝 러닝화</p>", // HTML String (ReactQuill)
  "imageUrl": "https://firebasestorage.googleapis.com/.../main.jpg",
  "images": [
    "https://firebasestorage.googleapis.com/.../sub1.jpg",
    "https://firebasestorage.googleapis.com/.../sub2.jpg"
  ],
  "isFeatured": true,
  "createdAt": "2026-08-01T10:00:00.000Z",
  "options": [
    {
      "name": "265",
      "stock": 15,
      "sales": 5,
      "history": [
        {
          "date": "2026-08-03T05:00:00.000Z",
          "type": "수동 입고", // "수동 입고" | "수동 차감" | "카드 결제 (자동 차감)"
          "amount": 10
        }
      ]
    },
    {
      "name": "270",
      "stock": 8,
      "sales": 12,
      "history": []
    }
  ]
}
```

---

### 2.2 `orders` (주문 및 결제)

```json
{
  "merchant_uid": "mid_1722650000000",
  "imp_uid": "imp_1234567890", // 포트원 결제 고유 번호
  "userName": "홍길동",
  "userPhone": "010-1234-5678",
  "userAddress": "서울특별시 강남구 테헤란로 123 4층",
  "items": [
    {
      "productId": "abc123XYZ",
      "productName": "Air Max Dzy 2026",
      "optionName": "265",
      "price": 189000,
      "quantity": 1,
      "imageUrl": "https://firebasestorage.googleapis.com/..."
    }
  ],
  "totalAmount": "₩189,000",
  "status": "결제 완료", // "결제 완료" | "배송 준비중" | "배송중" | "배송 완료" | "주문 취소"
  "paymentMethod": "card",
  "createdAt": "2026-08-03T12:30:00.000Z"
}
```

---

### 2.3 `reviews` (상품 리뷰)

```json
{
  "id": "rev_999",
  "productId": "abc123XYZ",
  "userName": "김철수",
  "userEmail": "chulsoo@example.com",
  "rating": 5, // 1 ~ 5
  "content": "착용감이 너무 부드럽고 디자인이 진짜 나이키 감성이네요!",
  "photoUrl": "https://firebasestorage.googleapis.com/.../review.jpg",
  "createdAt": "2026-08-02T14:20:00.000Z"
}
```

---

### 2.4 `qna` (상품 Q&A)

```json
{
  "id": "qna_777",
  "productId": "abc123XYZ",
  "userName": "이영희",
  "userEmail": "young@example.com",
  "question": "사이즈 정사이즈로 나왔나요?",
  "isSecret": false,
  "status": "답변완료", // "답변대기" | "답변완료"
  "reply": "네, 정사이즈로 착용하시면 잘 맞습니다!",
  "createdAt": "2026-08-02T09:00:00.000Z",
  "repliedAt": "2026-08-02T11:00:00.000Z"
}
```

---

### 2.5 `settings` (글로벌 설정 - Document: `main`)

```json
{
  "heroImageUrls": [
    "https://firebasestorage.googleapis.com/.../banner1.jpg",
    "https://firebasestorage.googleapis.com/.../banner2.jpg"
  ],
  "splashImageUrl": "https://firebasestorage.googleapis.com/.../splash.jpg"
}
```

---

### 2.6 `visitorStats` (일별 방문자 - Document: `YYYY-MM-DD`)

```json
{
  "count": 342 // 필드 업데이트 시 increment(1) 사용
}
```

---

## 3. Storage 보안 및 폴더 규칙 (Firebase Storage)

- **`products/`**: 상품 메인/서브 이미지 업로드.
- **`reviews/`**: 고객 후기 사진.
- **`settings/`**: 메인 히어로 배너 및 스플래시 이미지.
- 이미지 업로드 전 프론트엔드 `browser-image-compression` 적용으로 1MB 이하 최적화 후 업로드.
