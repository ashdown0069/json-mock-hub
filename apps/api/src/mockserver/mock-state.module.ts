import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MockStateController } from './mock-state.controller';
import { MockStateService } from './mock-state.service';
import { MockStateEventService } from './mock-state-event.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MockStateController],
  providers: [MockStateService, MockStateEventService],
  exports: [MockStateService, MockStateEventService],
})
export class MockStateModule {}
