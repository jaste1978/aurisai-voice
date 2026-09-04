import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '';
    return {
      status: 'healthy',
      version: commit ? commit.slice(0, 7) : 'dev',
      branch: process.env.RENDER_GIT_BRANCH || 'main',
      timestamp: new Date(),
      env: process.env.NODE_ENV,
    };
  }
}
