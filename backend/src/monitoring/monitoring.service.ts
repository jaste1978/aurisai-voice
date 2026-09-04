import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';
import { TelegramService, escapeHtml } from '../telegram/telegram.service';

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
      const scope = { createdAt: { gte: since } };
      const terminal = ['completed', 'failed', 'transferred'];
      const [total, completed, failed, noConvo, newUsers] = await Promise.all([
        this.prisma.call.count({ where: { ...scope } }),
        this.prisma.call.count({ where: { ...scope, status: 'completed' } }),
        this.prisma.call.count({ where: { ...scope, status: 'failed' } }),
        // Genuinely broken: finished but the user never spoke (call.duration is
        // unreliable on Bolna, so we go by the transcript instead).
        this.prisma.call.count({ where: { ...scope, status: { in: terminal }, NOT: { transcript: { contains: 'user:' } } } }),
        this.prisma.user.count({ where: { ...scope } }),
      ]);

      let wallet = '—';
      try {
        const me = await this.bolna.getMe();
        if (me?.wallet != null) wallet = String(Math.round(Number(me.wallet)));
      } catch {
        /* wallet is best-effort */
      }

      const health = total === 0 ? '😴 no calls' : noConvo === 0 && failed === 0 ? '✅ healthy' : `⚠️ ${noConvo} no-conversation, ${failed} failed`;
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

      const msg =
        `📊 <b>AurisAI hourly report</b>\n` +
        `<i>${now} UTC · last 60 min</i>\n\n` +
        `Calls: <b>${total}</b> (✅ ${completed} · ❌ ${failed})\n` +
        `No-conversation: <b>${noConvo}</b>\n` +
        `New signups: <b>${newUsers}</b>\n` +
        `Bolna wallet: <b>${wallet}</b>\n` +
        `Health: ${health}`;
      await this.telegram.sendMessage(msg);
    } catch (e: any) {
      this.logger.warn(`hourlyReport failed: ${e.message}`);
    }
  }
}
