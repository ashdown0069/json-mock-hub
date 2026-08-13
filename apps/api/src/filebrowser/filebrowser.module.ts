import { Module } from '@nestjs/common';
import { FilebrowserService } from './filebrowser.service';
import { FilebrowserController } from './filebrowser.controller';
import { FilebrowserEventService } from './filebrowser-event.service';
import { DatabaseModule } from '../database/database.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MockStateModule } from '../mockserver/mock-state.module';

@Module({
  imports: [DatabaseModule, WorkspacesModule, MockStateModule],
  controllers: [FilebrowserController],
  providers: [FilebrowserService, FilebrowserEventService],
  exports: [FilebrowserService],
})
export class FilebrowserModule {}
