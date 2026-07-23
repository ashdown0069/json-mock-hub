# JSON Mock Hub — Web (Frontend)

스키마를 정의하면 곧바로 호출 가능한 **Mock API**를 만들어 주는 서비스의 프론트엔드입니다.
스키마 빌더 · 실시간 파일 트리 · 클라이언트 코드 생성 · 다국어 · 권한(RBAC) · AI(MCP) 연동을 다룹니다.

> 모노레포(Turborepo)의 `apps/web`. 백엔드는 [`apps/api`](../api), AI 연동은 `apps/mcp`.

---

## 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| 프레임워크 | **Next.js 15 (App Router)**, **React 19** |
| 서버 상태 | **TanStack Query v5** (query key 팩토리, 전역 `MutationCache.onError`, staleTime 전략) |
| 클라이언트 상태 | **Zustand v5** (`useShallow` 셀렉터, devtools) |
| 폼/검증 | **react-hook-form** + **zod** |
| UI | **shadcn/ui** (공용 `@workspace/ui`), **Tailwind CSS v4**, lucide-react |
| 트리/DnD | **react-arborist**, @dnd-kit |
| 코드 하이라이트 | **shiki** |
| 국제화 | **next-intl** (ko/en, `localePrefix: as-needed`) |
| 테스트 | **Jest** + React Testing Library |

---

## 핵심 기능

- **스키마 빌더** — 필드/타입/중첩 구조를 UI로 정의하고, faker 기반 목 데이터를 미리보기.
- **파일 트리 탐색기** — react-arborist로 폴더/Mock API를 트리로 관리(인라인 rename, 드래그 이동, 권한별 액션).
- **실시간 동기화** — **SSE**로 다른 세션의 생성/이동/삭제를 실시간 반영.
- **클라이언트 코드 생성** — 저장된 스키마로 TypeScript 타입 · fetch/axios 클라이언트 · TanStack Query 훅 · zod/yup/joi 검증 코드를 shiki로 렌더.
- **권한(RBAC)** — owner/member 역할과 세부 권한(canCreate/canRename/canUpdate/canDelete/canMove)에 따라 UI 게이팅.
- **다국어** — 한국어/영어. 기본 로케일(ko)은 URL 접두사 생략.
- **MCP 연동 가이드** — AI 클라이언트(Claude 등)에서 Mock API를 다루는 설치·사용법 페이지.

---

## 아키텍처

### Feature-Sliced 구조
도메인별로 `api / components / hooks / store / schema / types`를 한 폴더에 모읍니다.

```
apps/web/
├── app/[locale]/                 # App Router (route groups로 인증/대시보드/탐색기 분리)
│   └── (root)/(dashboard)/workspaces/[workspaceId]/
│       ├── (explorer)/apis|code  # 좌측 트리 + 상세/코드 패널
│       ├── settings               # 멤버·권한·API 키
│       └── mcp                    # MCP 설치·사용법
├── features/
│   ├── file-browser/             # 트리, SSE, 이동/생성 훅
│   ├── mock-api/                 # 스키마 빌더, 생성 다이얼로그, 상세
│   ├── code-gen/                 # 코드 생성 패널
│   ├── workspace / workspace-settings / auth / dashboard / mcp-guide / landing
├── hooks/                        # useWorkspaceBasePath, useMyPermissions ...
├── lib/                          # axios(인터셉터), queryKeys, localePath ...
└── messages/                     # ko.json / en.json
```

### 설계 포인트 (면접 대비 요약)
- **데이터 계층**: `lib/queryKeys.ts`의 쿼리키 팩토리로 캐시 키를 일원화하고, `QueryProvider`에서 전역 mutation 에러를 토스트로 처리해 무음 실패를 제거.
- **인증**: `lib/axios.ts`의 인터셉터가 401 시 refresh 토큰으로 재발급하고 대기열(경쟁 상태)을 제어.
- **상태 분리**: Zustand 스토어는 `useShallow`로 필요한 슬라이스만 구독해 불필요한 리렌더를 차단.
- **경로 규칙**: `localePath`/`useWorkspaceBasePath`로 로케일 접두사 규칙을 한 곳에서 관리.

---

## 실행 방법

### 요구사항
- Node.js 20+
- 실행 중인 백엔드([`apps/api`](../api))

### 환경 변수 (`apps/web/.env.local`)
| 변수 | 설명 | 예시 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_BACKEND_URL` | API 서버 주소(axios baseURL) | `http://localhost:4001` |
| `NEXT_PUBLIC_MOCK_DOMAIN` | Mock API 서빙 도메인 | `localhost:4001` |

### 명령어
```bash
# 모노레포 루트에서
npm install

# 개발 서버 (포트 4000, Turbopack)
npm run dev -w apps/web        # 또는 turbo dev

# 타입체크 / 린트 / 테스트
npm run typecheck -w apps/web
npm run lint -w apps/web
npm run test -w apps/web       # Jest + RTL

# 프로덕션 빌드
npm run build -w apps/web
```

앱은 http://localhost:4000 에서 뜹니다.

---

## 테스트

Jest + React Testing Library로 컴포넌트·훅·유틸을 검증합니다. next-intl/shiki 등 ESM 의존은 테스트에서 목킹합니다.

```bash
npm run test -w apps/web
npm run test:coverage -w apps/web
```

---

## 공용 패키지

`@workspace/ui`(shadcn 컴포넌트), `@workspace/types`(스키마 도메인 타입), `@workspace/mockgen`(목 데이터 생성), `@workspace/codegen`(클라이언트 코드 생성)을 웹·API·MCP가 공유합니다.
