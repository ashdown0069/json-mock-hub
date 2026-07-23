import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [HttpModule],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
