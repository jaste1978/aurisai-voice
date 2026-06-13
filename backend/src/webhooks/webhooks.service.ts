import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

  async processWebhook(payload: any) {
    const executionId = payload.execution_id || payload.id;
    if (!executionId) return { received: true };

    const call = await this.prisma.call.findFirst({ where: { bolnaExecutionId: executionId } });
    if (!call) return { received: true, note: 'No matching call' };

    // Webhook gives us an early status update — poller will do the full sync
    // (transcript, recording, Google Chat) once the terminal status is confirmed
    await this.prisma.call.update({
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

    return { received: true };
  }
}
