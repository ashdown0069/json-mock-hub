import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from 'src/workspaces/guards/workspace-access.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { SkipThrottle } from '@nestjs/throttler';
import { DashboardService } from './dashboard.service';
import { GetLogsQueryDto } from './dto/req/get-logs-query.dto';
import { DashboardStatsDto } from './dto/res/dashboard-stats.dto';
import { GetRequestLogsDto } from './dto/res/request-logs.dto';

// 대시보드 조회는 워크스페이스 멤버라면 누구나 가능 (권한 플래그 불필요)
// 대시보드는 15초 폴링 x 다중 탭으로 전역 스로틀(60req/60s, 차단 1h)을 넘길 수 있어 예외 처리.
// JwtAuthGuard + WorkspaceMemberGuard 뒤의 읽기 전용 엔드포인트라 남용 리스크가 낮다.
@SkipThrottle()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller(':workspaceId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Serialize(DashboardStatsDto)
  @Get('stats')
  getStats(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getStats(workspaceId);
  }

  @Serialize(GetRequestLogsDto)
  @Get('logs')
  getLogs(
    @Param('workspaceId') workspaceId: string,
    @Query() query: GetLogsQueryDto,
  ) {
    return this.dashboardService.getLogs(
      workspaceId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}
