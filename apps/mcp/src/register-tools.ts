import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "./api-client"
import type { McpConfig } from "./config"
import { registerCreateMockApi } from "./tools/create-mock-api"
import { registerCreateFolder } from "./tools/create-folder"
import { registerListMockApis } from "./tools/list-mock-apis"
import { registerDescribeMockApi } from "./tools/describe-mock-api"
import { registerUpdateMockApi } from "./tools/update-mock-api"
import { registerRenameMockApi } from "./tools/rename-mock-api"
import { registerMoveMockApi } from "./tools/move-mock-api"
import { registerDeleteMockApi } from "./tools/delete-mock-api"
import { registerResetMockState } from "./tools/reset-mock-state"
import { registerGetApiCode } from "./tools/get-api-code"

/**
 * 등록을 index.ts에서 분리한 이유: index.ts는 최상위에서 loadConfig와
 * transport 연결까지 실행하므로 테스트에서 import할 수 없다. 등록만 떼어
 * 놓으면 가짜 server로 "무엇이 등록됐는지"를 검사할 수 있다.
 */
export function registerAllTools(
  server: McpServer,
  client: ApiClient,
  config: McpConfig
): void {
  registerCreateMockApi(server, client, config)
  registerCreateFolder(server, client)
  registerListMockApis(server, client)
  registerDescribeMockApi(server, client, config)
  registerUpdateMockApi(server, client, config)
  registerRenameMockApi(server, client)
  registerMoveMockApi(server, client)
  registerDeleteMockApi(server, client)
  registerResetMockState(server, client)
  registerGetApiCode(server, client, config)
}
