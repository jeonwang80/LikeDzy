# 운영 배포 기록 — 2026-09-06

사용자가 수정사항의 운영 배포를 명시적으로 요청하여 수행했다. 이전 검증 문서의 미배포 표시는 2026-09-05 검증 당시 상태이며 이 기록으로 갱신한다.

- 애플리케이션 배포 커밋: `10c5df211b28e335ce36a3d9d11ccd29676f29a0`.
- GitHub `origin/master`에 푸시했다. 로컬 `master`의 추적 브랜치도 `origin/master`로 정리했다.
- Firebase 프로젝트: `likedzy-store`. Firestore·Storage 보안 규칙 및 색인 배포 성공.
- `createBankTransferOrder`, `getOrder`, `setVariantStock`, `updateOrder`, `expireBankTransferOrders`: 모두 Node.js 22, `us-central1`, `ACTIVE` 확인.
- 기존 `verifyPayment` 함수는 배포 전 운영 함수 목록에 존재하지 않아 별도 삭제하지 않았다.
- 미입금 만료용 `(schemaVersion, status, depositDeadlineAt)` 색인을 추가 배포하고 기존 `reviews` 색인을 보존했다. 기존 색인을 삭제하는 `--force`는 사용하지 않았다.
- 예약 함수에 필요한 Cloud Scheduler API가 Firebase 배포 과정에서 활성화됐다.
- Vercel 배포: `dpl_CNyJM2pD5UTZE7C2oELtWHgmdDro`, Production / Ready.
- 배포 주소: https://likedzy-a50r6pdzn-jeonwang80-6811s-projects.vercel.app
- 운영 주소: https://www.likedzy.com 및 https://likedzy.com
- 운영 HTML·JavaScript 응답 200. 운영 진입 번들 `/assets/index-DaiyueDP.js`가 로컬 검증 빌드와 일치하며 OrderLookup·PolicyPage 포함을 확인했다.

## Vercel 배포 방식에서 확인한 차이

이번 `master` 푸시는 웹훅으로 자동 빌드됐으나 Preview로 생성됐다. 현재 원격 프로젝트 설정과 기존 `.agents/AGENTS.md`의 “master 자동 운영 배포” 설명이 일치하지 않는다. 프로젝트의 브랜치 설정을 임의로 변경하지 않고, 해당 새 배포를 Vercel CLI `promote`로 운영에 반영했다. 향후 배포에서도 환경이 Production인지 확인해야 한다.

## 판매 개방과 데이터 관련 상태

- 운영 Vercel 환경 변수 목록이 비어 있어 App Check 사이트 키가 미설정 상태다. 일반 고객 주문 개방 조건은 충족되지 않았다.
- 실제 색상×사이즈 재고 등록, 구버전 주문 이전, 사업자·계좌·정책 확인, 백업·TTL·예산 알림 등은 별도 운영 작업으로 남는다.
- 이번 배포에서는 고객·실재고 데이터를 직접 수정하거나 테스트 주문을 생성하지 않았다. 예약 만료 함수는 배포 이후 새 구조의 미입금 주문에 대해 정상 운영 로직을 실행할 수 있다.
- 운영에서 실제 송금·현금영수증 발급·고객 알림 전송을 시험하지 않았다. 에뮬레이터 테스트 결과와 배포 상태 확인을 구분한다.

직전 운영 프런트엔드 배포는 `dpl_7VsGpFsPE5KiEAN9eVhtmS2aSiQD`였다. 서버·규칙과 화면 계약이 함께 변경됐으므로 프런트엔드만 이전 버전으로 되돌리는 조치는 호환성 확인이 필요하다.

# 한국어 KRW / 영어 VND 운영 반영 — 2026-09-28

- 변경 커밋: `e8b9d2d`, origin/master 푸시 완료.
- Firebase likedzy-store의 주문/조회/재고/관리/만료 함수 5개 업데이트 및 Deploy complete 확인.
- Vercel master Preview 빌드 후 promote 실행. 새 Production 배포 `dpl_6ozcyxo3jfmgthbNywSnRxRzWUUf` Ready 확인.
- 운영 배포 URL: https://likedzy-mx85licl5-jeonwang80-6811s-projects.vercel.app
- https://www.likedzy.com HTTP 200, 진입 번들 `/assets/index-CElXeHlx.js` 로컬 검증 빌드 일치.
- lint 및 build 통과. 전체 에뮬레이터 포함 테스트 46개 통과. 첫 기동 시 callable 테스트 1건 시간 초과 후 단독 및 전체 재실행 성공.
- 로컬 UI에서 KRW 39,000원과 EN VND 700,000동 전환, VND 장바구니, 영어 주문서와 베트남 설정 미완료 시 주문 차단 확인.
- 실제 운영 가격·계좌·배송비·정책·재고와 판매 개방 설정은 변경하지 않음. VND 주문 접수에는 관리자 베트남 설정 및 기존 App Check/재고 준비가 필요함.

## 2026-10-04 주문 화면 개선 및 App Check 선택 기능 운영 배포

- App Check 공개 사이트 키가 없어도 주문 접수·주문 조회·쿠폰 적용을 이용할 수 있도록 클라이언트와 주문 API의 필수 검사를 해제했다.
- 사이트 키를 설정한 경우에는 기존 App Check 초기화를 계속 사용한다.
- 주문 API의 요청 횟수 제한, 회원/비회원 주문 접근 검증, 서버 가격·재고·쿠폰 재검증, 중복 주문 방지는 유지한다.
- 일반 고객 주문을 개방하려면 사업자·계좌·정책 및 실제 재고·국가별 판매 설정을 완료해야 한다.
- 소스 커밋: 5a4994c. 관련 테스트 42개, 변경 파일 lint 및 운영 build 통과.
- Firebase 운영 createBankTransferOrder, quoteCoupon, getOrder 업데이트 및 Hosting 배포 완료.
- Vercel Production: dpl_6YGnfoxZa2HedVGsJ6DNEz72HysB, https://likedzy-88z52q28l-jeonwang80-6811s-projects.vercel.app
- likedzy.com 및 www.likedzy.com HTTP 200, 진입 번들 /assets/index-DHNCQl4b.js 일치. 베트남 QR 이미지 image/png, 318163바이트 제공 확인.
- App Check 토큰 없는 빈 주문·조회 요청은 INVALID_ARGUMENT, 비로그인 쿠폰 조회는 UNAUTHENTICATED 응답 확인. 실제 주문 생성이나 쿠폰 지급 없이 검증했다.
- 베트남 계좌/QR 안내와 자동 가격·재고 확인, 쿠폰 할인 적용 개선을 함께 배포했다. 판매 기준정보와 주문 개방 설정은 직접 변경하지 않았다.

## 2026-10-04 베트남 초기 수기 입금 주문 운영 배포

- 사용자 요청에 따라 베트남 수기 입금 모드를 추가했다. 설정 문서가 없으면 사용자 제공 Shinhan Bank Vietnam / JUN HONG / 700-010-577080 계좌, 무료배송, 기존 48시간 입금기한으로 주문을 접수한다.
- 설정이 이미 존재하는 경우 저장된 국가별 설정을 존중하며, 명시적으로 중지한 베트남 주문을 자동으로 다시 켜지 않는다.
- 수기 모드의 주문은 테스트가 아닌 실제 입금 대기 주문이며 기존 관리자 주문 관리에서 입금 확인·배송 상태를 변경한다. 은행 입금은 자동 확인되지 않는다.
- 수기 모드에서는 사업자 및 정책 입력 완료를 주문 접수의 기술적 필수 조건에서 제외한다. 확인 체크나 사업자 정보를 임의로 채우지는 않는다.
- 초기 판매 국가는 베트남으로 제한한다. 배송 국가는 베트남으로 고정하고 한국어·영어 화면 모두 VND 가격을 사용한다. 한국의 저장된 주소는 주문서에 적용하지 않는다.
- 서버에서도 한국 신규 주문을 관리자 계정까지 차단한다. 기존 한국 주문 조회·관리 기능은 유지한다. 관리자 기준정보 저장 시 한국 주문 접수는 중지 상태로 저장한다.
- 베트남 정식 판매 모드는 기존 설정 조건을 유지한다. 가격·재고·쿠폰·주문 접근 권한·요청 횟수 제한은 유지한다.
- 관련 테스트 48개 및 변경 파일 lint/build 통과. 로컬 주문서에서 준비중 안내 제거, 주문 접수 버튼 활성화, 무료배송·기존 계좌/QR 표시를 확인했다. 실제 운영 주문은 테스트로 생성하지 않았다.
- 소스 커밋 907df12. Firebase createBankTransferOrder 및 Hosting 배포 완료. Vercel Production dpl_2xk5WuJVsQk9u6Vtt9PjPgqpCpK7, https://likedzy-ogrmokl1s-jeonwang80-6811s-projects.vercel.app 배포 완료.
- likedzy.com, www.likedzy.com, likedzy-store.web.app HTTP 200 및 진입 번들 /assets/index-BCQLaH8b.js 일치 확인.
- 운영 서버의 불완전한 KRW 요청은 FAILED_PRECONDITION(한국 주문 중지), VND 요청은 INVALID_ARGUMENT(주문 요청 정보 누락)으로 응답했다. 실제 주문을 생성하지 않았다.
- 운영 주문 화면의 배송 국가 베트남 고정, VND 가격, 무료배송, 계좌·QR, 수기 입금 확인 표시를 확인했다. 재고가 없는 장바구니 항목에 대해서는 재고 부족 안내 및 주문 버튼 비활성화를 확인했다.
