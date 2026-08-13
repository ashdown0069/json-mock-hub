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

  // 키가 멤버십에 귀속되므로 멤버는 자기 키만 조회한다. 남의 키를 읽을 경로는 없다.
  // 키로 들어온 요청은 키 주인의 role로 판정되므로(JwtOrApiKeyGuard),
  // member에게 키를 줘도 canCreate/canDelete 등 세분 권한이 그대로 적용된다.
  @UseGuards(WorkspaceMemberGuard)
  @Get(':workspaceId/api-key')
  async getMyApiKey(
    @Param('workspaceId') workspaceId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.apiKeyService.getMyKey(workspaceId, userId);
  }

  // 재발급 — 본인 키만 교체된다. 다른 멤버의 MCP 연동은 끊기지 않는다.
  @UseGuards(WorkspaceMemberGuard)
  @Post(':workspaceId/api-key')
  @HttpCode(HttpStatus.OK)
  async reissueMyApiKey(
    @Param('workspaceId') workspaceId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.apiKeyService.reissueMyKey(workspaceId, userId);
  }
}
