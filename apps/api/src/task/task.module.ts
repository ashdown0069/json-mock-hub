import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { CommonModule } from 'src/common/common.module';
import { QUEUE_NAMES } from 'src/constant/tokens';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [TaskController],
  providers: [],
  imports: [
    CommonModule,
    // BullModule.registerQueue({
    //   name: '',
    // }),
  ],
})
export class TaskModule {}
