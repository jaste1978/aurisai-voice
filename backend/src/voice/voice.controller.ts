import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { VoiceService } from './voice.service';

// Admin-only harness to exercise the provider layer in isolation, BEFORE it is
// wired into the main call flow. Does not touch the live Bolna path.
@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private voice: VoiceService) {}

  private assertAdmin(user: any) {
    if (user?.role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  // Provider status: which are registered/configured and which is default.
  @Get('providers')
  async providers(@Request() req: ExpressRequest & { user: any }) {
    this.assertAdmin(req.user);
    return { success: true, data: this.voice.list() };
  }

  // Place a test call through the abstraction. body: { phone_number, agent_ref, provider?, variables? }
  @Post('test-call')
  async testCall(@Request() req: ExpressRequest & { user: any }, @Body() body: any) {
    this.assertAdmin(req.user);
    const phoneNumber = String(body.phone_number || body.phoneNumber || '').trim();
    const agentRef = String(body.agent_ref || body.agentRef || '').trim();
    if (!phoneNumber || !agentRef) throw new BadRequestException('phone_number and agent_ref are required');
    const result = await this.voice.triggerCall(
      { phoneNumber, agentRef, variables: body.variables, webhookUrl: body.webhook_url },
      { provider: body.provider },
    );
    return { success: true, data: result };
  }
}
