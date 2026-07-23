import { Aspect, LazyDecorator, WrapParams } from '@toss/nestjs-aop';
import { Injectable, Logger } from '@nestjs/common';
import { DistributedLockService } from './distributed-lock.service';
import { REDIS_LOCK_DECORATOR, RedisLockOptions } from './redis-lock.decorator';

@Aspect(REDIS_LOCK_DECORATOR)
@Injectable()
export class RedisLockAspect implements LazyDecorator<any, RedisLockOptions> {
  private readonly logger = new Logger(RedisLockAspect.name);

  constructor(private readonly lockService: DistributedLockService) {}

  wrap({ method, metadata }: WrapParams<any, RedisLockOptions>) {
    const { key, ttlSeconds } = metadata;

    return async (...args: any[]) => {
      const acquired = await this.lockService.tryAcquire(key, ttlSeconds);
      if (!acquired) {
        this.logger.log(
          `Skipping cron job [${key}]: another instance holds the lock`,
        );
        return;
      }

      try {
        return await method(...args);
      } finally {
        await this.lockService.release(key);
      }
    };
  }
}
