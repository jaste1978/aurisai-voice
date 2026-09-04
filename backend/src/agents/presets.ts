// Preset agents available to every user during the trial/test period.
// Users cannot create their own agents right now — they pick one of these to
// place a (max 2-minute, demo) call. Calls are still attributed to the caller,
// so each user's call logs stay private. To add/remove a preset, edit this list
// (and create/delete the matching agent in the Bolna account).
export interface PresetAgent {
  agentId: string;
  name: string;
  useCase: 'hr' | 'sales' | 'support';
}

export const PRESET_AGENTS: PresetAgent[] = [
  { agentId: '04486b73-cc1e-442b-bfce-602a85edd945', name: 'HR Interview — Round 1 (Demo)', useCase: 'hr' },
  { agentId: 'e755cae2-64ab-44e6-951c-3b3d97cada4c', name: 'Lead / Sales Calling (Demo)', useCase: 'sales' },
  { agentId: '5eb3ac48-bbca-41be-84b3-4039d06b718e', name: 'Customer Support (Demo)', useCase: 'support' },
];

export const PRESET_AGENT_IDS = new Set(PRESET_AGENTS.map((p) => p.agentId));
