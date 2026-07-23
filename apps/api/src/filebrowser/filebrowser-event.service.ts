import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { REDIS_CLIENT } from '../constant/tokens';

export const FILEBROWSER_ACTIONS = [
  'CREATE',
  'MOVE',
  'RENAME',
  'UPDATE',
  'DELETE',
] as const;
export type FilebrowserAction = (typeof FILEBROWSER_ACTIONS)[number];

export interface FilebrowserEvent {
  workspaceId: string;
  action: FilebrowserAction;
}

const CHANNEL = 'filebrowser:updated';

@Injectable()
export class FilebrowserEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilebrowserEventService.name);
  private subscriber: Redis;
  private readonly events$ = new Subject<FilebrowserEvent>();

  constructor(@Inject(REDIS_CLIENT) private readonly publisher: Redis) {}

  async onModuleInit() {
    // Redis는 subscribe 모드 커넥션에서 일반 명령을 못 쓰므로 구독 전용 커넥션 분리.
    // 설정 재파싱 대신 주입된 클라이언트 설정을 복제한다.
    this.subscriber = this.publisher.duplicate();

    // ioredis는 자동 재연결·재구독하므로 로깅만 수행 (리스너 없으면 프로세스 크래시 위험)
    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber 오류 (자동 재연결 대기 중)', err);
    });

    this.subscriber.on('message', (_channel: string, message: string) => {
      try {
        const payload = JSON.parse(message) as FilebrowserEvent;
        if (
          !payload?.workspaceId ||
          !FILEBROWSER_ACTIONS.includes(payload.action)
        ) {
          this.logger.warn(`잘못된 이벤트 페이로드 무시: ${message}`);
          return;
        }
        this.events$.next(payload);
      } catch (err) {
        this.logger.error('Redis 메시지 파싱 실패', err);
      }
    });

    try {
      await this.subscriber.subscribe(CHANNEL);
      this.logger.log(`Redis 채널 '${CHANNEL}' 구독 시작`);
    } catch (err) {
      this.logger.error(
        'Redis subscriber 초기화 실패. SSE 기능이 비활성화됩니다.',
        err,
      );
    }
  }

  async publish(payload: FilebrowserEvent): Promise<void> {
    try {
      await this.publisher.publish(CHANNEL, JSON.stringify(payload));
    } catch (err) {
      this.logger.error('Redis publish 실패', err);
    }
  }

  subscribe(workspaceId: string): Observable<FilebrowserEvent> {
    return this.events$.pipe(
      filter((event) => event.workspaceId === workspaceId),
    );
  }

  async onModuleDestroy() {
    this.events$.complete();
    if (this.subscriber) {
      await this.subscriber.quit();
      this.logger.log('Redis subscriber 연결 해제');
    }
  }
}
