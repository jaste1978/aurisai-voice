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
  evaluateCall(call: any): string[] {
    const issues: string[] = [];
    const resp: any = call?.bolnaResponse || {};
    const status = call?.status;
    const bolnaStatus = resp.status;
    const dur = call?.duration ?? 0;
    const tta = resp?.latency_data?.time_to_first_audio;
    const llmTurns = resp?.latency_data?.llm?.turns;
    const transcriptLen = (call?.transcript || '').length;

    if (status === 'failed') issues.push('Call failed');
    if (status === 'completed' && dur === 0) issues.push('Zero-duration call (dropped immediately)');
    if (bolnaStatus === 'call-disconnected' && dur === 0) issues.push('Disconnected before the conversation ran');
    if (Array.isArray(llmTurns) && llmTurns.length === 0 && transcriptLen > 0) {
      issues.push('Agent greeted but the LLM produced no reply turns');
    }
    if (typeof tta === 'number' && tta > 8) issues.push(`Slow first audio (${tta.toFixed(1)}s)`);
    if (call?.errorMessage) issues.push(`Error: ${String(call.errorMessage).slice(0, 120)}`);
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
      const [total, completed, failed, zeroDur, agg, newUsers] = await Promise.all([
        this.prisma.call.count({ where: { ...scope } }),
        this.prisma.call.count({ where: { ...scope, status: 'completed' } }),
        this.prisma.call.count({ where: { ...scope, status: 'failed' } }),
        this.prisma.call.count({ where: { ...scope, status: 'completed', duration: 0 } }),
        this.prisma.call.aggregate({ where: { ...scope, status: 'completed' }, _avg: { duration: true } }),
        this.prisma.user.count({ where: { ...scope } }),
      ]);

      let wallet = '—';
      try {
        const me = await this.bolna.getMe();
        if (me?.wallet != null) wallet = String(Math.round(Number(me.wallet)));
      } catch {
        /* wallet is best-effort */
      }

      const avg = Math.round(agg._avg.duration || 0);
      const problems = failed + zeroDur;
      const health = total === 0 ? '😴 no calls' : problems === 0 ? '✅ healthy' : `⚠️ ${problems} problem call(s)`;
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

      const msg =
        `📊 <b>AurisAI hourly report</b>\n` +
        `<i>${now} UTC · last 60 min</i>\n\n` +
        `Calls: <b>${total}</b> (✅ ${completed} · ❌ ${failed})\n` +
        `Zero-duration: <b>${zeroDur}</b>\n` +
        `Avg duration: <b>${avg}s</b>\n` +
        `New signups: <b>${newUsers}</b>\n` +
        `Bolna wallet: <b>${wallet}</b>\n` +
        `Health: ${health}`;
      await this.telegram.sendMessage(msg);
    } catch (e: any) {
      this.logger.warn(`hourlyReport failed: ${e.message}`);
    }
  }
}
