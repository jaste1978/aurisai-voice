import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BolnaService } from '../bolna/bolna.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private bolna: BolnaService, private prisma: PrismaService) {}

  private isAdmin(user: any) { return user?.role === 'admin'; }
  private trialExpired(user: any) {
    return user?.isTrial && user?.trialEndsAt && new Date(user.trialEndsAt) < new Date();
  }

  async findAll(user?: any) {
    const res = await this.bolna.getAgents();
    const agents = Array.isArray(res) ? res : (res.agents || res.data || []);
    const all = agents.map((a: any) => ({ id: a.id, name: a.agent_name || a.name, status: a.status }));

    if (!user || this.isAdmin(user)) return all; // admin sees everything

    // everyone else sees ONLY the agents they own
    const owned = await this.prisma.ownedAgent.findMany({ where: { userId: user.id } });
    const ownedIds = new Set(owned.map((o) => o.agentId));
    return all.filter((a: any) => ownedIds.has(a.id));
  }

  async create(user: any, data: any) {
    if (this.trialExpired(user)) {
      throw new BadRequestException('Your 14-day trial has ended. Upgrade to keep building agents.');
    }
    if (!this.isAdmin(user)) {
      const count = await this.prisma.ownedAgent.count({ where: { userId: user.id } });
      const limit = user.agentLimit ?? 2;
      if (count >= limit) {
        throw new BadRequestException(`You've reached your limit of ${limit} agents on the trial.`);
      }
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

    const guardrail = `\n\n== LANGUAGE GUARDRAIL (STRICT) ==\n- You ONLY speak in ${langWord}. Never switch to any other language.\n- If the transcript ever shows another language/script (Kannada, Tamil, Telugu, Punjabi, Bengali, etc.), treat it as a mishear — do NOT reply in that language. Politely ask the caller to repeat, in ${langWord}.\n- Never output non-Hindi/English script.`;

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
            task_config: { hangup_after_silence: 12, call_terminate: 180, ambient_noise: false },
          },
        ],
      },
      agent_prompts: { task_1: { system_prompt: systemPrompt } },
    };
  }
}
