import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('scripts')
@UseGuards(JwtAuthGuard)
export class ScriptsController {
  constructor(private scriptsService: ScriptsService) {}

  @Get()
  async findAll() {
    const data = await this.scriptsService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.scriptsService.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: any) {
    const data = await this.scriptsService.create(body);
    return { success: true, data };
  }

  @Post('generate')
  async generate(@Body() body: any) {
    if (!body.purpose || !body.context) {
      return { success: false, error: 'purpose and context are required' };
    }
    const content = await this.scriptsService.generate(body);
    return { success: true, data: { content } };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const data = await this.scriptsService.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.scriptsService.delete(id);
    return { success: true, message: 'Script deleted' };
  }
}
