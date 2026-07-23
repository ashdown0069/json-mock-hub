import { Aspect, LazyDecorator, WrapParams } from '@toss/nestjs-aop';
import { Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/constant/tokens';
import {
  REDIS_CACHE_DECORATOR,
  RedisCacheOptions,
} from './redis-cache.decorator';

@Aspect(REDIS_CACHE_DECORATOR)
export class RedisCacheAspect implements LazyDecorator<any, RedisCacheOptions> {
  private readonly logger = new Logger(RedisCacheAspect.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  wrap({
    method,
    metadata,
    instance,
    methodName,
  }: WrapParams<any, RedisCacheOptions>) {
    const { ttl = 3600 } = metadata;
    const className = instance.constructor.name;
    const prefix = `cache:${className}.${methodName}`;

    return async (...args: any[]) => {
      const keySuffix = args.map((a) => String(a)).join('::');
      const cacheKey = `${prefix}:${args.length}:${keySuffix}`;

      try {
        const cached = await this.redis.get(cacheKey);
        if (cached !== null) {
          this.logger.debug(`HIT ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.error(`Redis GET 실패, 원본 실행: ${error}`);
      }

      const result = await (async () => {
        try {
          return await method(...args);
        } catch (e) {
          console.error(`[Aspect] Error during method execution:`, e);
          throw e;
        }
      })();

      if (result != null) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
          this.logger.debug(`SAVE ${cacheKey} (ttl: ${ttl}s)`);
        } catch (error) {
          this.logger.error(`Redis SETEX 실패: ${error}`);
        }
      }

      return result;
    };
  }
}
