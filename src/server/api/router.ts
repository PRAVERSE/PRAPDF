/**
 * PRA PDF — Versioned API Router (/api/v1/...)
 * A PRAVERSE Company
 * Dispatches endpoints with consistent JSON envelope, error reporting, and CORS.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { CONFIG } from '../config';
import { getAllServices, getServiceById } from '../servicesRegistry';
import { jobService } from '../jobs/jobService';
import { jobStore } from '../jobs/jobStore';
import { storageManager } from '../storage/storageManager';
import { UploadParser } from './multipartParser';
import { SecurityValidator } from '../security/validation';
import { logger } from '../logger';

export class ApiRouter {
  public static async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 1. CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-service-id, x-filename, x-original-filename');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method || 'GET';

    // Upfront strict Content-Length 50 MB verification
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > CONFIG.maxFileSizeBytes) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Payload too large. File exceeds the 50 MB maximum limit (${(contentLength / (1024 * 1024)).toFixed(2)} MB received).`,
          },
          maxAllowedBytes: CONFIG.maxFileSizeBytes,
          maxFileLimit: '50 MB',
          message: `Payload too large. File exceeds the 50 MB maximum limit (${(contentLength / (1024 * 1024)).toFixed(2)} MB received).`,
        })
      );
      return;
    }

    try {
      // Endpoint 1: Health check (/api/v1/health & legacy /api/health)
      if (pathname === '/api/v1/health' || pathname === '/api/health') {
        this.sendJson(res, 200, {
          success: true,
          status: 'healthy',
          product: 'PRA PDF',
          company: 'A PRAVERSE Company',
          version: '1.0.0',
          maxFileLimit: '50 MB',
          maxFileSizeMb: CONFIG.maxFileSizeMb,
          maxFileSizeBytes: CONFIG.maxFileSizeBytes,
          zeroAI: true,
          storageProviders: storageManager.getProvidersStatus(),
          telegramConfigured: CONFIG.telegram.isConfigured,
          processorConfigured: CONFIG.processor.isConfigured,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Endpoint 2: 30 Services Registry (/api/v1/services)
      if (method === 'GET' && pathname === '/api/v1/services') {
        const services = getAllServices();
        this.sendJson(res, 200, {
          success: true,
          total: services.length,
          services,
        });
        return;
      }

      // Endpoint 3: Create & Submit Job (/api/v1/jobs & legacy /api/upload)
      if (method === 'POST' && (pathname === '/api/v1/jobs' || pathname === '/api/upload')) {
        await this.handleCreateJob(req, res);
        return;
      }

      // Endpoint 4 & 5 & 6: Job operations (/api/v1/jobs/:jobId[...])
      const jobRouteMatch = pathname.match(/^\/api\/v1\/jobs\/([a-zA-Z0-9_\-]+)(\/result)?$/);
      if (jobRouteMatch) {
        const jobId = jobRouteMatch[1];
        const isResultSubpath = Boolean(jobRouteMatch[2]);

        if (!SecurityValidator.validateJobId(jobId)) {
          this.sendError(res, 400, 'INVALID_JOB_ID', `Invalid job ID format: ${jobId}`);
          return;
        }

        if (method === 'GET' && isResultSubpath) {
          await this.handleGetJobResult(jobId, res);
          return;
        }

        if (method === 'GET') {
          await this.handleGetJobStatus(jobId, res);
          return;
        }

        if (method === 'DELETE') {
          await this.handleDeleteJob(jobId, res);
          return;
        }
      }

      // 404 Not Found fallback
      this.sendError(res, 404, 'NOT_FOUND', `Endpoint not found: ${method} ${pathname}`);
    } catch (err: any) {
      logger.error('API_UNHANDLED_ERROR', { error: err?.message, pathname, method });
      this.sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected server error occurred.');
    }
  }

  /**
   * Handles POST /api/v1/jobs
   */
  private static async handleCreateJob(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const parsed = await UploadParser.parse(req);

      const result = await jobService.createAndProcessJob(
        {
          serviceId: parsed.serviceId,
          originalFilename: parsed.originalFilename,
          inputSize: parsed.fileBuffer.length,
          mimeType: parsed.mimeType,
          options: parsed.options,
        },
        parsed.fileBuffer
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'FILE_TOO_LARGE'
            ? 413
            : result.error?.code === 'PROCESSOR_UNAVAILABLE'
            ? 503
            : 400;

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            jobId: result.job?.jobId,
            status: result.job?.status,
            error: {
              code: result.error?.code || 'JOB_CREATION_FAILED',
              message: result.error?.message || 'Failed to initialize processing job.',
            },
          })
        );
        return;
      }

      this.sendJson(res, 201, {
        success: true,
        jobId: result.job.jobId,
        serviceId: result.job.serviceId,
        originalFilename: result.job.originalFilename,
        status: result.job.status,
        inputSize: result.job.inputSize,
        createdAt: result.job.createdAt,
      });
    } catch (err: any) {
      if (err?.code === 'FILE_TOO_LARGE') {
        this.sendError(
          res,
          413,
          'FILE_TOO_LARGE',
          `Maximum file size is ${CONFIG.maxFileSizeMb} MB.`
        );
        return;
      }

      if (err?.code === 'EMPTY_FILE') {
        this.sendError(res, 400, 'EMPTY_FILE', 'The uploaded file is empty or missing.');
        return;
      }

      this.sendError(res, 400, 'UPLOAD_ERROR', err?.message || 'Failed to process file upload.');
    }
  }

  /**
   * Handles GET /api/v1/jobs/:jobId
   */
  private static async handleGetJobStatus(jobId: string, res: ServerResponse): Promise<void> {
    const job = await jobService.getJob(jobId);
    if (!job) {
      this.sendError(res, 404, 'JOB_NOT_FOUND', `Job with ID '${jobId}' was not found.`);
      return;
    }

    this.sendJson(res, 200, {
      success: true,
      job: {
        jobId: job.jobId,
        serviceId: job.serviceId,
        originalFilename: job.originalFilename,
        inputSize: job.inputSize,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        expiresAt: job.expiresAt,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
      },
    });
  }

  /**
   * Handles GET /api/v1/jobs/:jobId/result
   */
  private static async handleGetJobResult(jobId: string, res: ServerResponse): Promise<void> {
    const result = await jobService.getJobResultUrl(jobId);
    if (result.error) {
      const statusCode = result.error.code === 'JOB_NOT_FOUND' ? 404 : 400;
      this.sendError(res, statusCode, result.error.code, result.error.message);
      return;
    }

    this.sendJson(res, 200, {
      success: true,
      jobId,
      downloadUrl: result.url,
      expiresAt: result.expiresAt,
    });
  }

  /**
   * Handles DELETE /api/v1/jobs/:jobId
   */
  private static async handleDeleteJob(jobId: string, res: ServerResponse): Promise<void> {
    const deleted = await jobService.deleteJob(jobId);
    if (!deleted) {
      this.sendError(res, 404, 'JOB_NOT_FOUND', `Job with ID '${jobId}' was not found.`);
      return;
    }

    this.sendJson(res, 200, {
      success: true,
      jobId,
      message: 'Job cancelled and scheduled for cleanup.',
    });
  }

  private static sendJson(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private static sendError(
    res: ServerResponse,
    statusCode: number,
    code: string,
    message: string
  ): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        error: {
          code,
          message,
        },
      })
    );
  }
}
