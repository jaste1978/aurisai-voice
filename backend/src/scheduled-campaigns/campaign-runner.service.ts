import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';
import { ScheduledCampaignsService } from './scheduled-campaigns.service';

@Injectable()
export class CampaignRunnerService {
  private readonly logger = new Logger(CampaignRunnerService.name);

  constructor(
    private prisma: PrismaService,
    private bolna: BolnaService,
    private campaigns: ScheduledCampaignsService,
  ) {}

  /** Runs every minute — picks up any campaign whose nextRunAt has passed */
  @Cron(CronExpression.EVERY_MINUTE)
  async runDueCampaigns() {
    const now = new Date();

    const due = await this.prisma.scheduledCampaign.findMany({
      where: {
        active: true,
        nextRunAt: { lte: now },
      },
    });

    if (!due.length) return;

    this.logger.log(`Found ${due.length} campaign(s) due to run`);

    for (const campaign of due) {
      await this.runCampaign(campaign);
    }
  }

  private async runCampaign(campaign: any) {
    this.logger.log(`Running scheduled campaign "${campaign.name}" (id=${campaign.id})`);

    try {
      const contacts = campaign.contacts as Record<string, string>[];
      if (!contacts.length) {
        this.logger.warn(`Campaign "${campaign.name}" has no contacts — skipping`);
        return;
      }

      // Trigger individual /call per contact — avoids Bolna batch scheduling issues
      // and gives us individual execution IDs the poller can track natively
      let triggered = 0;
      let failed = 0;

      for (const contact of contacts) {
        const phone = contact.contact_number || contact.phone_number || contact.phone || '';
        if (!phone) { failed++; continue; }

        try {
          // Build user_data from remaining columns (all except contact_number)
          const userData: Record<string, string> = {};
          for (const [key, val] of Object.entries(contact)) {
            if (key !== 'contact_number' && key !== 'phone_number' && key !== 'phone') {
              userData[key] = String(val);
            }
          }

          const res = await this.bolna.triggerCall(phone, campaign.agentId, null, {
            purpose: campaign.name,
            ...userData,
          });

          const executionId = res.execution_id || res.id;

          // Store minimal Call record so the existing poller picks it up
          const contactName = contact.name || contact.Name || contact.contact_name || null;
          await this.prisma.call.create({
            data: {
              agentId: campaign.agentId,
              agentName: campaign.agentName ?? null,
              phoneNumber: phone,
              bolnaExecutionId: executionId || null,
              status: 'queued',
              transcript: '',
              duration: 0,
              agentResponseNotes: contactName,
            },
          });

          triggered++;
        } catch (callErr: any) {
          this.logger.warn(`Failed to trigger call to ${phone}: ${callErr.message}`);
          failed++;
        }
      }

      this.logger.log(
        `Campaign "${campaign.name}" — triggered ${triggered}/${contacts.length} calls (${failed} failed)`,
      );

      await this.campaigns.markRan(
        campaign.id,
        campaign.recurrence,
        campaign.scheduledTime,
        campaign.daysOfWeek as number[],
        campaign.dayOfMonth,
        campaign.endDate,
      );
    } catch (err: any) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`Campaign "${campaign.name}" failed: ${detail}`);
      await this.prisma.scheduledCampaign.update({
        where: { id: campaign.id },
        data: { nextRunAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
    }
  }
}
