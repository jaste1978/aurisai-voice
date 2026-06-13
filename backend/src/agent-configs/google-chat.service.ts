import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GoogleChatService {
  private readonly logger = new Logger(GoogleChatService.name);

  async sendCallNotification(webhookUrl: string, opts: {
    sendTranscript: boolean;
    sendSummary: boolean;
    call: any;
    transcript: string;
    summary: string;
  }) {
    const { sendTranscript, sendSummary, call, transcript, summary } = opts;

    const durationStr = call.duration
      ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
      : '—';

    const istTime = call.callEndTime
      ? new Date(new Date(call.callEndTime).getTime() + 5.5 * 3600 * 1000)
          .toISOString().replace('T', ' ').slice(0, 16) + ' IST'
      : '—';

    // Build main widgets — always show phone, optionally contact name, then rest
    const mainWidgets: any[] = [
      {
        decoratedText: {
          topLabel: 'Phone Number',
          text: call.phoneNumber || '—',
          icon: { knownIcon: 'PHONE' },
        },
      },
    ];

    // Contact name — stored in agentResponseNotes for scheduled campaign calls
    if (call.agentResponseNotes) {
      mainWidgets.push({
        decoratedText: {
          topLabel: 'Contact Name',
          text: call.agentResponseNotes,
          icon: { knownIcon: 'PERSON' },
        },
      });
    }

    mainWidgets.push(
      {
        decoratedText: {
          topLabel: 'Agent',
          text: call.agentName || call.agentId || '—',
          icon: { knownIcon: 'BOT' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Duration',
          text: durationStr,
          icon: { knownIcon: 'CLOCK' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Status',
          text: (call.status || '—').toUpperCase(),
          icon: { knownIcon: 'CONFIRMATION_NUMBER' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Time',
          text: istTime,
          icon: { knownIcon: 'INVITE' },
        },
      },
    );

    const sections: any[] = [{ widgets: mainWidgets }];

    if (sendSummary && summary) {
      sections.push({
        header: 'Summary',
        widgets: [{ textParagraph: { text: summary } }],
      });
    }

    if (sendTranscript && transcript) {
      const trimmed = transcript.length > 3000
        ? transcript.slice(0, 3000) + '\n...[truncated]'
        : transcript;
      sections.push({
        header: 'Transcript',
        widgets: [{ textParagraph: { text: `<pre>${trimmed}</pre>` } }],
      });
    }

    const message = {
      cardsV2: [
        {
          cardId: `call-${call.id}`,
          card: {
            header: {
              title: '📞 Call Completed',
              subtitle: `${call.agentName || 'AI Agent'} · ${call.phoneNumber || ''}`,
              imageUrl: 'https://fonts.gstatic.com/s/i/googlematerialicons/call/v6/black-48dp.png',
              imageType: 'CIRCLE',
            },
            sections,
          },
        },
      ],
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Google Chat webhook failed: ${res.status} — ${text}`);
      } else {
        this.logger.log(`Google Chat notification sent for call ${call.id}`);
      }
    } catch (err: any) {
      this.logger.error(`Google Chat webhook error: ${err.message}`);
    }
  }
}
