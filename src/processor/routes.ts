/**
 * PRA PDF — Processing Server API Router
 * A PRAVERSE Company
 * Handles /internal/v1/... endpoints with authentication, B2 IO, and real PDF engine execution.
 */

import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import { PROCESSOR_CONFIG } from './config';
import { procLogger } from './logger';
import { verifyProcessorAuth } from './auth';
import { workspaceManager } from './workspace';
import { PdfValidator } from './validator';
import { processCompressPdf } from './engines/compressPdf';
import { storageManager } from '../server/storage/storageManager';
import { B2ProviderId } from '../server/config';

export class ProcessorRouter {
  public static async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const host = req.headers.host || '127.0.0.1';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method || 'GET';

    try {
      // 1. Health check (public / internal)
      if (method === 'GET' && (pathname === '/health' || pathname === '/internal/v1/health')) {
        this.sendJson(res, 200, {
          ok: true,
          service: 'pra-pdf-processor',
          status: 'healthy',
          version: '1.0.0',
          supportedServices: ['compress-pdf'],
          maxFileSizeMb: PROCESSOR_CONFIG.maxFileSizeMb,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Services registry
      if (method === 'GET' && pathname === '/internal/v1/services') {
        this.sendJson(res, 200, {
          ok: true,
          services: [
            {
              serviceId: 'compress-pdf',
              displayName: 'Compress PDF',
              category: 'optimize',
              status: 'AVAILABLE',
            },
          ],
        });
        return;
      }

      // Authentication required for processing routes
      const auth = verifyProcessorAuth(req);
      if (!auth.authorized) {
        procLogger.warn('PROCESSOR_AUTH_REJECTED', {
          pathname,
          errorCode: auth.errorCode,
        });
        this.sendJson(res, 401, {
          ok: false,
          errorCode: auth.errorCode || 'PROCESSOR_UNAUTHORIZED',
          message: auth.errorMessage || 'Unauthorized',
        });
        return;
      }

      // 3. Process execution (POST /internal/v1/process and POST /api/v1/process)
      if (method === 'POST' && (pathname === '/internal/v1/process' || pathname === '/api/v1/process')) {
        await this.handleProcessJob(req, res);
        return;
      }

      // 4. Job status (GET /internal/v1/jobs/:jobId/status)
      const statusMatch = pathname.match(/^\/internal\/v1\/jobs\/([a-zA-Z0-9_\-]+)\/status$/);
      if (method === 'GET' && statusMatch) {
        const jobId = statusMatch[1];
        this.sendJson(res, 200, {
          ok: true,
          jobId,
          status: 'COMPLETED',
        });
        return;
      }

      // 5. Job cancellation (POST /internal/v1/jobs/:jobId/cancel)
      const cancelMatch = pathname.match(/^\/internal\/v1\/jobs\/([a-zA-Z0-9_\-]+)\/cancel$/);
      if (method === 'POST' && cancelMatch) {
        const jobId = cancelMatch[1];
        workspaceManager.cleanupWorkspace(jobId);
        this.sendJson(res, 200, {
          ok: true,
          jobId,
          cancelled: true,
        });
        return;
      }

      // 404 Fallback
      this.sendJson(res, 404, {
        ok: false,
        errorCode: 'PROCESSOR_NOT_FOUND',
        message: `Endpoint ${method} ${pathname} not found on processing server.`,
      });
    } catch (err: any) {
      procLogger.error('PROCESSOR_UNHANDLED_ERROR', { error: err?.message, pathname });
      this.sendJson(res, 500, {
        ok: false,
        errorCode: 'INTERNAL_PROCESSOR_ERROR',
        message: 'An internal error occurred on the processing server.',
      });
    }
  }

  private static async handleProcessJob(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startTime = Date.now();
    let bodyData = '';

    for await (const chunk of req) {
      bodyData += chunk;
      if (bodyData.length > 5 * 1024 * 1024) {
        // Metadata payload shouldn't exceed 5MB
        this.sendJson(res, 413, {
          ok: false,
          errorCode: 'FILE_TOO_LARGE',
          message: 'Request payload too large.',
        });
        return;
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyData);
    } catch {
      this.sendJson(res, 400, {
        ok: false,
        errorCode: 'PROCESSOR_BAD_REQUEST',
        message: 'Malformed JSON payload.',
      });
      return;
    }

    const { jobId, serviceId, inputStorageKey, outputStorageKey, storageProvider } = payload;
    const providerId: B2ProviderId = storageProvider || 'B2_2';

    // Validate parameters
    if (!jobId || !serviceId || !inputStorageKey || !outputStorageKey) {
      this.sendJson(res, 400, {
        ok: false,
        errorCode: 'PROCESSOR_BAD_REQUEST',
        message: 'Missing required parameters: jobId, serviceId, inputStorageKey, outputStorageKey.',
      });
      return;
    }

    // Phase 1 constraint: only compress-pdf is supported
    if (serviceId !== 'compress-pdf') {
      this.sendJson(res, 400, {
        ok: false,
        errorCode: 'SERVICE_UNSUPPORTED',
        message: `Service '${serviceId}' is not yet implemented on the processing engine. Currently supported: ['compress-pdf'].`,
      });
      return;
    }

    let workspace: { dir: string; inputPath: string; outputPath: string } | null = null;

    try {
      // 1. Prepare isolated workspace
      workspace = workspaceManager.prepareWorkspace(jobId);

      // 2. Download original file from Backblaze B2
      procLogger.info('PROCESSOR_B2_DOWNLOAD_STARTED', { jobId, inputStorageKey, providerId });
      const b2Client = storageManager.getProvider(providerId);

      let inputBuffer: Buffer;
      try {
        inputBuffer = await b2Client.download(inputStorageKey);
      } catch (err: any) {
        procLogger.error('PROCESSOR_B2_DOWNLOAD_FAILED', { jobId, inputStorageKey, error: err?.message });
        this.sendJson(res, 404, {
          ok: false,
          errorCode: 'B2_DOWNLOAD_FAILED',
          message: `Failed to download input object from storage: ${err?.message}`,
        });
        return;
      }

      // 3. Validate input PDF
      const inputValidation = PdfValidator.validateInput(inputBuffer);
      if (!inputValidation.valid) {
        const statusCode = inputValidation.errorCode === 'FILE_TOO_LARGE' ? 413 : 400;
        this.sendJson(res, statusCode, {
          ok: false,
          errorCode: inputValidation.errorCode,
          message: inputValidation.errorMessage,
        });
        return;
      }

      // Write to workspace
      fs.writeFileSync(workspace.inputPath, inputBuffer);

      // 4. Execute Real PDF Compression Engine
      const compressResult = await processCompressPdf(
        workspace.inputPath,
        workspace.outputPath,
        jobId
      );

      // 5. Validate Output PDF
      const outputValidation = await PdfValidator.validateOutputFile(workspace.outputPath);
      if (!outputValidation.valid) {
        procLogger.error('PROCESSOR_OUTPUT_INVALID', { jobId, error: outputValidation.errorMessage });
        this.sendJson(res, 500, {
          ok: false,
          errorCode: outputValidation.errorCode || 'PROCESSING_OUTPUT_INVALID',
          message: outputValidation.errorMessage,
        });
        return;
      }

      // 6. Upload processed output to B2
      const outputBuffer = fs.readFileSync(workspace.outputPath);
      procLogger.info('PROCESSOR_B2_UPLOAD_STARTED', {
        jobId,
        outputStorageKey,
        sizeBytes: outputBuffer.length,
      });

      await b2Client.upload(outputStorageKey, outputBuffer, 'application/pdf');

      const durationMs = Date.now() - startTime;
      procLogger.info('PROCESSOR_JOB_COMPLETED', {
        jobId,
        serviceId,
        durationMs,
        inputSize: compressResult.inputSizeBytes,
        outputSize: compressResult.outputSizeBytes,
        reductionPercent: compressResult.reductionPercentage,
      });

      // 7. Success Response
      this.sendJson(res, 200, {
        ok: true,
        jobId,
        status: 'COMPLETED',
        serviceId: 'compress-pdf',
        output: {
          storageProvider: providerId,
          storageKey: outputStorageKey,
          sizeBytes: compressResult.outputSizeBytes,
          sha256: compressResult.sha256,
          reductionBytes: compressResult.reductionBytes,
          reductionPercentage: compressResult.reductionPercentage,
        },
        processingTimeMs: durationMs,
      });
    } catch (err: any) {
      procLogger.error('PROCESSOR_EXECUTION_FAILED', { jobId, error: err?.message });
      this.sendJson(res, 500, {
        ok: false,
        errorCode: 'PDF_PROCESSING_FAILED',
        message: err?.message || 'PDF processing engine failure.',
      });
    } finally {
      // 8. Guaranteed temporary workspace cleanup
      if (workspace) {
        workspaceManager.cleanupWorkspace(jobId);
      }
    }
  }

  private static sendJson(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}
