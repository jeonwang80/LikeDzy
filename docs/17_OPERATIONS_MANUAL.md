# 운영 매뉴얼

- 공개 주소: https://likedzy.com/guide/
- 소스: `public/guide/index.html`, `guide.css`, `guide.js`
- 기준: 2026-10-05 구현된 스토어/관리자 기능
- 관리자 상단의 운영 매뉴얼 링크로 새 탭에서 접근 가능
- 독립 정적 HTML이며 로그인 정보나 고객/주문 데이터는 조회하지 않음. 검색엔진에는 noindex, nofollow 지정. 관리자 바로가기는 기존 권한 검사 적용.
- 메뉴별 작업 순서, 베트남 수기 입금, 현재 옵션 재고, 쿠폰 지급 및 수정, 사이즈 유형, 팝업, 문의, 전표, PWA 안내 포함.
- 검색은 공백으로 구분한 검색어를 모두 포함하는 주제를 표시하고 상세 설명을 펼침. 검색 해제 시 접힘 상태 복원.
- 반응형 목차, 현재 위치 표시, 인쇄/PDF용 전체 문서 스타일 제공.
- 기능 변경 시 본문과 기준일을 함께 갱신. 실제 계좌번호, 고객정보, 관리자 UID, 비밀키는 문서에 넣지 않음.
- Vercel SPA rewrite에서 `/guide/` 제외. Firebase Hosting은 실제 정적 파일 우선 제공.

## 시스템 구조 및 ERD 확장

- `#architecture`: 호스팅, React 화면, Auth, Cloud Functions, Firestore, Storage, 자동 트리거 구성과 주문 트랜잭션 흐름.
- `#erd`: 상품/재고와 회원/주문/쿠폰 논리 ERD. Firestore는 FK를 강제하는 관계형 DB가 아님을 명시. orders.items[]는 내장 배열, Auth는 별도 서비스로 표현.
- `#data-reference`: 주요 필드, 보조 컬렉션, 문서별 설정, 읽기/쓰기 권한, 로컬 브라우저 데이터 설명.
- SVG 원본 생성: `node scripts/build-manual-diagrams.mjs` → `public/guide/diagrams/*.svg`. 외부 라이브러리/CDN 의존성 없이 표시·인쇄 가능.
- 작은 화면에서는 그림 영역만 가로 스크롤, SVG 새 탭 크게 보기와 텍스트 관계표 제공.
- 필드·관계는 실제 소스와 규칙에서 검토. 계정 목록은 Auth, 사용자 프로필은 users에 분리. 쿠폰 발급 사본과 최신 행사 조건, 사용 상태 문서와 주문 이벤트를 구분.

## 운영 반영 확인

- 소스 커밋: `efb19e8`.
- 빌드, AdminLayout lint, 매뉴얼 JS 구문 검사 통과.
- PC 1280px / 모바일 390px에서 레이아웃 검수. 가로 넘침 없음, 내부 앵커 누락 없음, 검색·빈 결과·초기화·모바일 목차 이동 확인.
- Vercel Production `dpl_2y1NMSRVA7GNxnLW87k9RbRhEfgK` READY 확인.
- 배포 주소: https://likedzy-7u4tpak0o-jeonwang80-6811s-projects.vercel.app
- Firebase Hosting 배포 완료.
- likedzy.com, www.likedzy.com, likedzy-store.web.app에서 `/guide`, `/guide/`, CSS, JS 응답 200과 로컬 파일 내용 일치 확인.
- 운영 진입 번들 `/assets/index-LJybrhsR.js` 일치 확인.
