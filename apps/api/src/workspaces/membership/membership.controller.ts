import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceOwnerGuard } from '../guards/workspace-owner.guard';
import { GetMemberDto } from './dto/res/get-member.dto';
import { Serialize } from 'src/interceptors/serialize.interceptor';

// 멤버 조회·추가·추방은 settings(owner 전용) 기능이므로 전부 owner 가드 적용
@UseGuards(JwtAuthGuard, WorkspaceOwnerGuard)
@Controller('workspaces/:workspaceId/members')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Serialize(GetMemberDto)
  @Get()
  async getMembers(@Param('workspaceId') workspaceId: string) {
    const members = await this.membershipService.getMembers(workspaceId);
    return members;
  }

  @Serialize(GetMemberDto)
  @Delete(':userId')
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    const membership = await this.membershipService.removeMember(
      workspaceId,
      userId,
    );
    return membership;
  }
}
