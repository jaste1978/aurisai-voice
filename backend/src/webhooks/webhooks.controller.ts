import { Controller, Post, Body } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('bolna')
  async bolna(@Body() body: any) {
    return this.webhooksService.processWebhook(body);
  }
}
