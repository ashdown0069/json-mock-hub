import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { CommonModule } from './common/common.module';
import { TaskModule } from './task/task.module';
import * as https from 'https';
import * as http from 'http';
import CacheableLookup from 'cacheable-lookup';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './redis/redis.module';
import { createKeyv } from '@keyv/redis';
import { AopModule } from '@toss/nestjs-aop';
import { FilebrowserModule } from './filebrowser/filebrowser.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MockserverModule } from './mockserver/mockserver.module';
import { DashboardModule } from './dashboard/dashboard.module';

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
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'rate-limit',
          ttl: 60000, // 1m
          limit: 60,
          blockDuration: 60 * 60 * 1000, //1h
        },
      ],
    }),
    HttpModule,
    CommonModule,
    // CacheModule.registerAsync({
    //   isGlobal: true,
    //   useFactory: async (config: ConfigService) => ({
    //     stores: [createKeyv(config.get('REDIS_URL'))],
    //     ttl: 30 * 60 * 1000, // 30분 (ms)
    //     namespace: 'http-cache',
    //   }),
    //   inject: [ConfigService],
    // }),
    TaskModule,
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
    // BullModule.forRootAsync({
    //   useFactory(config: ConfigService) {
    //     return {
    //       connection: {
    //         url: config.get('REDIS_URL'),
    //       },
    //     };
    //   },
    //   inject: [ConfigService],
    // }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
