import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/constant/tokens';
import { DistributedLockService } from 'src/redis/distributed-lock.service';
import { RedisLockAspect } from 'src/redis/redis-lock.aspect';
import { RedisCacheAspect } from './redis-cache.aspect';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');

        if (!url) {
          throw new Error('REDIS_URL이 설정되지 않았습니다.');
        }

        return new Redis(url);
      },
      inject: [ConfigService],
    },
    DistributedLockService,
    RedisLockAspect,
    RedisCacheAspect,
  ],
  exports: [REDIS_CLIENT, DistributedLockService],
})
export class RedisModule {}

/**
 * 사용법
 * constructor(
 * @Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 */
