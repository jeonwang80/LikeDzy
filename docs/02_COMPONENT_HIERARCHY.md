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
- `Header`: 사용 중인 `categoryMasters`를 1차 상단 탭, 2차 열, 3차 링크로 변환하며 모바일에서는 접이식 메뉴로 표시합니다.
- `productPresentation.js`: 가격, 배지, 정렬, 이미지 fallback 등 Firestore 원본을 화면용 값으로 정규화합니다.
- `FeaturedProducts`: `isFeatured`/`isBestSeller` 상품을 먼저 노출하고 부족하면 최신 상품으로 채웁니다.
- `CollectionList`: URL의 `category` 코드에 맞춰 상품을 필터링하고 기준정보 명칭, 정렬, 빈 카테고리 안내를 담당합니다.
- `ProductDetail`: 선택한 색상에 연결된 대표·호버·추가 이미지를 모두 모은 갤러리, 색상/사이즈 선택, 장바구니 진입을 담당합니다.
- `AdminInventory`: Firestore 상품을 실시간 구독하고 상품명/SKU 검색, 카테고리·노출·저재고 필터, 빠른 노출 전환과 진열 순서 변경을 담당합니다.
- `ProductEditor`: 필수 등록 항목의 완료 상태를 안내하며 기본 정보, 설명, 이미지, 노출 플래그, 색상·사이즈를 빠르게 입력합니다. 세부 이미지 배치는 스토어 미리보기 모드에서 편집합니다.
- `InventoryModal`: 색상·사이즈 옵션별 재고 조정과 최근 재고 변동 이력 확인을 담당합니다.
- `AdminMasterData`: `MAN-TOP-FW` 형식의 1·2·3차 카테고리 코드와 명칭, 사용 상태, 정렬 순서를 관리합니다.
- `useCategoryMasters`: `categoryMasters` 컬렉션을 실시간 구독해 기준정보 화면, 상품 목록 필터, 상품 등록 선택값을 동기화합니다.

주문·리뷰·Q&A의 데이터 처리 로직은 유지하고 공통 관리자 레이아웃과 화면 헤더만 통일합니다. 다음 기능 확장 전까지는 상품 등록·진열·재고 관리가 우선 범위입니다.
