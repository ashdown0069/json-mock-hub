# JSON Mock Hub — Web (Frontend)

JSON Mock Hub의 프론트엔드 애플리케이션으로, 스키마 시각적 빌더, 파일 트리 탐색기, 실시간 협업(SSE), 멀티 타겟 코드 자동 생성 패널 및 워크스페이스 관리 대시보드를 제공합니다.

> **모노레포 위치:** `apps/web` · **백엔드 문서:** [`apps/api`](../api/README.md) · **MCP 서버:** [`apps/mcp`](../mcp/README.md)

---

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| **Framework** | **Next.js 15** (App Router, Turbopack) |
| **Core** | **React 19**, TypeScript 5.9 |
| **상태 관리 & 서버 상태** | **TanStack Query v5** (캐싱/동기화), **Zustand** (클라이언트 전역 상태) |
| **폼 & 유효성 검증** | **React Hook Form**, **Zod** (`@hookform/resolvers`) |
| **UI & Styling** | **Tailwind CSS v4**, **shadcn/ui** (`@workspace/ui`), Radix UI, Lucide Icons, Sonner, Vaul |
| **트리 & 코드 하이라이팅** | **react-arborist** (가상화 트리), **Shiki** (구문 강조) |
| **다국어 (i18n)** | **next-intl** (한국어/영어 지원) |
| **테스트** | **Jest**, **React Testing Library** (RTL), `@testing-library/user-event` |
| **공유 패키지** | `@workspace/types`, `@workspace/codegen`, `@workspace/mockgen`, `@workspace/ui` |

---

## ✨ 핵심 기능

- **스키마 시각적 에디터 (`features/mock-api`)** — 필드 추가/수정, 타입 선택, Faker Mock 규칙 매핑, 중첩(Object/Array) 스키마 정의 및 실시간 가상 데이터 생성 미리보기.
- **가상화 파일 브라우저 (`features/file-browser`)** — `react-arborist` 기반으로 대규모 Mock API 및 폴더 트리를 렌더링하며, 인라인 이름 변경, 드래그앤드롭 폴더 이동, SSE 실시간 동기화 지원.
- **멀티 타겟 코드 생성 (`features/code-gen`)** — 정의된 스키마로부터 TypeScript 인터페이스, Fetch/Axios 클라이언트, TanStack Query 훅, Zod/Yup/Joi 검증 스키마를 즉시 생성 및 복사.
- **워크스페이스 & RBAC 대시보드 (`features/workspace`, `features/workspace-settings`)** — 워크스페이스 생성/초대/참여, 역할(Owner/Member) 및 5대 세부 권한(Create/Rename/Update/Delete/Move) 제어, API 키 발급/관리.
- **실시간 SSE 동기화** — 백엔드 SSE 스트림을 구독하여 동시 작업자의 생성/이동/수정/삭제 액션을 새로고침 없이 즉각 반영.
- **다국어 지원** — `next-intl` 기반으로 한국어(`ko`)와 영어(`en`) 로케일 라우팅 및 메시지 완벽 지원.

---

## 🏛️ 아키텍처 및 디렉토리 구조

`features/` 도메인 단위 모듈 분리(Feature-Driven Architecture)를 채택하여 관심사를 명확히 분리하였습니다.

```
apps/web/
├── app/
│   └── [locale]/                 # App Router (i18n 로케일 라우트)
│       ├── (auth)/login|register # 인증 페이지 (Route Group)
│       ├── (dashboard)/          # 워크스페이스 메인 및 설정
│       │   ├── [workspaceId]/
│       │   │   ├── (explorer)/   # 트리 탐색기 + Mock 상세/코드 패널
│       │   │   ├── settings/     # 워크스페이스 권한/멤버/API 키
│       │   │   └── mcp/          # MCP 연동 가이드
│       │   └── workspaces/       # 워크스페이스 선택/생성
│       └── layout.tsx            # 전역 레이아웃 (Providers)
├── features/                     # 도메인별 응집 모듈
│   ├── auth/                     # 로그인, 회원가입
│   ├── code-gen/                 # 코드 생성 패널, 타겟별 프리뷰
│   ├── dashboard/                # 요청 로그, 통계 그래프
│   ├── file-browser/             # react-arborist 트리, 드래그앤드롭, SSE 구독 훅
│   ├── landing/                  # 서비스 소개 랜딩 페이지
│   ├── mcp-guide/                # MCP 설치 및 Claude 연동 가이드
│   ├── mock-api/                 # 스키마 빌더 폼, Mock 상세, 생성 다이얼로그
│   ├── workspace/                # 워크스페이스 목록, 생성, 참여 모달
│   └── workspace-settings/       # 멤버 관리, 역할/권한 수정, API 키 관리
├── hooks/                        # 공통 훅 (useWorkspaceBasePath, useMyPermissions ...)
├── lib/                          # axios(인터셉터/토큰갱신), queryKeys, localePath ...
├── messages/                     # 다국어 리소스 (ko.json, en.json)
└── proxy.ts                      # 서브도메인 라우팅 및 프록시 미들웨어
```

---

## 🎯 주요 설계 포인트

1. **401 토큰 갱신 큐잉 (Token Refresh Queue)** — `axios-auth-refresh` 및 인터셉터를 활용하여 Access Token 만료 시 중복 갱신 요청을 방지하고, 대기 중인 모든 요청을 큐에 적재 후 일괄 재시도합니다.
2. **동기화 탄력성 (SSE Resiliency)** — 파일 브라우저의 실시간 변경을 감지하고, 네트워크 단절 시 지수 백오프 기반 재연결 및 낙관적 UI 업데이트(Optimistic Update)를 수행합니다.
3. **타입 안전성 (Type Safety)** — `@workspace/types`를 공유하여 API 스키마, 권한 플래그, Mock 계약의 타입을 프론트엔드 전반에서 컴파일 타임에 검증합니다.

---

## 🚀 실행 방법

### 요구사항
- Node.js >= 20.0.0
- 실행 중인 `apps/api` 백엔드 서버

### 환경 변수 (`apps/web/.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4001
NEXT_PUBLIC_APP_DOMAIN=localhost:4000
```

### 명령어
```bash
# 개발 서버 실행 (Turbopack, 포트 4000)
npm run dev -w apps/web

# 타입 체크
npm run typecheck -w apps/web

# 린트 검사
npm run lint -w apps/web

# 단위/통합 테스트 (Jest + RTL)
npm run test -w apps/web

# 프로덕션 빌드
npm run build -w apps/web
npm run start -w apps/web
```
