/**
 * PRA PDF — Automated Cleanup Service
 * A PRAVERSE Company
 * Idempotent, retryable, safe retention enforcement.
 * - B2 Temporary Files: Purged ~10 minutes after job output is ready.
 * - Telegram Original Backups: Purged ~24 hours after creation.
 * Never deletes on corrupt/misread timestamps; does not corrupt job records.
 */

import { jobStore } from '../jobs/jobStore';
import { storageManager } from '../storage/storageManager';
import { telegramBackup } from '../backup/telegramBackup';
import { JobRecord } from '../jobs/types';
import { B2ProviderId } from '../config';
import { logger } from '../logger';

export class CleanupService {
  private timer: NodeJS.Timeout | null = null;
  private isSweeping = false;

  /**
   * Starts periodic background sweep
   */
  public start(intervalMs: number = 60000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.runSweep(), intervalMs);
    // Unref so it does not block node process termination during tests
    if (this.timer.unref) this.timer.unref();
  }

  /**
   * Stops background sweep
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Runs single cleanup sweep across expired jobs
   */
  public async runSweep(): Promise<{ swept: number; succeeded: number; failed: number }> {
    if (this.isSweeping) {
      return { swept: 0, succeeded: 0, failed: 0 };
    }

    this.isSweeping = true;
    const now = new Date();
    const nowIso = now.toISOString();

    let swept = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const candidates = jobStore.findJobsForCleanup(nowIso);
      swept = candidates.length;

      for (const job of candidates) {
        try {
          const res = await this.cleanupJob(job, now);
          if (res) succeeded++;
          else failed++;
        } catch (err: any) {
          failed++;
          logger.error('CLEANUP_JOB_ERROR', {
            jobId: job.jobId,
            error: err?.message,
          });
        }
      }
    } catch (err: any) {
      logger.error('CLEANUP_SWEEP_FAILED', { error: err?.message });
    } finally {
      this.isSweeping = false;
    }

    return { swept, succeeded, failed };
  }

  /**
   * Safely and idempotently cleans up artifacts for a single job
   */
  public async cleanupJob(job: JobRecord, now: Date = new Date()): Promise<boolean> {
    logger.info('CLEANUP_STARTED', { jobId: job.jobId });

    const cleanupState = {
      b2InputDeleted: job.cleanupState?.b2InputDeleted || false,
      b2OutputDeleted: job.cleanupState?.b2OutputDeleted || false,
      telegramPurged: job.cleanupState?.telegramPurged || false,
      lastAttemptAt: now.toISOString(),
      retryCount: (job.cleanupState?.retryCount || 0) + 1,
    };

    let allSucceeded = true;
    const provider = storageManager.getProvider(job.storageProvider as B2ProviderId);

    // 1. Clean B2 input object
    if (!cleanupState.b2InputDeleted && job.inputStorageKey) {
      try {
        await provider.delete(job.inputStorageKey);
        cleanupState.b2InputDeleted = true;
      } catch (err: any) {
        allSucceeded = false;
        logger.warn('CLEANUP_B2_INPUT_FAILED', {
          jobId: job.jobId,
          error: err?.message,
        });
      }
    }

    // 2. Clean B2 output object (if expired)
    const isOutputExpired = job.expiresAt ? new Date(job.expiresAt) <= now : false;
    if (isOutputExpired && !cleanupState.b2OutputDeleted && job.outputStorageKey) {
      try {
        await provider.delete(job.outputStorageKey);
        cleanupState.b2OutputDeleted = true;
      } catch (err: any) {
        allSucceeded = false;
        logger.warn('CLEANUP_B2_OUTPUT_FAILED', {
          jobId: job.jobId,
          error: err?.message,
        });
      }
    }

    // 3. Purge Telegram backup message if older than 24 hours
    const jobCreated = new Date(job.createdAt);
    const ageMs = now.getTime() - jobCreated.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (
      ageMs >= twentyFourHoursMs &&
      !cleanupState.telegramPurged &&
      job.telegramMetadata?.messageId
    ) {
      try {
        const purged = await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
        if (purged) {
          cleanupState.telegramPurged = true;
        } else {
          allSucceeded = false;
        }
      } catch (err: any) {
        allSucceeded = false;
        logger.warn('CLEANUP_TELEGRAM_FAILED', {
          jobId: job.jobId,
          error: err?.message,
        });
      }
    }

    // Determine final status
    const isFullyCleaned =
      cleanupState.b2InputDeleted &&
      (!job.outputStorageKey || cleanupState.b2OutputDeleted) &&
      (!job.telegramMetadata?.messageId || cleanupState.telegramPurged || ageMs < twentyFourHoursMs);

    jobStore.update(job.jobId, {
      cleanupState: {
        ...cleanupState,
        cleanedAt: isFullyCleaned ? now.toISOString() : undefined,
      },
      status: isFullyCleaned ? 'CLEANED' : 'CLEANUP_PENDING',
    });

    logger.info('CLEANUP_COMPLETED', {
      jobId: job.jobId,
      allSucceeded,
      isFullyCleaned,
    });

    return allSucceeded;
  }
}

export const cleanupService = new CleanupService();
