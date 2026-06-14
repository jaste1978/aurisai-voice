import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private enquiriesService: EnquiriesService) {}

  // PUBLIC — the marketing website posts enquiries here (no auth)
  @Post()
  async create(@Body() body: any) {
    return this.enquiriesService.create(body);
  }

  // --- everything below requires login (viewed inside the voice app) ---

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('status') status?: string) {
    const data = await this.enquiriesService.findAll(status);
    return { success: true, data };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async stats() {
    const data = await this.enquiriesService.stats();
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.enquiriesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.enquiriesService.delete(id);
  }
}
