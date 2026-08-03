# 🚀 01. 시스템 개요 & 깃허브/배포 구성 (Overview & Deployment)

본 문서는 **LikeDzy** 쇼핑몰 및 관리자 웹 플랫폼의 기술 스택, 전체 디렉토리 구조, GitHub 관리 정책, Vercel 프론트엔드 배포 및 Firebase 백엔드 설정 환경을 설명합니다.

---

## 1. 프로젝트 개요 (System Overview)

- **프로젝트 명**: LikeDzy (나이키 스타일의 감각적인 프리미엄 E-Commerce 웹 서비스)
- **주요 기능**:
  - **스토어프론트 (Storefront)**: 트렌디한 히어로 섹션, 컬렉션/추천 상품, 상품 상세 모달, Q&A/리뷰 관리, 장바구니/옵션 수량 체크, 포트원 카드 결제.
  - **AI 가상 피팅 (Virtual Try-On)**: HuggingFace IDM-VTON AI 모델과 연결되어 착용 사진 업로드 시 상품 옷을 AI로 자연스럽게 합성 피팅.
  - **관리자 대시보드 (Admin Suite)**: 상품 등록/수정/삭제, 옵션별 재고/히스토리 관리, 주문 상태 변경, Q&A/리뷰 답변 및 관리, 스플래시/히어로 배너 설정, 일별 방문자 통계.

---

## 2. 기술 스택 (Tech Stack)

| 구분 | 사용 기술 / 라이브러리 | 용도 및 특징 |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19.2, Vite 8.0 | 초고속 HMR 및 최신 컴포넌트 렌더링 |
| **Routing** | React Router v7 (`HashRouter`) | 클라이언트 사이드 라우팅 및 탭 관리 |
| **State Management** | React Context API (`AuthContext`, `CartContext`) | 인증 상태 및 장바구니/주문 상태 관리 |
| **Styling** | Vanilla CSS + CSS Variables | Nike 스타일의 화이트(라이트 모드) 기반 디자인 시스템 |
| **Backend & DB** | Firebase Firestore | NoSQL 실시간 문서 데이터베이스 |
| **Authentication** | Firebase Auth | 이메일/비밀번호 및 구글 소셜 로그인 지원 |
| **Storage** | Firebase Storage | 상품 이미지, 히어로/스플래시 이미지 업로드 |
| **Serverless Logic** | Firebase Cloud Functions | 포트원 결제 위변조 검증(`verifyPayment`) 및 자동 재고 차감 |
| **AI Integration** | `@gradio/client` (v2.2.0) | `yisol/IDM-VTON` AI 서비스 가상 피팅 인터페이스 연동 |
| **Image Compression** | `browser-image-compression` | 상품 및 이미지 업로드 시 브라우저 단 용량 압축 |
| **Deployment** | Vercel (Front) + Firebase (Back) | GitHub main 브랜치 푸시 시 자동 지속 배포 |

---

## 3. 디렉토리 구조 (Directory Map)

```
LikeDzy/
├── .env.local             # 외부 API 및 환경 변수 설정 (Git 미커밋, .gitignore에 포함)
├── .firebaserc            # Firebase 프로젝트 매핑 정보 (likedzy-store)
├── firebase.json          # Firebase Firestore/Functions/Hosting 규격 설정
├── package.json           # 의존성 패키지 및 스크립트 정의
├── vite.config.js         # Vite 빌드 설정
├── DESIGN-nike.md         # Nike 스타일 디자인 레퍼런스 문서
├── docs/                  # 🌟 전체 웹 시스템 구조도 및 아키텍쳐 문서
│   ├── README.md
│   ├── 01_OVERVIEW_AND_DEPLOYMENT.md
│   ├── 02_COMPONENT_HIERARCHY.md
│   ├── 03_BUSINESS_LOGIC_AND_STATE.md
│   ├── 04_CSS_DESIGN_SYSTEM.md
│   └── 05_DATABASE_SCHEMA.md
├── functions/             # Firebase Cloud Functions (Serverless Backend)
│   ├── index.js           # verifyPayment 결제 검증 함수
│   └── package.json
├── public/                # 파비콘 및 정적 에셋
└── src/
    ├── main.jsx           # 엔트리 포인트 (Provider 계층: Language > Auth > Cart)
    ├── App.jsx            # 라우팅 메인 루트
    ├── App.css            # 글로벌 앱 스타일
    ├── admin.css          # 관리자 대시보드 전용 스타일
    ├── index.css          # 디자인 시스템 변수 & 전역 스타일
    ├── firebase.js        # Firebase SDK 초기화 (db, auth, storage)
    ├── assets/            # 이미지 및 아이콘 자원
    ├── components/        # 공용/스토어프론트 컴포넌트 (19개 파일: 11 JSX + 5 CSS + 3 기타)
    ├── context/           # React Context (AuthContext, CartContext)
    ├── i18n/              # 다국어 지원 (LanguageContext, translations.js)
    └── pages/             # 페이지 레벨 컴포넌트 (12개)
```

---

## 4. 깃허브 & 배포 워크플로우 (GitHub & Deployment Workflow)

### 4.1 Git 브랜치 전략
- **`main` 브랜치**: 배포 가능한 안정 버전 (Vercel 자동 배포 트리거).
- **작업 브랜치**: 기능 개발 및 수정 시 로컬 검증 후 `main`에 커밋/푸시.

### 4.2 Vercel 프론트엔드 배포
- **연동 레포지토리**: `jeonwang80/LikeDzy`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Router Handling**: `HashRouter` 사용으로 SPA 라우팅 새로고침 시 404 방지.

### 4.3 Firebase 백엔드 & Cloud Functions 배포
- **Firebase Project ID**: `likedzy-store`
- **Cloud Functions 배포 명령**:
  ```bash
  cd functions
  firebase deploy --only functions
  ```
- **Firestore Security Rules**: [05_DATABASE_SCHEMA.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/05_DATABASE_SCHEMA.md) 참조.

---

## 5. 환경 변수 관리 (Environment Variables)

`.env.local` 파일 예시 (프로젝트 루트):
```env
# Firebase 클라이언트 SDK 환경변수 (필요시)
VITE_FIREBASE_API_KEY=AIzaSyDK_a3nr437qsYzccMzPESSSltbjA6SXI4
VITE_FIREBASE_AUTH_DOMAIN=likedzy-store.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=likedzy-store

# Gradio AI HuggingFace 엔드포인트
VITE_GRADIO_TRYON_MODEL=yisol/IDM-VTON
```
