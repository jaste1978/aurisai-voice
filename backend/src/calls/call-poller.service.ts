import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../bolna/bolna.service';
import { AgentConfigsService } from '../agent-configs/agent-configs.service';
import { GoogleChatService } from '../agent-configs/google-chat.service';

// Statuses Bolna returns for calls still in flight
const BOLNA_ACTIVE_STATUSES = new Set([
  'queued', 'ringing', 'initiate', 'in-progress', 'in_progress',
  // Batch-specific statuses — call is queued/prepared but not yet started
  'prepared', 'PREPARED', 'scheduled', 'SCHEDULED',
]);

// What we store in our DB for active calls
const DB_ACTIVE_STATUSES = ['queued', 'ringing', 'initiate', 'in_progress', 'in-progress', 'PREPARED', 'prepared', 'SCHEDULED', 'scheduled'];

// Max time a call can stay active before we force-close it (safety net)
const MAX_ACTIVE_MINUTES = 120;

const STATUS_MAP: Record<string, string> = {
  'call-disconnected': 'completed',
  'no-answer':         'failed',
  'busy':              'failed',
  'canceled':          'failed',
  'balance-low':       'failed',
  'stopped':           'failed',
  'error':             'failed',
  'hung-up':           'completed',
  'hangup':            'completed',
  'user_hangup':       'completed',
  'agent_hangup':      'completed',
  'initiate':          'in_progress',
  'ringing':           'in_progress',
  'in-progress':       'in_progress',
  'prepared':          'in_progress',
  'PREPARED':          'in_progress',
  'scheduled':         'in_progress',
  'SCHEDULED':         'in_progress',
  'COMPLETED':         'completed',
  'FAILED':            'failed',
  'TRANSFERRED':       'transferred',
};

function normalise(status: string): string {
  return STATUS_MAP[status] ?? status;
}

@Injectable()
export class CallPollerService {
  private readonly logger = new Logger(CallPollerService.name);
  private polling = new Set<number>(); // call IDs currently being fetched (avoid overlap)
  private pollingBatches = new Set<number>(); // batch IDs currently being fetched

  constructor(
    private prisma: PrismaService,
    private bolna: BolnaService,
    private agentConfigs: AgentConfigsService,
    private googleChat: GoogleChatService,
  ) {}

  @Cron('*/10 * * * * *') // every 10 seconds
  async pollActiveCalls() {
    const activeCalls = await this.prisma.call.findMany({
      where: {
        status: { in: DB_ACTIVE_STATUSES },
        bolnaExecutionId: { not: null },
      },
      select: {
        id: true, bolnaExecutionId: true, agentId: true,
        agentName: true, phoneNumber: true, status: true,
        transcript: true, createdAt: true,
      },
    });

    if (!activeCalls.length) return;

    const cutoff = new Date(Date.now() - MAX_ACTIVE_MINUTES * 60 * 1000);

    await Promise.allSettled(
      activeCalls
        .filter(c => !this.polling.has(c.id))
        .map(c => {
          // Force-close calls that have been active too long (safety net)
          if (c.createdAt && new Date(c.createdAt) < cutoff) {
            this.logger.warn(`Call ${c.id} exceeded ${MAX_ACTIVE_MINUTES}min — force-closing`);
            return this.prisma.call.update({
              where: { id: c.id },
              data: { status: 'failed', callEndTime: new Date(), errorMessage: 'Force-closed: exceeded max active duration' },
            });
          }
          return this.pollOne(c);
        }),
    );
  }

  private async pollOne(call: any) {
    this.polling.add(call.id);
    try {
      const exec = await this.bolna.getExecution(call.bolnaExecutionId);
      const rawStatus: string = exec.status || '';
      this.logger.debug(`Call ${call.id} raw status from Bolna: "${rawStatus}"`);
      // Terminal = anything NOT in Bolna's known active statuses
      // This means unknown statuses (hung-up, user_hangup, etc.) are treated as terminal
      const isTerminal = !!rawStatus && !BOLNA_ACTIVE_STATUSES.has(rawStatus);
      const normStatus = normalise(rawStatus);

      const updateData: any = {
        status: normStatus,
        bolnaResponse: exec,
      };

      if (exec.transcript)    updateData.transcript    = exec.transcript;
      if (exec.duration)      updateData.duration      = exec.duration;
      if (exec.summary)       updateData.agentResponseOutcome = exec.summary;

      // recording_url lives inside telephony_data per Bolna docs
      const recordingUrl = exec.recording_url || exec.telephony_data?.recording_url;
      if (recordingUrl) {
        updateData.recordingUrl      = recordingUrl;
        updateData.recordingDuration = exec.duration || null;
      }

      if (isTerminal) updateData.callEndTime = new Date();

      const updated = await this.prisma.call.update({
        where: { id: call.id },
        data: updateData,
      });

      if (isTerminal) {
        this.logger.log(`Call ${call.id} finished with status "${rawStatus}" — transcript length: ${(exec.transcript || '').length} chars`);
        // Fire Google Chat non-blocking
        this.notifyGoogleChat(updated, exec).catch(() => {});
      }
    } catch (err: any) {
      this.logger.warn(`Poll failed for call ${call.id}: ${err.message}`);
    } finally {
      this.polling.delete(call.id);
    }
  }

  // ---------- Batch polling (scheduled + bulk calls) ----------

  @Cron('*/30 * * * * *') // every 30 seconds
  async pollActiveBatches() {
    const batches = await this.prisma.batch.findMany({
      where: {
        status: { in: ['created', 'scheduled', 'in_progress'] },
        bolnaBatchId: { not: null },
      },
      select: {
        id: true, bolnaBatchId: true, agentId: true,
        agentName: true, status: true, createdAt: true,
      },
    });

    if (!batches.length) return;

    const cutoff = new Date(Date.now() - MAX_ACTIVE_MINUTES * 60 * 1000);

    await Promise.allSettled(
      batches
        .filter(b => !this.pollingBatches.has(b.id))
        .map(b => {
          if (b.createdAt && new Date(b.createdAt) < cutoff) {
            this.logger.warn(`Batch ${b.id} exceeded ${MAX_ACTIVE_MINUTES}min — force-closing`);
            return this.prisma.batch.update({
              where: { id: b.id },
              data: { status: 'completed' },
            });
          }
          return this.pollOneBatch(b);
        }),
    );
  }

  private async pollOneBatch(batch: any) {
    this.pollingBatches.add(batch.id);
    try {
      const res = await this.bolna.getBatchExecutions(batch.bolnaBatchId);
      const executions: any[] = Array.isArray(res) ? res : (res?.executions || res?.data || []);

      if (!executions.length) return;

      let allTerminal = true;

      for (const exec of executions) {
        const rawStatus: string = exec.status || '';
        const isTerminal = !!rawStatus && !BOLNA_ACTIVE_STATUSES.has(rawStatus);
        if (!isTerminal) { allTerminal = false; continue; }

        const executionId = exec.execution_id || exec.id;
        if (!executionId) continue;

        // Dedup — skip if we already created a Call record for this execution
        const existing = await this.prisma.call.findFirst({
          where: { bolnaExecutionId: executionId },
          select: { id: true },
        });
        if (existing) continue;

        // Fetch full execution if transcript is missing
        let full = exec;
        if (!exec.transcript) {
          try {
            full = await this.bolna.getExecution(executionId);
          } catch (err: any) {
            this.logger.warn(`Failed to fetch full execution ${executionId}: ${err.message}`);
          }
        }

        // Bolna batch execution phone field is user_number
        const phone =
          full.user_number ||
          exec.user_number ||
          full.to_phone_number ||
          full.to_number ||
          full.telephony_data?.to_number ||
          '';
        const recordingUrl = full.recording_url || full.telephony_data?.recording_url || null;

        const created = await this.prisma.call.create({
          data: {
            agentId: batch.agentId || null,
            agentName: batch.agentName || null,
            phoneNumber: phone,
            bolnaExecutionId: executionId,
            status: normalise(rawStatus),
            transcript: full.transcript || '',
            duration: full.duration || 0,
            agentResponseOutcome: full.summary || null,
            recordingUrl,
            recordingDuration: full.duration || null,
            bolnaResponse: full,
            callEndTime: new Date(),
          },
        });

        this.logger.log(`Batch ${batch.id} — created call for ${phone} (exec ${executionId})`);
        this.notifyGoogleChat(created, full).catch(() => {});
      }

      // Batch status updates
      if (allTerminal && executions.length > 0) {
        await this.prisma.batch.update({
          where: { id: batch.id },
          data: { status: 'completed' },
        });
        this.logger.log(`Batch ${batch.id} marked completed (${executions.length} executions)`);
      } else if (batch.status !== 'in_progress') {
        await this.prisma.batch.update({
          where: { id: batch.id },
          data: { status: 'in_progress' },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Batch poll failed for batch ${batch.id}: ${err.message}`);
    } finally {
      this.pollingBatches.delete(batch.id);
    }
  }

  private async notifyGoogleChat(call: any, exec: any) {
    if (!call.agentId) return;
    const config = await this.agentConfigs.findByAgentId(call.agentId);
    if (!config?.gchatEnabled || !config.gchatWebhookUrl) return;

    await this.googleChat.sendCallNotification(config.gchatWebhookUrl, {
      sendTranscript: config.gchatSendTranscript,
      sendSummary: config.gchatSendSummary,
      call,
      transcript: exec.transcript || call.transcript || '',
      summary: exec.summary || call.agentResponseOutcome || '',
    });
  }
}
