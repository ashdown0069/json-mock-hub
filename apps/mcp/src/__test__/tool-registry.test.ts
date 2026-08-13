import { MCP_TOOL_NAMES } from "@workspace/types"
import { registerAllTools } from "../register-tools"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ApiClient } from "../api-client"
import type { McpConfig } from "../config"

// 등록 시점에는 데이터 생성이 일어나지 않지만, 도구 모듈이 최상위에서
// mockgen을 import하므로 무거운 faker 초기화를 피하려고 모킹한다.
jest.mock("@workspace/mockgen/generateData", () => ({
  generateDummyData: () => [],
}))

describe("MCP 도구 등록", () => {
  /** registerTool에 들어온 이름만 순서대로 모으는 가짜 server */
  function registeredNames(): string[] {
    const names: string[] = []
    const fakeServer = {
      registerTool: (name: string) => {
        names.push(name)
      },
      // get_api_code가 elicit 클로저를 만들 때 참조한다 (등록 시점에는 호출되지 않음)
      server: { getClientCapabilities: () => ({}) },
    } as unknown as McpServer

    registerAllTools(fakeServer, {} as ApiClient, {} as McpConfig)
    return names
  }

  // 웹 설치 가이드가 이 목록을 그대로 렌더한다. 어긋나면 사용자가 실제로
  // 쓸 수 있는 도구를 못 쓰거나, 없는 도구를 부르라고 안내하게 된다.
  it("실제 등록되는 도구가 공유 목록과 정확히 일치한다", () => {
    expect(registeredNames().sort()).toEqual([...MCP_TOOL_NAMES].sort())
  })

  it("같은 이름을 두 번 등록하지 않는다", () => {
    const names = registeredNames()

    expect(new Set(names).size).toBe(names.length)
  })
})
