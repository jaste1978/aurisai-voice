import { Injectable, Logger } from '@nestjs/common';

// Thin wrapper around the Telegram Bot API. Reads TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID from env; if either is missing it no-ops (so the app runs
// fine without Telegram configured).
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private get token() { return process.env.TELEGRAM_BOT_TOKEN; }
  private get chatId() { return process.env.TELEGRAM_CHAT_ID; }

  get enabled() { return !!(this.token && this.chatId); }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — message skipped');
      return false;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      if (!res.ok) {
        this.logger.warn(`Telegram send failed: ${res.status} ${await res.text().catch(() => '')}`);
        return false;
      }
      return true;
    } catch (e: any) {
      this.logger.warn(`Telegram send error: ${e.message}`);
      return false;
    }
  }
}

export function escapeHtml(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
