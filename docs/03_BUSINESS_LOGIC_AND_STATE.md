# 03. 상태와 데이터 흐름

## 전역 상태

- `LanguageContext`: 한국어/영어/베트남어 선택과 번역 조회
- `AuthContext`: Firebase 인증 사용자 상태
- `CartContext`: 선택 옵션과 수량을 포함한 장바구니 상태

Provider 순서는 `LanguageProvider → AuthProvider → CartProvider → App`입니다.

## 상품 노출

`FeaturedProducts`와 `CollectionList`는 Firestore `products`를 실시간 구독합니다. 각 문서는 `presentProduct`를 거쳐 가격, 이미지, 배지, 카테고리 표시가 일관되게 정리되고 공용 `ProductCard`로 렌더링됩니다.

상품 노출 플래그:

- `isFeatured`: 메인 추천 우선 노출
- `isBestSeller`: 베스트 배지 및 메인 추천 후보
- `isNew`: 신상품 배지

## 상품 편집

`ProductEditor`는 신규 등록과 수정에 공용으로 사용됩니다. 이미지 업로드는 브라우저 압축 후 Firebase Storage에 저장하고, 최종 URL과 상품 필드를 Firestore `products`에 기록합니다.

## 보존 중인 거래 영역

`CartModal`, `AdminOrders`, `AdminInventory`, `ProductReviews`, `ProductQnA`의 기존 흐름은 유지됩니다. 주문·재고·후기 데이터 정합성은 별도 단계에서 Firebase 규칙과 Cloud Functions까지 함께 검토해야 합니다.
