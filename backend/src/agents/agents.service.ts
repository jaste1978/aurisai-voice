import { Injectable } from '@nestjs/common';
import { BolnaService } from '../bolna/bolna.service';

@Injectable()
export class AgentsService {
  constructor(private bolna: BolnaService) {}

  async findAll(user?: any) {
    const res = await this.bolna.getAgents();
    const agents = Array.isArray(res) ? res : (res.agents || res.data || []);
    const all = agents.map((a: any) => ({ id: a.id, name: a.agent_name || a.name, status: a.status }));

    // Admin or no permission filter → return all agents
    if (!user || user.role === 'admin') return all;

    const allowed: string[] | null = (user.permissions as any)?.agents;
    // null/undefined/empty means NO agent restriction was set → return all
    if (!allowed || allowed.length === 0) return all;

    // Filter to only allowed agent IDs
    return all.filter((a: any) => allowed.includes(a.id));
  }
}
