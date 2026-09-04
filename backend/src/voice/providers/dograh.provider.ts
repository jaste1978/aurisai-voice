import { Injectable, Logger } from '@nestjs/common';
import {
  VoiceProvider, TriggerCallInput, TriggerCallResult, ExecutionResult, VoiceAgentSummary,
} from '../voice-provider.interface';

// Dograh (open-source, self-hostable) provider. Config via env:
//   DOGRAH_BASE_URL  e.g. https://app.dograh.com  or  https://voice-oss.yourdomain.com
//   DOGRAH_API_KEY   dg_...   (sent as X-API-Key)
// agentRef = a Dograh *workflow uuid*. Calls are placed via the public trigger.
//
// NOTE: Dograh isn't stood up yet — the exact run-status/transcript response
// shapes are best-effort from its API docs and should be confirmed against a
// live instance when we "connect" this (see TODOs).
@Injectable()
export class DograhProvider implements VoiceProvider {
  readonly name = 'dograh';
  private readonly logger = new Logger(DograhProvider.name);

  private get base() { return (process.env.DOGRAH_BASE_URL || '').replace(/\/$/, ''); }
  private get key() { return process.env.DOGRAH_API_KEY || ''; }

  isConfigured(): boolean {
    return !!this.base && !!this.key;
  }

  private headers() {
    return { 'Content-Type': 'application/json', 'X-API-Key': this.key };
  }

  async triggerCall(input: TriggerCallInput): Promise<TriggerCallResult> {
    const url = `${this.base}/api/v1/public/agent/workflow/${input.agentRef}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone_number: input.phoneNumber, initial_context: input.variables || {} }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Dograh trigger failed: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
    const runId = body.workflow_run_id ?? body.id;
    // Encode workflow + run so getExecution can address the run later.
    return { provider: this.name, externalId: `${input.agentRef}:${runId}`, status: body.status || 'in_progress', raw: body };
  }

  async getExecution(externalId: string): Promise<ExecutionResult> {
    const [workflowRef, runId] = externalId.split(':');
    // TODO(connect): confirm the exact run-status route on a live instance.
    const url = `${this.base}/api/v1/workflow/${workflowRef}/runs/${runId}`;
    const res = await fetch(url, { headers: this.headers() });
    const e: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Dograh getExecution failed: ${res.status}`);

    const gathered = e.gathered_context || {};
    let transcript = '';
    if (e.transcript_url) {
      try { transcript = await (await fetch(e.transcript_url)).text(); } catch { /* best-effort */ }
    }
    return {
      status: gathered.call_status || e.status || 'unknown',
      transcript,
      recordingUrl: e.recording_url || null,
      durationSec: Math.round(e.cost_info?.call_duration_seconds || e.duration || 0),
      summary: gathered.summary || null,
      raw: e,
    };
  }

  async listAgents(): Promise<VoiceAgentSummary[]> {
    const res = await fetch(`${this.base}/api/v1/workflow/fetch`, { headers: this.headers() });
    const body: any = await res.json().catch(() => ({}));
    const rows = Array.isArray(body) ? body : body.data || body.workflows || [];
    return rows.map((w: any) => ({ id: w.uuid || w.id, name: w.name }));
  }

  async getAccount() {
    // BYOK / self-hosted: no central wallet to report.
    return null;
  }
}
