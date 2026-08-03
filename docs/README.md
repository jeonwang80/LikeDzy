# 📐 LikeDzy 웹 시스템 전체 구조도 및 개발 문서 (System Architecture & Docs)

본 문서는 **LikeDzy (나이키 스타일 E-Commerce 쇼핑몰 및 관리자 대시보드 시스템)**의 전체 프론트엔드/백엔드 컴포넌트, 비즈니스 로직, CSS 디자인 시스템, 데이터베이스(Firestore) 스키마, 깃허브 및 배포 구조를 개발 단위별로 분할 관리하는 아키텍처 가이드입니다.

---

## 📂 개발 단위별 문서 목차

| 순번 | 개발 단위 (모듈) | 핵심 내용 | 문서 링크 |
| :---: | :--- | :--- | :--- |
| **01** | **개요 & 깃허브/배포 구성** | 프로젝트 개요, 기술 스택, 깃허브 레포지토리, Vercel/Firebase 배포 설정 | [01_OVERVIEW_AND_DEPLOYMENT.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/01_OVERVIEW_AND_DEPLOYMENT.md) |
| **02** | **컴포넌트 & 라우팅 구조** | React 컴포넌트 계층도, 스토어프론트 및 관리자 라우터, UI 레이아웃 | [02_COMPONENT_HIERARCHY.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/02_COMPONENT_HIERARCHY.md) |
| **03** | **상태 관리 & 비즈니스 로직** | AuthContext, CartContext, AI Virtual Try-On(Gradio), 포트원 결제 연동 | [03_BUSINESS_LOGIC_AND_STATE.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/03_BUSINESS_LOGIC_AND_STATE.md) |
| **04** | **CSS & 디자인 시스템** | CSS 파일 분할 체계, 전역 디자인 토큰, 다크 모드, 반응형 Breakpoint | [04_CSS_DESIGN_SYSTEM.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/04_CSS_DESIGN_SYSTEM.md) |
| **05** | **데이터베이스 스키마** | Firebase Firestore 컬렉션 구조, 필드 정의, Cloud Functions 및 규칙 | [05_DATABASE_SCHEMA.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/05_DATABASE_SCHEMA.md) |

---

## 🏛️ 시스템 한 눈에 보기 (High-Level Architecture)

```mermaid
graph TD
    Client[사용자 브라우저 / 모바일 Web] --> Router[React Router v7 / HashRouter]
    
    subgraph Frontend [React 19 + Vite 8 App]
        Router --> Storefront[사용자 화면: Storefront / MyPage / Login]
        Router --> Admin[관리자 화면: AdminDashboard / Inventory / Board / Stats]
        
        Storefront --> CartCtx[CartContext - 장바구니 & 주문]
        Storefront --> TryOnModal[VirtualTryOnModal - AI 가상 피팅]
        Storefront --> AuthCtx[AuthContext - Firebase 인증]
        
        Admin --> AuthCtx
    end

    subgraph External_Services [외부 AI & 결제 API]
        TryOnModal -->|@gradio/client| GradioAI[IDM-VTON HuggingFace Space]
        CartCtx -->|Portone SDK| PortoneAPI[포트원 결제대행사]
    end

    subgraph Firebase_Backend [Firebase BaaS & Serverless]
        AuthCtx --> FireAuth[Firebase Auth]
        Storefront --> Firestore[(Firestore Database)]
        Admin --> Firestore
        PortoneAPI -->|Webhook/REST| CloudFunc[Cloud Functions verifyPayment]
        CloudFunc --> Firestore
        Admin --> FireStorage[Firebase Storage - 상품/스플래시 이미지]
    end
```

---

## 💡 개발 및 유지보수 규칙
1. **신규 기능 추가 시**: 관련 모듈 문서(`01`~`05`)에 스키마 및 컴포넌트 추가 변경 사항을 업데이트합니다.
2. **디자인 시스템 변경 시**: [04_CSS_DESIGN_SYSTEM.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/04_CSS_DESIGN_SYSTEM.md)의 CSS 변수 토큰과의 일관성을 유지합니다.
3. **DB 변경 시**: Firestore 문서 및 컬렉션 필드 정의를 [05_DATABASE_SCHEMA.md](file:///c:/Users/JeonWang/OneDrive/Antigravity/LikeDzy/docs/05_DATABASE_SCHEMA.md)에 동기화합니다.
