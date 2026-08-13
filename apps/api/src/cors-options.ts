import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// MockserverController가 @Controller('api')이므로 mock 요청은 /api 또는 /api/**로 들어온다.
// /apiary 같은 경로를 오인하지 않도록 경계를 명시한다.
const MOCK_ROUTE_PATTERN = /^\/api(\/|\?|$)/;

/**
 * 요청 경로에 따라 CORS 정책을 고른다.
 *
 * 전역 enableCors는 등록 즉시 express에 설치되어 어떤 모듈 미들웨어보다 먼저 실행되고,
 * OPTIONS를 res.end()로 종료한다. 즉 미들웨어 계층에서는 목서버용 프리플라이트를
 * 가로챌 수 없다. 그래서 경로별 정책 결정을 이 함수 한 곳으로 모은다.
 */
export function resolveCorsOptions(
  url: string | undefined,
  dashboardOrigin: string,
): CorsOptions {
  if (MOCK_ROUTE_PATTERN.test(url ?? '')) {
    return {
      // 외부 앱이 자유롭게 호출해야 하는 mock 서버이므로 전면 개방한다
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      // origin: '*'와 credentials: true를 동시에 보내면 브라우저가 응답을 거부한다
      credentials: false,
    };
  }

  return { origin: dashboardOrigin, credentials: true };
}
