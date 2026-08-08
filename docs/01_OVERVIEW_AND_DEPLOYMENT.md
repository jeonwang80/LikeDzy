# 01. 개요와 배포

## 기술 구성

- React 19 + Vite 8
- React Router `HashRouter`
- React Context: 인증, 장바구니, 언어
- Firebase: Auth, Firestore, Storage, Cloud Functions
- Vercel: 정적 프런트엔드 배포
- Vanilla CSS: 공통 토큰과 컴포넌트별 반응형 스타일

## 주요 디렉터리

```text
LikeDzy/
├─ src/
│  ├─ components/        스토어프론트 공용 UI
│  ├─ pages/             고객/관리자 화면
│  ├─ context/           AuthContext, CartContext
│  ├─ i18n/              언어 상태와 번역
│  ├─ utils/             상품 표시값 정규화
│  ├─ firebase.js        Firebase 클라이언트 초기화
│  ├─ admin.css          관리자 화면 스타일
│  └─ index.css          전역 토큰과 공통 스타일
├─ functions/            결제 검증 Cloud Functions
├─ public/               런타임 정적 자산
├─ docs/                 개발 문서
├─ firebase.json
├─ vercel.json
└─ vite.config.js
```

루트의 `DESIGN-nike.md`와 파일명에 `golf`가 포함된 일부 이미지는 과거 레퍼런스/원본 자산입니다. 현재 화면 카피와 코드의 디자인 방향은 일반 아웃도어입니다. 데이터·자산 교체가 끝나면 별도 정리합니다.

## 로컬에서 운영까지

1. 기능 브랜치에서 `npm run dev -- --host 127.0.0.1`로 작업합니다.
2. 데스크톱과 모바일 화면을 확인합니다.
3. `npm run lint`와 `npm run build`를 통과시킵니다.
4. 변경 내용을 리뷰하고 커밋합니다.
5. 승인 후 `master`에 반영합니다.
6. Vercel이 `master`를 감시하므로 푸시 전 운영 배포 여부를 확인합니다.

Firebase 배포와 데이터 수정은 프런트엔드 배포와 분리합니다. 환경값은 로컬 환경 파일이나 Vercel 환경 변수로 관리하며 문서와 커밋에 실제 키를 기록하지 않습니다.

## 현재 보류 범위

- 주문 처리 흐름 고도화
- 재고 차감/복원 정책 변경
- 리뷰 및 Q&A 기능 확장
- Firebase 스키마/보안 규칙 변경
