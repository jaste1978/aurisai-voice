import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallPollerService } from './call-poller.service';
import { BolnaModule } from '../bolna/bolna.module';
import { AgentConfigsModule } from '../agent-configs/agent-configs.module';

@Module({
  imports: [BolnaModule, AgentConfigsModule],
  providers: [CallsService, CallPollerService],
  controllers: [CallsController],
})
export class CallsModule {}
