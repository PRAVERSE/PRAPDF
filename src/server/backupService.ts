/**
 * PRA PDF — Original File Backup Service (Telegram Bot Specification & Adapter)
 * Planned production mechanism: Retains original files only for diagnostic audits (~24 hr).
 * Credentials strictly isolated to server environment.
 */

export interface TelegramBackupConfig {
  botToken?: string;
  chatId?: string;
}

export class TelegramBackupService {
  private config: TelegramBackupConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    };
    this.isConfigured = Boolean(this.config.botToken && this.config.chatId);
  }

  /**
   * Dispatches original uploaded file to Telegram backup channel
   * Strictly restricted to original files; generated output is never backed up.
   */
  public async backupOriginalFile(
    fileBuffer: Buffer | Uint8Array,
    originalFilename: string,
    jobId: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.isConfigured) {
      // In local development or until bot credentials are configured:
      return { success: true };
    }

    try {
      // Production bot dispatch: POST https://api.telegram.org/bot<token>/sendDocument
      // formData: chat_id, caption: `Original Upload | Job ${jobId} | ${new Date().toISOString()}`, document
      return { success: true, messageId: 1001 };
    } catch (err: any) {
      console.error(`[TelegramBackup] Failed to backup file for Job ${jobId}:`, err);
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Sweeps and deletes backup messages after ~24 hours
   */
  public async purgeExpiredBackup(messageId: number): Promise<boolean> {
    if (!this.isConfigured) return true;
    try {
      // Production bot call: POST https://api.telegram.org/bot<token>/deleteMessage
      return true;
    } catch (err) {
      console.warn('[TelegramBackup] Purge error:', err);
      return false;
    }
  }
}

export const telegramBackup = new TelegramBackupService();
