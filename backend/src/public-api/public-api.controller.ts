import {
  Controller, Get, Post, Body, Param, Query, UseGuards, Request,
  ParseIntPipe, BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { CallsService } from '../calls/calls.service';
import { AgentsService } from '../agents/agents.service';
import { PrismaService } from '../prisma/prisma.service';
import { PRESET_AGENTS, PRESET_AGENT_IDS } from '../agents/presets';
import { Request as ExpressRequest } from 'express';

// Public partner API (v1). Authenticated by API key; acts as the key's account.
@Controller('v1')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(
    private calls: CallsService,
    private agents: AgentsService,
    private apiKeys: ApiKeysService,
    private prisma: PrismaService,
  ) {}

  // Preset alias (hr|sales|support) → agent id; otherwise treat as a raw id.
  private resolveAgent(agent: any): string {
    const a = String(agent || '').trim();
    const preset = PRESET_AGENTS.find((p) => p.useCase === a.toLowerCase());
    return preset ? preset.agentId : a;
  }

  private publicCall(c: any) {
    return {
      id: c.id,
      status: c.status,
      agent_id: c.agent_id,
      agent_name: c.agent_name,
      phone_number: c.phone_number,
      duration: c.duration,
      summary: c.agent_response_outcome || null,
      transcript_available: !!(c.transcript && c.transcript.length),
      recording_url: c.recording_url || null,
      error: c.error_message || null,
      metadata: c.metadata ?? null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }

  @Post('calls')
  async placeCall(@Request() req: ExpressRequest & { user: any; apiKey: any }, @Body() body: any) {
    const phone = String(body.phone_number || body.phoneNumber || '').trim();
    const agentInput = body.agent || body.agent_id || body.agentId;
    if (!phone) throw new BadRequestException('phone_number is required');
    if (!agentInput) throw new BadRequestException('agent is required — a preset (hr|sales|support) or an agent_id');

    const agentId = this.resolveAgent(agentInput);
    if (!agentId) throw new BadRequestException('Invalid agent');

    // Preset agents are open to any key; other agents must be owned by the account.
    if (!PRESET_AGENT_IDS.has(agentId)) {
      const owned = await this.prisma.ownedAgent.findFirst({ where: { agentId, userId: req.user.id } });
      if (!owned) throw new ForbiddenException('This API key cannot use that agent');
    }

    const result = await this.calls.trigger(
      { agent_id: agentId, phone_number: phone, language: body.language },
      req.user,
      { source: 'api', apiKeyId: req.apiKey?.id, partnerWebhookUrl: body.webhook_url, metadata: body.metadata },
    );
    if (req.apiKey?.id) await this.apiKeys.bumpUsage(req.apiKey.id);
    return { success: true, call: this.publicCall(result.data) };
  }

  @Get('calls')
  async listCalls(@Request() req: ExpressRequest & { user: any }, @Query('limit') limit?: string) {
    const all = await this.calls.findAll(req.user);
    const n = Math.min(parseInt(limit || '50', 10) || 50, 200);
    return { success: true, data: all.slice(0, n).map((c: any) => this.publicCall(c)) };
  }

  @Get('calls/:id')
  async getCall(@Request() req: ExpressRequest & { user: any }, @Param('id', ParseIntPipe) id: number) {
    return { success: true, call: this.publicCall(await this.calls.findOne(id, req.user)) };
  }

  @Get('calls/:id/transcript')
  async getTranscript(@Request() req: ExpressRequest & { user: any }, @Param('id', ParseIntPipe) id: number) {
    const c = await this.calls.findOne(id, req.user);
    return { success: true, id: c.id, transcript: c.transcript || '' };
  }

  @Get('calls/:id/recording')
  async getRecording(@Request() req: ExpressRequest & { user: any }, @Param('id', ParseIntPipe) id: number) {
    const c = await this.calls.findOne(id, req.user);
    if (!c.recording_url) throw new NotFoundException('No recording available yet');
    return { success: true, id: c.id, recording_url: c.recording_url };
  }

  @Get('agents')
  async listAgents(@Request() req: ExpressRequest & { user: any }) {
    const data = await this.agents.findAll(req.user);
    return { success: true, data: (data as any[]).map((a) => ({ id: a.id, name: a.name, use_case: a.useCase })) };
  }
}
