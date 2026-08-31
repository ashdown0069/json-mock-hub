# JSON Mock Hub — MCP Server (`apps/mcp`)

JSON Mock Hub의 **Model Context Protocol (MCP)** 서버 애플리케이션입니다.  
Claude Desktop, Cursor, Claude Code, Antigravity 등 MCP를 지원하는 AI 클라이언트가 표준 stdio 통신을 통해 워크스페이스를 직접 탐색하고, Mock API 생성·수정·삭제 및 클라이언트 연동 코드를 추출할 수 있는 표준 도구(Tools)를 제공합니다.

> **모노레포 위치:** `apps/mcp` · [🏠 루트 문서](../../README.md) · [🌐 프론트엔드 문서](../web/README.md) · [⚙️ 백엔드 문서](../api/README.md)

---

## 🛠️ 기술 스택

| 영역                   | 사용 기술                                                      |
| :--------------------- | :------------------------------------------------------------- |
| **Protocol & SDK**     | **`@modelcontextprotocol/sdk` (v1.12+)**                       |
| **Runtime & Language** | **Node.js 20+**, **TypeScript 5.9**, `tsx`                     |
| **Validation**         | **Zod** (도구 입력 스키마 검증 및 MCP Elicitation 스키마 생성) |
| **공유 패키지**        | `@workspace/types`, `@workspace/codegen`, `@workspace/mockgen` |

---

## 🤖 제공 도구 목록 (MCP Tools - 10종)

단일 진실 원천(`@workspace/types/mcpTools`)에 정의된 10종 도구를 지원합니다.

| 도구명              | 기능 설명                                                                                                                    | 주요 매개변수 (Parameters)                                                                                                                                         |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_mock_api`   | 스키마로부터 mock 데이터를 생성하고 Mock API를 등록합니다. 최상위 `id` 필드는 자동 생성됩니다.                               | `name` (이름), `schema` (타입 정의), `parentPath` (기본 `/`), `count` (1~50), `locale` (`ko`\|`en`), `fakerHints`, `pagination`, `sort`, `search`, `createParents` |
| `create_folder`     | Mock API를 분류할 계층형 폴더를 생성합니다. 중간 경로가 없으면 자동 생성됩니다.                                              | `path` (생성할 폴더 경로, 예: `/shop/v1`)                                                                                                                          |
| `list_mock_apis`    | 워크스페이스 내의 폴더 트리 및 Mock API 목록을 텍스트 트리 구조로 조회합니다.                                                | _(없음)_                                                                                                                                                           |
| `describe_mock_api` | 특정 Mock API의 스키마 구조, Faker 설정, 옵션(페이징/정렬/검색), 호출 URL을 상세 조회합니다.                                 | `path`, `includeData` (true 시 CUD 반영 실효 데이터 2건 샘플 반환)                                                                                                 |
| `update_mock_api`   | Mock API 데이터를 새로 생성해 갱신합니다. 스키마 생략 시 기존 스키마가 재사용됩니다.                                         | `path`, `schema` (선택), `count`, `locale`, `fakerHints`, `pagination`, `sort`, `search`, `disablePagination`, `disableSort`, `disableSearch`                      |
| `rename_mock_api`   | Mock API 또는 폴더의 이름을 변경합니다. (URL 경로 자동 재계산)                                                               | `path`, `newName`                                                                                                                                                  |
| `move_mock_api`     | Mock API 또는 폴더를 다른 폴더로 이동합니다. 동명 폴더 병합 시 확인 플래그가 필요합니다.                                     | `path`, `destinationPath` (기본 `/`), `confirmMerge`                                                                                                               |
| `delete_mock_api`   | Mock API 또는 폴더(하위 항목 재귀 삭제)를 영구 삭제합니다.                                                                   | `path`                                                                                                                                                             |
| `reset_mock_state`  | Mock 서버로 수행된 런타임 CUD 변경(Redis 오버레이)을 폐기하고 원본 Mock 데이터로 복구합니다.                                 | `path`                                                                                                                                                             |
| `get_api_code`      | Mock API 스키마 기반 TS 타입, HTTP 클라이언트, TanStack Query 훅, Zod/Yup/Joi 검증 코드를 생성합니다. (MCP Elicitation 지원) | `path`, `lang` (`ts`\|`js`), `clientMode` (`axios`\|`axios+query`\|`fetch`\|`fetch+query`), `validation` (`zod`\|`yup`\|`joi`\|`none`)                             |

---

## ⚙️ 환경 변수 (`apps/mcp/.env`)

| 환경 변수               | 필수 여부 | 기본값                  | 설명                                                   |
| :---------------------- | :-------: | :---------------------- | :----------------------------------------------------- |
| `MOCK_HUB_API_KEY`      | **필수**  | -                       | 워크스페이스 설정에서 발급받은 API 키 (`jmh_live_...`) |
| `MOCK_HUB_WORKSPACE_ID` | **필수**  | -                       | 대상 워크스페이스 ID (ObjectId 24자리)                 |
| `API_BASE_URL`          |   선택    | `http://localhost:4001` | `apps/api` 백엔드 서버 주소                            |
| `MOCK_DOMAIN`           |   선택    | `localhost:4001`        | Mock API 서빙 호스트 및 포트                           |

---

## 🔌 AI 클라이언트 연동 가이드

### 1. Claude Desktop 연동

설정 파일(`claude_desktop_config.json`)에 아래와 같이 등록합니다.

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "json-mock-hub": {
      "command": "npm",
      "args": [
        "--prefix",
        "<프로젝트 루트 절대경로>",
        "run",
        "start",
        "-w",
        "apps/mcp"
      ],
      "env": {
        "MOCK_HUB_API_KEY": "jmh_live_your_workspace_api_key",
        "MOCK_HUB_WORKSPACE_ID": "your_workspace_id",
        "API_BASE_URL": "http://localhost:4001",
        "MOCK_DOMAIN": "localhost:4001"
      }
    }
  }
}
```

---

## 🚀 실행 및 테스트 방법

```bash
# MCP 서버 단독 실행 (STDIO 통신 대기)
npm run start -w apps/mcp

# TypeScript 타입 검사
npm run typecheck -w apps/mcp

# ESLint 코드 스타일 검사
npm run lint -w apps/mcp

# Jest 단위 테스트 실행 (20개 테스트 스위트)
npm run test -w apps/mcp
```
