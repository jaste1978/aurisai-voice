// Vendor-agnostic voice-provider abstraction. Each backend (Bolna, Dograh, …)
// implements this so the rest of the platform never has to know which vendor
// placed a call. This layer is standalone — it does NOT change the existing
// Bolna call path; it's wired in ("connected") separately when ready.

export interface TriggerCallInput {
  phoneNumber: string;
  agentRef: string;                     // Bolna agent id, or Dograh workflow uuid
  variables?: Record<string, any>;      // dynamic context injected into the agent
  webhookUrl?: string;                  // optional per-call completion callback
}

export interface TriggerCallResult {
  provider: string;                     // which provider actually placed it
  externalId: string;                   // provider-native execution/run id
  status?: string;
  raw?: any;
}

export interface ExecutionResult {
  status: string;
  transcript?: string;
  recordingUrl?: string | null;
  durationSec?: number;
  summary?: string | null;
  raw?: any;
}

export interface VoiceAgentSummary {
  id: string;
  name: string;
}

export interface VoiceProvider {
  readonly name: string;                // 'bolna' | 'dograh' | …
  isConfigured(): boolean;              // are the creds/URL present?
  triggerCall(input: TriggerCallInput): Promise<TriggerCallResult>;
  getExecution(externalId: string): Promise<ExecutionResult>;
  listAgents(): Promise<VoiceAgentSummary[]>;
  getAccount?(): Promise<{ email?: string; wallet?: number } | null>;
}

export const VOICE_PROVIDERS = 'VOICE_PROVIDERS'; // DI token for the provider list
