import { Global, Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

// Prisma, Bolna and Telegram modules are all @Global, so no imports needed.
@Global()
@Module({
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
