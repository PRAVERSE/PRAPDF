/**
 * PRA PDF — Processing Server Adapter Client
 * A PRAVERSE Company
 * Communicates with the external dedicated PDF heavy processing server (PROCESSOR_BASE_URL).
 * If PROCESSOR_BASE_URL is unconfigured, truthfully reports PROCESSOR_UNAVAILABLE.
 * Never fakes processing execution or success.
 */

import { CONFIG } from '../config';
import { logger } from '../logger';

export interface ProcessorJobPayload {
  jobId: string;
  serviceId: string;
  inputStorageKey: string;
  outputStorageKey: string;
  originalFilename: string;
  options?: Record<string, any>;
}

export interface ProcessorJobStatusResponse {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputStorageKey?: string;
  outputSize?: number;
  error?: string;
  processingTimeMs?: number;
}

export class ProcessorAdapter {
  private baseUrl: string;
  public readonly isConfigured: boolean;

  constructor() {
    this.baseUrl = CONFIG.processor.baseUrl.replace(/\/+$/, '');
    this.isConfigured = CONFIG.processor.isConfigured;
  }

  /**
   * Submits a processing job to the dedicated processing engine
   */
  public async submitJob(payload: ProcessorJobPayload): Promise<{
    accepted: boolean;
    status: 'QUEUED' | 'PROCESSOR_UNAVAILABLE';
    message?: string;
  }> {
    if (!this.isConfigured) {
      logger.warn('PROCESSOR_SUBMISSION_UNAVAILABLE', {
        jobId: payload.jobId,
        serviceId: payload.serviceId,
        reason: 'PROCESSOR_BASE_URL_NOT_CONFIGURED',
      });
      return {
        accepted: false,
        status: 'PROCESSOR_UNAVAILABLE',
        message: 'Processing server is not configured (PROCESSOR_BASE_URL is empty). Real processing engine required.',
      };
    }

    logger.info('PROCESSOR_SUBMITTED', {
      jobId: payload.jobId,
      serviceId: payload.serviceId,
      inputKey: payload.inputStorageKey,
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000), // 15s handshake timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PROCESSOR_SUBMISSION_REJECTED', {
          jobId: payload.jobId,
          statusCode: response.status,
          error: errorText,
        });
        return {
          accepted: false,
          status: 'PROCESSOR_UNAVAILABLE',
          message: `Processor returned HTTP ${response.status}: ${errorText}`,
        };
      }

      const resData = await response.json();
      return {
        accepted: true,
        status: 'QUEUED',
        message: resData.message || 'Job queued on processing engine',
      };
    } catch (err: any) {
      logger.error('PROCESSOR_SUBMISSION_NETWORK_ERROR', {
        jobId: payload.jobId,
        error: err?.message,
      });
      return {
        accepted: false,
        status: 'PROCESSOR_UNAVAILABLE',
        message: `Failed to contact processing server: ${err?.message}`,
      };
    }
  }

  /**
   * Queries status of an active job on processing engine
   */
  public async checkStatus(jobId: string): Promise<ProcessorJobStatusResponse | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}/status`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;
      return (await response.json()) as ProcessorJobStatusResponse;
    } catch (err: any) {
      logger.warn('PROCESSOR_CHECK_STATUS_ERROR', { jobId, error: err?.message });
      return null;
    }
  }

  /**
   * Requests cancellation of a job on processing engine
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    if (!this.isConfigured) return true;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const processorAdapter = new ProcessorAdapter();
