import { Test } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';
import { REDIS_CLIENT } from '../constant/tokens';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let redis: { set: jest.Mock; eval: jest.Mock };

  beforeEach(async () => {
    redis = { set: jest.fn(), eval: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();
    service = module.get(DistributedLockService);
  });

  it('획득 성공 시 토큰 문자열을 반환한다', async () => {
    redis.set.mockResolvedValue('OK');

    const token = await service.tryAcquire('mock-state:ws1:/users', 5);

    expect(typeof token).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      'lock:mock-state:ws1:/users',
      token,
      'EX',
      5,
      'NX',
    );
  });

  it('이미 점유 중이면 null을 반환한다', async () => {
    redis.set.mockResolvedValue(null);

    expect(await service.tryAcquire('k', 5)).toBeNull();
  });

  it('같은 키를 두 번 획득하면 서로 다른 토큰이 발급된다', async () => {
    redis.set.mockResolvedValue('OK');

    const first = await service.tryAcquire('k', 5);
    const second = await service.tryAcquire('k', 5);

    // 프로세스 공용 instanceId만 쓰면 두 값이 같아져, 먼저 끝난 쪽이
    // 나중 요청의 락을 해제할 수 있다
    expect(first).not.toBe(second);
  });

  it('release는 전달받은 토큰을 소유권 인자로 넘긴다', async () => {
    redis.eval.mockResolvedValue(1);

    const released = await service.release('k', 'token-123');

    expect(released).toBe(true);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'lock:k',
      'token-123',
    );
  });

  it('소유권이 다르면 release가 false를 반환한다', async () => {
    redis.eval.mockResolvedValue(0);

    expect(await service.release('k', 'token-123')).toBe(false);
  });
});
