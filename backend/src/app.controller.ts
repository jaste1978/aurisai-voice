import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'healthy', timestamp: new Date(), env: process.env.NODE_ENV };
  }
}
