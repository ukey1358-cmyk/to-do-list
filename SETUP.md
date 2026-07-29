# 동기화 + 모바일 배포 가이드

이 앱은 두 부분으로 구성됩니다.

- **프론트엔드** (`index.html`): GitHub Pages 에 올려서 모든 기기에서 같은 URL 로 접속
- **백엔드** (`apps-script.gs`): 본인 구글 계정의 스프레드시트에 Apps Script 로 배포 → 데이터 저장소

설정은 한 번만 하면 됩니다.

---

## 1단계 — 구글 시트 + Apps Script 백엔드 만들기

1. https://sheets.google.com 접속 → **빈 스프레드시트** 새로 만들기. 파일명은 자유 (예: "To-Do Sync").
2. 상단 메뉴 **확장 프로그램 → Apps Script** 클릭. 새 탭에서 스크립트 편집기가 열립니다.
3. 기본으로 보이는 `Code.gs` 파일 안의 내용을 모두 지우고, 이 프로젝트의 [apps-script.gs](apps-script.gs) 파일 내용을 통째로 복사해 붙여넣습니다.
4. 파일 상단의 `SHARED_TOKEN` 값을 본인만의 임의 문자열로 바꿉니다.
   - 예: `'k8s2-blue-river-9912'`
   - **이 값을 메모해 두세요.** 3단계에서 다시 씁니다.
5. 💾 (저장) 클릭. 프로젝트 이름을 묻는다면 아무거나 입력 (예: "todo-backend").
6. 우상단 **배포 → 새 배포** 클릭.
   - 톱니바퀴 (⚙) → **웹 앱** 선택
   - 설명: "todo v1" (자유)
   - **다음 사용자로 실행**: `나`
   - **액세스 권한이 있는 사용자**: `모든 사용자` ← 중요
   - **배포** 클릭
7. 권한 검토 창이 뜨면 본인 구글 계정 선택 → "이 앱은 Google에서 확인하지 않았습니다" 화면이 나오면 **고급 → (프로젝트 이름)(으)로 이동** → **허용** 클릭.
8. 배포 완료 화면에 **웹 앱 URL** 이 표시됩니다. `https://script.google.com/macros/s/AKfy.../exec` 형태. **이 URL을 복사해 두세요.**

> **나중에 Apps Script 코드를 수정하면** 반드시 `배포 → 배포 관리 → 연필(편집) → 버전: 새 버전 → 배포` 로 재배포해야 변경이 반영됩니다. URL 은 그대로 유지됩니다.

---

## 2단계 — index.html 에 URL/토큰 채우기

[index.html](index.html) 을 열고 상단의 동기화 설정 부분 (약 596번 라인 근처) 을 수정합니다.

```js
// 변경 전
const SYNC_URL = '';
const SYNC_TOKEN = 'CHANGE-ME-TO-A-RANDOM-STRING';

// 변경 후 (예시)
const SYNC_URL = 'https://script.google.com/macros/s/AKfy.../exec';
const SYNC_TOKEN = 'k8s2-blue-river-9912';  // ← 1단계에서 정한 값과 동일
```

저장 후 `index.html` 을 브라우저에서 열어보면 우상단 뱃지가 **"동기화됨"** (초록) 으로 바뀝니다. 할 일을 추가/체크해 보고, 구글 시트의 `tasks` 탭에 행이 추가되는지 확인합니다.

뱃지 상태:
- 🟢 **동기화됨** — 정상
- 🟡 **동기화 중** — 푸시/풀 진행 중
- 🔴 **오프라인** — 네트워크 끊김 또는 URL/토큰 오류 (로컬에서는 계속 작동, 온라인 복귀 시 자동 푸시)
- ⚪ **로컬 전용** — `SYNC_URL` 이 비어있음

---

## 3단계 — GitHub Pages 로 배포 (모바일 접근)

이미 git repo 상태이므로 원격 저장소만 만들어 푸시하면 됩니다.

### A. GitHub 저장소 만들기
1. https://github.com/new
2. Repository name: 자유 (예: `todo-app`)
3. **Public** 선택 (Pages 무료 사용 조건)
4. README/.gitignore 추가하지 않기 → **Create repository**

### B. 푸시하기 (PowerShell)
GitHub 가 생성 후 보여주는 명령어를 복사해 실행. 보통 이런 형태:

```powershell
git remote add origin https://github.com/<본인계정>/todo-app.git
git add index.html apps-script.gs SETUP.md
git commit -m "Add Google Sheets sync"
git branch -M main
git push -u origin main
```

> ⚠️ `SYNC_URL` 과 `SYNC_TOKEN` 이 커밋에 포함됩니다. Public 저장소라면 누구나 볼 수 있고, 그러면 누구나 시트를 읽고 쓸 수 있습니다. 본인만 쓸 거면 **토큰을 충분히 길고 랜덤하게** (예: `crypto.randomUUID()` 결과) 두면 사실상 안전합니다. 추측 불가하면 URL 도 추측 불가합니다.

### C. Pages 활성화
1. GitHub 저장소 페이지 → **Settings** → 좌측 **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / `(root)` → **Save**
4. 1~2분 후 같은 페이지 상단에 `https://<본인계정>.github.io/todo-app/` URL 이 표시됩니다.

### D. 모바일에서 사용
- 휴대폰 브라우저에서 위 URL 접속
- 사파리/크롬에서 **홈 화면에 추가** → 앱 아이콘처럼 사용 가능
- 데스크탑에서 추가한 할 일이 폰에서 30초 이내 자동 반영 (즉시 보고 싶으면 탭 전환/새로고침)

---

## 동작 원리 (참고)

- **저장 방식**: 매 변경마다 현재 목록 전체를 `tasks` 탭에 덮어씁니다. 항목이 수십~수백 개 수준에선 충분히 빠르고 단순합니다.
- **완료 기록**: 완료로 체크한 항목은 **`완료기록`** 탭에 날짜(yyyy-MM-dd)·중요도·할 일·완료 시각으로 한 줄씩 **누적** 저장됩니다. "완료한 일 비우기"로 목록에서 지워도 기록은 그대로 남으므로, 날짜별로 무엇을 끝냈는지 시트에서 계속 확인할 수 있습니다. 완료를 취소하면 해당 기록만 삭제됩니다.
- **충돌 처리**: 마지막-쓰기-우선. 동시에 두 기기에서 편집하면 늦게 푸시된 쪽이 이깁니다. 단일 사용자 가정.
- **오프라인**: 로컬 `localStorage` 가 항상 유지되므로 오프라인에서도 정상 작동합니다. 온라인 복귀 시 자동 푸시.
- **데이터 위치**: 모든 데이터는 본인 구글 시트에 있습니다. 시트를 직접 편집해도 다음 풀 (최대 30초) 후 반영됩니다.

## 문제 해결

- **"오프라인" 으로 표시됨**
  - 브라우저 콘솔 (F12) 에서 에러 확인
  - `SYNC_URL` 이 `.../exec` 로 끝나는지 확인 (`.../dev` 면 안 됨)
  - `SYNC_TOKEN` 양쪽 동일한지 확인
  - Apps Script 배포 시 "액세스 권한: 모든 사용자" 로 했는지 확인
- **시트가 비어있음 / 새 행이 안 보임**
  - 시트의 **`tasks`** / **`완료기록`** 탭을 확인 (없으면 첫 푸시 때 자동 생성됨)
- **Apps Script 코드를 고쳤는데 반영 안 됨**
  - `배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포` 로 반드시 재배포
