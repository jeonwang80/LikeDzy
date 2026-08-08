# 02. 컴포넌트 구조

```text
main.jsx
└─ LanguageProvider
   └─ AuthProvider
      └─ CartProvider
         └─ App
            ├─ 고객 화면
            │  ├─ Header / BottomNav
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
               └─ AdminLayout
                  ├─ AdminDashboard
                  ├─ AdminInventory ─ ProductEditor
                  ├─ AdminOrders
                  ├─ AdminBoard
                  └─ AdminStats
```

## 핵심 책임

- `ProductCard`: 메인과 컬렉션이 공유하는 상품 이미지, 색상, 찜, 빠른 보기, 키보드 이동 UI입니다.
- `productPresentation.js`: 가격, 배지, 정렬, 이미지 fallback 등 Firestore 원본을 화면용 값으로 정규화합니다.
- `FeaturedProducts`: `isFeatured`/`isBestSeller` 상품을 먼저 노출하고 부족하면 최신 상품으로 채웁니다.
- `CollectionList`: 카테고리 필터와 정렬을 담당합니다.
- `ProductDetail`: 이미지 갤러리, 색상/사이즈 선택, 장바구니 진입을 담당합니다.
- `ProductEditor`: 상품 정보와 이미지, `isFeatured`, `isNew`, `isBestSeller` 노출 플래그를 편집합니다.

주문·재고·리뷰·Q&A 컴포넌트는 유지하지만 현재 UI 개선의 우선 범위가 아닙니다.
