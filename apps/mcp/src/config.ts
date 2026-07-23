import { z } from "zod"

// stdio 프로토콜을 오염시키지 않도록 오류는 stderr로만 출력한다
const envSchema = z.object({
  API_BASE_URL: z.string().url().default("http://localhost:4001"),
  MOCK_DOMAIN: z.string().min(1).default("localhost:4001"),
  MOCK_HUB_API_KEY: z.string().min(1),
  MOCK_HUB_WORKSPACE_ID: z.string().min(1),
})

export type McpConfig = z.infer<typeof envSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.flatten().fieldErrors)
    throw new Error(
      `[json-mock-hub-mcp] 환경변수 설정 오류입니다. .mcp.json의 env를 확인하세요: ${errorDetails}`
    )
  }
  return parsed.data
}
