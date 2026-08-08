# LikeDzy

기술적 기능성과 일상성을 결합한 아웃도어 의류 브랜드의 React 스토어프론트입니다. 상품·히어로 콘텐츠는 Firebase에서 읽고, 프런트엔드는 Vercel에 배포하는 구조입니다.

## 로컬 작업

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

브라우저에서 `http://127.0.0.1:5173`을 엽니다.

변경 전후에는 아래 검증을 실행합니다.

```powershell
npm run lint
npm run build
npm run preview
```

## 작업 원칙

- 기능 브랜치에서 개발하고 로컬에서 화면·린트·빌드를 확인합니다.
- Firebase 데이터와 규칙 변경은 별도 작업으로 관리합니다.
- `master` 반영 전 리뷰하며, `master` 푸시는 Vercel 운영 배포를 유발할 수 있습니다.
- 주문·재고·리뷰·Q&A 로직은 현재 보존 영역입니다. 우선순위는 상품 등록, 상품 노출, 메인/컬렉션/상세 화면입니다.

상세 구조와 데이터 필드는 [docs/README.md](docs/README.md)를 참고하세요.
