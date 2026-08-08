# 05. Firestore 데이터 스키마

이 문서는 프런트엔드에서 현재 참조하는 주요 필드만 정리합니다. Firebase 규칙과 실제 데이터 수정은 별도 검토 후 진행합니다.

## 컬렉션

| 컬렉션 | 용도 |
| --- | --- |
| `products` | 상품, 이미지, 옵션, 노출 설정 |
| `settings/main` | 히어로, 스플래시 등 메인 화면 설정 |
| `settings/admin` | 관리자 이메일 목록 |
| `orders` | 주문 및 결제 결과 |
| `reviews` | 상품 리뷰 |
| `qna` | 상품 문의와 답변 |
| `visitorStats` | 일자별 방문 집계 |

## products 주요 필드

```js
{
  name: "LIGHTWEIGHT SHELL JACKET",
  price: 189000,
  category: "OUTERWEAR", // TOPS | BOTTOMS | OUTERWEAR | ACC
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

## settings/main 주요 필드

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
