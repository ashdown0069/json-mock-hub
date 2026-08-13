import { Module } from '@nestjs/common';
import { MockStateService } from './mock-state.service';
import { MockStateEventService } from './mock-state-event.service';

@Module({
  providers: [MockStateService, MockStateEventService],
  exports: [MockStateService, MockStateEventService],
})
export class MockStateModule {}
