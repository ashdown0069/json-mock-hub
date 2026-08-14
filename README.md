<div align="center">

# 🧩 JSON Mock Hub

**스키마만 정의하면, 즉시 호출 가능한 REST Mock API와 완전한 클라이언트 코드가 생성됩니다.**

프론트엔드 개발자가 백엔드 API 완성을 기다리지 않고도 실제 백엔드와 동일한 REST API 환경에서 개발 및 테스트할 수 있도록 지원하는 풀스택 엔지니어링 플랫폼입니다.
스키마 빌더 · 실시간 협업(SSE) · 다층 권한 제어(RBAC) · 클라이언트 코드 자동 생성 · **AI(MCP) 연동**까지 완벽하게 지원합니다.

<!-- 배포 링크 및 문서 링크 -->
[🔗 라이브 데모](#) · [🎬 데모 영상](#) · [🌐 Frontend 문서](apps/web/README.md) · [⚙️ Backend 문서](apps/api/README.md) · [🤖 MCP Server 문서](apps/mcp/README.md)

`Next.js 15` · `React 19` · `NestJS 10` · `MongoDB` · `Redis` · `TanStack Query v5` · `Turborepo`

</div>

---

## 📸 미리보기

<!--
  화면 GIF/스크린샷 추천:
  (1) 스키마 빌더로 Mock 생성 → 서브도메인 URL 반환
  (2) 파일 트리 실시간 SSE 동기화
  (3) 멀티 타겟 클라이언트 코드 자동 생성
-->
> _여기에 스키마 빌더 · 실시간 트리 · 코드 생성 화면 GIF/이미지를 추가할 수 있습니다._

---

## 💡 해결하고자 하는 문제 (Problem Statement)

프론트엔드 개발 시 백엔드 API 구현이 완료될 때까지 작업이 병목되는 문제를 해결합니다. 기존 목킹 도구는 정적 JSON 파일만 흉내 내는 수준에 그쳐 실제 개발 환경과의 괴리가 컸습니다.

**JSON Mock Hub는 다음과 같이 해결합니다:**
- **동적 가상 데이터 생성**: 필드/타입/중첩(Object/Array) 구조를 UI로 정의하면 `@faker-js/faker` 기반으로 실제와 같은 데이터를 동적으로 생성합니다.
- **서브도메인 기반 실제 REST 엔드포인트**: `{workspaceId}.도메인/api/*` 서브도메인을 통해 목록·단건·페이지네이션·CRUD가 실제로 동작하는 REST 엔드포인트를 제공합니다.
- **End-to-End 코드 자동 생성**: 정의된 스키마로부터 TypeScript 타입, Fetch/Axios 클라이언트, TanStack Query 훅, Zod/Yup/Joi 검증 스키마를 즉시 생성합니다.
- **AI 어시스턴트(MCP) 연동**: Claude, Cursor 등 MCP 지원 AI 클라이언트가 자연어로 Mock API를 생성하고 관리할 수 있습니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
| :--- | :--- |
| 🏗️ **스키마 빌더** | 필드·타입·중첩(Object/Array)을 UI로 정의하고 Faker Mock 데이터를 실시간으로 미리보기 |
| 🌳 **파일 트리 탐색기** | 폴더/Mock API를 트리 구조로 관리 (인라인 편집, 드래그앤드롭 이동, 동일 이름 폴더 자동 병합) |
| ⚡ **실시간 협업 (SSE)** | Server-Sent Events(SSE)로 다른 사용자의 생성/이동/수정/삭제 액션을 실시간으로 브로드캐스트 |
| 🔌 **동적 Mock 서빙** | `{workspaceId}.도메인/api/*` 서브도메인 멀티테넌시로 실제 호출 가능한 CRUD 응답 서빙 |
| 🧑‍💻 **멀티 타겟 코드 생성** | TypeScript Interface · Fetch/Axios 클라이언트 · TanStack Query 훅 · Zod/Yup/Joi 검증 스키마 자동 추출 |
| 👥 **워크스페이스 & RBAC** | Owner/Member 역할 및 세부 권한 플래그(Create/Rename/Update/Delete/Move), 비밀번호 참여, API 키 발급 |
| 🌐 **다국어 지원** | `next-intl` 기반 한국어/영어 완벽 지원 |
| 🤖 **AI MCP 서버 연동** | Model Context Protocol 기반 10종 도구를 통해 AI 어시스턴트에서 자연어로 Mock API 제어 |

---

## 🏛️ 아키텍처 (Architecture)

Turborepo 기반의 모노레포 아키텍처로 구성되어 있으며, 프론트엔드·백엔드·AI 서버가 공용 패키지를 통해 도메인 계약과 엔진을 공유합니다.

```
[ 👤 사용자 (브라우저) ]           [ 🤖 AI 어시스턴트 (Claude/Cursor) ]
         │                                      │
         ▼ (Next.js 웹 UI)                      ▼ (MCP 프로토콜)
 ┌───────────────┐                      ┌───────────────┐
 │   apps/web    │                      │   apps/mcp    │
 │  (Next.js 15) │                      │  (MCP Server) │
 └───────┬───────┘                      └───────┬───────┘
         │ (REST + SSE)                         │ (X-API-Key REST)
         ▼                                      ▼
 ┌──────────────────────────────────────────────────────┐
 │                       apps/api                       │
 │                 (NestJS 10 Backend)                  │
 │    - 동적 Mock 서빙 ({workspaceId}.도메인/api/*)     │
 │    - 다층 RBAC 권한 검증 / SSE 실시간 브로드캐스트   │
 └───────────────┬──────────────────────┬───────────────┘
                 ▼                      ▼
           [ MongoDB ]              [ Redis ]
           (영속 스키마)          (분산 락 & 캐시)

   ┌────────────────────────────────────────────────────┐
   │             공유 패키지 (@workspace/*)             │
   │  - types: 도메인 스키마 & 계약 타입 정의           │
   │  - mockgen: Faker 기반 Mock 데이터 생성 엔진       │
   │  - codegen: TS/Fetch/Axios/Query/Zod 코드 생성기   │
   │  - ui: Radix + Tailwind v4 기반 공용 shadcn/ui     │
   │  - eslint-config / typescript-config: 공통 툴링    │
   └────────────────────────────────────────────────────┘
```

---

## 📂 모노레포 패키지 구성 (Workspace Map)

### Applications (`apps/`)
- [`apps/web`](apps/web/README.md) — Next.js 15 App Router 프론트엔드 (React 19, Feature-Sliced 구조, TanStack Query v5, Tailwind CSS v4)
- [`apps/api`](apps/api/README.md) — NestJS 10 백엔드 (서브도메인 Mock 서빙, RBAC 권한 심층 방어, SSE 이벤트, Redis 분산 락)
- [`apps/mcp`](apps/mcp/README.md) — AI 연동용 Model Context Protocol (MCP) 서버 (10개 도구 제공, stdio 통신)
- [`apps/test`](apps/test/README.md) — UI 컴포넌트 및 모노레포 패키지 검증용 Next.js 15 샌드박스 앱

### Packages (`packages/`)
- [`packages/types`](packages/types/README.md) — 전사 도메인 스키마, Mock 서빙 규약(`MockContract`), 파일 트리 인터페이스 공유
- [`packages/codegen`](packages/codegen/README.md) — TypeScript, Fetch/Axios, TanStack Query, Zod/Yup/Joi 멀티 타겟 코드 생성 엔진
- [`packages/mockgen`](packages/mockgen/README.md) — Faker.js 기반 가상 데이터 생성 및 스키마 변환 라이브러리
- [`packages/ui`](packages/ui/README.md) — Radix UI 및 Tailwind CSS v4 기반 공용 shadcn/ui 컴포넌트 라이브러리
- [`packages/typescript-config`](packages/typescript-config/README.md) — 모노레포 공통 TypeScript 5.9 컴파일러 설정
- [`packages/eslint-config`](packages/eslint-config/README.md) — 모노레포 공통 ESLint 9 Flat Config 린트 설정

---

## 🎯 기술적 하이라이트 (Engineering Highlights)

- **서브도메인 기반 멀티테넌시** — 하나의 API 서버가 요청 호스트(`X-Forwarded-Host`)에서 `workspaceId`를 추출하여 해당 워크스페이스 전용 Mock 엔드포인트를 동적으로 서빙합니다.
- **실시간 협업 및 네트워크 복원력 (SSE)** — 파일 트리 변경 이벤트를 SSE로 브로드캐스트하며, 주기적 Heartbeat를 통해 프록시 유휴 타임아웃을 방지합니다.
- **다층 심층 방어 권한 체계 (RBAC)** — 서비스 쿼리 필터링 + `WorkspacePermissionGuard` + `@RequirePermission` 커스텀 데코레이터를 통한 다계층 인가 검증.
- **계약 기반 모노레포 일원화** — `@workspace/types`를 기반으로 프론트엔드, 백엔드, MCP 서버가 동일한 데이터 규약을 공유하여 타입 불일치를 원천 차단.
- **경쟁 상태 방지 및 토큰 회전** — JWT Access/Refresh 토큰 쿠키 회전과 동시 401 요청 대기열 큐잉 인터셉터를 통한 안전한 인증 제어.

---

## 🚀 시작하기 (Getting Started)

### 요구사항
- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB, Redis 인스턴스

### 빠른 실행
```bash
# 1) 의존성 설치
npm install

# 2) 환경 변수 설정
#    - apps/api/.env.development  (MONGODB_URI, REDIS_URL, JWT_* 등)
#    - apps/web/.env.local        (NEXT_PUBLIC_BACKEND_URL 등)
#    - apps/mcp/.env              (API_KEY, WORKSPACE_ID 등)

# 3) 개발 서버 전체 실행 (Turborepo)
npm run dev

# 또는 개별 앱 실행
npm run dev -w apps/web        # Frontend (http://localhost:4000)
npm run dev -w apps/api        # Backend (http://localhost:4001)
npm run start -w apps/mcp      # MCP Server (stdio)
```

---

