import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AgentConfigsService } from './agent-configs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('agent-configs')
@UseGuards(JwtAuthGuard)
export class AgentConfigsController {
  constructor(private readonly service: AgentConfigsService) {}

  @Get(':agentId')
  async get(@Param('agentId') agentId: string) {
    const config = await this.service.findByAgentId(agentId);
    return { success: true, data: this.service.serialize(config) };
  }

  @Put(':agentId')
  async upsert(@Param('agentId') agentId: string, @Body() body: any) {
    const config = await this.service.upsert(agentId, body);
    return { success: true, data: this.service.serialize(config) };
  }
}
