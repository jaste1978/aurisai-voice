import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  async findAll(@Request() req: ExpressRequest & { user: any }) {
    const data = await this.agentsService.findAll(req.user);
    return { success: true, data };
  }

  @Post()
  async create(@Request() req: ExpressRequest & { user: any }, @Body() body: any) {
    return this.agentsService.create(req.user, body);
  }

  @Delete(':agentId')
  async remove(@Request() req: ExpressRequest & { user: any }, @Param('agentId') agentId: string) {
    return this.agentsService.remove(req.user, agentId);
  }
}
