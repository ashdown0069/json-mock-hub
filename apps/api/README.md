# JSON Mock Hub — API (Backend)

JSON Mock Hub의 백엔드 서비스로, 사용자 인증(JWT/API Key), 다층 워크스페이스 권한 제어(RBAC), 계층형 파일 트리 관리, **서브도메인 기반 동적 Mock REST 서빙**, 실시간 협업(SSE) 을 담당합니다.

> **모노레포 위치:** `apps/api` · [🏠 루트 문서](../../README.md) · [🌐 프론트엔드 문서](../web/README.md) · [🤖 MCP 서버](../mcp/README.md)

---

## 🛠️ 기술 스택

| 영역               | 사용 기술                                     | 설명                                                              |
| :----------------- | :-------------------------------------------- | :---------------------------------------------------------------- |
| **Framework**      | **NestJS 10**                                 | 모듈형 아키텍처, Express 플랫폼                                   |
| **Database & ODM** | **MongoDB** + **Mongoose 8**                  | 계층 트리, 스키마, 사용자, 워크스페이스, 요청 로그 저장           |
| **Redis**          | **ioredis**                                   | **Mock 쓰기 상태 오버레이(CRUD 격리 저장)**, 분산 락, SSE Pub/Sub |
| **인증 & 보안**    | **Passport** (Local, JWT), `bcrypt`, `helmet` | Access/Refresh 보안 쿠키(RTR), CSRF 방어 가드                     |
| **검증 & 직렬화**  | `class-validator`, `@Serialize` 인터셉터      | 요청 DTO 유효성 검증, 응답 DTO 직렬화 및 `_id` 정제               |
| **실시간 통신**    | **Server-Sent Events (SSE)**                  | 파일 트리/Mock 상태 변경 실시간 브로드캐스트                      |

---

## ✨ 핵심 기능 요약

- **인증 & 보안 (`auth`)**: `bcrypt` 비밀번호 암호화, JWT Access/Refresh 토큰 쿠키 회전(RTR), 다중 인증 가드(`JwtOrApiKeyGuard`), 비안전 요청 CSRF 헤더 검증.
- **워크스페이스 & RBAC (`workspaces`)**: Owner/Member 역할 모델, 5대 세부 권한(`canCreate`, `canRename`, `canUpdate`, `canDelete`, `canMove`), `WorkspaceAccessGuard` 다계층 인가
- **파일 브라우저 (`filebrowser`)**: 계층형 폴더/Mock 트리 CRUD, 드래그앤드롭 이동 시 동일 이름 폴더 자동 병합, MongoDB `bulkWrite` 경로 갱신, SSE 실시간 변경 브로드캐스팅.
- **동적 Mock REST 서빙 & Redis 상태 오버레이 (`mockserver`)**:
  - 서브도메인(`{workspaceId}.도메인/api/*`) 와일드카드 수신.
  - 클라이언트의 `POST`, `PUT`, `PATCH`, `DELETE` 요청 결과를 MongoDB 원본 대신 **Redis 상태 오버레이(State Overlay)**에 격리 저장.
  - `GET` 요청 시 MongoDB 기본 스키마와 Redis 오버레이를 실시간 병합(`applyOverlay`)하여 실제 DB처럼 CRUD 상태가 유지되는 Mocking 제공 (초기화 API 지원).

---

## 🏛️ 디렉토리 및 모듈 구성

```
apps/api/src/
├── app.controller.ts            # GET / (Health check)
├── app.module.ts                # 루트 모듈 (전역 가드, Throttler, Config)
├── main.ts                      # 엔트리포인트 (Helmet, CORS, Cookie, ValidationPipe, Filter)
├── auth/                        # JWT 쿠키 인증, Local 전략, CSRF 가드, @CurrentUserId
├── workspaces/                  # 워크스페이스 CRUD, 참여, API 키, WorkspaceAccessGuard, RBAC
├── filebrowser/                 # 계층 트리 CRUD, 노드 이동/병합, 파일 트리 SSE
├── mockserver/                  # 서브도메인 /api/* Mock 서빙, 상태 오버레이, 상태 SSE, 요청 로깅
├── users/                       # 사용자 프로필 (GET /users/me)
├── dashboard/                   # 요청 로그 페이징 및 워크스페이스 통계
├── redis/                       # ioredis 클라이언트 및 DistributedLockService (Lua script)
├── database/                    # Mongoose 스키마 (User, Workspace, Membership, Role, Item, Log)
├── filters/                     # AllExceptionsFilter (전역 예외 정규화 및 error code 매핑)
├── interceptors/                # @Serialize (DTO 변환 및 _id -> id 정제)
└── config/                      # env.validation.ts (부팅 시 필수 환경변수 검증)
```

---

## 📡 REST API 엔드포인트 명세

| 그룹                | Method             | 엔드포인트                                 | 가드 / 데코레이터                                                             | 설명                                         |
| :------------------ | :----------------- | :----------------------------------------- | :---------------------------------------------------------------------------- | :------------------------------------------- |
| **Auth**            | `POST`             | `/auth/signup`                             | -                                                                             | 회원가입                                     |
|                     | `POST`             | `/auth/login`                              | Throttle (5회/분)                                                             | 로그인 및 Access/Refresh 보안 쿠키 발급      |
|                     | `POST`             | `/auth/refresh`                            | `JwtRefreshGuard`                                                             | Refresh Token Rotation 기반 토큰 갱신        |
|                     | `POST`             | `/auth/logout`                             | `JwtAuthGuard`                                                                | 세션 종료 및 쿠키 삭제                       |
| **Users**           | `GET`              | `/users/me`                                | `JwtAuthGuard`                                                                | 현재 로그인 사용자 정보 조회                 |
| **Workspaces**      | `POST` / `GET`     | `/workspaces`                              | `JwtAuthGuard`                                                                | 워크스페이스 생성 및 내 목록 조회            |
|                     | `GET`              | `/workspaces/:workspaceId`                 | `JwtAuthGuard`, `WorkspaceAccessGuard`                                        | 워크스페이스 상세 조회                       |
|                     | `PATCH` / `DELETE` | `/workspaces/:workspaceId`                 | `JwtAuthGuard`, `WorkspaceAccessGuard`, `@RequireOwner()`                     | 워크스페이스 수정 및 삭제                    |
|                     | `POST`             | `/workspaces/:workspaceId/join`            | `JwtAuthGuard`                                                                | 비밀번호 기반 워크스페이스 참여              |
|                     | `GET`              | `/workspaces/:workspaceId/membership`      | `JwtAuthGuard`                                                                | 내 멤버십 상태 확인                          |
|                     | `GET` / `POST`     | `/workspaces/:workspaceId/api-key`         | `JwtAuthGuard`, `WorkspaceAccessGuard`                                        | API 키 조회 및 발급/재발급                   |
| **Members & Roles** | `GET` / `DELETE`   | `/workspaces/:workspaceId/members`         | `JwtAuthGuard`, `WorkspaceAccessGuard`, `@RequireOwner()`                     | 멤버 목록 조회 및 멤버 추방 (`/:userId`)     |
|                     | `GET` / `PATCH`    | `/workspaces/:workspaceId/roles`           | `JwtAuthGuard`, `WorkspaceAccessGuard`                                        | 역할 조회 및 5대 세부 권한 수정 (`/:roleId`) |
| **File Browser**    | `GET`              | `/:workspaceId/filebrowser/subscribe`      | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`                                    | 파일 트리 실시간 SSE 스트림 구독             |
|                     | `GET`              | `/:workspaceId/filebrowser/getItems`       | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`                                    | 전체 트리 조회 (`?view=tree\|full`)          |
|                     | `GET`              | `/:workspaceId/filebrowser/items/:itemId`  | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`                                    | 특정 노드(폴더/Mock) 단건 상세 조회          |
|                     | `POST`             | `/:workspaceId/filebrowser/createItem`     | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`, `@RequirePermission('canCreate')` | 폴더 또는 Mock API 생성                      |
|                     | `PATCH`            | `/:workspaceId/filebrowser/moveItems`      | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`, `@RequirePermission('canMove')`   | 노드 이동 및 동일 이름 폴더 자동 병합        |
|                     | `PATCH`            | `/:workspaceId/filebrowser/renameItem`     | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`, `@RequirePermission('canRename')` | 노드 이름 변경                               |
|                     | `PUT`              | `/:workspaceId/filebrowser`                | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`, `@RequirePermission('canUpdate')` | Mock 스키마 및 설정 수정                     |
|                     | `DELETE`           | `/:workspaceId/filebrowser`                | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`, `@RequirePermission('canDelete')` | 아이템(폴더 포함) 다중 삭제                  |
|                     | `POST`             | `/:workspaceId/filebrowser/resetMockState` | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`, `@RequirePermission('canUpdate')` | Mock API 상태 오버레이 초기화                |
| **Mock State**      | `GET`              | `/:workspaceId/mockstate/subscribe`        | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`                                    | Mock 상태 실시간 SSE 스트림                  |
|                     | `GET`              | `/:workspaceId/mockstate/effective`        | `JwtOrApiKeyGuard`, `WorkspaceAccessGuard`                                    | 스키마 + 상태 오버레이가 반영된 최종 JSON    |
| **Dashboard**       | `GET`              | `/:workspaceId/dashboard/stats`            | `JwtAuthGuard`, `WorkspaceAccessGuard`                                        | 워크스페이스 요청 통계 조회                  |
|                     | `GET`              | `/:workspaceId/dashboard/logs`             | `JwtAuthGuard`, `WorkspaceAccessGuard`                                        | 호출 로그 페이징 조회 (`?page=1&limit=20`)   |
| **Mock Server**     | `ALL`              | `{workspaceId}.{MOCK_BASE_DOMAIN}/api/*`   | 와일드카드 서브도메인 라우팅                                                  | 동적 Mock REST API 호출                      |

---

## 🚀 실행 및 테스트 방법

> 아래 명령어는 `apps/api` 디렉토리 내부에서 실행할 때 기준입니다.

### 환경 변수 (`.env.development`)

```env
PORT=4001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/json-mock-hub
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:4000
CORS_ORIGIN_URL=http://localhost:4000
MOCK_BASE_DOMAIN=localhost:4001
```

### 명령어 (`apps/api/` 경로 기준)

```bash
# 개발 서버 실행 (Watch 모드)
npm run dev

# 단위 테스트 실행 (Jest)
npm test

# TypeScript 컴파일 검사
npm run typecheck

# 린트 검사
npm run lint

# 프로덕션 빌드 및 실행
npm run build
npm run start:prod
```
