# LikeDzy 개발 문서

현재 코드는 React/Vite 프런트엔드와 Firebase 백엔드, Vercel 배포로 구성됩니다.

| 문서 | 내용 |
| --- | --- |
| [01 개요와 배포](01_OVERVIEW_AND_DEPLOYMENT.md) | 기술 스택, 디렉터리, 로컬→배포 절차 |
| [02 컴포넌트 구조](02_COMPONENT_HIERARCHY.md) | 화면과 컴포넌트 책임 |
| [03 상태와 데이터 흐름](03_BUSINESS_LOGIC_AND_STATE.md) | Context, 상품 노출, 결제 경계 |
| [04 디자인 시스템](04_CSS_DESIGN_SYSTEM.md) | 아웃도어 비주얼과 반응형 규칙 |
| [05 데이터 스키마](05_DATABASE_SCHEMA.md) | Firestore 컬렉션과 주요 상품 필드 |

현재 개발 우선순위는 상품 등록/노출과 스토어프론트 완성도입니다. 주문·재고·리뷰·Q&A는 기존 동작을 유지하되 이번 개선 범위에서는 확장하지 않습니다.

```text
Firebase products/settings
          │
          ▼
HeroSection + FeaturedProducts + CollectionList
                              │
                              ▼
                   ProductCard / ProductDetail
                              │
                              ▼
                      CartContext / CartModal
```
