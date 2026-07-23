import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { ApiKeyService } from './api-key.service';
import { DatabaseModule } from '../database/database.module';
import { MembershipModule } from './membership/membership.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [DatabaseModule, MembershipModule, RoleModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, ApiKeyService],
  exports: [ApiKeyService],
})
export class WorkspacesModule {}
