import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

import { Request } from 'express';
import { resolveCorsOptions } from './cors-options';
import { TRUST_PROXY_HOPS } from './trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // 리버스 프록시(Cloudflare, Nginx) 뒤에서 req.hostname과 req.ip가
  // X-Forwarded-* 를 반영하도록 설정한다.
  //
  // true를 주면 안 된다. req.ip가 요청자가 써 넣은 X-Forwarded-For 맨 왼쪽
  // 값이 되고, ThrottlerGuard가 그 값을 추적 키로 쓰므로 로그인 브루트포스
  // 제한(auth.controller.ts의 @Throttle 5회/분)이 통째로 뚫린다.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', TRUST_PROXY_HOPS);

  const dashboardOrigin =
    process.env.CORS_ORIGIN_URL || 'http://localhost:4000';

  // 경로별 정책을 delegate로 결정한다.
  // 전역 CORS가 모듈 미들웨어보다 먼저 실행되어 mock 프리플라이트를 가로채던 문제(API-I6)를
  // 미들웨어 제거 + 단일 지점 결정으로 해소한다.
  app.enableCors((req: Request, callback) => {
    callback(null, resolveCorsOptions(req.url, dashboardOrigin));
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // DTO에 선언되지 않은 필드를 제거한다 (mass assignment 차단)
      whitelist: true,
      // 제거에 그치지 않고 400으로 거절해 클라이언트의 오작성을 조기에 드러낸다
      forbidNonWhitelisted: true,
    }),
  );

  // 모든 예외를 단일 에러 바디로 정규화한다.
  // CastError/BSONError가 500으로 유출되던 것을 400으로 바로잡고,
  // 클라이언트(web/mcp)가 분기할 수 있는 code를 항상 제공한다.
  app.useGlobalFilters(new AllExceptionsFilter());

  // SIGTERM 시 onModuleDestroy/onApplicationShutdown이 실행되도록 한다.
  // 없으면 Redis subscriber의 quit()가 호출되지 않고, 롤링 배포에서
  // in-flight 요청이 그대로 끊긴다.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
