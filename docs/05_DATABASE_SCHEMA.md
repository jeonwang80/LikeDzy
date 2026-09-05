# 05. Firestore 데이터 스키마

이 문서는 프런트엔드에서 현재 참조하는 주요 필드만 정리합니다. Firebase 규칙과 실제 데이터 수정은 별도 검토 후 진행합니다.

## 컬렉션

| 컬렉션 | 용도 |
| --- | --- |
| `products` | 상품, 이미지, 옵션, 노출 설정 |
| `categoryMasters` | 3레벨 상품 카테고리 기준정보 |
| `settings/main` | 히어로, 스플래시 등 메인 화면 설정 |
| `settings/admin` | 관리자 이메일 목록 |
| `orders` | 주문 및 결제 결과 |
| `reviews` | 상품 리뷰 |
| `qna` | 상품 문의와 답변 |
| `visitorStats` | 일자별 방문 집계 |

`settings/commerce`에는 무통장 입금 계좌, 배송비, 무료배송 기준, 입금기한, 기본 택배사와 주문 활성화 여부를 저장합니다. 신규 주문은 `inventoryState: reserved`로 옵션 재고를 예약하고, 입금 확인 시 `sold`, 취소 시 `released`로 전환합니다. 주문 문서에는 상품금액·배송비·최종금액을 숫자로 각각 보존하며 계좌 정보는 주문 당시 값으로 스냅샷을 남깁니다.

## products 주요 필드

```js
{
  name: "LIGHTWEIGHT SHELL JACKET",
  price: 189000,
  category: "MAN-TOP-FW", // categoryMasters.code, 기존 분류 코드도 호환
  categoryMasterId: "firestore-document-id",
  categoryPath: "남성 / 상의 / 기능성 웨어",
  description: "<p>...</p>",
  imageUrl: "https://...",
  images: ["https://..."],
  colors: [
    { name: "Black", hex: "#111111", images: ["https://..."] }
  ],
  sizes: ["S", "M", "L", "XL"],
  options: [
    { name: "Black / M", stock: 12, sales: 0, history: [] }
  ],
  isFeatured: true,
  isBestSeller: false,
  isNew: true,
  orderIndex: 0,
  createdAt: Date
}
```

과거 상품은 일부 필드가 없을 수 있습니다. 화면 계층은 누락값을 안전하게 보정하며, Firebase 데이터 마이그레이션은 프런트 변경과 분리합니다.

## categoryMasters 주요 필드

```js
{
  code: "MAN-TOP-FW",
  level1Code: "MAN",
  level1Name: "남성",
  level2Code: "TOP",
  level2Name: "상의",
  level3Code: "FW",
  level3Name: "기능성 웨어",
  active: true,
  sortOrder: 100,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

- 각 레벨 코드는 영문 대문자와 숫자만 허용하며 화면에서 자동 정규화합니다.
- 상품 등록 화면에는 `active !== false`인 기준정보만 표시합니다.
- 기준정보를 비활성화하거나 삭제해도 기존 상품에 저장된 `category` 코드는 유지됩니다.
- 기준정보 컬렉션의 읽기·쓰기 권한은 관리자 인증 정책에 맞춰 Firestore Rules에서 별도로 허용해야 합니다.

## settings/main 주요 필드

주문 구조 v2의 `inventory`, `stockAvailability`, `inventoryMovements`, `orderAccess`, `orderRequests`, `orderEvents`와 신규 `qnaV2`/`reviewsV2` 접근 정책은 `functions/COMMERCE_CONTRACT.md` 및 [주문·재고 검증 기록](07_COMMERCE_VALIDATION.md)을 참조한다. 구버전 데이터는 자동 이전하지 않았다.

```js
{
  heroImageUrl: "https://...",
  heroImageUrls: ["https://..."],
  heroTitle: "MOVE BEYOND THE MAP",
  heroSubtitle: "...",
  splashImageUrl: "https://...",
  splashEnabled: false
}
```
