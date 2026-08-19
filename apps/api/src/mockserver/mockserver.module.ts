import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MockStateModule } from './mock-state.module';
import { MockserverController } from './mockserver.controller';
import { MockserverService } from './mockserver.service';
import { RequestLogService } from './request-log.service';

@Module({
  imports: [DatabaseModule, MockStateModule, WorkspacesModule],
  controllers: [MockserverController],
  providers: [MockserverService, RequestLogService],
})
export class MockserverModule {}
