import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe, Res, HttpException, HttpStatus } from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Get('stats')
  async getStats() {
    const data = await this.callsService.getStats();
    return { success: true, data };
  }

  @Get()
  async findAll() {
    const data = await this.callsService.findAll();
    return { success: true, data };
  }

  @Get('export')
  async exportCalls(@Query() query: any, @Res() res: Response) {
    await this.callsService.exportCalls(query, res);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.callsService.findOne(id);
    return { success: true, data };
  }

  // Redirect to recording URL — no JWT guard so browser <audio> element can load it directly
  @UseGuards()
  @Get(':id/recording/stream')
  async streamRecording(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const call = await this.callsService.findOne(id);
    if (!call.recording_url) {
      throw new HttpException('No recording available', HttpStatus.NOT_FOUND);
    }
    res.redirect(302, call.recording_url);
  }

  @Post()
  async trigger(@Body() body: any) {
    return this.callsService.trigger(body);
  }

  // Also accept /trigger route (camelCase fields from frontend)
  @Post('trigger')
  async triggerAlt(@Body() body: any) {
    // Normalize camelCase → snake_case so the service handles both
    const normalized = {
      customer_id: body.customerId ?? body.customer_id,
      agent_id: body.agentId ?? body.agent_id,
      phone_number: body.phoneNumber ?? body.phone_number,
      language: body.language,
      purpose: body.purpose,
    };
    return this.callsService.trigger(normalized);
  }

  @Post(':id/sync')
  async sync(@Param('id', ParseIntPipe) id: number) {
    return this.callsService.sync(id);
  }

  @Post(':id/analyze')
  async analyze(@Param('id', ParseIntPipe) id: number) {
    return this.callsService.analyze(id);
  }

  // Bulk fix: re-sync all completed calls missing recordings
  @Post('bulk-sync-recordings')
  async bulkSyncRecordings() {
    const results = await this.callsService.bulkSyncMissingRecordings();
    return {
      success: true,
      message: `Bulk sync complete. Fixed: ${results.fixed}, Skipped (no recording yet): ${results.skipped}, Failed: ${results.failed}`,
      data: results,
    };
  }
}
