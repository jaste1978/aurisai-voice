import { Controller, Post, Body, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@SkipThrottle()
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('bolna')
  async bolna(@Body() body: any, @Query('secret') secret?: string, @Headers('x-webhook-secret') hdr?: string) {
    // If WEBHOOK_SECRET is configured, require it (as ?secret=… or x-webhook-secret
    // header) so only our Bolna integration can post call updates. If it's not set,
    // we accept posts (backward-compatible) — set it + append it to WEBHOOK_URL.
    const expected = process.env.WEBHOOK_SECRET;
    if (expected && secret !== expected && hdr !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return this.webhooksService.processWebhook(body);
  }
}
