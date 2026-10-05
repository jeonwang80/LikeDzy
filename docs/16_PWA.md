# LIKEDZY PWA

- 앱 이름/시작 주소: LIKEDZY, `/#/`, 범위 `/`. 설치 시 독립 창으로 연다.
- 아이콘: 기존 브랜드 로고를 정사각형 배경에 배치한 192/512px PNG, 마스커블 512px, iOS 180px. 마스커블 로고는 중앙 안전 영역 안에 둔다.
- 스토어 하단 `LIKEDZY 앱 설치`: 설치 이벤트 지원 브라우저는 사용자 클릭으로 설치 창을 연다. 이벤트 미지원 또는 설치 불가능 상태는 Safari/Chrome/Edge 설치 안내를 보여준다. 설치된 앱 창에서는 버튼을 숨긴다. 한국어/영어 지원.
- `src/utils/pwa.js`는 초기 렌더 전에 설치 이벤트를 수집한다. 운영 빌드의 보안 연결(HTTPS 또는 localhost)에서 `/sw.js`를 등록한다. 기존 서비스 워커 일괄 해제 코드는 제거했다.
- 서비스 워커는 `/offline.html`만 캐시한다. HTML 탐색은 항상 네트워크를 사용하며 네트워크 실패 시 일반 연결 안내 화면을 제공한다. 상품·가격·재고·회원·주문·쿠폰·API·사진·JS 번들은 캐시하거나 오프라인 요청을 재전송하지 않는다. Firebase 인증 `/__/` 경로도 가로채지 않는다.
- 새 서비스 워커는 즉시 활성화해도 현재 페이지를 새로고침하지 않는다. 앱 복귀와 온라인 전환 시 업데이트를 확인한다. 온라인 재접속은 `다시 시도`로 원래 주소를 새로고침한다.
- 캐시 버전 변경 시 `likedzy-pwa-` 접두어의 이전 캐시만 제거한다. 연결 안내 페이지 변경 시 `public/sw.js`의 `CACHE_NAME` 버전을 올린다.
- Vercel rewrite에서 sw.js/manifest.webmanifest/offline.html/pwa 아이콘을 제외한다. Firebase Hosting도 서비스 워커와 manifest에 재검증 헤더를 제공한다. 배포 시 정적 파일의 MIME/본문을 확인한다.
- 개발 서버에서는 워커를 등록하지 않는다. `npm run build` 후 `npm run preview`로 설치/오프라인 동작을 확인한다. 실제 설치 지원은 OS/브라우저에 따라 다르며 앱스토어 배포나 푸시 알림은 포함하지 않는다.

참고: [MDN 설치 조건](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [web.dev 설치 프롬프트](https://web.dev/learn/pwa/installation-prompt).

## 검증 — 2026-10-05 (운영 미배포)

- 운영 빌드 및 변경 JS/JSX lint 통과. 서비스 워커 캐시 경계·탐색 실패·API 우회·manifest/아이콘/rewrite·설치 이벤트 테스트 5개 통과.
- 로컬 운영 빌드를 브라우저에서 열어 서비스 워커 `/sw.js` 등록, `activated`, 페이지 제어를 확인했다.
- 모바일 390px 설치 안내 표시/닫기, 데스크톱 영어 전환, 320px 연결 안내에서 가로 넘침 없음을 확인했다.
- 기기에 앱을 실제로 설치하는 OS 단계 및 운영 HTTPS 도메인 반영은 아직 수행하지 않았다.
