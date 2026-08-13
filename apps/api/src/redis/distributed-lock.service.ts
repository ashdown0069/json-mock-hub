import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from 'src/constant/tokens';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  /** 인스턴스 고유 식별자 — 로그에서 어느 프로세스가 잡았는지 식별하는 용도 */
  private readonly instanceId = randomUUID();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * 락 획득 시도
   *
   * Redis SET NX EX 명령의 원자성을 이용하여
   * 동시에 여러 호출자가 시도해도 단 하나만 성공한다.
   *
   * 저장하는 값은 **호출마다 새로 만드는 토큰**이다. 프로세스 공용 식별자를 쓰면
   * 한 프로세스 안의 동시 요청 A·B가 같은 값을 갖게 되고, A의 락이 TTL로 만료된 뒤
   * B가 락을 잡았을 때 A의 release가 B의 락을 지운다.
   *
   * @param key - 락 식별 키 (예: 'cron:bookScraper')
   * @param ttlSeconds - 락 자동 만료 시간(초). 호출자 크래시 시 안전장치 역할
   * @returns 획득 성공 시 소유권 토큰, 이미 점유 중이면 null
   */
  async tryAcquire(key: string, ttlSeconds: number): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const token = `${this.instanceId}:${randomUUID()}`;

    // SET key value NX EX ttl → 키가 없을 때만 설정하는 원자적 명령
    // NX: 키가 존재하지 않을 때만 SET (Not eXists)
    // EX: TTL을 초 단위로 설정 → 크래시 시 자동 해제 보장
    const result = await this.redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');

    if (result !== 'OK') {
      this.logger.warn(`Lock denied: ${lockKey} (held by another owner)`);
      return null;
    }

    this.logger.log(`Lock acquired: ${lockKey} (instance: ${this.instanceId})`);
    return token;
  }

  /**
   * 락 해제
   *
   * Lua 스크립트로 "자기 것인지 확인 → 삭제"를 원자적으로 수행한다.
   * GET과 DEL을 별도 명령으로 보내면 그 사이에 다른 호출자가
   * 락을 획득할 수 있는 race condition이 발생하므로,
   * 반드시 Lua 스크립트로 하나의 원자적 연산으로 묶어야 한다.
   *
   * @param key - 해제할 락의 키
   * @param token - tryAcquire가 반환한 소유권 토큰
   * @returns true면 정상 해제, false면 소유권 불일치(이미 만료되었거나 다른 호출자 소유)
   */
  async release(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    // Lua 스크립트: KEYS[1]의 값이 ARGV[1](자신의 토큰)과 일치하면 DEL
    // Redis는 Lua 스크립트를 단일 명령처럼 원자적으로 실행함
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, token);
    const released = result === 1;

    if (released) {
      this.logger.log(`Lock released: ${lockKey}`);
    } else {
      this.logger.warn(
        `Lock release failed: ${lockKey} (not owned by this caller)`,
      );
    }

    return released;
  }
}
