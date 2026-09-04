import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';
import { TelegramService, escapeHtml } from '../telegram/telegram.service';

// Trim preset agent names like "HR Interview — Round 1 (Demo)" down for reports.
function shortAgent(name: string): string {
  return String(name || '—').split('—')[0].replace(/\(Demo\)/i, '').trim() || String(name || '—');
}

// Rule-based call-health monitoring + an hourly system report to Telegram.
// No AI/LLM involved — pure signal checks, so it needs no extra keys.
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private prisma: PrismaService,
    private bolna: BolnaService,
    private telegram: TelegramService,
  ) {}

  // Returns a list of problem signals for a finished call ([] means healthy).
  // NOTE: Bolna's `conversation_duration` is unreliable (often 0 even on a real
  // conversation), so health is judged by whether a conversation actually
  // happened — LLM turns and/or the user speaking — not by raw duration.
  evaluateCall(call: any): string[] {
    const issues: string[] = [];
    const resp: any = call?.bolnaResponse || {};
    const status = call?.status;
    const tta = resp?.latency_data?.time_to_first_audio;
    const llmTurns = resp?.latency_data?.llm?.turns;
    const llmTurnCount = Array.isArray(llmTurns) ? llmTurns.length : null;
    const transcript = call?.transcript || '';
    const userSpoke = /(^|\n)\s*user:/i.test(transcript);
    const hadConversation = (llmTurnCount != null && llmTurnCount > 0) || userSpoke;

    if (status === 'failed') issues.push('Call failed');
    if (call?.errorMessage) issues.push(`Error: ${String(call.errorMessage).slice(0, 120)}`);
    if (!hadConversation) {
      if (transcript && llmTurnCount === 0) {
        issues.push('Agent greeted but the conversation never started (no LLM turns)');
      } else {
        issues.push('No conversation — call dropped before the agent engaged');
      }
    }
    if (typeof tta === 'number' && tta > 10) issues.push(`Slow first audio (${tta.toFixed(1)}s)`);
    return issues;
  }

  // Called right after a call reaches a terminal state (from the webhook / poller).
  async alertOnCall(call: any): Promise<void> {
    try {
      if (!['completed', 'failed', 'transferred'].includes(call?.status)) return;
      const issues = this.evaluateCall(call);
      if (!issues.length) return;
      const msg =
        `⚠️ <b>Call health alert</b>\n` +
        `Agent: ${escapeHtml(call.agentName || call.agentId || '—')}\n` +
        `To: ${escapeHtml(call.phoneNumber || '—')}\n` +
        `Status: ${escapeHtml(call.status)} · ${call.duration ?? 0}s\n` +
        `Issues:\n${issues.map((i) => `• ${escapeHtml(i)}`).join('\n')}\n` +
        `Call #${call.id}`;
      await this.telegram.sendMessage(msg);
    } catch (e: any) {
      this.logger.warn(`alertOnCall failed: ${e.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async hourlyReport(): Promise<void> {
    if (!this.telegram.enabled) return;
    try {
      const since = new Date(Date.now() - 3600 * 1000);

      const [calls, newUsers] = await Promise.all([
        this.prisma.call.findMany({
          where: { createdAt: { gte: since } },
          select: {
            id: true, agentName: true, agentId: true, phoneNumber: true,
            status: true, transcript: true, bolnaResponse: true, errorMessage: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      ]);

      let wallet = '—';
      try {
        const me = await this.bolna.getMe();
        if (me?.wallet != null) wallet = String(Math.round(Number(me.wallet)));
      } catch { /* best-effort */ }

      // Per-call analysis (rule-based).
      const perAgent = new Map<string, { total: number; good: number }>();
      const problems: string[] = [];
      let good = 0;
      for (const c of calls) {
        const issues = this.evaluateCall(c);
        const healthy = issues.length === 0;
        if (healthy) good++;
        const name = c.agentName || c.agentId || '—';
        const a = perAgent.get(name) || { total: 0, good: 0 };
        a.total++; if (healthy) a.good++; perAgent.set(name, a);
        if (!healthy) {
          problems.push(`• #${c.id} ${escapeHtml(shortAgent(name))} → ${escapeHtml(c.phoneNumber || '—')}: ${escapeHtml(issues[0])}`);
        }
      }

      const total = calls.length;
      const bad = total - good;
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const health = total === 0 ? '😴 no calls' : bad === 0 ? '✅ all healthy' : `⚠️ ${bad} problem call(s)`;

      const agentLines = [...perAgent.entries()]
        .map(([name, a]) => `• ${escapeHtml(shortAgent(name))}: ${a.total} (✅ ${a.good})`)
        .join('\n');

      let msg =
        `📊 <b>AurisAI hourly report</b>\n` +
        `<i>${now} UTC · last 60 min</i>\n\n` +
        `Calls: <b>${total}</b> (✅ ${good} good · ⚠️ ${bad} problem)\n` +
        `New signups: <b>${newUsers}</b>\n` +
        `Bolna wallet: <b>${wallet}</b>\n` +
        `Health: ${health}`;
      if (agentLines) msg += `\n\n<b>By agent</b>\n${agentLines}`;
      if (problems.length) msg += `\n\n<b>Problem calls</b>\n${problems.slice(0, 10).join('\n')}` +
        (problems.length > 10 ? `\n…and ${problems.length - 10} more` : '');

      await this.telegram.sendMessage(msg);
    } catch (e: any) {
      this.logger.warn(`hourlyReport failed: ${e.message}`);
    }
  }
}
