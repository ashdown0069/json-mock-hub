// apps/web/lib/mockApiUrl.ts의 getMockApiBaseUrl과 동일 규칙 (localhost → http)
export function getMockApiBaseUrl(
  workspaceId: string,
  mockDomain: string
): string {
  const protocol = mockDomain.startsWith("localhost") ? "http" : "https"
  return `${protocol}://${workspaceId}.${mockDomain}/api`
}
