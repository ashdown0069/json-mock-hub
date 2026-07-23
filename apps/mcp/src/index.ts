import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { loadConfig } from "./config"
import { ApiClient } from "./api-client"
import { registerCreateMockApi } from "./tools/create-mock-api"
import { registerListMockApis } from "./tools/list-mock-apis"
import { registerDeleteMockApi } from "./tools/delete-mock-api"
import { registerRenameMockApi } from "./tools/rename-mock-api"
import { registerUpdateMockApi } from "./tools/update-mock-api"
import { registerGetApiCode } from "./tools/get-api-code"

const config = loadConfig()
const client = new ApiClient(config)

const server = new McpServer({ name: "json-mock-hub", version: "0.1.0" })

registerCreateMockApi(server, client, config)
registerListMockApis(server, client)
registerDeleteMockApi(server, client)
registerRenameMockApi(server, client)
registerUpdateMockApi(server, client, config)
registerGetApiCode(server, client, config)

const transport = new StdioServerTransport()
await server.connect(transport)
// stdout은 MCP 프로토콜 전용이므로 로그는 stderr로만 출력한다
console.error("[json-mock-hub-mcp] stdio 서버가 시작되었습니다.")
