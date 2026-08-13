import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { loadConfig } from "./config"
import { ApiClient } from "./api-client"
import { registerAllTools } from "./register-tools"

// VSCode MCP 클라이언트는 .vscode/mcp.json의 env를 프로세스에 직접 주입하지만,
// 터미널에서 npm run start로 수동 실행할 때는 그 env가 적용되지 않는다.
// .env가 없으면(=VSCode가 이미 주입한 경우) 조용히 무시하고 process.env를 그대로 사용한다.
try {
  process.loadEnvFile()
} catch {
  // .env 파일이 없는 경우 — VSCode가 env를 직접 주입했다고 가정하고 넘어간다
}

const config = loadConfig()
const client = new ApiClient(config)

const server = new McpServer({ name: "json-mock-hub", version: "0.1.0" })

registerAllTools(server, client, config)

const transport = new StdioServerTransport()

// stdio 파싱 오류를 조용히 버리면 원인 파악이 불가능하다.
// stdout은 MCP 프로토콜 전용이므로 로그는 항상 stderr로만 출력한다.
transport.onerror = (error: Error) => {
  console.error("[json-mock-hub-mcp] transport 오류:", error.message)
}

await server.connect(transport)
console.error("[json-mock-hub-mcp] stdio 서버가 시작되었습니다.")
