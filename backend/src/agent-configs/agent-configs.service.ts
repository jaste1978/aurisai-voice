import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentConfigsService {
  constructor(private prisma: PrismaService) {}

  async findByAgentId(agentId: string) {
    return this.prisma.agentConfig.findUnique({ where: { agentId } });
  }

  async upsert(agentId: string, body: any) {
    const data: any = {};

    // Freshdesk fields
    if (body.freshdeskEnabled !== undefined) data.freshdeskEnabled = !!body.freshdeskEnabled;
    if (body.freshdeskDomain !== undefined) data.freshdeskDomain = body.freshdeskDomain || null;
    // Only overwrite API key if a new one is explicitly provided
    if (body.freshdeskApiKey) data.freshdeskApiKey = body.freshdeskApiKey;

    // Google Chat fields
    if (body.gchatEnabled !== undefined) data.gchatEnabled = !!body.gchatEnabled;
    if (body.gchatWebhookUrl !== undefined) data.gchatWebhookUrl = body.gchatWebhookUrl || null;
    if (body.gchatSendTranscript !== undefined) data.gchatSendTranscript = !!body.gchatSendTranscript;
    if (body.gchatSendSummary !== undefined) data.gchatSendSummary = !!body.gchatSendSummary;

    return this.prisma.agentConfig.upsert({
      where: { agentId },
      update: data,
      create: { agentId, ...data },
    });
  }

  serialize(c: any) {
    if (!c) {
      return {
        freshdeskEnabled: false,
        freshdeskDomain: '',
        freshdeskApiKeySet: false,
        gchatEnabled: false,
        gchatWebhookUrl: '',
        gchatSendTranscript: true,
        gchatSendSummary: true,
      };
    }
    return {
      freshdeskEnabled: c.freshdeskEnabled,
      freshdeskDomain: c.freshdeskDomain || '',
      freshdeskApiKeySet: !!c.freshdeskApiKey,
      gchatEnabled: c.gchatEnabled,
      gchatWebhookUrl: c.gchatWebhookUrl || '',
      gchatSendTranscript: c.gchatSendTranscript,
      gchatSendSummary: c.gchatSendSummary,
    };
  }
}
