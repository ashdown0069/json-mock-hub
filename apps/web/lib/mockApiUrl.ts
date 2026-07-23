/**
 * NEXT_PUBLIC_MOCK_DOMAIN 환경변수를 기반으로 워크스페이스 전용 목 API의 Base URL을 생성합니다.
 * 개발 환경: "localhost:4001" (프로토콜: http, 예시: http://{workspaceId}.localhost:4001/api)
 * 운영 환경: "myrealm.cloud" (프로토콜: https, 예시: https://{workspaceId}.myrealm.cloud/api)
 */
export function getMockApiBaseUrl(workspaceId: string): string {
  // NEXT_PUBLIC_MOCK_DOMAIN이 정의되지 않은 경우 개발 api 포트(4001)로 폴백합니다.
  const domain = process.env.NEXT_PUBLIC_MOCK_DOMAIN ?? "localhost:4001"
  const protocol = domain.startsWith("localhost") ? "http" : "https"
  return `${protocol}://${workspaceId}.${domain}/api`
}
