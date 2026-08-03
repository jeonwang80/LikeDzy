# 🎨 04. CSS & 디자인 시스템 (CSS & Design System)

본 문서는 **LikeDzy** 웹 서비스의 CSS 파일 분할 체계, 나이키(Nike) 스타일 디자인 토큰, 타이포그래피, 화이트(라이트 모드) 기반 테마 및 반응형 레이아웃 가이드를 설명합니다.

---

## 1. CSS 파일 구조 (CSS Architecture)

프로젝트 내 CSS는 역할과 스코프에 따라 분할되어 관리됩니다.

```
src/
├── index.css               # 🌟 전역 CSS 디자인 토큰, 폰트 임포트, 리셋, 공용 모달/유틸리티
├── App.css                 # 메인 앱 전용 레이아웃 및 팝업 애니메이션
├── admin.css               # 관리자 대시보드 전용 전용 스파크라인, 카드, 사이드바 스타일
└── components/
    ├── BottomNav.css       # 모바일 전용 고정 하단 탭 바 스타일
    ├── CollectionList.css  # 컬렉션 카테고리 그리드 스타일
    ├── FeaturedProducts.css# 상품 리스트 및 호버 줌 애니메이션
    ├── HeroSection.css     # 메인 풀-블리드 히어로 배너 & 타이포그래피
    └── IntroSplash.css     # 스플래시 오버레이 페이드 아웃 애니메이션
```

---

## 2. 디자인 토큰 (Design Tokens in `index.css`)

### 2.1 색상 팔레트 (Nike Color Palette)

```css
:root {
  /* Nike Design System Colors */
  --colors-ink: #111111;           /* 메인 텍스트 및 프라이머리 버튼 */
  --colors-on-primary: #ffffff;    /* 반전 텍스트 */
  --colors-canvas: #ffffff;        /* 메인 배경색 */
  --colors-soft-cloud: #f5f5f5;    /* 세컨더리 섹션 배경 */
  --colors-charcoal: #39393b;      /* 다크 텍스트 */
  --colors-mute: #707072;          /* 보조 설명 텍스트 */
  --colors-stone: #9e9ea0;         /* 비활성 요소 */
  --colors-hairline: #cacacb;      /* 메인 구분선/보더 */
  --colors-hairline-soft: #e5e5e5; /* 연한 구분선 */
  --colors-sale: #d30005;          /* 할인/경고/품절 레드 */
  --colors-success: #007d48;       /* 성공/배송완료 그린 */

  /* CSS Alias Variables */
  --bg-color: var(--colors-canvas);
  --bg-secondary: var(--colors-soft-cloud);
  --text-color: var(--colors-ink);
  --text-muted: var(--colors-mute);
  --border-color: var(--colors-hairline);
  --glass-bg: rgba(255, 255, 255, 0.92);
  --glass-border: var(--colors-hairline-soft);
  --btn-bg: var(--colors-ink);
  --btn-text: var(--colors-on-primary);
}
```

### 2.2 타이포그래피 (Typography)
Google Fonts의 'Bebas Neue', 'Anton', 'Inter' 폰트를 활용합니다.
- **Display Font**: `'Bebas Neue', 'Anton', sans-serif` (`--font-display`) - 히어로 대형 헤드라인 및 강렬한 나이키 타이틀.
- **Body Font**: `'Inter', sans-serif` (`--font-body`) - 본문, 메뉴, 본문 텍스트, 가독성 중심.

### 2.3 여백 및 라운딩 (Spacing & Radius)
- **Base Spacing**: 8px 단위 기반 (`--space-sm: 8px`, `--space-md: 12px`, `--space-lg: 18px`, `--space-xl: 24px`, `--space-section: 48px`).
- **Border Radius**: `--rounded-md: 24px`, `--rounded-lg: 30px`, `--rounded-full: 9999px`.

---

## 3. 반응형 및 모바일 대응 (Responsive Design)

### 3.1 Breakpoint 맵
- **Desktop (1024px 이상)**: 3~4열 상품 그리드, 상단 고정 헤더 메뉴, 풀 뷰 관리자 대시보드.
- **Tablet (768px ~ 1023px)**: 2열 상품 그리드, 상단 탭 간격 조절.
- **Mobile (767px 이하)**:
  - 1열/2열 가변 그리드.
  - 상단 메뉴 단순화 및 `BottomNav.css` 모바일 전용 하단 고정 탭 바 노출.
  - 모바일 터치 패딩 최적화 (최소 44px 터치 영역 확보).

---

## 4. 모달 및 애니메이션 가이드

- **Glassmorphism**: `backdrop-filter: blur(12px)`와 `var(--glass-bg)` 조합으로 프리미엄 오버레이 감성 연출.
- **Hover Micro-Animations**:
  - 상품 카드 호버 시 `transform: scale(1.03)`, `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`.
- **JSX 스타일 주의사항**:
  - React 인라인 스타일 사용 시 `!important` 구문 사용 금지 (`index.css` 또는 전용 CSS 클래스 정의 활용).
