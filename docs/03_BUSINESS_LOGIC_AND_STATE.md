# 03. 상태와 데이터 흐름

## 전역 상태

- `LanguageContext`: 한국어/영어/베트남어 선택과 번역 조회
- `AuthContext`: Firebase 인증 사용자 상태
- `CartContext`: 선택 옵션과 수량을 포함한 장바구니 상태

Provider 순서는 `LanguageProvider → AuthProvider → CartProvider → App`입니다.

## 상품 노출

`FeaturedProducts`와 `CollectionList`는 Firestore `products`를 실시간 구독합니다. 각 문서는 `presentProduct`를 거쳐 가격, 이미지, 배지, 카테고리 표시가 일관되게 정리되고 공용 `ProductCard`로 렌더링됩니다. 기본 상품 배열은 관리자 상품 관리에서 저장한 `orderIndex` 오름차순을 사용하며 CSS Grid의 기본 행 흐름에 따라 왼쪽에서 오른쪽, 다음 행의 왼쪽부터 이어집니다.

상품 노출 플래그:

- `isFeatured`: 추천 배지 표시
- `isBestSeller`: 베스트 배지 표시
- `isNew`: 신상품 배지

노출 플래그는 상품 위치를 재정렬하지 않습니다. 컬렉션에서 사용자가 가격·최신·이름 정렬을 직접 선택한 경우에만 관리자 진열 순서 대신 해당 정렬이 적용됩니다.

## 상품 편집

`ProductEditor`는 신규 등록과 수정에 공용으로 사용됩니다. 상품 상세 이미지는 원본 비율을 유지하면서 최대 2400px·2MB의 고화질 버전으로 최적화하고, 보조 썸네일은 최대 1200px·0.45MB로 생성해 Firebase Storage에 저장합니다. 최종 URL과 상품 필드는 Firestore `products`에 기록합니다.

## 카테고리 탐색

- `Header`와 `CollectionList`는 `categoryMasters`를 실시간 구독합니다.
- 헤더는 `level1Code → level2Code → code` 순서로 3레벨 메뉴 트리를 생성합니다.
- 카테고리 링크는 `/?view=collection&category=MAN-TOP-FW` 형태이며 1차·2차 코드 링크는 해당 코드와 `-`로 이어진 모든 하위 코드 상품을 포함합니다. 필터는 원본 상품의 공통·언어별 카테고리 코드와 `categoryMasterId` 기준정보 연결값을 함께 비교합니다.
- 상품 상세 진입 전 카테고리 코드를 보존해 뒤로 이동하면 기존 컬렉션 필터로 돌아갑니다.
- 활성 기준정보가 없을 때는 기존 `TOPS`, `BOTTOMS`, `OUTERWEAR`, `ACC` 분류를 fallback으로 유지합니다.

## 상품 상세 이미지

- 메인·컬렉션 상품 카드는 고화질 상세 이미지 URL을 사용하고, 해당 이미지 로딩이 실패할 때만 썸네일로 대체합니다. 카드 내부에서는 `object-fit: contain`으로 원본 비율을 유지합니다.
- 기본 `imageUrls`와 색상별 `imageUrl`, `hoverImageUrl`, `imageUrls`를 합쳐 중복 URL을 제거합니다.
- 단일 색상 상품은 별도 색상 매핑이 없는 상품 이미지도 모두 해당 색상 이미지로 표시합니다.
- 여러 색상 상품은 현재 선택한 색상에 명시적으로 연결된 이미지 그룹만 표시하며 다른 색상 이미지는 섞지 않습니다.

## 보존 중인 거래 영역

현재 주문·재고 구현과 로컬 검증 결과는 [주문·재고 검증 기록](07_COMMERCE_VALIDATION.md) 및 `functions/COMMERCE_CONTRACT.md`를 따른다. `inventory`의 색상×사이즈 재고와 `stockAvailability` 공개 수량을 분리하고, 서버에서 주문 상태 전이와 예약·판매·반품 수량을 처리한다. 비회원은 주문 ID와 복구 코드로 `/orders/:orderId`에서 조회한다.

`CartModal`에서 주문서 페이지로 이동하면 `settings/commerce` 정책으로 배송비와 최종 입금액을 계산합니다. 무통장 주문 접수는 Firestore 트랜잭션에서 상품 가격과 옵션 재고를 다시 확인하고 재고를 예약합니다. 관리자가 입금을 확인하면 판매 수량을 확정하며 주문 취소 시 예약 재고를 복원합니다. `AdminOrders`에서 판매 설정, 현금영수증 처리 상태, 택배사와 송장번호를 함께 관리합니다. Firebase 보안 규칙은 운영 프로젝트 정책과 함께 별도로 배포·검증해야 합니다.
