import {
  Controller,
  Get,
  Header,
  MessageEvent,
  Param,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtOrApiKeyGuard } from '../auth/guards/jwt-or-api-key.guard';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { MockStateService } from './mock-state.service';
import { MockStateEventService } from './mock-state-event.service';
import {
  completeAtAuthDeadline,
  SseRequest,
} from '../sse/complete-at-auth-deadline';

// 프록시/LB 유휴 타임아웃(보통 60초)보다 짧게 유지 (filebrowser SSE와 동일 값)
const HEARTBEAT_INTERVAL_MS = 25_000;

// WorkspacePermissionGuard: 멤버십 검증만 수행 (읽기 전용 경로라 @RequirePermission 없음)
@UseGuards(JwtOrApiKeyGuard, WorkspaceAccessGuard)
@Controller(':workspaceId/mockstate')
export class MockStateController {
  constructor(
    private readonly mockStateService: MockStateService,
    private readonly mockStateEvent: MockStateEventService,
  ) {}

  @Sse('subscribe')
  @Header('X-Accel-Buffering', 'no') // nginx 계열 프록시의 SSE 응답 버퍼링 방지
  subscribe(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SseRequest,
  ): Observable<MessageEvent> {
    const events$ = this.mockStateEvent.subscribe(workspaceId).pipe(
      map((event): MessageEvent => ({
        data: { workspaceId: event.workspaceId, path: event.path },
      })),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: '' })),
    );

    const stream$ = merge(events$, heartbeat$);
    const expiresAtSeconds = req.user && !('viaApiKey' in req.user)
      ? req.user.exp
      : undefined;
    return completeAtAuthDeadline(stream$, expiresAtSeconds);
  }

  @Get('effective')
  async getEffective(
    @Param('workspaceId') workspaceId: string,
    @Query('path') path: string,
  ) {
    return this.mockStateService.getEffectiveJson(workspaceId, path);
  }
}
