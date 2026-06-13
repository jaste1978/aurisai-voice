import { Module } from '@nestjs/common';
import { ScheduledCampaignsService } from './scheduled-campaigns.service';
import { ScheduledCampaignsController } from './scheduled-campaigns.controller';
import { CampaignRunnerService } from './campaign-runner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BolnaModule } from '../bolna/bolna.module';

@Module({
  imports: [PrismaModule, BolnaModule],
  controllers: [ScheduledCampaignsController],
  providers: [ScheduledCampaignsService, CampaignRunnerService],
})
export class ScheduledCampaignsModule {}
