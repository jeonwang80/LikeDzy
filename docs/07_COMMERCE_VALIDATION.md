# 주문·재고 작업 복구 및 검증 기록

검증일: 2026-09-05 (한국 시간). 새 대화에서 이전 작업을 이어받아 로컬 코드와 격리 환경을 검증했다. 운영 배포, 실제 고객·주문·재고 변경, 유료 백업 설정은 수행하지 않았다.

## 완료된 범위

- 주문·재고 서버 처리, 관리자 권한, 비회원 복구·조회, 정책 화면, 상품 링크 및 이미지·조회 최적화의 기존 변경을 유지했다.
- 상품 전환 시 이전 재고를 숨기고, 계정/주문 ID 전환 시 조회 화면 상태를 초기화한다. 관리자 주문 목록은 현재 필터·페이지의 응답이 올 때까지 로딩 상태를 표시한다.
- 색상 선택창은 열기 이벤트에서 초깃값을 설정한다. 개인 주문 조회는 오래된 비동기 응답을 무시한다.
- 관리자 현금영수증 정보는 새 주문의 `cashReceipt.type/identity`를 표시하며 구버전 필드도 읽는다.
- Functions의 날짜·서버 시각 생성은 `firebase-admin/firestore`의 `Timestamp`와 `FieldValue`를 직접 가져온다. 기존 네임스페이스 접근 오류가 실제 호출 테스트에서 발견되어 수정됐다.
- Storage 후기 사진의 신규 업로드 조건에 `resource == null`을 추가해 기존 파일 덮어쓰기를 명시적으로 차단한다.

## 검증 결과

- `npm run lint`: 통과.
- `npm run build`: 통과.
- 모든 에뮬레이터 연결 후 `node --test --test-concurrency=1 functions/test/*.test.js`: **42개 통과, 실패 0, 건너뜀 0**. 이 수치는 하위 테스트를 담는 상위 테스트 2개도 포함한다.
- 핵심 주문 테스트 25개, Firestore 동시성 통합 테스트 1개, 실제 callable 어댑터 테스트 1개, Firestore 권한 하위 테스트 9개, Storage 권한 하위 테스트 4개.
- 실제 트랜잭션으로 중복 요청, 마지막 재고 경쟁, 응답 유실 후 복구, 미입금 만료, 취소된 시도의 지연 재접수를 검사했다.
- 브라우저에서 합성 상품 상세 진입/새로고침, 색상·사이즈 장바구니, 배송비 3,000원과 합계 42,000원, 최신 재고 확인, 비회원 주문 접수, 실패 요청 복구, 주문 조회 및 새로고침 후 복원을 확인했다.
- 관리자 합성 계정 로그인, 신규 주문 목록·상세·상태 필터 표시와 상세창 닫기를 확인했다.
- 테스트용 데이터는 `TEST ONLY` 이름·주소·계좌 및 `example.test` 이메일만 사용했다.

## 로컬 재현

Java 21 이상, Node와 설치된 Firebase CLI가 필요하다. 이번 실행은 호스트 Node 24를 사용했다. 배포 대상 Node 22와 동일한 런타임에서의 검증은 별도로 필요하다. CLI의 Functions SDK 버전 경고는 남아 있다.

PowerShell에서 환경 변수는 현재 테스트 프로세스에만 설정한다. `.local-tools`는 Git에서 제외한다. 실제 Firebase 로그인 파일을 사용하지 않도록 별도 CLI 설정 디렉터리를 사용한다.

```powershell
$env:JAVA_HOME = Join-Path (Get-Location) '.local-tools/java-21/jdk-21.0.12.1+1'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
$env:JAVA_TOOL_OPTIONS = '-Duser.language=en -Duser.country=US'
$env:FIREBASE_EMULATORS_PATH = Join-Path (Get-Location) '.local-tools'
$env:XDG_CONFIG_HOME = Join-Path (Get-Location) '.local-tools/firebase-config'
$env:METADATA_SERVER_DETECTION = 'none'
firebase emulators:start --only firestore,auth,functions,storage --project demo-likedzy --config firebase.emulators.json
```

Java의 한국어 로케일에서는 Firestore 1.21.0 규칙 오류 메시지 리소스 누락으로 쿼리가 실패할 수 있어 실행 프로세스만 영어로 설정한다. 시스템 언어 설정은 변경하지 않는다.

에뮬레이터가 모두 준비된 뒤 다른 터미널에서 실행한다.

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
$env:FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199'
$env:FUNCTIONS_EMULATOR_HOST = '127.0.0.1:5001'
node functions/test/seed-demo.cjs
node --test --test-concurrency=1 functions/test/*.test.js
$env:VITE_USE_FIREBASE_EMULATORS = 'true'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
```

로컬 관리자: `admin@example.test`, 고객: `customer@example.test`. 합성 계정 비밀번호는 seed 스크립트에 명시돼 있다. 운영 계정과 무관하다. 테스트 파일은 공유 에뮬레이터를 사용하므로 순서대로 실행하며, 동시 주문 테스트 내부의 병렬 요청은 유지한다.

## 운영 반영 전에 남은 항목

1. 운영 사업자·계좌·약관·개인정보·반품 정책과 구매안전서비스 확인, App Check 설정.
2. 기존 색상별 재고의 실사·등록 및 구버전 주문 이전 계획. 기존 공통 재고를 색상별로 자동 분배하지 않는다.
3. 백업·시점 복구·삭제 방지·예산 알림·TTL 보존 정책의 운영 설정.
4. Rules·색인·Functions 배포, 기존 `verifyPayment` 함수 정리 후 호환 프런트엔드 배포. 이 문서는 배포 승인을 의미하지 않는다.
5. 운영 색인 생성 완료, App Check 및 Storage 교차 서비스 권한, 예약 만료 함수의 실제 스케줄 호출을 확인한 뒤 판매 접수 개방.

에뮬레이터는 운영 복합 색인의 준비 상태와 과금 설정을 검증하지 않는다. 자동 만료 로직은 테스트했지만 이번 실행에는 Pub/Sub 스케줄 실행을 포함하지 않았다. 은행 송금·현금영수증 외부 발급·고객 알림은 자동 연동이 아닌 운영자 처리/기록 범위다. 기존 이미지 일괄 변환, 오래된 Storage 파일 정리와 카탈로그 데이터 이전도 수행하지 않았다.
