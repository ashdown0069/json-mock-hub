# 🧩 JSON Mock Hub

**스키마 정의만으로 즉시 호출 가능한 REST Mock API와 완전한 클라이언트 코드를 생성하는 풀스택 엔지니어링 플랫폼**

백엔드 API 완성을 기다릴 필요 없이 실제 서버와 동일한 서브도메인 기반 REST 환경에서 프론트엔드를 개발·테스트할 수 있습니다. 시각적 스키마 빌더, 실시간 협업(SSE), 다층 권한 제어(RBAC), TypeScript/Axios/React Query/Zod 코드 자동 생성 및 AI 어시스턴트(MCP) 연동을 지원합니다.

> **문서 바로가기:** [🌐 Frontend (`apps/web`)](apps/web/README.md) · [⚙️ Backend (`apps/api`)](apps/api/README.md) · [🤖 MCP Server (`apps/mcp`)](apps/mcp/README.md)

---

## 💡 해결하고자 하는 문제 (Problem Statement)

기존의 단순 정적 JSON 모킹 도구는 목록 조회, 단건 조회, 페이징, 수정/삭제(CRUD) 등 실제 백엔드의 동적 상호작용을 재현하기 어려웠습니다. **JSON Mock Hub**는 다음 접근 방식으로 문제를 해결합니다:

- **동적 가상 데이터 생성**: 필드명과 타입, 중첩(Object/Array) 구조를 UI로 정의하면 `@faker-js/faker` 기반으로 실제와 유사한 데이터를 동적으로 생성합니다.
- **서브도메인 기반 실제 REST & Redis 상태 오버레이**: `{workspaceId}.도메인/api/*` 서브도메인을 통해 CRUD 엔드포인트를 제공하며, 클라이언트의 POST/PUT/PATCH/DELETE 변경 사항을 **Redis 상태 오버레이(State Overlay)**에 격리 저장하여 MongoDB 원본 훼손 없이 실제 데이터베이스처럼 동작합니다.
- **End-to-End 코드 자동 생성**: 정의된 스키마로부터 TypeScript Interface, Fetch/Axios 클라이언트, TanStack Query 훅, Zod/Yup/Joi 검증 스키마를 즉시 생성 및 복사할 수 있습니다.
- **AI 어시스턴트(MCP) 연동**: Model Context Protocol(MCP)을 지원하는 Claude, Cursor, Antigravity 등의 AI가 자연어로 Mock API를 탐색하고 생성·수정할 수 있습니다.

---

## 🏛️ 시스템 아키텍처 (Architecture)

Turborepo 기반의 모노레포 아키텍처로 구성되어 있으며, 프론트엔드·백엔드·AI MCP 서버가 공용 패키지를 통해 도메인 계약과 모킹 엔진을 공유합니다.

```
[ 👤 사용자 브라우저 ]                 [ 🤖 AI 클라이언트 (Claude / Cursor) ]
         │                                            │
         ▼ (Next.js 15 Web UI)                        ▼ (MCP Protocol / STDIO)
 ┌───────────────┐                            ┌───────────────┐
 │   apps/web    │                            │   apps/mcp    │
 │  (Next.js 15) │                            │  (MCP Server) │
 └───────┬───────┘                            └───────┬───────┘
         │ (REST API + SSE)                           │ (REST API)
         ▼                                            ▼
 ─────────────────────────────────────────────────────────────
                            apps/api
                      (NestJS 10 Backend)
   - 서브도메인 동적 Mock REST 서빙 ({workspaceId}.도메인/api/*)
   - 다층 RBAC 권한 검증 및 실시간 SSE 브로드캐스팅
   - Redis 분산 락을 통한 동시 수정 데이터 무결성 보장
 ───────────────┬─────────────────────────────┬───────────────
                ▼                             ▼
          [ MongoDB ]                      [ Redis ]
   (워크스페이스, 스키마, 사용자)         (세션 락, Pub/Sub 이벤트)

 ─────────────────────────────────────────────────────────────
                  공유 패키지 (@workspace/*)
 - packages/types: 도메인 스키마, Mock 서빙 규약, 파일 트리 타입 일원화
 - packages/codegen: TS / Fetch / Axios / TanStack Query / Zod 코드 생성 엔진
 - packages/mockgen: Faker.js 기반 가상 데이터 생성 및 스키마 변환
 - packages/ui: Radix UI + Tailwind CSS v4 기반 공용 컴포넌트
 ─────────────────────────────────────────────────────────────
```

---

## ✨ 주요 기능 요약

| 기능 영역                   | 주요 내용                                                                                                                        |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **🏗️ 시각적 스키마 빌더**   | 필드 추가/수정, 타입 선택, Faker Mock 규칙 매핑, 중첩(Object/Array) 스키마 정의 및 실시간 데이터 프리뷰                          |
| **🌳 가상화 파일 브라우저** | `react-arborist` 기반 가상화 트리, 인라인 이름 변경, 드래그앤드롭 폴더 이동 및 동일 이름 폴더 자동 병합                          |
| **⚡ 실시간 협업 (SSE)**    | Server-Sent Events를 통해 동시 작업자의 생성/이동/수정/삭제 액션을 새로고침 없이 실시간 동기화                                   |
| **🔌 동적 Mock REST 서빙**  | `{workspaceId}.도메인/api/*` 서브도메인 라우팅으로 GET(목록/상세/페이징), POST, PUT, PATCH, DELETE 완벽 지원                     |
| **🧑‍💻 멀티 타겟 코드 생성**  | TypeScript Interface · Fetch/Axios · TanStack Query 훅 · Zod/Yup/Joi 검증 스키마 즉시 추출                                       |
| **👥 워크스페이스 & RBAC**  | Owner/Member 역할 모델, 5대 세부 권한(`canCreate`, `canRename`, `canUpdate`, `canDelete`, `canMove`), 비밀번호 참여, API 키 발급 |
| **🌐 다국어 (i18n)**        | `next-intl` 기반 한국어(`ko`) / 영어(`en`) 로케일 라우팅                                                                         |
| **🤖 AI MCP 서버 연동**     | Model Context Protocol 10종 도구를 통해 AI 어시스턴트에서 자연어로 Mock API 및 폴더 제어                                         |

---

## 🎯 기술적 하이라이트 (Engineering Highlights)

1. **서브도메인 기반 동적 멀티테넌시 라우팅**
   - 단일 백엔드 인스턴스에서 요청 호스트(`X-Forwarded-Host` / Host)의 서브도메인으로부터 `workspaceId`를 파싱하고, `@All('*')` 와일드카드 컨트롤러를 통해 해당 워크스페이스 전용 Mock API를 동적으로 라우팅하여 서빙합니다.
2. **네트워크 복원력 기반의 SSE 실시간 트리 동기화**
   - 백엔드의 `@nestjs/event-emitter`와 RxJS Subject 스트림을 활용하여 워크스페이스 단위 이벤트를 브로드캐스트합니다. 프록시 유휴 타임아웃을 방지하기 위한 주기적 Heartbeat 전송 및 프론트엔드 연결 단절 시 지수 백오프 기반 자동 재연결 로직을 구현했습니다.
3. **Redis 분산 락(`DistributedLockService`)을 통한 데이터 무결성 보장**
   - 동시 다발적인 폴더 이동 및 하위 경로 일괄 갱신(`bulkWrite`) 시 발생할 수 있는 경쟁 상태(Race Condition)를 Redis `SET NX EX` 및 Lua 스크립트 기반 원자적 분산 락으로 격리하여 트리 구조의 무결성을 보장합니다.
4. **계약 기반(Contract-Driven) 모노레포 타입 일원화**
   - `@workspace/types` 패키지를 통해 프론트엔드(`apps/web`), 백엔드(`apps/api`), AI 서버(`apps/mcp`)가 단일한 도메인 타입 및 API 인터페이스를 공유하여 런타임 타입 불일치를 원천 차단했습니다.
5. **보안 쿠키 토큰 회전(RTR) 및 동시 401 갱신 큐잉**
   - JWT Access/Refresh 토큰을 `httpOnly`, `SameSite=Lax`, `Secure` 쿠키로 발급하고 Refresh Token Rotation(RTR)을 적용했습니다. 프론트엔드에서는 Axios 인터셉터 기반의 요청 큐를 구성하여 동시 401 발생 시 중복 갱신을 방지하고 요청을 일괄 재시도합니다.

---

## 📂 모노레포 패키지 구성 (Workspace Map)

### Applications (`apps/`)

- [`apps/web`](apps/web/README.md) — Next.js 15 App Router 프론트엔드 (React 19, TanStack Query v5, Tailwind CSS v4, react-arborist)
- [`apps/api`](apps/api/README.md) — NestJS 10 백엔드 (서브도메인 Mock 서빙, RBAC 권한 검증, SSE 실시간 브로드캐스트, Redis 분산 락)
- [`apps/mcp`](apps/mcp/README.md) — Model Context Protocol (MCP) AI 연동 서버 (10개 도구 제공, stdio 통신)

### Packages (`packages/`)

- `packages/types` — 도메인 스키마, Mock 서빙 규약, 파일 트리 인터페이스 정의
- `packages/codegen` — TypeScript, Fetch/Axios, TanStack Query, Zod/Yup/Joi 멀티 타겟 코드 생성 엔진
- `packages/mockgen` — Faker.js 기반 가상 데이터 생성 및 스키마 변환 라이브러리
- `packages/ui` — Radix UI 및 Tailwind CSS v4 기반 공용 UI 컴포넌트
- `packages/typescript-config` — 모노레포 공통 TypeScript 컴파일러 설정
- `packages/eslint-config` — 모노레포 공통 ESLint 9 Flat Config 린트 설정

---

## 🚀 시작하기 (Getting Started)

### 요구사항

- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB 6.0+
- Redis 7.0+

### 빠른 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
# apps/api/.env.development
# apps/web/.env.local
# apps/mcp/.env

# 3. 개발 서버 전체 실행 (Turborepo)
npm run dev

# 개별 애플리케이션 실행
npm run dev -w apps/web        # Frontend (http://localhost:4000)
npm run dev -w apps/api        # Backend (http://localhost:4001)
npm run start -w apps/mcp      # MCP Server (stdio)
```
