/**
 * PRA PDF — Processing Server API Router
 * A PRAVERSE Company
 * Handles /internal/v1/... endpoints with authentication, B2 IO, and real PDF engine execution.
 * Full execution for all 30 canonical document services.
 */

import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { PROCESSOR_CONFIG } from './config';
import { procLogger } from './logger';
import { verifyProcessorAuth } from './auth';
import { workspaceManager } from './workspace';
import { PdfValidator } from './validator';
import {
  processCompressPdf,
  processJpgToPdf,
  processPngToPdf,
  processImagesToPdf,
  processPdfToJpg,
  processPdfToPng,
  processMergePdf,
  processSplitPdf,
  processOrganizePdf,
  processDeletePdfPages,
  processExtractPdfPages,
  processRotatePdf,
  processCropPdf,
  processTxtToPdf,
  processMarkdownToPdf,
  processHtmlToPdf,
  processPdfToMarkdown,
  processExtractPdfText,
  processWordToPdf,
  processExcelToPdf,
  processPowerpointToPdf,
  processPdfToWord,
  processRtfConversion,
  processOcrPdf,
  processAddPageNumbers,
  processWatermarkPdf,
  processProtectPdf,
  processUnlockPdf,
  processEditPdfMetadata,
  processFullPdfEditing,
} from './engines';
import { storageManager } from '../server/storage/storageManager';
import { B2ProviderId } from '../server/config';

function getMimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.zip':
      return 'application/zip';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt':
      return 'text/plain';
    case '.md':
      return 'text/markdown';
    case '.rtf':
      return 'application/rtf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

export const ALL_SUPPORTED_SERVICES = [
  'jpg-to-pdf',
  'png-to-pdf',
  'images-to-pdf',
  'word-to-pdf',
  'excel-to-pdf',
  'powerpoint-to-pdf',
  'html-to-pdf',
  'txt-to-pdf',
  'markdown-to-pdf',
  'pdf-to-jpg',
  'pdf-to-png',
  'pdf-to-markdown',
  'pdf-to-word',
  'merge-pdf',
  'split-pdf',
  'organize-pdf',
  'organize-pdf-pages',
  'delete-pdf-pages',
  'extract-pdf-pages',
  'rotate-pdf',
  'crop-pdf',
  'compress-pdf',
  'ocr-pdf',
  'add-page-numbers',
  'watermark-pdf',
  'full-pdf-editing',
  'editor',
  'password-protect-pdf',
  'protect-pdf',
  'unlock-pdf',
  'edit-pdf-metadata',
  'extract-pdf-text',
  'rtf-conversion',
];

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
          supportedServices: ALL_SUPPORTED_SERVICES,
          serviceCount: ALL_SUPPORTED_SERVICES.length,
          maxFileSizeMb: PROCESSOR_CONFIG.maxFileSizeMb,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Services registry
      if (method === 'GET' && pathname === '/internal/v1/services') {
        const servicesList = ALL_SUPPORTED_SERVICES.map((id) => ({
          serviceId: id,
          status: 'AVAILABLE',
        }));
        this.sendJson(res, 200, {
          ok: true,
          total: servicesList.length,
          services: servicesList,
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

    const { jobId, serviceId, inputStorageKey, outputStorageKey, storageProvider, options } = payload;
    const providerId: B2ProviderId = storageProvider || 'B2_2';

    if (!jobId || !serviceId || !inputStorageKey || !outputStorageKey) {
      this.sendJson(res, 400, {
        ok: false,
        errorCode: 'PROCESSOR_BAD_REQUEST',
        message: 'Missing required parameters: jobId, serviceId, inputStorageKey, outputStorageKey.',
      });
      return;
    }

    if (!ALL_SUPPORTED_SERVICES.includes(serviceId)) {
      this.sendJson(res, 400, {
        ok: false,
        errorCode: 'SERVICE_UNSUPPORTED',
        message: `Service '${serviceId}' is not yet implemented on the processing engine.`,
      });
      return;
    }

    let workspace: { dir: string; inputPath: string; outputPath: string } | null = null;

    try {
      // 1. Prepare isolated workspace with appropriate file extensions
      const inputExt = path.extname(inputStorageKey) || '.pdf';
      const outputExt = path.extname(outputStorageKey) || '.pdf';
      workspace = workspaceManager.prepareWorkspace(jobId, inputExt, outputExt);

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

      // 3. Validate input format & size
      const inputValidation = PdfValidator.validateInput(inputBuffer, serviceId);
      if (!inputValidation.valid) {
        const statusCode = inputValidation.errorCode === 'FILE_TOO_LARGE' ? 413 : 400;
        this.sendJson(res, statusCode, {
          ok: false,
          errorCode: inputValidation.errorCode,
          message: inputValidation.errorMessage,
        });
        return;
      }

      // Write input to workspace
      fs.writeFileSync(workspace.inputPath, inputBuffer);

      // 4. Execute Real Dedicated Engine
      let engineResult: any;
      switch (serviceId) {
        case 'compress-pdf':
          engineResult = await processCompressPdf(workspace.inputPath, workspace.outputPath, jobId);
          break;
        case 'jpg-to-pdf':
          engineResult = await processJpgToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'png-to-pdf':
          engineResult = await processPngToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'images-to-pdf':
          engineResult = await processImagesToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'pdf-to-jpg':
          engineResult = await processPdfToJpg(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'pdf-to-png':
          engineResult = await processPdfToPng(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'merge-pdf':
          engineResult = await processMergePdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'split-pdf':
          engineResult = await processSplitPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'organize-pdf':
        case 'organize-pdf-pages':
          engineResult = await processOrganizePdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'delete-pdf-pages':
          engineResult = await processDeletePdfPages(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'extract-pdf-pages':
          engineResult = await processExtractPdfPages(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'rotate-pdf':
          engineResult = await processRotatePdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'crop-pdf':
          engineResult = await processCropPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'txt-to-pdf':
          engineResult = await processTxtToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'markdown-to-pdf':
          engineResult = await processMarkdownToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'html-to-pdf':
          engineResult = await processHtmlToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'pdf-to-markdown':
          engineResult = await processPdfToMarkdown(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'extract-pdf-text':
          engineResult = await processExtractPdfText(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'word-to-pdf':
          engineResult = await processWordToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'excel-to-pdf':
          engineResult = await processExcelToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'powerpoint-to-pdf':
          engineResult = await processPowerpointToPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'pdf-to-word':
          engineResult = await processPdfToWord(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'rtf-conversion':
          engineResult = await processRtfConversion(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'ocr-pdf':
          engineResult = await processOcrPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'add-page-numbers':
          engineResult = await processAddPageNumbers(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'watermark-pdf':
          engineResult = await processWatermarkPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'password-protect-pdf':
        case 'protect-pdf':
          engineResult = await processProtectPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'unlock-pdf':
          engineResult = await processUnlockPdf(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'edit-pdf-metadata':
          engineResult = await processEditPdfMetadata(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        case 'full-pdf-editing':
        case 'editor':
          engineResult = await processFullPdfEditing(workspace.inputPath, workspace.outputPath, jobId, options);
          break;
        default:
          throw new Error(`Unhandled service: ${serviceId}`);
      }

      // 5. Validate Output File
      const outputValidation = await PdfValidator.validateOutputFile(workspace.outputPath, serviceId);
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
      const outputMimeType = getMimeTypeForPath(workspace.outputPath);

      procLogger.info('PROCESSOR_B2_UPLOAD_STARTED', {
        jobId,
        outputStorageKey,
        sizeBytes: outputBuffer.length,
        mimeType: outputMimeType,
      });

      await b2Client.upload(outputStorageKey, outputBuffer, outputMimeType);

      const durationMs = Date.now() - startTime;
      procLogger.info('PROCESSOR_JOB_COMPLETED', {
        jobId,
        serviceId,
        durationMs,
        inputSize: engineResult.inputSizeBytes,
        outputSize: engineResult.outputSizeBytes,
      });

      // 7. Success Response
      this.sendJson(res, 200, {
        ok: true,
        jobId,
        status: 'COMPLETED',
        serviceId,
        output: {
          storageProvider: providerId,
          storageKey: outputStorageKey,
          sizeBytes: engineResult.outputSizeBytes,
          sha256: engineResult.sha256,
          pageCount: engineResult.pageCount,
          imageCount: engineResult.imageCount,
          reductionBytes: engineResult.reductionBytes,
          reductionPercentage: engineResult.reductionPercentage,
        },
        processingTimeMs: durationMs,
      });
    } catch (err: any) {
      procLogger.error('PROCESSOR_EXECUTION_FAILED', { jobId, error: err?.message });
      this.sendJson(res, 500, {
        ok: false,
        errorCode: 'PROCESSING_FAILED',
        message: err?.message || 'Processing engine execution failure.',
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
