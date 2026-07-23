import { Controller, Get, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../guards/workspace-member.guard';
import { WorkspaceOwnerGuard } from '../guards/workspace-owner.guard';
import { UpdateRoleDto } from './dto/req/update-role.dto';
import { GetRoleDto } from './dto/res/get-role.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // 멤버 열람 허용: member도 자기 권한을 조회해 UI 버튼 비활성화에 사용
  @UseGuards(WorkspaceMemberGuard)
  @Serialize(GetRoleDto)
  @Get()
  async getRoles(@Param('workspaceId') workspaceId: string) {
    const roles = await this.roleService.getRoles(workspaceId);
    return roles;
  }

  @UseGuards(WorkspaceOwnerGuard)
  @Serialize(GetRoleDto)
  @Patch(':roleId')
  async updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const role = await this.roleService.updateRole(
      workspaceId,
      roleId,
      updateRoleDto,
    );
    return role;
  }
}
