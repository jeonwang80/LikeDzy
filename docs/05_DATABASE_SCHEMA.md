# 05. 현재 데이터 구조와 논리 ERD

2026-10-05 코드 기준. 운영 데이터 조회 없이 저장·조회 코드 및 Firestore/Storage 규칙을 검토했다.

사용자용 문서: https://likedzy.com/guide/#erd · [시스템 구성](https://likedzy.com/guide/#architecture) · [데이터 사전](https://likedzy.com/guide/#data-reference)

## 저장 방식

Firestore 문서 간 연결은 문자열 ID·코드에 의한 논리 참조다. SQL 외래키/연쇄 삭제를 의미하지 않는다. Firebase Auth는 Firestore 밖의 계정 서비스이고 Storage는 파일 저장소다. 주문 items[]와 bankSnapshot은 주문 문서에 내장된다.

| 컬렉션/문서 | 식별 및 주요 관계 | 역할 |
| --- | --- | --- |
| categoryMasters | categoryId, code | 3레벨 분류·사용 여부·정렬 |
| products | productId, categoryMasterId(선택), category | ko/en/vi, prices, colorSwatches, sizeOptions, measurementGuide, imageUrls, imageVariants, isActive, orderIndex 등 |
| inventory | variantId, productId | 색상×사이즈별 stock, reserved, sold, version |
| stockAvailability | inventory와 동일 variantId | 공개용 available=stock, 상품·색상·사이즈 |
| inventoryMovements | movementId, variantId, productId, orderId(선택) | 증감량, 변경 후 수량, 버전, 수행자·시간 |
| orders | orderId, userId(회원만), couponCode(선택) | v2 주문·금액·배송지·계좌 스냅샷·상태·송장 |
| orderEvents | eventId, orderId, userId(선택) | 주문 생성·상태 변경·송장·환불 등 이력 |
| users | Auth UID와 동일 문서 ID | 본인 연락처·기본 배송지. 가입자 전체 목록은 Auth에서 조회 |
| coupons | CODE와 동일 문서 ID | 최신 할인 조건·기간·자동 발급·전체 사용 한도/사용 수 |
| userCoupons | 회원+코드 조합 해시, userId, code | 발급 문서와 조건 사본, orderId·redeemedAt. 화면은 최신 행사 조건을 우선 조회 |
| couponUses | 회원+코드 조합 해시, userId, code, orderId | 사용 상태·released. 전체 감사 이력 테이블은 아님 |
| couponWalletLocks | uid | 동시 발급 시 보유 3개 제한을 위한 트랜잭션 조정 |
| orderAccess | orderId | 복구 정보의 해시, 서버 전용 |
| orderRequests | 주문 요청 식별값 해시 | 처리 결과·내용 지문 또는 생성 전 종료 기록 |
| inventoryRequests | 재고 요청 식별값 해시 | 중복 저장 방지용 지문·결과 |
| orderRateLimits | 요청 주체/동작별 식별 | 요청 횟수 제한. 개별 주문의 자식 아님 |
| qnaV2 | productId, userId | content, author, isSecret, status, reply. 답변은 같은 문서 |
| reviewsV2 | productId, userId | content, rating, imagePaths, purchaseVerified |
| qna / reviews | 구형 문서 | 관리자 전용 레거시 기록, 신규 생성 차단 |
| visitorStats | 날짜 문서 | count 읽기/통계. 현재 코드에서 생성 경로는 확인되지 않음 |

## 설정 문서

- settings/main: heroImageUrls, heroTitle, heroSubtitle, splashImageUrl 등.
- settings/launchPopup: enabled, startsAt, endsAt, images, 한국어/영어 문구, href 등.
- settings/commerce: 판매·배송·입금·정책. vietnam 내부에 베트남 설정.
- settings/admin: adminUids. 이메일 목록이 아님.
- settings/catalog: queryVersion 등 목록 조회 기능 설정.

## ERD 핵심 관계

- categoryMasters 1 → products 0..N. 상품은 분류 문서 ID가 없고 코드만 있는 레거시 형태도 가능.
- products 1 → inventory 0..N. inventory 1 ↔ stockAvailability 1 (현재 서버 저장 경로 기준).
- inventory 1 → inventoryMovements 0..N.
- orders 1 → items 1..N (내장 배열). 각 항목은 productId 및 variantId 참조와 상품명·가격·수량 사본을 보관.
- Auth 계정 1 → users 0..1, orders 0..N, userCoupons 0..N. 비회원 orders는 userId가 null.
- orders 1 → orderEvents 1..N (v2 생성 이벤트 포함).
- coupons 1 → userCoupons 0..N, couponUses 0..N, orders 0..N. 주문은 쿠폰을 선택적으로 하나 사용.
- userCoupons/couponUses는 회원+코드 조합당 문서 하나. 코드 직접 사용 쿠폰은 발급 문서가 없어도 사용 가능; autoIssue 쿠폰은 보유 검증.
- 주문 취소 시 couponUses released 및 userCoupons 연결을 해제하고 쿠폰 사용 수를 되돌림. 환불과 미입금 취소는 서로 다른 처리.

SVG는 `scripts/build-manual-diagrams.mjs`에서 생성한다. 산출물은 `public/guide/diagrams/`에 있으며 외부 렌더러가 필요 없다.

## 처리 경로와 권한

- 화면: React 19/Vite 8, HashRouter, Auth/Cart/Language 상태. Vercel 및 Firebase Hosting에 정적 빌드 배포.
- 주요 상품·공개 재고·설정은 읽기 공개, 관리자만 설정 변경. 개인 프로필과 보유 쿠폰은 본인 직접 읽기.
- 상품·설정·쿠폰 행사·문의/리뷰는 SDK + 보안 규칙을 통해 클라이언트에서 처리.
- 주문·재고·쿠폰 사용/발급은 Cloud Functions가 권한 및 조건 검증 후 트랜잭션 처리. Admin SDK의 검증은 규칙과 별개.
- 계정 생성 이벤트로 자동 쿠폰 발급, 5분 예약 작업으로 v2 미입금 만료 처리.
- 주문 생성 시 가격·배송비·쿠폰·재고를 재검증하고 주문/예약/공개 수량/쿠폰/이력을 함께 확정.
- 현재 신규 판매 통화는 VND, 베트남 수기 입금 운영. App Check는 키 설정 시 초기화되는 선택 기능이며 필수 접수 조건이 아님.
- 파일은 products/, details/, settings/, users/{uid}/reviews/ 경로에 저장. 장바구니·찜·복구 정보 일부는 브라우저 로컬 저장이며 Firestore 컬렉션이 아님.

## 검토 근거

`functions/index.js`, `commerce.js`, `couponWallet.js`, `couponGrants.js`, `members.js`, `firestore.rules`, `storage.rules`, `ProductEditor.jsx`, `AdminCoupons.jsx`, `AdminLaunchPromotion.jsx`, `AuthContext.jsx`, `measurementGuide.js`, `catalogQuery.js` 및 각 조회 훅.

이전 계약 문서에 남은 과거 App Check 필수/한국 판매 조건은 현재 동작과 구분해야 한다. 레거시 데이터는 자동 이전하지 않으며 표는 현재 코드의 구조이지 모든 운영 문서의 필드가 동일하다는 보장이 아니다.
