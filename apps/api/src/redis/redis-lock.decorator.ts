import { createDecorator } from '@toss/nestjs-aop';

export const REDIS_LOCK_DECORATOR = Symbol('REDIS_LOCK_DECORATOR');

export interface RedisLockOptions {
  /** 락 키 (예: 'cron:bookScraper') */
  key: string;
  /** 락 TTL (초). 작업 예상 최대 소요시간의 2배로 설정 권장 */
  ttlSeconds: number;
}

/**
 * @RedisLock 데코레이터
 * @example
 * @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
 * @RedisLock({ key: 'cron:bookScraper', ttlSeconds: 7200 })
 * async handleCron() { ... }
 */
export const RedisLock = (options: RedisLockOptions) =>
  createDecorator(REDIS_LOCK_DECORATOR, options);
