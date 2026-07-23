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
        return new Redis(config.get('REDIS_URL'));
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
