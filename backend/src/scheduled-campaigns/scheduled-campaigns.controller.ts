import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ScheduledCampaignsService } from './scheduled-campaigns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('scheduled-campaigns')
@UseGuards(JwtAuthGuard)
export class ScheduledCampaignsController {
  constructor(private readonly service: ScheduledCampaignsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':campaignId')
  findOne(@Param('campaignId') campaignId: string) {
    return this.service.findOne(campaignId);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':campaignId')
  update(@Param('campaignId') campaignId: string, @Body() body: any) {
    return this.service.update(campaignId, body);
  }

  @Delete(':campaignId')
  remove(@Param('campaignId') campaignId: string) {
    return this.service.remove(campaignId);
  }
}
