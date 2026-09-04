import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MockStateController } from './mock-state.controller';
import { MockStateService } from './mock-state.service';
import { MockStateEventService } from './mock-state-event.service';

@Module({
  imports: [DatabaseModule, WorkspacesModule],
  controllers: [MockStateController],
  providers: [MockStateService, MockStateEventService],
  exports: [MockStateService, MockStateEventService],
})
export class MockStateModule {}
