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

## 카테고리 탐색

- `Header`와 `CollectionList`는 `categoryMasters`를 실시간 구독합니다.
- 헤더는 `level1Code → level2Code → code` 순서로 3레벨 메뉴 트리를 생성합니다.
- 카테고리 링크는 `/?view=collection&category=MAN-TOP-FW` 형태이며 1차·2차 코드 링크는 해당 접두어를 가진 상품 전체를 필터링합니다.
- 상품 상세 진입 전 카테고리 코드를 보존해 뒤로 이동하면 기존 컬렉션 필터로 돌아갑니다.
- 활성 기준정보가 없을 때는 기존 `TOPS`, `BOTTOMS`, `OUTERWEAR`, `ACC` 분류를 fallback으로 유지합니다.

## 상품 상세 이미지

- 기본 `imageUrls`와 색상별 `imageUrl`, `hoverImageUrl`, `imageUrls`를 합쳐 중복 URL을 제거합니다.
- 단일 색상 상품은 별도 색상 매핑이 없는 상품 이미지도 모두 해당 색상 이미지로 표시합니다.
- 여러 색상 상품은 현재 선택한 색상에 명시적으로 연결된 이미지 그룹만 표시하며 다른 색상 이미지는 섞지 않습니다.

## 보존 중인 거래 영역

`CartModal`, `AdminOrders`, `AdminInventory`, `ProductReviews`, `ProductQnA`의 기존 흐름은 유지됩니다. 주문·재고·후기 데이터 정합성은 별도 단계에서 Firebase 규칙과 Cloud Functions까지 함께 검토해야 합니다.
