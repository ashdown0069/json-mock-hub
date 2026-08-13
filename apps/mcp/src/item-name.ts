// apps/api/src/filebrowser/dto/req/create-item.ts의 ITEM_NAME_REGEX와 동일 규칙.
// 서버가 400을 던지기 전에 MCP가 먼저 걸러 LLM이 즉시 자가 수정하게 한다.
export const ITEM_NAME_REGEX = /^[a-zA-Z0-9가-힣_-]+$/
