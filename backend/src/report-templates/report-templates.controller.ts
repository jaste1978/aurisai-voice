import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ReportTemplatesService } from './report-templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('report-templates')
@UseGuards(JwtAuthGuard)
export class ReportTemplatesController {
  constructor(private service: ReportTemplatesService) {}

  @Get()
  async findAll() {
    const data = await this.service.findAll();
    return { success: true, data };
  }

  @Get(':templateId')
  async findOne(@Param('templateId') templateId: string) {
    const data = await this.service.findOne(templateId);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.service.create(body);
    return { success: true, data };
  }

  @Put(':templateId')
  async update(@Param('templateId') templateId: string, @Body() body: any) {
    const data = await this.service.update(templateId, body);
    return { success: true, data };
  }

  @Delete(':templateId')
  async remove(@Param('templateId') templateId: string) {
    return this.service.remove(templateId);
  }
}
