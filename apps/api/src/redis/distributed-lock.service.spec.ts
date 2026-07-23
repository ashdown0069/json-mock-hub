import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/constant/tokens';
import { DistributedLockService } from './distributed-lock.service';

const TEST_KEY = 'test:distributed-lock';

// 실제 Redis가 필요한 통합 테스트. 기본 실행에선 skip하고, RUN_REDIS_TESTS=1일 때만 수행한다.
const describeRedis =
  process.env.RUN_REDIS_TESTS === '1' ? describe : describe.skip;

// ── 1. DistributedLockService 통합 테스트 ──
describeRedis('DistributedLockService (실제 Redis)', () => {
  let module: TestingModule;
  let redis: Redis;
  let lockService: DistributedLockService;

  beforeAll(async () => {
    redis = new Redis({ host: 'localhost', port: 6379 });

    module = await Test.createTestingModule({
      providers: [
        { provide: REDIS_CLIENT, useValue: redis },
        DistributedLockService,
      ],
    }).compile();
    await module.init();

    lockService = module.get(DistributedLockService);
  });

  beforeEach(async () => {
    const keys = await redis.keys('lock:test:*');
    if (keys.length) await redis.del(...keys);
  });

  afterAll(async () => {
    const keys = await redis.keys('lock:test:*');
    if (keys.length) await redis.del(...keys);
    await redis.quit();
    await module.close();
  });

  it('락 획득에 성공한다', async () => {
    const result = await lockService.tryAcquire(TEST_KEY, 10);
    expect(result).toBe(true);
  });

  it('동일 키에 대해 이중 획득이 불가능하다', async () => {
    await lockService.tryAcquire(TEST_KEY, 10);
    const second = await lockService.tryAcquire(TEST_KEY, 10);
    expect(second).toBe(false);
  });

  it('락 해제 후 같은 키를 재획득할 수 있다', async () => {
    await lockService.tryAcquire(TEST_KEY, 10);
    await lockService.release(TEST_KEY);

    const reacquired = await lockService.tryAcquire(TEST_KEY, 10);
    expect(reacquired).toBe(true);
  });

  it('TTL 만료 후 자동으로 락이 해제되어 재획득 가능하다', async () => {
    await lockService.tryAcquire(TEST_KEY, 1);
    await new Promise((r) => setTimeout(r, 2000));

    const reacquired = await lockService.tryAcquire(TEST_KEY, 10);
    expect(reacquired).toBe(true);
  }, 10000);
});

// ── 2. 두 인스턴스 간 분산락 경쟁 테스트 ──
describeRedis('DistributedLockService — 2개 인스턴스 경쟁 (실제 Redis)', () => {
  let redis: Redis;
  let moduleA: TestingModule;
  let moduleB: TestingModule;
  let instanceA: DistributedLockService;
  let instanceB: DistributedLockService;

  beforeAll(async () => {
    redis = new Redis({ host: 'localhost', port: 6379 });

    // 서로 다른 모듈 = 서로 다른 instanceId (randomUUID)
    [moduleA, moduleB] = await Promise.all([
      Test.createTestingModule({
        providers: [
          { provide: REDIS_CLIENT, useValue: redis },
          DistributedLockService,
        ],
      })
        .compile()
        .then(async (m) => {
          await m.init();
          return m;
        }),
      Test.createTestingModule({
        providers: [
          { provide: REDIS_CLIENT, useValue: redis },
          DistributedLockService,
        ],
      })
        .compile()
        .then(async (m) => {
          await m.init();
          return m;
        }),
    ]);

    instanceA = moduleA.get(DistributedLockService);
    instanceB = moduleB.get(DistributedLockService);
  });

  beforeEach(async () => {
    const keys = await redis.keys('lock:test:*');
    if (keys.length) await redis.del(...keys);
  });

  afterAll(async () => {
    const keys = await redis.keys('lock:test:*');
    if (keys.length) await redis.del(...keys);
    await redis.quit();
    await moduleA.close();
    await moduleB.close();
  });

  it('인스턴스A가 락을 잡으면, 인스턴스B는 획득에 실패한다', async () => {
    const acquiredA = await instanceA.tryAcquire(TEST_KEY, 10);
    const acquiredB = await instanceB.tryAcquire(TEST_KEY, 10);

    expect(acquiredA).toBe(true);
    expect(acquiredB).toBe(false);
  });

  it('인스턴스B는 인스턴스A의 락을 해제할 수 없다', async () => {
    await instanceA.tryAcquire(TEST_KEY, 10);

    const releasedByB = await instanceB.release(TEST_KEY);
    expect(releasedByB).toBe(false);

    // 락이 여전히 살아있으므로 B는 획득 불가
    const retryB = await instanceB.tryAcquire(TEST_KEY, 10);
    expect(retryB).toBe(false);
  });

  it('인스턴스A가 락을 해제하면, 인스턴스B가 획득할 수 있다', async () => {
    await instanceA.tryAcquire(TEST_KEY, 10);
    await instanceA.release(TEST_KEY);

    const acquiredB = await instanceB.tryAcquire(TEST_KEY, 10);
    expect(acquiredB).toBe(true);
  });

  it('두 인스턴스가 동시에 락을 시도하면 단 하나만 성공한다', async () => {
    const [resultA, resultB] = await Promise.all([
      instanceA.tryAcquire(TEST_KEY, 10),
      instanceB.tryAcquire(TEST_KEY, 10),
    ]);

    // 정확히 하나만 true
    expect([resultA, resultB].filter(Boolean)).toHaveLength(1);
  });
});
