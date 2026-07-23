# JSON Mock Hub — API (Backend)

Mock API 생성·서빙 플랫폼의 백엔드입니다.
인증(JWT/OAuth/API Key) · 워크스페이스 권한(RBAC) · 파일 트리 · **서브도메인 기반 동적 Mock 서빙** · 실시간(SSE)을 담당합니다.

> 모노레포(Turborepo)의 `apps/api`. 프론트엔드는 [`apps/web`](../web).

---

## 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| 프레임워크 | **NestJS 10** (모듈형 아키텍처) |
| DB / ODM | **MongoDB** + **Mongoose 8** |
| 캐시 / 락 | **Redis** (ioredis, @keyv/redis) + 분산 락 |
| 인증 | **Passport** (JWT access/refresh, Google OAuth, Local), 쿠키 기반 |
| 검증 / 직렬화 | class-validator, class-transformer (`@Serialize` 인터셉터) |
| 실시간 | **SSE** (`@nestjs/event-emitter` + RxJS) |
| 부가 | AOP(@toss/nestjs-aop) 캐시/락 데코레이터, Throttler(rate limit), Schedule, Helmet |

---

## 핵심 기능

- **인증** — 회원가입/로그인(로컬), **Google OAuth**, JWT access/refresh 토큰을 **httpOnly 쿠키**로 발급, refresh 회전. MCP 등 외부 클라이언트용 **워크스페이스 API 키**(SHA-256 해시 저장, 발급 시 1회 노출).
- **워크스페이스 & 권한(RBAC)** — owner/member 역할, 세부 권한 플래그(create/rename/update/delete/move), 비밀번호 기반 참여, 멤버십 검사 가드.
- **파일 브라우저** — 폴더/Mock API를 트리로 관리(생성·이름변경·이동·삭제). **이동 시 동일 이름 폴더 병합**과 경로/depth 일괄 갱신(bulkWrite) 처리.
- **동적 Mock 서빙** — `{workspaceId}.{도메인}/api/*` **서브도메인**으로 들어오는 요청을 `@All('*')`로 받아, 저장된 스키마/데이터로 CRUD 응답(목록·단건·페이지네이션·에코) 생성.
- **실시간 이벤트** — 파일 브라우저 변경을 SSE로 브로드캐스트(heartbeat 포함).
- **대시보드** — 요청 로그/통계.
- **동시성 제어** — Redis **분산 락**(경쟁 상태 방지), rate limiting(분당 60회).

---

## 아키텍처

### 모듈 구성
```
apps/api/src/
├── auth/           # JWT/Google/Local 전략, 가드, @CurrentUserId 데코레이터, API 키 검증
├── workspaces/     # 워크스페이스 CRUD, 역할/권한 가드, 멤버십, API 키
├── filebrowser/    # 트리 CRUD, 이동/병합, SSE 이벤트 서비스
├── mockserver/     # 서브도메인 파싱 → 동적 Mock CRUD 응답
├── users/          # 사용자
├── dashboard/      # 요청 로그/통계
├── redis/          # 분산 락, AOP 캐시/락 aspect
├── database/       # Mongoose 스키마 (workspace, membership, role, file-browser-item ...)
├── common/         # Discord 웹훅 알림 등
└── interceptors/   # @Serialize (응답 DTO 변환)
```

### 설계 포인트 (면접 대비 요약)
- **인증 계약 일원화**: `@CurrentUserId()` 커스텀 데코레이터로 컨트롤러의 `req.user.sub` 접근을 추상화. `JwtOrApiKeyGuard`가 JWT 또는 API 키를 동일 인터페이스로 처리.
- **권한 심층 방어**: 서비스 쿼리 + `WorkspacePermissionGuard`(멤버십+권한 플래그) + `@RequirePermission` 데코레이터의 다층 검증.
- **응답 계약 안정화**: `@Serialize(Dto)` 인터셉터로 `_id → id` 변환 및 민감 필드 노출 차단.
- **멀티테넌시**: 요청 호스트(`X-Forwarded-Host`)에서 워크스페이스를 추출해 하나의 서버가 워크스페이스별 Mock을 서빙.

---

## API 개요 (주요 엔드포인트)

| 그룹 | 엔드포인트 |
| :--- | :--- |
| Auth | `POST /auth/signup` · `/auth/login` · `/auth/logout` · `/auth/refresh` · `GET /auth/google` · `/auth/google/callback` |
| Users | `GET /users/me` |
| Workspaces | `POST /workspaces` · `GET /workspaces` · `GET|PATCH|DELETE /workspaces/:id` · `POST /workspaces/:id/join` · `GET /workspaces/:id/membership` · `POST|GET|DELETE /workspaces/:id/api-key` |
| Filebrowser | `GET /:workspaceId/filebrowser/getItems` · `POST .../createItem` · `PATCH .../moveItems|renameItem` · `PUT /:workspaceId/filebrowser` · `DELETE /:workspaceId/filebrowser` · `SSE .../subscribe` |
| Mock 서빙 | `ALL {workspaceId}.{MOCK_BASE_DOMAIN}/api/*` |

인증은 `access_token` 쿠키(JWT) 또는 `X-API-Key` 헤더로 수행합니다.

---

## 실행 방법

### 요구사항
- Node.js 20+
- **MongoDB**, **Redis** 인스턴스

### 환경 변수 (`apps/api/.env.development`)
| 변수 | 설명 |
| :--- | :--- |
| `PORT` | 서버 포트 (개발 env 기본 4001, env 미설정 시 코드 폴백 3000) |
| `NODE_ENV` | `development` / `production` |
| `MONGODB_URI` | MongoDB 연결 문자열 |
| `REDIS_URL` | Redis 연결 문자열 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT 서명 키 |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | 토큰 만료 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth |
| `CLIENT_URL` | OAuth 성공 후 리다이렉트할 프론트 주소 |
| `CORS_ORIGIN_URL` | CORS 허용 오리진(프론트 주소) |
| `MOCK_BASE_DOMAIN` | Mock 서빙 베이스 도메인 (예: `localhost:4001`) |
| `DISCORD_WEBHOOK_URL` | (선택) 알림용 |

### 명령어
```bash
# 모노레포 루트에서
npm install

# 개발 서버 (watch, NODE_ENV=development)
npm run dev -w apps/api

# 린트 / 테스트
npm run lint -w apps/api
npm run test -w apps/api        # Jest (단위)

# 프로덕션 빌드/실행
npm run build -w apps/api
npm run start:prod -w apps/api
```

> 참고: 일부 테스트(`distributed-lock.service.spec`)는 **실제 Redis 연결**을 요구하는 통합 테스트입니다.

---

## 공용 패키지

`@workspace/types`(스키마 도메인 타입)를 프론트엔드와 공유해 요청/응답 계약을 일치시킵니다.
