import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BolnaProvider } from './providers/bolna.provider';
import { DograhProvider } from './providers/dograh.provider';
import { VoiceProvider, TriggerCallInput, TriggerCallResult, ExecutionResult } from './voice-provider.interface';

// Registry + selection + failover across voice providers.
//   default provider:  VOICE_PROVIDER env (fallback 'bolna')
//   failover:          on unless VOICE_FAILOVER='false' — if the chosen provider
//                      errors placing a call, try the next *configured* one.
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly providers = new Map<string, VoiceProvider>();

  constructor(bolna: BolnaProvider, dograh: DograhProvider) {
    for (const p of [bolna, dograh]) this.providers.set(p.name, p);
  }

  private get defaultName() { return (process.env.VOICE_PROVIDER || 'bolna').toLowerCase(); }
  private get failoverEnabled() { return process.env.VOICE_FAILOVER !== 'false'; }

  get(name?: string): VoiceProvider | undefined {
    return name ? this.providers.get(name.toLowerCase()) : undefined;
  }

  list() {
    return [...this.providers.values()].map((p) => ({
      name: p.name,
      configured: p.isConfigured(),
      default: p.name === this.defaultName,
    }));
  }

  // Ordered candidate list: [chosen, …other configured] for failover.
  private order(override?: string, agentProvider?: string): VoiceProvider[] {
    const chosen = (override || agentProvider || this.defaultName).toLowerCase();
    const names = [chosen, ...[...this.providers.keys()].filter((n) => n !== chosen)];
    const seen = new Set<string>();
    const out: VoiceProvider[] = [];
    for (const n of names) {
      const p = this.providers.get(n);
      if (p && !seen.has(n) && p.isConfigured()) { out.push(p); seen.add(n); }
    }
    return out;
  }

  async triggerCall(
    input: TriggerCallInput,
    opts: { provider?: string; agentProvider?: string } = {},
  ): Promise<TriggerCallResult> {
    const candidates = this.failoverEnabled
      ? this.order(opts.provider, opts.agentProvider)
      : this.order(opts.provider, opts.agentProvider).slice(0, 1);

    if (!candidates.length) {
      throw new BadRequestException('No voice provider is configured. Set VOICE_PROVIDER and provider credentials.');
    }

    let lastErr: any;
    for (const p of candidates) {
      try {
        const result = await p.triggerCall(input);
        if (p.name !== (opts.provider || opts.agentProvider || this.defaultName)) {
          this.logger.warn(`Voice failover: placed call via '${p.name}'`);
        }
        return result;
      } catch (err: any) {
        lastErr = err;
        this.logger.warn(`Provider '${p.name}' failed to place call: ${err.message}. Trying next…`);
      }
    }
    throw new BadRequestException(`All voice providers failed. Last error: ${lastErr?.message || 'unknown'}`);
  }

  // Sync/poll a call on the SAME provider that placed it.
  async getExecution(providerName: string, externalId: string): Promise<ExecutionResult> {
    const p = this.get(providerName);
    if (!p) throw new BadRequestException(`Unknown voice provider '${providerName}'`);
    return p.getExecution(externalId);
  }
}
