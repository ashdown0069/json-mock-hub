import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MockserverController } from './mockserver.controller';
import { MockserverService } from './mockserver.service';
import { RequestLogService } from './request-log.service';
import { MockCorsMiddleware } from './mock-cors.middleware';

@Module({
  imports: [DatabaseModule],
  controllers: [MockserverController],
  providers: [MockserverService, RequestLogService],
})
export class MockserverModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // /api 경로로 들어오는 목 서버 요청에 개방형 CORS 미들웨어를 적용합니다.
    consumer.apply(MockCorsMiddleware).forRoutes('api');
  }
}
