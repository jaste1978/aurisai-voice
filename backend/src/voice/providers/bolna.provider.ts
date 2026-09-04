import { Injectable } from '@nestjs/common';
import { BolnaService } from '../../bolna/bolna.service';
import {
  VoiceProvider, TriggerCallInput, TriggerCallResult, ExecutionResult, VoiceAgentSummary,
} from '../voice-provider.interface';

// Thin adapter over the existing, working BolnaService — no behavior change to it.
@Injectable()
export class BolnaProvider implements VoiceProvider {
  readonly name = 'bolna';
  constructor(private bolna: BolnaService) {}

  isConfigured(): boolean {
    return !!process.env.BOLNA_API_KEY;
  }

  async triggerCall(input: TriggerCallInput): Promise<TriggerCallResult> {
    const res = await this.bolna.triggerCall(
      input.phoneNumber,
      input.agentRef,
      input.variables?.customer_id ?? 'unknown',
      { ...(input.variables || {}), purpose: input.variables?.purpose || 'outreach' },
    );
    return { provider: this.name, externalId: res.execution_id || res.id, status: 'in_progress', raw: res };
  }

  async getExecution(externalId: string): Promise<ExecutionResult> {
    const e = await this.bolna.getExecution(externalId);
    return {
      status: e.status,
      transcript: e.transcript || '',
      recordingUrl: e.telephony_data?.recording_url || e.recording_url || null,
      durationSec: Math.round(e.conversation_duration || e.duration || 0),
      summary: e.summary || null,
      raw: e,
    };
  }

  async listAgents(): Promise<VoiceAgentSummary[]> {
    const res = await this.bolna.getAgents();
    const agents = Array.isArray(res) ? res : res.agents || res.data || [];
    return agents.map((a: any) => ({ id: a.id, name: a.agent_name || a.name }));
  }

  async getAccount() {
    try {
      const me = await this.bolna.getMe();
      return { email: me?.email, wallet: me?.wallet };
    } catch {
      return null;
    }
  }
}
