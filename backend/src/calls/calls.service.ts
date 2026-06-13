import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';

interface FieldDef {
  key: string;
  label: string;
  source: 'transcript_extract' | 'call_field' | 'customer_field' | 'bolna_variable' | 'static';
  extractionPrompt?: string;
  callField?: string;
  customerField?: string;
  bolnaKey?: string;
  staticValue?: string;
  defaultValue?: string;
}

const STATUS_MAP: Record<string, string> = {
  completed: 'completed',
  failed: 'failed',
  busy: 'failed',
  'no-answer': 'failed',
  canceled: 'failed',
  in_progress: 'in_progress',
  queued: 'queued',
  transferred: 'transferred',
};

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService, private bolna: BolnaService) {}

  async findAll() {
    const calls = await this.prisma.call.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return calls.map(this.serialize);
  }

  async findOne(id: number) {
    const call = await this.prisma.call.findUnique({ where: { id }, include: { customer: true } });
    if (!call) throw new NotFoundException('Call not found');
    return this.serialize(call);
  }

  async getStats() {
    const [total, completed, failed, inProgress, transferred] = await Promise.all([
      this.prisma.call.count(),
      this.prisma.call.count({ where: { status: 'completed' } }),
      this.prisma.call.count({ where: { status: 'failed' } }),
      this.prisma.call.count({ where: { status: 'in_progress' } }),
      this.prisma.call.count({ where: { status: 'transferred' } }),
    ]);
    const avgResult = await this.prisma.call.aggregate({ _avg: { duration: true } });
    return {
      total,
      completed,
      failed,
      in_progress: inProgress,
      transferred,
      success_rate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%',
      avg_duration: avgResult._avg.duration || 0,
    };
  }

  async trigger(data: any) {
    const { customer_id, agent_id, phone_number, language } = data;
    if (!agent_id || !phone_number) throw new BadRequestException('agent_id and phone_number are required');

    let customer = null;
    if (customer_id) {
      customer = await this.prisma.customer.findUnique({ where: { id: Number(customer_id) } });
    }

    const call = await this.prisma.call.create({
      data: {
        phoneNumber: phone_number,
        status: 'queued',
        agentId: agent_id,
        language: language || 'en',
        ...(customer && { customerId: customer.id }),
      },
    });

    try {
      const bolnaRes = await this.bolna.triggerCall(
        phone_number,
        agent_id,
        customer?.id || 'unknown',
        { customerName: customer?.name, purpose: 'outreach', language: language || 'en' },
      );
      const updated = await this.prisma.call.update({
        where: { id: call.id },
        data: {
          bolnaExecutionId: bolnaRes.execution_id || bolnaRes.id,
          status: 'in_progress',
          callStartTime: new Date(),
        },
        include: { customer: true },
      });
      return { success: true, message: 'Call triggered successfully', data: this.serialize(updated) };
    } catch (err) {
      await this.prisma.call.update({
        where: { id: call.id },
        data: { status: 'failed', errorMessage: err.response?.data?.message || err.message },
      });
      throw new BadRequestException(err.response?.data?.message || err.message);
    }
  }

  async sync(id: number) {
    const call = await this.prisma.call.findUnique({ where: { id } });
    if (!call) throw new NotFoundException('Call not found');
    if (!call.bolnaExecutionId) throw new BadRequestException('No Bolna execution ID on this call');

    const exec = await this.bolna.getExecution(call.bolnaExecutionId);

    const updated = await this.prisma.call.update({
      where: { id },
      data: {
        status: STATUS_MAP[exec.status] || exec.status,
        transcript: exec.transcript || call.transcript || '',
        duration: Math.round(exec.conversation_duration || 0),
        bolnaResponse: exec,
        ...(exec.telephony_data?.recording_url && { recordingUrl: exec.telephony_data.recording_url }),
        ...(exec.error_message && { errorMessage: exec.error_message }),
        ...(exec.telephony_data?.hangup_reason && { agentResponseNotes: exec.telephony_data.hangup_reason }),
        ...(exec.summary && { agentResponseOutcome: exec.summary }),
      },
      include: { customer: true },
    });
    return { success: true, message: 'Call synced from Bolna', data: this.serialize(updated) };
  }

  async analyze(id: number) {
    const call = await this.prisma.call.findUnique({ where: { id }, include: { customer: true } });
    if (!call) throw new NotFoundException('Call not found');

    const transcript = call.transcript;
    if (!transcript) throw new BadRequestException('No transcript available to analyze');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new BadRequestException('OPENAI_API_KEY is not configured');

    const client = new OpenAI({ apiKey });

    // Build full context from all available call data
    const bolnaData = call.bolnaResponse as any || {};
    const callContext = {
      candidate_name: call.customer?.name || 'Unknown',
      candidate_phone: call.phoneNumber,
      candidate_email: call.customer?.email || null,
      agent_id: call.agentId,
      agent_name: bolnaData?.agent_name || call.agentName || null,
      call_duration_seconds: call.duration,
      language: call.language,
      call_status: call.status,
      hangup_by: bolnaData?.telephony_data?.hangup_by || null,
      bolna_summary: bolnaData?.summary || call.agentResponseOutcome || null,
      smart_status: bolnaData?.smart_status || null,
      extracted_data: bolnaData?.extracted_data || null,
      custom_extractions: bolnaData?.custom_extractions || null,
      call_date: call.createdAt,
    };

    const prompt = `You are an expert reviewer analyzing a call made by an AI voice agent to a human participant. Your job is to assess the HUMAN on the call — their responses, behavior, suitability, and communication. Do NOT assess the AI agent's performance.

Use ALL the context below to give a specific, relevant, and actionable assessment. Be direct and honest — this will be reviewed by a human (HR team, manager, or supervisor).

--- CALL CONTEXT ---
${JSON.stringify(callContext, null, 2)}

--- TRANSCRIPT ---
${transcript}
--- END ---

Return a JSON object with these fields:
- overall_score: number (0-10, how well the human performed / how suitable they are based on this call)
- summary: string (3-4 sentences — who is this person, what was the call about, how did they come across, and what is your recommendation or key takeaway)
- strengths: array of strings (3-5 specific strengths with evidence from the transcript — quote or reference what they said)
- weaknesses: array of strings (3-5 specific concerns or red flags with evidence — be direct, not generic)
- sentiment_journey: array of { time: string, sentiment: "positive"|"neutral"|"negative", note: string }
- key_moments: array of { time: string, type: string, description: string }
- behavioral_tags: array of strings (e.g. "confident", "hesitant", "well-prepared", "evasive", "cooperative", "language-switched", "needs-followup", "strong-candidate", "not-suitable")
- communication_skills: { clarity: number (0-10), confidence: number (0-10), relevance: number (0-10), notes: string }
- analyzed_at: string (ISO timestamp)

Return ONLY valid JSON, no markdown.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    let insights: any;
    try {
      insights = JSON.parse(res.choices[0].message.content || '{}');
    } catch {
      throw new BadRequestException('Failed to parse AI response');
    }

    insights.analyzed_at = new Date().toISOString();

    await this.prisma.call.update({
      where: { id },
      data: { behavioralInsights: JSON.stringify(insights) },
    });

    return { success: true, data: insights };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async exportCalls(
    query: { templateId?: string; format?: string; agentId?: string; from?: string; to?: string; callId?: string },
    res: Response,
  ) {
    if (!query.templateId) throw new BadRequestException('templateId is required');

    const template = await this.prisma.reportTemplate.findUnique({
      where: { templateId: query.templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const fields = template.fields as unknown as FieldDef[];

    // Build call filter
    const where: any = {};
    if (query.callId) where.id = Number(query.callId);
    if (query.agentId) where.agentId = query.agentId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const calls = await this.prisma.call.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });


    // GPT extraction for transcript_extract fields (with caching)
    const transcriptFields = fields.filter(f => f.source === 'transcript_extract' && (f.key || f.label));
    if (transcriptFields.length > 0) {
      const apiKey = process.env.OPENAI_API_KEY;
      const callsNeedingExtraction = calls.filter(call => {
        if (!call.transcript) return false;
        const existing = call.extractedData as Record<string, any> | null;
        return !existing?.[template.templateId];
      });

      // Process in batches of 5 to balance speed vs. rate limits
      const BATCH = 5;
      for (let i = 0; i < callsNeedingExtraction.length; i += BATCH) {
        await Promise.allSettled(
          callsNeedingExtraction.slice(i, i + BATCH).map(call =>
            this.extractAndCache(call, template.templateId, transcriptFields, apiKey),
          ),
        );
      }

      // Reload extractedData for updated calls
      const updatedIds = callsNeedingExtraction.map(c => c.id);
      if (updatedIds.length > 0) {
        const refreshed = await this.prisma.call.findMany({
          where: { id: { in: updatedIds } },
          select: { id: true, extractedData: true },
        });
        const refreshMap = new Map(refreshed.map(r => [r.id, r.extractedData]));
        calls.forEach(c => {
          if (refreshMap.has(c.id)) (c as any).extractedData = refreshMap.get(c.id);
        });
      }
    }

    // Build header + rows — skip completely blank fields
    const validFields = fields.filter(f => f.label || f.key);
    const headers = validFields.map(f => f.label || f.key);
    const rows = calls.map(call => this.buildRow(call, validFields, template.templateId));


    const filename = `${template.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}`;

    if (query.format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Export');

      // Header row styled
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF013443' } };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      rows.forEach(row => sheet.addRow(row));

      // Auto-width
      sheet.columns.forEach(col => {
        let maxLen = 12;
        col.eachCell?.({ includeEmpty: true }, cell => {
          const len = cell.value ? String(cell.value).length : 0;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 60);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // CSV
      const escape = (v: any) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const lines = [headers, ...rows].map(row => row.map(escape).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(lines.join('\n'));
    }
  }

  private async extractAndCache(
    call: any,
    templateId: string,
    fields: FieldDef[],
    apiKey: string | undefined,
  ) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const useGemini = !!geminiKey;

    if (!geminiKey && !apiKey) {
      console.warn('[Export] Neither GEMINI_API_KEY nor OPENAI_API_KEY is set — transcript_extract fields will be empty');
      return;
    }

    // Use label-derived key when key is blank (handles templates saved before auto-generate UX)
    const labelToKey = (label: string) =>
      label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '');

    const fieldLines = fields
      .filter(f => f.key || f.label)                          // skip truly blank fields
      .map(f => {
        const k = f.key || labelToKey(f.label);
        const prompt = f.extractionPrompt || `Extract the value for "${f.label}" from the transcript. Return a short, direct answer or null if not mentioned.`;
        return `"${k}": ${prompt}`;
      })
      .join('\n');

    const prompt = `Given this call transcript, extract the following fields and return as a single JSON object.
Use null for fields that cannot be determined from the transcript.
Return ONLY valid JSON with no markdown or explanation.

Fields to extract:
${fieldLines}

TRANSCRIPT:
${call.transcript}`;

    try {
      let raw = '{}';

      if (useGemini) {
        const genAI = new GoogleGenerativeAI(geminiKey!);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash-lite',
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        });
        const result = await model.generateContent(prompt);
        raw = result.response.text();
      } else {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });
        raw = completion.choices[0].message.content || '{}';
      }

      const extracted = JSON.parse(raw);
      const existing = (call.extractedData as Record<string, any>) || {};
      const updated = {
        ...existing,
        [templateId]: { ...extracted, extracted_at: new Date().toISOString() },
      };
      await this.prisma.call.update({
        where: { id: call.id },
        data: { extractedData: updated },
      });
      (call as any).extractedData = updated;
    } catch (err) {
      console.error(`[Export] GPT extraction failed for call id=${call.id}:`, err);
    }
  }

  private buildRow(call: any, fields: FieldDef[], templateId: string): string[] {
    const extracted = ((call.extractedData as any)?.[templateId]) || {};
    const bolna = (call.bolnaResponse as any) || {};

    return fields.map(f => {
      switch (f.source) {
        case 'customer_field':
          return call.customer?.[f.customerField as string] ?? f.defaultValue ?? '';
        case 'call_field':
          return this.getCallFieldValue(call, f.callField as string) ?? f.defaultValue ?? '';
        case 'bolna_variable':
          return bolna?.variables?.[f.bolnaKey as string]
            ?? bolna?.extracted_data?.[f.bolnaKey as string]
            ?? f.defaultValue ?? '';
        case 'transcript_extract': {
          const k = f.key || f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '');
          return extracted[k] ?? f.defaultValue ?? '';
        }
        case 'static':
          return f.staticValue ?? '';
        default:
          return '';
      }
    });
  }

  private getCallFieldValue(call: any, key: string): string {
    const map: Record<string, () => any> = {
      status:             () => call.status,
      duration:           () => (call.duration ? `${call.duration}s` : ''),
      call_start_time:    () => call.callStartTime?.toISOString() || '',
      call_end_time:      () => call.callEndTime?.toISOString() || '',
      created_at:         () => call.createdAt?.toISOString() || '',
      agent_name:         () => call.agentName || '',
      agent_id:           () => call.agentId || '',
      phone_number:       () => call.phoneNumber || '',
      recording_url:      () => call.recordingUrl || '',
      outcome:            () => call.agentResponseOutcome || '',
      notes:              () => call.agentResponseNotes || '',
      error_message:      () => call.errorMessage || '',
      language:           () => call.language || '',
      bolna_execution_id: () => call.bolnaExecutionId || '',
      transferred:        () => (call.transferredToAgent ? 'Yes' : 'No'),
      transferred_agent:  () => call.transferredAgentName || '',
    };
    return map[key]?.() ?? '';
  }

  serialize(call: any) {
    return {
      id: call.id,
      call_id: call.callId,
      customer_id: call.customerId,
      customer_name: call.customer?.name || null,
      bolna_execution_id: call.bolnaExecutionId,
      phone_number: call.phoneNumber,
      status: call.status,
      agent_id: call.agentId,
      agent_name: call.agentName,
      duration: call.duration,
      transcript: call.transcript,
      recording_url: call.recordingUrl,
      agent_response_outcome: call.agentResponseOutcome,
      agent_response_notes: call.agentResponseNotes,
      error_message: call.errorMessage,
      language: call.language,
      transferred_to_agent: call.transferredToAgent,
      transferred_agent_name: call.transferredAgentName,
      bolna_response: call.bolnaResponse,
      behavioral_insights: call.behavioralInsights,
      extracted_data: call.extractedData,
      created_at: call.createdAt,
      updated_at: call.updatedAt,
    };
  }

  async bulkSyncMissingRecordings() {
    // Find all completed calls with execution ID but no recording
    const calls = await this.prisma.call.findMany({
      where: {
        status: 'completed',
        bolnaExecutionId: { not: null },
        recordingUrl: null,
      },
    });

    const results = { total: calls.length, fixed: 0, failed: 0, skipped: 0 };

    for (const call of calls) {
      try {
        const exec = await this.bolna.getExecution(call.bolnaExecutionId!);

        const recordingUrl = exec.telephony_data?.recording_url;
        const hasNewData = recordingUrl || exec.summary || exec.transcript;

        if (!hasNewData) {
          results.skipped++;
          continue;
        }

        await this.prisma.call.update({
          where: { id: call.id },
          data: {
            ...(recordingUrl && { recordingUrl }),
            ...(exec.transcript && { transcript: exec.transcript }),
            ...(exec.summary && { agentResponseOutcome: exec.summary }),
            ...(exec.telephony_data?.hangup_reason && { agentResponseNotes: exec.telephony_data.hangup_reason }),
            ...(exec.conversation_duration && { duration: Math.round(exec.conversation_duration) }),
            bolnaResponse: exec,
          },
        });

        if (recordingUrl) results.fixed++;
        else results.skipped++;
      } catch {
        results.failed++;
      }
    }

    return results;
  }
}
