/**
 * PRA PDF — Telegram Original File Backup Adapter
 * A PRAVERSE Company
 * Backs up ORIGINAL uploaded files only to private Telegram backup channel.
 * Never backs up processed output.
 * Captures message_id, file_id, and chat_id honestly.
 */

import { CONFIG } from '../config';
import { logger } from '../logger';

export interface TelegramBackupResult {
  success: boolean;
  messageId?: number;
  fileId?: string;
  chatId?: string;
  timestamp: string;
  error?: string;
}

export class TelegramBackupAdapter {
  private botToken: string;
  private chatId: string;
  public readonly isConfigured: boolean;

  constructor() {
    this.botToken = CONFIG.telegram.botToken;
    this.chatId = CONFIG.telegram.chatId;
    this.isConfigured = CONFIG.telegram.isConfigured;
  }

  /**
   * Backs up the original uploaded file to the configured Telegram private backup channel.
   * Honest status reporting: returns success only if Telegram API returns ok: true.
   */
  public async backupOriginal(
    jobId: string,
    fileBuffer: Buffer | Uint8Array,
    originalFilename: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<TelegramBackupResult> {
    const timestamp = new Date().toISOString();

    if (!this.isConfigured) {
      logger.warn('TELEGRAM_BACKUP_SKIPPED', {
        jobId,
        reason: 'TELEGRAM_CREDENTIALS_NOT_CONFIGURED',
      });
      return {
        success: false,
        timestamp,
        error: 'TELEGRAM_CREDENTIALS_NOT_CONFIGURED',
      };
    }

    logger.info('TELEGRAM_BACKUP_STARTED', {
      jobId,
      filename: originalFilename,
      sizeBytes: fileBuffer.length,
    });

    const maxRetries = 2;
    let lastError = 'Unknown error';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/sendDocument`;

        // Create multipart form data natively
        const formData = new FormData();
        formData.append('chat_id', this.chatId);
        formData.append(
          'caption',
          `PRA PDF Original Backup\nJob: ${jobId}\nFile: ${originalFilename}\nSize: ${(
            fileBuffer.length / 1024
          ).toFixed(1)} KB\nTime: ${timestamp}`
        );

        const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
        formData.append('document', blob, originalFilename);

        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        const data: any = await response.json();

        if (response.ok && data.ok && data.result) {
          const messageId = data.result.message_id;
          const fileId = data.result.document?.file_id || data.result.photo?.[0]?.file_id;
          const returnedChatId = String(data.result.chat?.id || this.chatId);

          logger.info('TELEGRAM_BACKUP_COMPLETED', {
            jobId,
            messageId,
            chatId: returnedChatId,
          });

          return {
            success: true,
            messageId,
            fileId,
            chatId: returnedChatId,
            timestamp,
          };
        } else {
          lastError = data.description || `HTTP ${response.status}: Failed to dispatch to Telegram`;
          logger.warn('TELEGRAM_BACKUP_ATTEMPT_FAILED', {
            jobId,
            attempt: attempt + 1,
            error: lastError,
          });
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error';
        logger.warn('TELEGRAM_BACKUP_ATTEMPT_EXCEPTION', {
          jobId,
          attempt: attempt + 1,
          error: lastError,
        });
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    logger.error('TELEGRAM_BACKUP_FAILED', {
      jobId,
      error: lastError,
    });

    return {
      success: false,
      timestamp,
      error: lastError,
    };
  }

  /**
   * Purges backup message from Telegram channel after retention window (~24h).
   * Safe, idempotent operation.
   */
  public async deleteBackupMessage(messageId: number): Promise<boolean> {
    if (!this.isConfigured || !messageId) return true;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          message_id: messageId,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data: any = await response.json();
      return Boolean(data.ok);
    } catch (err: any) {
      logger.warn('TELEGRAM_PURGE_WARNING', {
        messageId,
        error: err?.message,
      });
      return false;
    }
  }
}

export const telegramBackup = new TelegramBackupAdapter();
