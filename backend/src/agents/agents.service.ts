import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BolnaService } from '../bolna/bolna.service';
import { PrismaService } from '../prisma/prisma.service';
import { PRESET_AGENTS } from './presets';

@Injectable()
export class AgentsService {
  constructor(private bolna: BolnaService, private prisma: PrismaService) {}

  private isAdmin(user: any) { return user?.role === 'admin'; }

  async findAll(user?: any) {
    // Non-admins get the shared preset agents (they can't create their own during the trial).
    if (user && !this.isAdmin(user)) {
      return PRESET_AGENTS.map((p) => ({ id: p.agentId, name: p.name, status: 'preset', useCase: p.useCase }));
    }

    // Admin sees every agent in the Bolna account.
    const res = await this.bolna.getAgents();
    const agents = Array.isArray(res) ? res : (res.agents || res.data || []);
    return agents.map((a: any) => ({ id: a.id, name: a.agent_name || a.name, status: a.status }));
  }

  async create(user: any, data: any) {
    // During the trial/test period only admins may create agents; everyone else
    // uses the provided preset agents.
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Agents are provided by AurisAI during the trial — pick a ready-made agent to start a demo call.');
    }

    const name = (data.name || '').trim();
    if (!name) throw new BadRequestException('Please give your agent a name.');

    const payload = this.buildAgentConfig({
      name,
      welcome: (data.welcome_message || data.welcome || '').trim(),
      prompt: (data.system_prompt || data.prompt || '').trim(),
      language: (data.language || 'hinglish').trim().toLowerCase(),
    });

    let res: any;
    try {
      res = await this.bolna.createAgent(payload);
    } catch (e: any) {
      throw new BadRequestException(e.response?.data?.message || 'Could not create the agent on Bolna.');
    }
    const agentId = res?.agent_id || res?.id;
    if (!agentId) throw new BadRequestException('Agent creation did not return an id.');

    await this.prisma.ownedAgent.create({ data: { agentId, userId: user.id, name } });
    return { success: true, data: { id: agentId, name, state: res?.state } };
  }

  async remove(user: any, agentId: string) {
    const owned = await this.prisma.ownedAgent.findUnique({ where: { agentId } });
    if (!this.isAdmin(user) && (!owned || owned.userId !== user.id)) {
      throw new ForbiddenException('You can only delete your own agents.');
    }
    try { await this.bolna.deleteAgent(agentId); } catch { /* best-effort */ }
    await this.prisma.ownedAgent.deleteMany({ where: { agentId } });
    return { success: true, message: 'Agent deleted' };
  }

  // Build a Bolna v2 agent payload from simple trial-user inputs, with a
  // language guardrail baked in and a 3-min per-call cap for trials.
  private buildAgentConfig({ name, welcome, prompt, language }: any) {
    const langWord = language === 'english' ? 'English' : language === 'hindi' ? 'Hindi' : 'Hinglish (a natural Hindi + English mix)';
    const transcriberLang = language === 'english' ? 'en' : 'hi';

    const guardrail = `\n\n== LANGUAGE GUARDRAIL ==\n- Speak naturally in ${langWord}. Hindi and English are BOTH welcome — never ask the caller to repeat just because they spoke Hindi or English.\n- Understand whatever the caller says in Hindi or English and respond helpfully; keep the conversation flowing.\n- Only if the caller clearly uses a completely different regional language (Tamil, Telugu, Kannada, Bengali, etc.) should you gently continue in ${langWord} yourself — do NOT demand they switch or repeat.`;

    const systemPrompt =
      (prompt || `You are ${name}, a helpful AI voice agent. Be warm, concise and natural.`) + guardrail;

    const welcomeMsg = welcome || `Hello! This is ${name}. How can I help you today?`;

    return {
      agent_config: {
        agent_name: name,
        agent_type: 'simple_llm_agent',
        agent_welcome_message: welcomeMsg,
        tasks: [
          {
            task_type: 'conversation',
            toolchain: { execution: 'parallel', pipelines: [['transcriber', 'llm', 'synthesizer']] },
            tools_config: {
              input: { format: 'wav', provider: 'twilio' },
              output: { format: 'wav', provider: 'twilio' },
              transcriber: { provider: 'deepgram', model: 'nova-2', language: transcriberLang, stream: true, encoding: 'linear16' },
              llm_agent: {
                agent_type: 'simple_llm_agent',
                agent_flow_type: 'streaming',
                llm_config: { provider: 'openai', model: 'gpt-4o-mini', max_tokens: 150, temperature: 0.4 },
              },
              synthesizer: {
                provider: 'polly',
                stream: true,
                buffer_size: 150,
                provider_config: { voice: 'Kajal', engine: 'neural', language: 'en-IN' },
              },
            },
            task_config: { hangup_after_silence: 10, call_terminate: 120, ambient_noise: false },
          },
        ],
      },
      agent_prompts: { task_1: { system_prompt: systemPrompt } },
    };
  }
}
