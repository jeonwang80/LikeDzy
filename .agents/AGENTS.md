# LikeDzy 프로젝트 운영 규칙

## 🚀 배포 규칙 (Vercel 운영 배포)

### ⚠️ 핵심: Vercel 배포 대상 브랜치는 `master`
- Vercel은 **`master` 브랜치**를 감시하여 자동 빌드/배포를 수행합니다.
- GitHub에 `origin/main`과 `origin/master` 두 개의 리모트 브랜치가 존재합니다.
- **운영 배포 시 반드시 `git push origin master` 명령을 사용해야 합니다.**
- `git push origin master:main` 만 실행하면 `main` 브랜치에만 푸시되어 **Vercel 배포가 트리거되지 않습니다.**

### 운영 배포 명령 순서
```bash
# 1. 빌드 확인
cmd /c "npm run build"

# 2. 스테이징 및 커밋
cmd /c "git add . && git commit -m \"feat/fix: 변경 사항 설명\""

# 3. 운영 배포 (master 브랜치 푸시 — Vercel 자동 배포 트리거)
cmd /c "git push origin master"

# 4. main 브랜치 동기화 (선택, 권장)
cmd /c "git push origin master:main"

# 5. ⚡ Git 웹훅 누락/미동작 시 Vercel CLI 직통 강제 배포 (즉시 프로덕션 반영)
cmd /c "npx vercel --prod --yes"
```

### ⚡ Vercel Git 웹훅 미동작 시 즉각 대응 지침
- GitHub `git push` 후 Vercel 대시보드에 배포가 트리거되지 않거나 멈춰있는 경우(Git 재연동 시 웹훅 누락 등):
  - 즉각 `cmd /c "npx vercel --prod --yes"` 를 실행하여 Vercel 프로덕션으로 즉시 강제 직접 배포합니다.

### PowerShell 실행 정책 제한
- 이 환경에서는 PowerShell에서 `npm` 직접 실행 시 `UnauthorizedAccess` 에러가 발생합니다.
- 반드시 `cmd /c "npm run build"` 형태로 cmd를 통해 실행해야 합니다.

---

## 🏗️ 기술 스택 요약

| 구분 | 기술 |
|------|------|
| Frontend | React 19 + Vite 8 |
| Backend/DB | Firebase Firestore |
| Auth | Firebase Auth |
| Storage | Firebase Storage |
| Routing | React Router v7 (HashRouter) |
| AI | @gradio/client (IDM-VTON) |
| Deploy | Vercel (master 브랜치 자동 배포) |

---

## 📐 코드 작성 규칙

### Firestore 실시간 데이터 연동
- 어드민에서 설정한 데이터를 메인 화면에 반영할 때는 `getDoc` 대신 **`onSnapshot` 실시간 구독**을 사용하여, 새로고침 없이도 즉시 반영되도록 합니다.

### CSS 인라인 스타일 제약
- React JSX의 `style={{}}` 내부에 `!important`를 넣으면 해당 스타일이 무시됩니다.
- 우선순위 지정이 필요하면 반드시 외부 CSS 파일에서 클래스로 정의합니다.

### 내부 문서 동기화
- 기능 변경 시 `docs/` 폴더의 관련 문서도 함께 업데이트합니다.
