# 🧩 02. 컴포넌트 & 라우팅 구조 (Component Hierarchy & Routing)

본 문서는 **LikeDzy** 애플리케이션의 화면 단위(Page) 및 재사용 컴포넌트(Component)의 계층 구조와 React Router 라우팅 맵을 상세 설명합니다.

---

## 1. 라우팅 맵 (Route Structure)

전체 라우팅은 `App.jsx`에서 `HashRouter`를 기반으로 정의되어 있으며, 스토어프론트(사용자 영역)와 관리자 영역(Admin Module)으로 명확히 구분됩니다.

```
/                         ---> [Storefront] 메인 쇼핑몰 화면 (Hero, Collection, Products)
├── /login                ---> [Login] 일반 사용자 로그인
├── /signup               ---> [Signup] 일반 사용자 회원가입
├── /mypage               ---> [MyPage] 마이페이지 (내 주문 내역 조회)
│
├── /admin/login          ---> [AdminLogin] 관리자 전용 인증 로그인 (독립 라우트, AdminLayout 밖)
│
└── /admin                ---> [AdminLayout] 관리자 공통 프레임 (사이드바 & 헤더)
    ├── /admin (index)    ---> [AdminDashboard] 스플래시/히어로 설정 & 종합 현황
    ├── /admin/inventory  ---> [AdminInventory] 재고 수량/이력 관리 및 ProductEditor 모달
    ├── /admin/orders     ---> [AdminOrders] 실시간 주문 조회 & 배송 상태 변경
    ├── /admin/board      ---> [AdminBoard] Q&A 및 리뷰 게시판 관리 (답변/삭제)
    └── /admin/stats      ---> [AdminStats] 최근 30일 일별 방문자 통계 분석
```

---

## 2. 컴포넌트 계층 트리 (Component Tree)

```
[App.jsx]
 ├── IntroSplash (첫 방문 스플래시 오버레이)
 ├── CartModal (전역 장바구니 & 주문 모달)
 ├── BottomNav (모바일 전용 하단 고정 탭 바)
 ├── ScrollToTop (페이지 이동 시 스크롤 리셋)
 │
 ├── [Storefront.jsx]
 │    ├── Header (브랜드 로고, 검색, 카테고리 탭, 로그인/장바구니 버튼)
 │    ├── HeroSection (메인 비주얼 슬라이더 & 프로모션 배너)
 │    ├── CollectionList (카테고리별 컬렉션 그리드)
 │    ├── FeaturedProducts (추천 상품 그리드)
 │    │    └── ProductDetail (상품 클릭 시 오픈되는 상세 모달)
 │    │         ├── VirtualTryOnModal (AI 가상 피팅 모달)
 │    │         ├── ProductReviews (상품 후기 작성 및 목록)
 │    │         └── ProductQnA (Q&A 질문 작성 및 목록)
 │    ├── BrandStory (브랜드 스토리 및 가치 전달)
 │    └── Footer (고객센터, 이용약관, SNS 링크)
 │
 └── [AdminLayout.jsx]
      ├── Header & Navigation Sidebar (관리자 메뉴)
      └── <Outlet /> (자식 관리자 페이지)
           ├── AdminDashboard (히어로/스플래시 이미지 관리 모달)
           ├── AdminInventory (재고 변경 모달 & 옵션 이력)
           │    └── ProductEditor (신규 상품 등록 & 기존 상품 수정 모달)
           ├── AdminOrders (주문 상태 업데이트 드롭다운)
           ├── AdminBoard (Q&A 답변 작성 모달 & 삭제)
           └── AdminStats (방문자 차트 & 요약 카드)
```

---

## 3. 핵심 컴포넌트 상세 역할 (Component Directory)

### 3.1 스토어프론트 (Storefront) 컴포넌트 (`src/components/`)

| 컴포넌트 파일 | 역할 및 주요 기능 |
| :--- | :--- |
| [Header.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/Header.jsx) | 상단 로고, 카테고리 필터링(ALL, SHOES, CLOTHING, ACCESSORIES), 검색창, 마이페이지/장바구니 뱃지 수량 표시 |
| [HeroSection.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/HeroSection.jsx) | Firestore `settings/main`의 히어로 이미지 슬라이더 및 타이틀/버튼 표시 |
| [CollectionList.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/CollectionList.jsx) | 대표 컬렉션 카드 렌더링 및 카테고리 필터 조작 |
| [FeaturedProducts.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/FeaturedProducts.jsx) | 상품 리스트 그리드 (품절 뱃지, 가격, 호버 애니메이션, 상세 클릭) |
| [ProductDetail.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/ProductDetail.jsx) | 상품 이미지 갤러리, 옵션 선택(사이즈/색상), 재고 수량 제한 체크, 장바구니 담기, AI 피팅 모달 호출 |
| [VirtualTryOnModal.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/VirtualTryOnModal.jsx) | 사용자 사진 업로드 → `@gradio/client` 호출 → IDM-VTON AI 가상 착용 결과 이미지 반환 |
| [ProductReviews.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/ProductReviews.jsx) | 상품 리뷰 별점 계산, 리뷰 작성폼, 사진 첨부 및 사용자 리뷰 삭제 |
| [ProductQnA.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/ProductQnA.jsx) | 상품 Q&A 질문 작성 (비밀글 지원), 답변 완료 상태 표시 |
| [CartModal.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/CartModal.jsx) | CartContext 연동 장바구니 리스트, 옵션 수량 수정, 배송지 작성 및 포트원 결제 요청 |
| [IntroSplash.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/IntroSplash.jsx) | 메인 첫 진입 시 브랜딩 오버레이 연출 (Firestore dynamic splash image 연동) |
| [BottomNav.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/BottomNav.jsx) | 모바일 디바이스 뷰포트에서 하단에 고정되는 네비게이션 탭 (Home, Shop, Cart, MyPage) |
| [ScrollToTop.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/ScrollToTop.jsx) | 페이지 이동(라우트 변경) 시 스크롤 위치를 최상단으로 리셋 |
| [BrandStory.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/BrandStory.jsx) | 메인 하단 브랜드 가치/스토리 소개 섹션 |
| [Footer.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/components/Footer.jsx) | 고객센터 안내, 이용약관, SNS 링크 등 사이트 푸터 |

### 3.3 다국어 지원 모듈 (`src/i18n/`)

| 파일 | 역할 및 주요 기능 |
| :--- | :--- |
| [LanguageContext.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/i18n/LanguageContext.jsx) | `LanguageProvider` 및 `useLanguage` 훅 제공. `t('key.path')` 함수로 dot-notation 번역 키 접근 |
| [translations.js](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/i18n/translations.js) | `ko` / `en` 등 언어별 번역 문자열 사전 정의 |

### 3.4 관리자 (Admin) 페이지 (`src/pages/`)

| 페이지 파일 | 역할 및 주요 기능 |
| :--- | :--- |
| [AdminLayout.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/AdminLayout.jsx) | 관리자 대시보드 공통 사이드바 메뉴 및 인증 확인 가드 |
| [AdminDashboard.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/AdminDashboard.jsx) | 메인 히어로 배너 이미지 관리, 스플래시 이미지 교체, 총 상품수/주문수 카운트 |
| [AdminInventory.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/AdminInventory.jsx) | 상품별 옵션 재고 증감 실시간 업데이트, 수동 입출고 이력 기록, ProductEditor 호출 |
| [ProductEditor.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/ProductEditor.jsx) | 상품명, 가격, 카테고리, 대표 이미지 업로드, 텍스트 에디터(ReactQuill) 상세설명, 옵션 배열 편집 모달 |
| [AdminOrders.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/AdminOrders.jsx) | 전체 주문 리스트 조회, 주문 상태 변경(결제완료 -> 배송중 -> 배송완료/취소), 상세 품목 확인 |
| [AdminBoard.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/AdminBoard.jsx) | Q&A 문의사항에 관리자 답변 등록/수정, 부적절한 리뷰 및 Q&A 삭제 |
| [AdminStats.jsx](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/src/pages/AdminStats.jsx) | Firestore `visitorStats` 데이터 기반 방문자 트렌드 분석 |
