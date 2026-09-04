import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';

const STATUS_MAP: Record<string, string> = {
  'call-disconnected': 'completed', 'no-answer': 'failed', 'busy': 'failed',
  'canceled': 'failed', 'balance-low': 'failed', 'stopped': 'failed',
  'error': 'failed', 'initiate': 'in_progress', 'ringing': 'in_progress',
  'in-progress': 'in_progress', 'COMPLETED': 'completed', 'FAILED': 'failed',
  'TRANSFERRED': 'transferred', completed: 'completed', failed: 'failed',
  transferred: 'transferred', in_progress: 'in_progress',
};

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService, private monitoring: MonitoringService) {}

  async processWebhook(payload: any) {
    const executionId = payload.execution_id || payload.id;
    if (!executionId) return { received: true };

    const call = await this.prisma.call.findFirst({ where: { bolnaExecutionId: executionId } });
    if (!call) return { received: true, note: 'No matching call' };

    // Webhook gives us an early status update — poller will do the full sync
    // (transcript, recording, Google Chat) once the terminal status is confirmed
    const updated = await this.prisma.call.update({
      where: { id: call.id },
      data: {
        status: STATUS_MAP[payload.status] || payload.status || call.status,
        bolnaResponse: payload,
        ...(payload.transcript   && { transcript: payload.transcript }),
        ...(payload.duration     && { duration: payload.duration }),
        ...(payload.summary      && { agentResponseOutcome: payload.summary }),
        ...(payload.recording_url && { recordingUrl: payload.recording_url }),
        ...(payload.error?.message && { errorMessage: payload.error.message }),
      },
    });

    // Fire-and-forget health check → instant Telegram alert if the call looks broken.
    this.monitoring.alertOnCall(updated).catch(() => {});

    // Fire-and-forget partner webhook delivery for API-placed calls.
    this.notifyPartner(updated).catch(() => {});

    return { received: true };
  }

  // POST the outcome to the caller's webhook_url once, when the call is terminal.
  private async notifyPartner(call: any) {
    const terminal = ['completed', 'failed', 'transferred'];
    if (!call?.partnerWebhookUrl || call.partnerNotifiedAt || !terminal.includes(call.status)) return;
    const payload = {
      event: 'call.completed',
      call: {
        id: call.id,
        status: call.status,
        agent_id: call.agentId,
        agent_name: call.agentName,
        phone_number: call.phoneNumber,
        duration: call.duration,
        summary: call.agentResponseOutcome || null,
        transcript_available: !!(call.transcript && call.transcript.length),
        recording_url: call.recordingUrl || null,
        error: call.errorMessage || null,
        metadata: call.metadata ?? null,
        created_at: call.createdAt,
      },
    };
    try {
      await fetch(call.partnerWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch { /* delivery is best-effort */ }
    await this.prisma.call.update({ where: { id: call.id }, data: { partnerNotifiedAt: new Date() } }).catch(() => {});
  }
}
