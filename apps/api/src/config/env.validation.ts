/**
 * 부팅 시 필수 환경변수를 일괄 검증한다.
 *
 * 개별 사용처에 `|| 'defaultSecret'` 같은 fallback을 두면 검증 키와 서명 키가
 * 비대칭이 되어도 앱이 조용히 기동한다. 여기서 fail-fast하는 것이 근본 대책이다.
 */
const REQUIRED_ENV_KEYS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `필수 환경변수가 설정되지 않았습니다: ${missing.join(', ')}. .env 파일을 확인하세요.`,
    );
  }

  return config;
}
