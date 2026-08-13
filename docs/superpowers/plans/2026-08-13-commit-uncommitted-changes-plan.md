# [Plan] 커밋되지 않은 변경사항 모듈별 분할 커밋 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to review and execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 모노레포 내 커밋되지 않은 모든 변경사항을 모듈 및 책임 단위(SRP)로 분리하여 총 7개의 독립적이고 명확한 한국어 커밋으로 구성합니다.

**Architecture:** 모노레포 패키지 기반 분리 (`packages/types`, `packages/codegen`, `packages/mockgen`, `apps/api`, `apps/mcp`, `apps/web`, Root Infra).

**Tech Stack:** TypeScript, Next.js, NestJS, Turborepo, Docker.

---

## User Review Required

> [!IMPORTANT]
> - Git 커밋은 사용자가 직접 수동으로 진행합니다.
> - 커밋 메시지는 프로젝트 컨벤션에 따라 무조건 **한국어**로 작성합니다.
> - 실행 전 삭제된 파일 (`apps/web/types/User.ts`, `apps/web/types/schema.ts`) 및 미추적 파일 (`.playwright-mcp/`, `turbo.log`)의 포함 여부를 확인해 주시기 바랍니다.

---

## Proposed Commits Overview

- **Task 1:** `packages/types` 패키지 업데이트 커밋
- **Task 2:** `packages/codegen` 패키지 업데이트 커밋
- **Task 3:** `packages/mockgen` 패키지 업데이트 커밋
- **Task 4:** `apps/api` 백엔드 업데이트 커밋
- **Task 5:** `apps/mcp` MCP 서버 업데이트 커밋
- **Task 6:** `apps/web` 프론트엔드 업데이트 커밋
- **Task 7:** Root & Monorepo 설정 업데이트 커밋

---

### Task 1: `packages/types` 패키지 커밋

공통 타입 스키마, 계약, 필드 검증 및 빌드/ESLint 설정 관련 변경사항을 커밋합니다.

**Files:**
- Modify: [package.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/types/package.json)
- Modify: [index.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/types/src/index.ts)
- Modify: [schema.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/types/src/schema.ts)
- Create: `packages/types/eslint.config.js`
- Create: `packages/types/tsconfig.build.json`
- Create: `packages/types/turbo.json`
- Create: `packages/types/fieldValidation.ts`
- Create: `packages/types/fileBrowserItem.ts`
- Create: `packages/types/mcpTools.ts`
- Create: `packages/types/mockContract.ts`
- Create: `packages/types/scripts/*`
- Create: `packages/types/src/__test__/*`

- [ ] **Step 1: Stage and verify `packages/types` files**
```bash
git add packages/types/
```

- [ ] **Step 2: Commit `packages/types`**
```bash
git commit -m "feat(types): 스키마 검증, 계약 타입 및 빌드 스크립트 업데이트"
```

---

### Task 2: `packages/codegen` 패키지 커밋

코드 생성 유틸리티, identifier, snippet, response type 및 단위 테스트를 커밋합니다.

**Files:**
- Modify: [package.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/package.json)
- Modify: [clientSnippets.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/src/clientSnippets.ts)
- Modify: [identifiers.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/src/identifiers.ts)
- Modify: [querySnippets.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/src/querySnippets.ts)
- Modify: [schemaToType.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/src/schemaToType.ts)
- Modify: [types.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/src/types.ts)
- Modify: [validationSnippets.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/codegen/src/validationSnippets.ts)
- Modify: `packages/codegen/src/__test__/*`
- Create: `packages/codegen/eslint.config.js`
- Create: `packages/codegen/src/context.ts`
- Create: `packages/codegen/src/listSignature.ts`
- Create: `packages/codegen/src/responseTypes.ts`
- Create: `packages/codegen/src/clients/*`

- [ ] **Step 1: Stage and verify `packages/codegen` files**
```bash
git add packages/codegen/
```

- [ ] **Step 2: Commit `packages/codegen`**
```bash
git commit -m "feat(codegen): 코드 생성 스니펫, 컨텍스트 및 응답 타입 기능 개선"
```

---

### Task 3: `packages/mockgen` 패키지 커밋

Mock 데이터 생성 유틸리티, faker 연동, 스키마 변환 및 깊이 일관성 테스트를 커밋합니다.

**Files:**
- Modify: [package.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/packages/mockgen/package.json)
- Modify: `packages/mockgen/src/convertSchema.ts`
- Modify: `packages/mockgen/src/fakerMethods.ts`
- Modify: `packages/mockgen/src/generateData.ts`
- Modify: `packages/mockgen/src/__test__/*`
- Create: `packages/mockgen/eslint.config.js`

- [ ] **Step 1: Stage and verify `packages/mockgen` files**
```bash
git add packages/mockgen/
```

- [ ] **Step 2: Commit `packages/mockgen`**
```bash
git commit -m "feat(mockgen): mock 데이터 생성 알고리즘 및 faker 연동 개선"
```

---

### Task 4: `apps/api` 백엔드 커밋

NestJS 서버의 Auth/Cookie/CSRF 가드, Database Schema Spec, FileBrowser DTO, MockState 핸들러/SSE, Workspace 서비스 및 테스트 코드를 커밋합니다.

**Files:**
- Create: `apps/api/eslint.config.js`
- Create: `apps/api/src/auth/*`
- Create: `apps/api/src/common/*`
- Create: `apps/api/src/config/*`
- Create: `apps/api/src/cors-options*`
- Create: `apps/api/src/trust-proxy*`
- Create: `apps/api/src/database/*`
- Create: `apps/api/src/filebrowser/*`
- Create: `apps/api/src/mockserver/*`
- Create: `apps/api/src/workspaces/*`

- [ ] **Step 1: Stage and verify `apps/api` files**
```bash
git add apps/api/
```

- [ ] **Step 2: Commit `apps/api`**
```bash
git commit -m "feat(api): 인증 가드, mock 상태 관리, 파일탐색기 DTO 및 스키마 테스트 추가"
```

---

### Task 5: `apps/mcp` MCP 서버 커밋

MCP (Model Context Protocol) 툴 레지스트리, 경로 해석기, 트리 구조, Mock API 옵션 툴 및 단위 테스트를 커밋합니다.

**Files:**
- Create: `apps/mcp/.env.example`
- Create: `apps/mcp/src/api-paths.ts`
- Create: `apps/mcp/src/folder-path.ts`
- Create: `apps/mcp/src/item-name.ts`
- Create: `apps/mcp/src/mock-api-options.ts`
- Create: `apps/mcp/src/register-tools.ts`
- Create: `apps/mcp/src/resolvePath.ts`
- Create: `apps/mcp/src/tool-errors.ts`
- Create: `apps/mcp/src/tree.ts`
- Create: `apps/mcp/src/tools/*`
- Create: `apps/mcp/src/__test__/*`

- [ ] **Step 1: Stage and verify `apps/mcp` files**
```bash
git add apps/mcp/
```

- [ ] **Step 2: Commit `apps/mcp`**
```bash
git commit -m "feat(mcp): MCP 툴 핸들러, 트리 탐색 및 경로 해석기 구현"
```

---

### Task 6: `apps/web` 프론트엔드 커밋

Next.js 웹 프론트엔드의 mock-api SSE/SelectedFile 훅, mcp-guide 컴포넌트, workspace 권한/설정, error boundary 및 테스트 폴리필/수정사항을 커밋합니다.

**Files:**
- Modify: [middleware.ts](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/apps/web/middleware.ts)
- Modify: [next.config.mjs](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/apps/web/next.config.mjs)
- Modify: [package.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/apps/web/package.json)
- Modify: [tsconfig.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/apps/web/tsconfig.json)
- Delete: `apps/web/types/User.ts`
- Delete: `apps/web/types/schema.ts`
- Create: `apps/web/jest.polyfill.ts`
- Create: `apps/web/types/permissions.ts`
- Create: `apps/web/app/[locale]/error.tsx`
- Create: `apps/web/app/[locale]/not-found.tsx`
- Create: `apps/web/app/global-error.tsx`
- Create: `apps/web/features/code-gen/*`
- Create: `apps/web/features/mcp-guide/*`
- Create: `apps/web/features/mock-api/*`
- Create: `apps/web/features/workspace*`
- Create: `apps/web/hooks/*`
- Create: `apps/web/lib/queryKeys/*`
- Create: `apps/web/components/*`
- Create: `apps/web/**/__test__/*`

- [ ] **Step 1: Stage and verify `apps/web` files**
```bash
git add apps/web/
```

- [ ] **Step 2: Commit `apps/web`**
```bash
git commit -m "feat(web): mock-api 상세 컴포넌트, 에러 바운더리, 워크스페이스 기능 및 단위 테스트 업데이트"
```

---

### Task 7: Root Infrastructure & Monorepo Config 커밋

모노레포 루트 의존성 설정, turbo.json, docker-compose.prod.yml 및 관련 설정을 커밋합니다.

**Files:**
- Modify: [package.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/package.json)
- Modify: [package-lock.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/package-lock.json)
- Modify: [docker-compose.prod.yml](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/docker-compose.prod.yml)
- Modify: [turbo.json](file:///c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/turbo.json)

- [ ] **Step 1: Stage root configuration files**
```bash
git add package.json package-lock.json docker-compose.prod.yml turbo.json docs/superpowers/plans/
```

- [ ] **Step 2: Commit root changes**
```bash
git commit -m "chore(repo): 루트 의존성 패키지, 빌드 파이프라인 설정 및 커밋 계획 문서 추가"
```

---

## [커밋할 파일 목록]

| 순번 | 커밋 대상 모듈/영역 | 주요 변경 및 생성 파일 목록 |
|---|---|---|
| 1 | `packages/types` | `packages/types/package.json`, `src/index.ts`, `src/schema.ts`, `eslint.config.js`, `tsconfig.build.json`, `turbo.json`, `fieldValidation.ts`, `fileBrowserItem.ts`, `mcpTools.ts`, `mockContract.ts`, `scripts/*`, `src/__test__/*` |
| 2 | `packages/codegen` | `packages/codegen/package.json`, `src/clientSnippets.ts`, `src/identifiers.ts`, `src/querySnippets.ts`, `src/schemaToType.ts`, `src/types.ts`, `src/validationSnippets.ts`, `eslint.config.js`, `src/context.ts`, `src/listSignature.ts`, `src/responseTypes.ts`, `src/clients/*`, `src/__test__/*` |
| 3 | `packages/mockgen` | `packages/mockgen/package.json`, `src/convertSchema.ts`, `src/fakerMethods.ts`, `src/generateData.ts`, `eslint.config.js`, `src/__test__/*` |
| 4 | `apps/api` | `apps/api/eslint.config.js`, `src/auth/*`, `src/common/*`, `src/config/*`, `src/cors-options*`, `src/trust-proxy*`, `src/database/*`, `src/filebrowser/*`, `src/mockserver/*`, `src/workspaces/*` |
| 5 | `apps/mcp` | `apps/mcp/.env.example`, `src/api-paths.ts`, `src/folder-path.ts`, `src/item-name.ts`, `src/mock-api-options.ts`, `src/register-tools.ts`, `src/resolvePath.ts`, `src/tool-errors.ts`, `src/tree.ts`, `src/tools/*`, `src/__test__/*` |
| 6 | `apps/web` | `apps/web/middleware.ts`, `next.config.mjs`, `package.json`, `tsconfig.json`, `jest.polyfill.ts`, `types/permissions.ts`, Error Boundary (`app/**/error.tsx`), `features/*`, `hooks/*`, `lib/queryKeys/*`, 삭제된 파일 (`types/User.ts`, `types/schema.ts`) |
| 7 | 루트 설정 | `package.json`, `package-lock.json`, `docker-compose.prod.yml`, `turbo.json`, `docs/superpowers/plans/*` |

---

## [권장 커밋 메시지]

```bash
# 1. packages/types
git add packages/types/
git commit -m "feat(types): 스키마 검증, 계약 타입 및 빌드 스크립트 업데이트"

# 2. packages/codegen
git add packages/codegen/
git commit -m "feat(codegen): 코드 생성 스니펫, 컨텍스트 및 응답 타입 기능 개선"

# 3. packages/mockgen
git add packages/mockgen/
git commit -m "feat(mockgen): mock 데이터 생성 알고리즘 및 faker 연동 개선"

# 4. apps/api
git add apps/api/
git commit -m "feat(api): 인증 가드, mock 상태 관리, 파일탐색기 DTO 및 스키마 테스트 추가"

# 5. apps/mcp
git add apps/mcp/
git commit -m "feat(mcp): MCP 툴 핸들러, 트리 탐색 및 경로 해석기 구현"

# 6. apps/web
git add apps/web/
git commit -m "feat(web): mock-api 상세 컴포넌트, 에러 바운더리, 워크스페이스 기능 및 단위 테스트 업데이트"

# 7. Root Monorepo Infrastructure
git add package.json package-lock.json docker-compose.prod.yml turbo.json docs/superpowers/plans/
git commit -m "chore(repo): 루트 의존성 패키지, 빌드 파이프라인 설정 및 커밋 계획 문서 추가"
```
