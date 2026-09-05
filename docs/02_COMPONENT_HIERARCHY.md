# 02. 컴포넌트 구조

```text
main.jsx
└─ LanguageProvider
   └─ AuthProvider
      └─ CartProvider
         └─ App
            ├─ 고객 화면
            │  ├─ Header (기준정보 기반 3레벨 메가메뉴) / BottomNav
            │  ├─ Storefront
            │  │  ├─ IntroSplash
            │  │  ├─ HeroSection
            │  │  ├─ FeaturedProducts ─ ProductCard
            │  │  ├─ CollectionList ─── ProductCard
            │  │  ├─ BrandStory
            │  │  └─ Footer
            │  ├─ ProductDetail
            │  ├─ CartModal
            │  ├─ CheckoutPage (배송지·무통장 입금·현금영수증·주문 완료)
            │  ├─ Login / Signup
            │  └─ MyPage
            └─ 관리자 화면
               └─ AdminLayout (공통 사이드바·상단바·모바일 메뉴)
                  ├─ AdminDashboard (운영 바로가기·메인 콘텐츠·권한)
                  ├─ AdminInventory (검색·필터·노출·재고·진열 순서)
                  │  ├─ InventoryModal (옵션별 재고·변동 이력)
                  │  └─ ProductEditor
                  │     ├─ 빠른 등록 (기본값)
                  │     └─ 스토어 미리보기
                  ├─ AdminOrders
                  ├─ AdminBoard
                  ├─ AdminStats
                  └─ AdminMasterData (3레벨 카테고리 기준정보 CRUD)
```

## 핵심 책임

- `ProductCard`: 메인과 컬렉션이 공유하는 상품 이미지, 색상, 찜, 빠른 보기, 키보드 이동 UI입니다.
- `Header`: 사용 중인 `categoryMasters`를 1차 상단 탭, 2차 열, 3차 링크로 변환하며 모바일에서는 접이식 메뉴로 표시합니다. 공통 `LIKEDZY` 이미지 로고는 헤더·푸터·브라우저 탭에서 함께 사용합니다.
- `productPresentation.js`: 가격, 배지, 정렬, 이미지 fallback 등 Firestore 원본을 화면용 값으로 정규화합니다.
- `FeaturedProducts`: 관리자 상품 관리의 `orderIndex` 진열 순서를 그대로 사용해 메인 상품을 왼쪽에서 오른쪽, 다음 행 순서로 노출합니다. 추천·베스트 플래그는 배지에만 반영합니다.
- `CollectionList`: URL의 `category` 코드에 맞춰 상품을 필터링하고 기본값으로 관리자 진열 순서를 유지하며, 기준정보 명칭, 사용자 선택 정렬, 빈 카테고리 안내를 담당합니다.
- `ProductDetail`: 선택한 색상에 연결된 대표·호버·추가 이미지를 모두 모은 갤러리, 색상/사이즈 선택, 장바구니 진입을 담당합니다. 확대 이미지는 헤더 아래의 전체 화면 라이트박스로 열리며 화면 밖으로 잘리지 않고, 고대비 닫기 버튼과 ESC 키로 닫을 수 있습니다.
- `AdminInventory`: Firestore 상품을 실시간 구독하고 상품명/SKU 검색, 카테고리·노출·저재고 필터, 빠른 노출 전환과 진열 순서 변경을 담당합니다.
- `ProductEditor`: 필수 등록 항목의 완료 상태를 안내하며 기본 정보, 설명, 이미지, 노출 플래그, 색상·사이즈를 빠르게 입력합니다. 세부 이미지 배치는 스토어 미리보기 모드에서 편집합니다. 색상 칩은 큰 색상 면과 색상 스펙트럼, HEX/RGB 입력을 제공하는 `AdminColorPicker`를 엽니다.
- `InventoryModal`: 색상·사이즈 옵션별 재고 조정과 최근 재고 변동 이력 확인을 담당합니다.
- `CheckoutPage`: 판매 설정을 불러와 배송비와 최종 입금액을 표시하고 서버 검증을 거쳐 재고 예약 주문을 생성합니다.
- `AdminOrders`: 무통장 입금 계좌와 배송 정책, 사업자 정보, 입금 확인, 현금영수증 상태와 택배 송장을 관리합니다.
- `AdminMasterData`: `MAN-TOP-FW` 형식의 1·2·3차 카테고리 코드와 명칭, 사용 상태, 정렬 순서를 관리합니다.
- `useCategoryMasters`: `categoryMasters` 컬렉션을 실시간 구독해 기준정보 화면, 상품 목록 필터, 상품 등록 선택값을 동기화합니다.

주문·리뷰·Q&A의 데이터 처리 로직은 유지하고 공통 관리자 레이아웃과 화면 헤더만 통일합니다. 다음 기능 확장 전까지는 상품 등록·진열·재고 관리가 우선 범위입니다.
