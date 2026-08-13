/** 사용자가 clone한 모노레포의 절대경로로 치환할 자리.
 *  apps/mcp는 배포되지 않으므로 사용자가 로컬에서 서버를 실행해야 하며,
 *  MCP 클라이언트는 임의 cwd에서 서버를 spawn하므로 npm --prefix로 루트를 고정해야 한다. */
export const REPO_PATH_PLACEHOLDER = "여기에-모노레포-절대경로"

/** MCP 클라이언트에 등록되는 서버 이름.
 *  CLI 명령과 JSON 설정이 서로 다른 이름을 쓰면 같은 서버가 둘로 등록되므로 상수로 묶는다. */
export const MCP_SERVER_NAME = "json-mock-hub"

/** apps/mcp를 띄우는 실행 파일과 인자.
 *  CLI 명령과 JSON 설정이 같은 출처를 보게 해 한쪽만 고쳐 어긋나는 일을 막는다. */
const MCP_SERVER_COMMAND = "npm"
const MCP_SERVER_ARGS = [
  "--prefix",
  REPO_PATH_PLACEHOLDER,
  "run",
  "start",
  "-w",
  "apps/mcp",
] as const

/** apps/mcp가 요구하는 환경변수 네 개를 조립한다.
 *  api 주소·목 도메인은 하드코딩하지 않고 웹이 이미 쓰는 환경변수에서 읽는다.
 *  운영 web에서 복사한 설정이 로컬 api를 가리키면 운영 DB의 워크스페이스를 찾지 못하기 때문이다.
 *  (폴백 값은 lib/mockApiUrl.ts·useFileBrowserSSE.ts와 동일하게 유지한다) */
function resolveMcpEnv(
  workspaceId: string,
  apiKey: string
): Record<string, string> {
  return {
    MOCK_HUB_API_KEY: apiKey,
    MOCK_HUB_WORKSPACE_ID: workspaceId,
    API_BASE_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001",
    MOCK_DOMAIN: process.env.NEXT_PUBLIC_MOCK_DOMAIN ?? "localhost:4001",
  }
}

/** Claude Code에 이 워크스페이스의 MCP 서버를 등록하는 명령을 만든다.
 *  --scope local은 설정을 ~/.claude.json에만 기록하므로 저장소에 API 키가 담긴 파일이 생기지 않는다.
 *  주의: --env 바로 뒤에 서버 이름이 오면 CLI가 이름을 또 다른 KEY=value로 오독하므로
 *  --transport를 사이에 두어야 한다. */
export function buildMcpAddCommand(
  workspaceId: string,
  apiKey: string
): string {
  const env = resolveMcpEnv(workspaceId, apiKey)
  return [
    "claude mcp add --scope local",
    ...Object.entries(env).map(([key, value]) => `--env ${key}=${value}`),
    `--transport stdio ${MCP_SERVER_NAME}`,
    `-- ${MCP_SERVER_COMMAND} ${MCP_SERVER_ARGS.join(" ")}`,
  ].join(" ")
}

/** CLI를 쓰지 않는 클라이언트를 위해 설정 파일에 그대로 붙여넣을 mcpServers 블록을 만든다.
 *  붙여넣기 대상이므로 2칸 들여쓰기로 포매팅한다. */
export function buildMcpServerJson(
  workspaceId: string,
  apiKey: string
): string {
  return JSON.stringify(
    {
      mcpServers: {
        [MCP_SERVER_NAME]: {
          command: MCP_SERVER_COMMAND,
          args: [...MCP_SERVER_ARGS],
          env: resolveMcpEnv(workspaceId, apiKey),
        },
      },
    },
    null,
    2
  )
}
