/**
 * PRA PDF — Job Lifecycle Coordinator Service
 * A PRAVERSE Company
 * Coordinates the full document processing pipeline:
 * Validation -> B2 Input Upload -> Telegram Original Backup -> Processor Dispatch
 * Real state transitions, zero faked processing.
 */

import path from 'path';
import { CONFIG, B2ProviderId } from '../config';
import { JobRecord, JobStatus, CreateJobInput } from './types';
import { jobStore } from './jobStore';
import { storageManager } from '../storage/storageManager';
import { telegramBackup } from '../backup/telegramBackup';
import { processorAdapter } from '../processor/processorAdapter';
import { SecurityValidator } from '../security/validation';
import { logger } from '../logger';

export class JobService {
  /**
   * Initializes and executes the job upload & dispatch pipeline
   */
  public async createAndProcessJob(
    input: CreateJobInput,
    fileBuffer: Buffer
  ): Promise<{ success: boolean; job: JobRecord; error?: { code: string; message: string } }> {
    const jobId = SecurityValidator.generateJobId();

    // 1. Strict 50 MB limit validation
    const sizeCheck = SecurityValidator.validateFileSize(fileBuffer.length);
    if (!sizeCheck.valid) {
      return {
        success: false,
        job: null as any,
        error: { code: sizeCheck.errorCode!, message: sizeCheck.errorMessage! },
      };
    }

    // 2. Service validation
    const serviceCheck = SecurityValidator.validateServiceId(input.serviceId);
    if (!serviceCheck.valid) {
      return {
        success: false,
        job: null as any,
        error: { code: serviceCheck.errorCode!, message: serviceCheck.errorMessage! },
      };
    }

    // 3. File extension validation
    const typeCheck = SecurityValidator.validateFileType(input.serviceId, input.originalFilename);
    if (!typeCheck.valid) {
      return {
        success: false,
        job: null as any,
        error: { code: typeCheck.errorCode!, message: typeCheck.errorMessage! },
      };
    }

    const cleanFilename = SecurityValidator.sanitizeFilename(input.originalFilename);
    const ext = path.extname(cleanFilename);
    const safeFileId = SecurityValidator.generateFileId(ext);
    const inputKey = storageManager.generateInputKey(jobId, safeFileId);
    const providerId = (input.storageProvider as B2ProviderId) || CONFIG.defaultB2Provider;

    const now = new Date().toISOString();
    // Expiration for 10-minute B2 output retention once generated
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    let job: JobRecord = {
      jobId,
      serviceId: input.serviceId,
      originalFilename: cleanFilename,
      inputSize: fileBuffer.length,
      mimeType: input.mimeType || 'application/octet-stream',
      storageProvider: providerId,
      inputStorageKey: inputKey,
      status: 'VALIDATING',
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    jobStore.insert(job);

    try {
      // Step A: Upload to B2 temporary input storage
      jobStore.update(jobId, { status: 'UPLOADING' });
      logger.info('B2_UPLOAD_STARTED', { jobId, inputKey, providerId });

      const provider = storageManager.getProvider(providerId);
      await provider.upload(inputKey, fileBuffer, job.mimeType);

      // Step B: Dispatch original file backup to Telegram
      jobStore.update(jobId, { status: 'BACKING_UP' });
      logger.info('TELEGRAM_BACKUP_STARTED', { jobId });

      const tgResult = await telegramBackup.backupOriginal(
        jobId,
        fileBuffer,
        cleanFilename,
        job.mimeType
      );

      job = jobStore.update(jobId, {
        telegramMetadata: {
          backedUp: tgResult.success,
          messageId: tgResult.messageId,
          fileId: tgResult.fileId,
          chatId: tgResult.chatId,
          timestamp: tgResult.timestamp,
          error: tgResult.error,
        },
      })!;

      // Step C: Dispatch to Processing Server
      const outputKey = storageManager.generateOutputKey(jobId, `output_${safeFileId}`);

      const processorSubmission = await processorAdapter.submitJob({
        jobId,
        serviceId: input.serviceId,
        inputStorageKey: inputKey,
        outputStorageKey: outputKey,
        originalFilename: cleanFilename,
        options: input.options,
      });

      if (!processorSubmission.accepted) {
        // Truthful reporting: do not pretend completion!
        job = jobStore.update(jobId, {
          status: 'FAILED',
          errorCode: 'PROCESSOR_UNAVAILABLE',
          errorMessage: processorSubmission.message || 'Processing server is currently unavailable.',
          outputStorageKey: outputKey,
        })!;

        return {
          success: false,
          job,
          error: {
            code: 'PROCESSOR_UNAVAILABLE',
            message: processorSubmission.message || 'Processing server is currently unavailable.',
          },
        };
      }

      job = jobStore.update(jobId, {
        status: 'QUEUED',
        outputStorageKey: outputKey,
      })!;

      return {
        success: true,
        job,
      };
    } catch (err: any) {
      logger.error('JOB_PIPELINE_ERROR', { jobId, error: err?.message });
      job = jobStore.update(jobId, {
        status: 'FAILED',
        errorCode: 'INTERNAL_ERROR',
        errorMessage: err?.message || 'Internal processing error',
      })!;

      return {
        success: false,
        job,
        error: { code: 'INTERNAL_ERROR', message: err?.message || 'Processing error' },
      };
    }
  }

  /**
   * Retrieves current job status, checking processor if active
   */
  public async getJob(jobId: string): Promise<JobRecord | null> {
    if (!SecurityValidator.validateJobId(jobId)) {
      return null;
    }

    const job = jobStore.get(jobId);
    if (!job) return null;

    // If job is queued or processing, check external processor status if available
    if ((job.status === 'QUEUED' || job.status === 'PROCESSING') && processorAdapter.isConfigured) {
      const procStatus = await processorAdapter.checkStatus(jobId);
      if (procStatus) {
        let updatedStatus: JobStatus = job.status;
        if (procStatus.status === 'PROCESSING') updatedStatus = 'PROCESSING';
        else if (procStatus.status === 'COMPLETED') updatedStatus = 'COMPLETED';
        else if (procStatus.status === 'FAILED') updatedStatus = 'FAILED';

        return jobStore.update(jobId, {
          status: updatedStatus,
          errorCode: procStatus.error ? 'PROCESSOR_ERROR' : undefined,
          errorMessage: procStatus.error,
          completedAt: procStatus.status === 'COMPLETED' ? new Date().toISOString() : undefined,
        })!;
      }
    }

    return job;
  }

  /**
   * Generates download result URL for completed jobs
   */
  public async getJobResultUrl(jobId: string): Promise<{
    url?: string;
    expiresAt?: string;
    error?: { code: string; message: string };
  }> {
    const job = await this.getJob(jobId);
    if (!job) {
      return { error: { code: 'JOB_NOT_FOUND', message: `Job ${jobId} not found.` } };
    }

    if (job.status !== 'COMPLETED') {
      return {
        error: {
          code: 'JOB_NOT_READY',
          message: `Job is currently in state '${job.status}'. Output is not ready for download.`,
        },
      };
    }

    if (!job.outputStorageKey) {
      return { error: { code: 'OUTPUT_MISSING', message: 'No output key found for this job.' } };
    }

    const provider = storageManager.getProvider(job.storageProvider as B2ProviderId);
    try {
      const signedUrl = await provider.getSignedDownloadUrl(job.outputStorageKey, 600); // 10 minutes
      return {
        url: signedUrl,
        expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
      };
    } catch (err: any) {
      return {
        error: { code: 'STORAGE_ERROR', message: `Could not generate download URL: ${err?.message}` },
      };
    }
  }

  /**
   * Deletes a job and cancels processing
   */
  public async deleteJob(jobId: string): Promise<boolean> {
    const job = jobStore.get(jobId);
    if (!job) return false;

    if (processorAdapter.isConfigured && (job.status === 'QUEUED' || job.status === 'PROCESSING')) {
      await processorAdapter.cancelJob(jobId);
    }

    jobStore.update(jobId, { status: 'CLEANUP_PENDING' });
    return true;
  }
}

export const jobService = new JobService();
