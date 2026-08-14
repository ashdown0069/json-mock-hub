# JSON Mock Hub — API (Backend)

JSON Mock Hub의 백엔드 서비스로, 사용자 인증(JWT/Google OAuth/API Key), 다층 워크스페이스 권한 제어(RBAC), 파일 트리 및 스키마 관리, **서브도메인 기반 동적 Mock REST 서빙**, 실시간 협업(SSE), Redis 분산 락 및 요청 대기열을 담당합니다.

> **모노레포 위치:** `apps/api` · **프론트엔드 문서:** [`apps/web`](../web/README.md) · **MCP 서버:** [`apps/mcp`](../mcp/README.md)

---

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| **Framework** | **NestJS 10** (모듈형 아키텍처, Express 플랫폼) |
| **Database & ODM** | **MongoDB** + **Mongoose 8** |
| **캐시 & 분산 락** | **Redis** (`ioredis`, `@keyv/redis`), `@toss/nestjs-aop` 기반 락/캐시 데코레이터 |
| **비동기 큐** | **BullMQ** (`@nestjs/bullmq`) |
| **인증 & 보안** | **Passport** (JWT, Google OAuth 2.0, Local), 쿠키 기반 토큰 회전, `helmet`, `bcrypt` |
| **검증 & 직렬화** | `class-validator`, `class-transformer`, 커스텀 `@Serialize` 인터셉터 |
| **실시간 통신** | **Server-Sent Events (SSE)** (`@nestjs/event-emitter`, RxJS Subject) |
| **속도 제한 & 스케줄링** | `@nestjs/throttler` (Rate Limiting), `@nestjs/schedule` (Cron Jobs) |
| **공유 패키지** | `@workspace/types` |

---

## ✨ 핵심 기능

1. **인증 및 세션 보안**
   - 로컬 회원가입/로그인 및 **Google OAuth 2.0** 소셜 로그인.
   - JWT Access/Refresh 토큰을 **httpOnly / SameSite 보안 쿠키**로 발급하며 Refresh Token 회전(RTR) 적용.
   - AI 및 외부 연동용 **워크스페이스 전용 API 키** (SHA-256 해시 저장, 발급 시 1회 노출).
2. **다층 워크스페이스 권한 체계 (RBAC)**
   - Owner / Member 역할 모델 및 5대 세부 권한 플래그(`create`, `rename`, `update`, `delete`, `move`).
   - 비밀번호 기반 워크스페이스 참여 및 `WorkspacePermissionGuard` + `@RequirePermission` 데코레이터.
3. **파일 브라우저 & 트리 관리**
   - 폴더 및 Mock API의 계층형 트리 관리(생성, 이름 변경, 이동, 삭제).
   - **폴더 이동 시 동일 이름 폴더 자동 병합** 및 MongoDB `bulkWrite`를 통한 경로(path)/depth 일괄 갱신.
4. **서브도메인 기반 동적 Mock REST 서빙 (`mockserver`)**
   - `{workspaceId}.도메인/api/*` 서브도메인 요청을 `@All('*')` 와일드카드로 수신.
   - 저장된 JSON 스키마를 기반으로 목록 조회(필터링/페이징), 단건 상세 조회, 생성(POST), 수정(PUT/PATCH), 삭제(DELETE) 응답 생성.
   - 인위적 지연(Delay) 및 에러 상태 코드 시뮬레이션 지원.
5. **실시간 이벤트 브로드캐스팅 (SSE)**
   - 파일 브라우저 내의 모든 CRUD 및 이동 이벤트를 워크스페이스 단위로 실시간 브로드캐스트.
   - 프록시 타임아웃 방지를 위한 주기적 Heartbeat 전송.
6. **동시성 및 데이터 무결성 제어**
   - Redis 기반 분산 락(`@DistributedLock`)을 통해 동시 폴더 이동/수정 시 경쟁 상태(Race Condition) 방지.

---

## 🏛️ 아키텍처 및 모듈 구성

```
apps/api/src/
├── auth/           # JWT, Google OAuth, Local 전략, JwtOrApiKeyGuard, @CurrentUserId
├── workspaces/     # 워크스페이스 CRUD, 멤버십, 역할/권한 가드, API 키 발급
├── filebrowser/    # 트리 아이템 CRUD, 이동/병합 알고리즘, SSE 이벤트 서비스
├── mockserver/     # 서브도메인 파싱 및 동적 Mock REST 응답 엔진
├── users/          # 사용자 프로필 및 계정 관리
├── dashboard/      # 요청 로그 및 사용 통계
├── redis/          # Redis 연결, 분산 락 서비스, AOP aspect (@toss/nestjs-aop)
├── database/       # Mongoose 스키마 (Workspace, Membership, FileBrowserItem 등)
├── common/         # 글로벌 필터, 인터셉터, Discord 알림 웹훅
├── config/         # 환경 변수 유효성 검증 및 설정
└── interceptors/   # @Serialize (응답 DTO 변환 및 _id -> id 정제)
```

---

## 📡 주요 API 엔드포인트

| 그룹 | Method | 엔드포인트 | 설명 |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/signup` · `/auth/login` · `/auth/logout` · `/auth/refresh` | 회원가입, 로그인, 로그아웃, 토큰 갱신 |
| | `GET` | `/auth/google` · `/auth/google/callback` | Google OAuth 소셜 로그인 |
| **Users** | `GET` | `/users/me` | 내 프로필 조회 |
| **Workspaces** | `POST` / `GET` | `/workspaces` | 워크스페이스 생성 및 내 워크스페이스 목록 조회 |
| | `GET`/`PATCH`/`DELETE` | `/workspaces/:id` | 워크스페이스 상세 조회, 수정, 삭제 |
| | `POST` | `/workspaces/:id/join` | 비밀번호 기반 워크스페이스 참여 |
| | `GET`/`PATCH`/`DELETE` | `/workspaces/:id/members/:memberId` | 멤버 목록, 권한 수정, 멤버 추방 |
| | `POST`/`GET`/`DELETE` | `/workspaces/:id/api-key` | 워크스페이스 API 키 발급, 조회, 폐기 |
| **File Browser** | `GET` | `/:workspaceId/filebrowser/getItems` | 워크스페이스 전체 파일 트리 조회 |
| | `POST` | `/:workspaceId/filebrowser/createItem` | 폴더 또는 Mock API 생성 |
| | `PATCH` | `/:workspaceId/filebrowser/renameItem` | 아이템 이름 변경 |
| | `PATCH` | `/:workspaceId/filebrowser/moveItems` | 아이템(단건/복수) 이동 및 폴더 병합 |
| | `PUT`/`DELETE` | `/:workspaceId/filebrowser` | 스키마 수정 및 아이템 삭제 |
| | `GET` | `/:workspaceId/filebrowser/subscribe` | 실시간 파일 트리 SSE 스트림 구독 |
| **Mock Serving** | `ALL` | `{workspaceId}.{MOCK_BASE_DOMAIN}/api/*` | 동적 Mock REST API 엔드포인트 서빙 |

---

## 🚀 실행 방법

### 요구사항
- Node.js >= 20.0.0
- MongoDB 인스턴스 (MongoDB 6.0+)
- Redis 인스턴스 (Redis 7.0+)

### 환경 변수 (`apps/api/.env.development`)
```env
PORT=4001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/json-mock-hub
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4001/auth/google/callback
CLIENT_URL=http://localhost:4000
CORS_ORIGIN_URL=http://localhost:4000
MOCK_BASE_DOMAIN=localhost:4001
```

### 명령어
```bash
# 개발 서버 실행 (Watch 모드)
npm run dev -w apps/api

# 단위 테스트 실행 (Jest)
npm run test -w apps/api

# E2E 테스트 실행
npm run test:e2e -w apps/api

# 린트 및 코드 포맷팅
npm run lint -w apps/api
npm run format -w apps/api

# 프로덕션 빌드 및 실행
npm run build -w apps/api
npm run start:prod -w apps/api
```
