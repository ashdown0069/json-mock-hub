import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import * as https from 'https';
import * as http from 'http';
import CacheableLookup from 'cacheable-lookup';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';
import { AopModule } from '@toss/nestjs-aop';
import { FilebrowserModule } from './filebrowser/filebrowser.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MockserverModule } from './mockserver/mockserver.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { CsrfHeaderGuard } from './auth/guards/csrf-header.guard';
import { validateEnv } from './config/env.validation';

const cacheable = new CacheableLookup();

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 200,
  maxFreeSockets: 20,
  maxTotalSockets: 200,
  scheduling: 'lifo',
  timeout: 20000, // connection timeout
  keepAliveMsecs: 1000,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 200,
  maxFreeSockets: 20,
  maxTotalSockets: 200,
  scheduling: 'lifo',
  timeout: 20000, // connection timeout
  keepAliveMsecs: 1000,
});

cacheable.install(httpAgent);
cacheable.install(httpsAgent);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      // 필수 시크릿 누락 시 부팅을 중단한다 (fallback으로 조용히 기동하는 것 방지)
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'rate-limit',
          ttl: 60000, // 1m
          limit: 60,
          blockDuration: 60 * 60 * 1000, //1h
        },
        {
          // mock 서버 쓰기 전용 한도.
          // 미인증·공개 경로라 전역 한도를 건너뛰지만, 쓰기는 Redis 오버레이를
          // 늘리므로 무제한으로 둘 수 없다. 읽기(GET)는 가드가 통과시킨다.
          name: 'mock-write',
          ttl: 60000, // 1m
          limit: 120,
        },
      ],
    }),
    HttpModule,
    CommonModule,
    ScheduleModule.forRoot(),
    AopModule,
    MockserverModule,
    DashboardModule,
    FilebrowserModule,
    RedisModule,
    WorkspacesModule,
    UsersModule,
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfHeaderGuard,
    },
  ],
})
export class AppModule {}
