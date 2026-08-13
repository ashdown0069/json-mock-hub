/**
 * MCP 서버가 노출하는 도구 이름 (단일 진실 원천).
 *
 * apps/mcp가 등록하는 목록과 apps/web 설치 가이드가 보여주는 목록이 따로
 * 유지되어 실제로 어긋난 적이 있다(move_mock_api가 등록돼 있는데 가이드에는
 * 없었다). 양쪽이 이 배열을 import하고, apps/mcp의 tool-registry 테스트가
 * 등록 결과와 이 배열이 같은지 검사한다.
 */
export const MCP_TOOL_NAMES = [
  "create_mock_api",
  "create_folder",
  "list_mock_apis",
  "describe_mock_api",
  "update_mock_api",
  "rename_mock_api",
  "move_mock_api",
  "delete_mock_api",
  "reset_mock_state",
  "get_api_code",
] as const

export type McpToolName = (typeof MCP_TOOL_NAMES)[number]
