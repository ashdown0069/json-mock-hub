import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../constant/tokens';
import { DistributedLockService } from '../redis/distributed-lock.service';
import { MockStateEventService } from './mock-state-event.service';
import {
  CollectionOverlay,
  createEmptyOverlay,
  normalizeOverlay,
} from './mock-state.util';

const OVERLAY_TTL_SECONDS = 3600; // 1시간 후 샌드박스 자동 초기화

/**
 * 임계구역 락의 TTL.
 * 임계구역은 Redis 왕복 2회(GET/SET)뿐이라 정상적으로는 밀리초 단위로 끝난다.
 * 이보다 오래 걸린 호출은 이미 클라이언트 타임아웃에 걸린 상태이므로,
 * 짧게 잡아 크래시한 호출자가 락을 오래 붙들지 못하게 한다.
 */
const LOCK_TTL_SECONDS = 5;
/** 락 재시도 횟수와 간격 — 총 대기 시간은 약 100ms다. */
const LOCK_RETRY_COUNT = 5;
const LOCK_RETRY_DELAY_MS = 20;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * mutate 콜백의 반환 계약.
 *
 * overlay와 result를 분리하는 것이 핵심이다. 하나로 합쳐 null을 쓰면
 * "저장하지 않음"과 "결과 없음"이 뭉개져, 거절 사유가 둘 이상이 되는 순간
 * 호출부가 사유를 구분할 수 없다.
 */
export interface MutationOutcome<T> {
  /** null이면 저장을 건너뛴다(대상 없음·요청 거절). */
  overlay: CollectionOverlay | null;
  result: T;
}

@Injectable()
export class MockStateService {
  private readonly logger = new Logger(MockStateService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly lockService: DistributedLockService,
    private readonly stateEvent: MockStateEventService,
  ) {}

  private key(workspaceId: string, path: string): string {
    return `mock:state:${workspaceId}:${path}`;
  }

  async getOverlay(workspaceId: string, path: string): Promise<CollectionOverlay> {
    const raw = await this.redis.get(this.key(workspaceId, path));
    if (!raw) return createEmptyOverlay();
    try {
      // 캐스팅만 하면 손상값·구버전값이 그대로 리듀서에 흘러간다
      return normalizeOverlay(JSON.parse(raw));
    } catch {
      // JSON으로 파싱조차 안 되는 값은 빈 오버레이로 폴백한다.
      return createEmptyOverlay();
    }
  }

  async setOverlay(
    workspaceId: string,
    path: string,
    overlay: CollectionOverlay,
  ): Promise<void> {
    await this.redis.set(
      this.key(workspaceId, path),
      JSON.stringify(overlay),
      'EX',
      OVERLAY_TTL_SECONDS,
    );
  }

  async reset(workspaceId: string, path: string): Promise<void> {
    await this.redis.del(this.key(workspaceId, path));
    await this.stateEvent.publish({ workspaceId, path });
  }

  /**
   * 여러 경로의 오버레이를 한 번에 폐기한다.
   *
   * 경로 변경(이름 변경·이동·폴더 삭제)은 하위 항목까지 N개 경로를 만든다.
   * DEL은 가변 인자를 받으므로 경로 수와 무관하게 왕복이 1회로 고정된다.
   * 없는 키에 대한 DEL은 no-op이라 호출 전 존재 확인이 필요 없고, 멱등이다.
   */
  async resetMany(workspaceId: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    // 폴더와 그 하위가 같은 배열에 담기므로 같은 경로가 중복 수집될 수 있다
    const uniquePaths = [...new Set(paths)];
    const keys = uniquePaths.map((path) => this.key(workspaceId, path));
    await this.redis.del(...keys);
    await this.stateEvent.publishMany(workspaceId, uniquePaths);
  }

  /**
   * 오버레이를 읽고 바꿔 쓰는 구간을 (workspace, path) 단위 임계구역으로 감싼다.
   *
   * 락을 잡은 **뒤에** 오버레이를 다시 읽는 것이 핵심이다. 락 밖에서 읽은 값으로
   * 계산하면 락을 걸어도 나중 쓰기가 앞선 쓰기를 덮어쓴다.
   *
   * @param fn 현재 오버레이를 받아 다음 오버레이와 결과를 돌려주는 순수 함수.
   *           overlay가 null이면 저장하지 않고 result만 돌려준다.
   * @returns fn이 돌려준 result.
   * @throws ServiceUnavailableException 재시도 후에도 락을 얻지 못한 경우
   */
  async mutate<T>(
    workspaceId: string,
    path: string,
    fn: (overlay: CollectionOverlay) => MutationOutcome<T>,
  ): Promise<T> {
    const lockKey = `mock-state:${workspaceId}:${path}`;

    let token: string | null = null;
    for (let attempt = 0; attempt <= LOCK_RETRY_COUNT; attempt += 1) {
      token = await this.lockService.tryAcquire(lockKey, LOCK_TTL_SECONDS);
      if (token) break;
      if (attempt < LOCK_RETRY_COUNT) await delay(LOCK_RETRY_DELAY_MS);
    }

    if (!token) {
      // 락 없이 진행하면 조용히 쓰기가 유실된다. 실패를 드러내는 편이 낫다.
      this.logger.warn(`Overlay lock timeout: ${lockKey}`);
      throw new ServiceUnavailableException({
        message:
          '같은 컬렉션에 동시 쓰기가 몰려 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        key: 'mockStateBusy',
      });
    }

    try {
      const current = await this.getOverlay(workspaceId, path);
      const applied = fn(current);
      if (applied.overlay) {
        await this.setOverlay(workspaceId, path, applied.overlay);
        await this.stateEvent.publish({ workspaceId, path });
      }
      return applied.result;
    } finally {
      await this.lockService.release(lockKey, token);
    }
  }
}
