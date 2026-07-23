import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { ApiKeyService } from './api-key.service';
import { CreateWorkspaceDto } from './dto/req/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/req/update-workspace.dto';
import { JoinWorkspaceDto } from './dto/req/join-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceOwnerGuard } from './guards/workspace-owner.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { GetWorkspaceDto } from './dto/res/get-workspace.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @CurrentUserId() userId: string,
  ) {
    await this.workspacesService.create(createWorkspaceDto, userId);
    return {
      message: '워크스페이스 생성이 완료되었습니다.',
      success: true,
    };
  }

  @Serialize(GetWorkspaceDto)
  @Get()
  async findAll(@CurrentUserId() userId: string) {
    const workspaces = await this.workspacesService.findAll(userId);
    return workspaces;
  }

  @Serialize(GetWorkspaceDto)
  @Get(':workspaceId')
  async findOne(
    @Param('workspaceId') id: string,
    @CurrentUserId() userId: string,
  ) {
    const workspace = await this.workspacesService.findOne(id, userId);
    return workspace;
  }

  @Patch(':workspaceId')
  async update(
    @Param('workspaceId') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @CurrentUserId() userId: string,
  ) {
    const workspace = await this.workspacesService.update(
      id,
      updateWorkspaceDto,
      userId,
    );
    return workspace;
  }

  @UseGuards(WorkspaceOwnerGuard)
  @Delete(':workspaceId')
  async remove(
    @Param('workspaceId') id: string,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.workspacesService.remove(id, userId);
    return result;
  }

  @Post(':workspaceId/join')
  @HttpCode(HttpStatus.OK)
  async join(
    @Param('workspaceId') workspaceId: string,
    @Body() joinWorkspaceDto: JoinWorkspaceDto,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.workspacesService.joinWorkspace(
      workspaceId,
      userId,
      joinWorkspaceDto.password,
    );
    return {
      message: result.message,
      success: true,
    };
  }

  @Get(':workspaceId/membership')
  @HttpCode(HttpStatus.OK)
  async checkMembership(
    @Param('workspaceId') workspaceId: string,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.workspacesService.checkMembership(
      workspaceId,
      userId,
    );
    return result;
  }

  // 멤버라면 누구나 조회 가능 — /mcp 설치 설정 자동 주입에 사용된다
  @UseGuards(WorkspaceMemberGuard)
  @Get(':workspaceId/api-key')
  async getApiKey(@Param('workspaceId') workspaceId: string) {
    return this.apiKeyService.getKey(workspaceId);
  }

  // 재발급은 owner 전용 — 기존 키는 즉시 무효화된다
  @UseGuards(WorkspaceOwnerGuard)
  @Post(':workspaceId/api-key')
  @HttpCode(HttpStatus.OK)
  async reissueApiKey(@Param('workspaceId') workspaceId: string) {
    return this.apiKeyService.issue(workspaceId);
  }
}
