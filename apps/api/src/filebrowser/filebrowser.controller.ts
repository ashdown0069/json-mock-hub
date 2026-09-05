import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtOrApiKeyGuard } from '../auth/guards/jwt-or-api-key.guard';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { RequirePermission } from '../workspaces/guards/require-permission.decorator';
import { interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FilebrowserService } from './filebrowser.service';
import { FilebrowserEventService } from './filebrowser-event.service';
import { MoveItemsDto } from './dto/req/move-items';
import { CreateItemDto } from './dto/req/create-item';
import { RenameItemDto } from './dto/req/rename-item';
import { UpdateItemDto } from './dto/req/update-item';
import { DeleteItemsDto } from './dto/req/delete-items';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { FilebrowserItems } from './dto/res/items';

// 프록시/LB 유휴 타임아웃(보통 60초)보다 짧게 유지
const HEARTBEAT_INTERVAL_MS = 25_000;

// WorkspacePermissionGuard: 멤버십 검증 + @RequirePermission이 붙은 메서드는 권한 플래그 검사
// (@RequirePermission이 없는 getItems/subscribe는 멤버 검증만 수행)
// MCP는 도구 하나당 API를 2~3회 호출한다. 전역 한도(60회/분 + 1시간 차단)로는
// 정상적인 배치 작업("mock 20개 만들어줘")이 장시간 차단에 걸린다.
// 이 컨트롤러는 JwtOrApiKeyGuard가 지키는 인증 전용 경로라 미인증 남용 벡터가
// 아니므로, 한도를 올리고 차단을 1분으로 줄인다.
@Throttle({ 'rate-limit': { limit: 300, ttl: 60_000, blockDuration: 60_000 } })
@UseGuards(JwtOrApiKeyGuard, WorkspaceAccessGuard)
@Controller(':workspaceId/filebrowser')
export class FilebrowserController {
  constructor(
    private readonly filebrowserService: FilebrowserService,
    private readonly filebrowserEvent: FilebrowserEventService,
  ) {}

  @Sse('subscribe')
  @Header('X-Accel-Buffering', 'no') // nginx 계열 프록시의 SSE 응답 버퍼링 방지
  subscribe(
    @Param('workspaceId') workspaceId: string,
  ): Observable<MessageEvent> {
    const events$ = this.filebrowserEvent.subscribe(workspaceId).pipe(
      map((event): MessageEvent => ({
        data: { action: event.action, workspaceId: event.workspaceId },
      })),
    );

    // named event('heartbeat')는 프론트 onmessage에 전달되지 않음.
    // 클라이언트 연결 종료 시 NestJS가 Observable을 자동 unsubscribe하므로 interval 누수 없음.
    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: '' })),
    );

    return merge(events$, heartbeat$);
  }

  @Serialize(FilebrowserItems)
  @Get('getItems')
  async getItems(
    @Param('workspaceId') workspaceId: string,
    @Query('view') view?: string,
  ) {
    // 기본값은 기존 동작(full) — 소비자 전환이 끝날 때까지 호환성을 유지한다
    return this.filebrowserService.getItems(
      workspaceId,
      view === 'tree' ? 'tree' : 'full',
    );
  }

  // itemId 형식 오류는 전역 예외 필터가 CastError를 400으로 변환한다
  @Serialize(FilebrowserItems)
  @Get('items/:itemId')
  async getItem(
    @Param('workspaceId') workspaceId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.filebrowserService.getItem(workspaceId, itemId);
  }

  @Serialize(FilebrowserItems)
  @RequirePermission('canCreate')
  @Post('createItem')
  async createItems(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateItemDto,
  ) {
    const result = await this.filebrowserService.createItem(workspaceId, body);
    await this.filebrowserEvent.publish({ workspaceId, action: 'CREATE' });
    return result;
  }

  @RequirePermission('canMove')
  @Patch('moveItems')
  async moveItems(
    @Param('workspaceId') workspaceId: string,
    @Body() body: MoveItemsDto,
  ) {
    // body.workspaceId를 신뢰하지 않고 가드가 검증한 URL 값으로 덮어쓴다
    const result = await this.filebrowserService.moveItems({
      ...body,
      workspaceId,
    });
    await this.filebrowserEvent.publish({ workspaceId, action: 'MOVE' });
    return result;
  }

  @RequirePermission('canRename')
  @Patch('renameItem')
  async renameItem(
    @Param('workspaceId') workspaceId: string,
    @Body() body: RenameItemDto,
  ) {
    const result = await this.filebrowserService.renameItem(workspaceId, body);
    await this.filebrowserEvent.publish({ workspaceId, action: 'RENAME' });
    return result;
  }

  @RequirePermission('canUpdate')
  @Put()
  async updateItem(
    @Param('workspaceId') workspaceId: string,
    @Body() body: UpdateItemDto,
  ) {
    const result = await this.filebrowserService.updateItem(body, workspaceId);
    await this.filebrowserEvent.publish({ workspaceId, action: 'UPDATE' });
    return result;
  }

  @RequirePermission('canDelete')
  @Delete()
  async deleteItems(
    @Param('workspaceId') workspaceId: string,
    @Body() body: DeleteItemsDto,
  ) {
    const result = await this.filebrowserService.deleteItems(
      workspaceId,
      body.itemIds,
    );
    await this.filebrowserEvent.publish({ workspaceId, action: 'DELETE' });
    return result;
  }

  @RequirePermission('canUpdate')
  @Post('resetMockState')
  async resetMockState(
    @Param('workspaceId') workspaceId: string,
    @Body('itemId') itemId: string,
  ) {
    return this.filebrowserService.resetMockState(workspaceId, itemId);
  }
}
