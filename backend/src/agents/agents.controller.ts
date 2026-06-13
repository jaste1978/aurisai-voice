import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
}
