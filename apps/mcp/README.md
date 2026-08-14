# JSON Mock Hub — MCP Server (`apps/mcp`)

JSON Mock Hub의 **Model Context Protocol (MCP)** 서버 애플리케이션입니다.
Claude Desktop, Cursor, Claude Code, Antigravity 등 MCP를 지원하는 AI 어시스턴트가 자연어로 JSON Mock Hub 워크스페이스를 직접 탐색하고, Mock API를 생성·수정·삭제하며, 즉시 사용 가능한 클라이언트 코드를 생성할 수 있도록 도구(Tools)를 제공합니다.

> **모노레포 위치:** `apps/mcp` · **백엔드 문서:** [`apps/api`](../api/README.md) · **프론트엔드 문서:** [`apps/web`](../web/README.md)

---

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| **Protocol & SDK** | **`@modelcontextprotocol/sdk` (v1.12+)** |
| **Runtime & Language** | **Node.js 20+**, TypeScript 5.9, `tsx` |
| **Validation** | **Zod** (도구 입력 스키마 검증) |
| **공유 패키지** | `@workspace/types`, `@workspace/codegen`, `@workspace/mockgen` |

---

## 🤖 제공 도구 목록 (MCP Tools - 10종)

MCP 클라이언트에 등록되어 AI가 호출할 수 있는 도구 목록입니다:

| 도구명 | 설명 | 주요 매개변수 |
| :--- | :--- | :--- |
| `create_mock_api` | 새로운 Mock API를 생성합니다. | `name`, `path`, `method`, `schema`, `description`, `delay` |
| `create_folder` | 파일 브라우저 트리에 새 폴더를 생성합니다. | `name`, `parentPath` |
| `list_mock_apis` | 워크스페이스 내의 모든 Mock API 및 폴더 계층 구조를 조회합니다. | 없음 |
| `describe_mock_api` | 특정 Mock API의 스키마 구조, 필드 정보, 설정값을 상세 조회합니다. | `path` |
| `update_mock_api` | 기존 Mock API의 스키마, 필드, 응답 설정, 지연 시간(delay) 등을 수정합니다. | `path`, `schema`, `description`, `delay` |
| `rename_mock_api` | Mock API 또는 폴더의 이름을 변경합니다. | `path`, `newName` |
| `move_mock_api` | Mock API 또는 폴더를 다른 부모 폴더로 이동합니다. | `path`, `targetFolderPath` |
| `delete_mock_api` | 특정 Mock API 또는 폴더(하위 항목 포함)를 삭제합니다. | `path` |
| `reset_mock_state` | Mock API의 상태를 초기화합니다. | `path` |
| `get_api_code` | 지정한 Mock API에 대해 즉시 복사 가능한 클라이언트 코드(TS 타입, Fetch, Axios, React Query, Zod)를 생성합니다. | `path`, `type` (types \| fetch \| axios \| react-query \| zod) |

---

## ⚙️ 환경 변수 (`apps/mcp/.env`)

MCP 서버가 백엔드 API와 통신하기 위해 필요한 설정값입니다.

```env
API_KEY=jmh_live_xxxxxxxxxxxxxxxxxxxxxxxx        # 워크스페이스 설정 페이지에서 발급받은 API 키
WORKSPACE_ID=66b4f123456789abcdef0123           # 대상 워크스페이스 ID
BASE_URL=http://localhost:4001                   # apps/api 백엔드 주소
```

---

## 🔌 Claude Desktop 연동 가이드

Claude Desktop 설정 파일(`claude_desktop_config.json`)에 아래와 같이 등록하여 즉시 사용할 수 있습니다.

### 설정 파일 위치
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### 설정 예시
```json
{
  "mcpServers": {
    "json-mock-hub": {
      "command": "node",
      "args": [
        "c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/apps/mcp/node_modules/tsx/dist/cli.mjs",
        "c:/Users/MyPC/Desktop/NB/Json-mock-hub-monorepo/apps/mcp/src/index.ts"
      ],
      "env": {
        "API_KEY": "jmh_live_your_api_key_here",
        "WORKSPACE_ID": "your_workspace_id_here",
        "BASE_URL": "http://localhost:4001"
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

# TypeScript 컴파일 검사
npm run typecheck -w apps/mcp

# 린트 검사
npm run lint -w apps/mcp

# 단위 테스트 실행 (Jest)
npm run test -w apps/mcp
```
