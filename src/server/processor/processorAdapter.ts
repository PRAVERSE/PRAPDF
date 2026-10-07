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
  storageProvider?: string;
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

export interface SubmitJobResult {
  accepted: boolean;
  status: 'COMPLETED' | 'QUEUED' | 'PROCESSOR_UNAVAILABLE';
  outputStorageKey?: string;
  outputSize?: number;
  outputSha256?: string;
  processingTimeMs?: number;
  message?: string;
}

export class ProcessorAdapter {
  private baseUrl: string;
  private sharedSecret: string;
  public readonly isConfigured: boolean;

  constructor() {
    this.baseUrl = CONFIG.processor.baseUrl.replace(/\/+$/, '');
    this.sharedSecret = CONFIG.processor.sharedSecret;
    this.isConfigured = CONFIG.processor.isConfigured;
  }

  /**
   * Submits a processing job to the dedicated processing engine
   */
  public async submitJob(payload: ProcessorJobPayload): Promise<SubmitJobResult> {
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.sharedSecret) {
        headers['Authorization'] = `Bearer ${this.sharedSecret}`;
      }

      const response = await fetch(`${this.baseUrl}/internal/v1/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30s timeout
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

      const resData: any = await response.json();

      if (resData.ok && resData.status === 'COMPLETED') {
        return {
          accepted: true,
          status: 'COMPLETED',
          outputStorageKey: resData.output?.storageKey,
          outputSize: resData.output?.sizeBytes,
          outputSha256: resData.output?.sha256,
          processingTimeMs: resData.processingTimeMs,
          message: 'Job completed by processing engine',
        };
      }

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
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (this.sharedSecret) {
        headers['Authorization'] = `Bearer ${this.sharedSecret}`;
      }

      const response = await fetch(`${this.baseUrl}/internal/v1/jobs/${encodeURIComponent(jobId)}/status`, {
        method: 'GET',
        headers,
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
      const headers: Record<string, string> = {};
      if (this.sharedSecret) {
        headers['Authorization'] = `Bearer ${this.sharedSecret}`;
      }

      const response = await fetch(`${this.baseUrl}/internal/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const processorAdapter = new ProcessorAdapter();
