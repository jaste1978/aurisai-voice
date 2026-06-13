import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

function buildPrompt(params: any): string {
  const {
    agentName, agentGender, company, purpose, context,
    tone, language, callDuration, sections, faqTopics,
    guardrails, extraInstructions,
  } = params;

  return `You are an expert voice AI script writer for outbound call agents.
Generate a complete, professional, structured call script.

Agent Name: ${agentName || 'Esha'}
Agent Gender: ${agentGender || 'Female'}
Company: ${company || 'Company'}
Call Purpose: ${purpose}
Context / Background: ${context}
Tone: ${tone || 'Polite, friendly, professional'}
Default Language: ${language || 'English (switch to Hindi/Hinglish only on user request)'}
Expected Call Duration: ${callDuration || '3-5 minutes'}
Sections to include: ${(sections || []).join(', ')}
FAQ Topics: ${(faqTopics || []).join(', ') || 'General product FAQs'}
Guardrails: ${guardrails || 'No politics, health, legal, or financial advice.'}
${extraInstructions ? `Additional Instructions: ${extraInstructions}` : ''}

REQUIREMENTS:
1. Structure the script into clearly labelled SECTIONS:
   SECTION 1: Demeanour & Identity (Personality, Role, Tone, Guardrails overview)
   SECTION 2: Interview Starter (Language check, opening question, busy/not-interested branches)
   SECTION 3: Main Questions / Flow (numbered questions with English + Hindi versions and branching instructions)
   SECTION 4: Objection Handling (empathetic responses for common objections)
   SECTION 5: Soft Conversion / CTA (if applicable — low-risk ask, outcomes)
   SECTION 6: FAQ Handling (table or list of common Q&A in both languages)
   SECTION 7: Guardrails & Graceful Fallbacks (off-topic, frustrated user, out-of-scope)
   SECTION 8: Closing & Data Tags (closing lines + CRM fields to capture post-call)

2. Write BOTH English AND Hindi versions for every question and answer.
3. Include explicit branching: "If YES → go to...", "If NO → go to..."
4. Cap agent responses at 2 lines / 60 words.
5. Use natural spoken language, not formal written text.
6. Make content specific to the company and purpose above.
7. End with a "Data to Capture in CRM" section with post-call tag fields.

Output ONLY the script. No preamble, no explanation, no markdown code fences.`;
}

@Injectable()
export class ScriptsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async findAll() {
    return this.prisma.script.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    return this.prisma.script.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.script.create({
      data: {
        name: data.name,
        description: data.description || '',
        content: data.content,
        agentId: data.agentId || null,
        metadata: data.metadata || {},
      },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.script.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.script.delete({ where: { id } });
  }

  async generate(params: any) {
    const provider = params.provider || 'openai';
    const prompt = buildPrompt(params);

    if (provider === 'openai') {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) throw new BadRequestException('OPENAI_API_KEY is not configured');
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      });
      return res.choices[0].message.content;
    }

    if (provider === 'gemini') {
      const apiKey = this.config.get<string>('GEMINI_API_KEY');
      if (!apiKey) throw new BadRequestException('GEMINI_API_KEY is not configured');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }

    throw new BadRequestException(`Unknown provider "${provider}". Use "openai" or "gemini".`);
  }
}
