import { Controller, Get } from '@nestjs/common';
import { hostname } from 'os';

@Controller('/')
export class AppController {
  @Get()
  async healthCheck() {
    return {
      status: 'ok',
      hostname: hostname(),
    };
  }
}
