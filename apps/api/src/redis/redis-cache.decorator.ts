import { createDecorator } from '@toss/nestjs-aop';

export const REDIS_CACHE_DECORATOR = Symbol('REDIS_CACHE_DECORATOR');

export interface RedisCacheOptions {
  /** TTL (초 단위). 기본값: 3600 (1시간) */
  ttl?: number;
}

export const RedisCache = (options?: RedisCacheOptions) =>
  createDecorator(REDIS_CACHE_DECORATOR, options ?? {});
