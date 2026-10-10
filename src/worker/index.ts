/**
 * PRA PDF — Cloudflare Worker Entrypoint (Phase 3A Production Processing)
 * A PRAVERSE Company
 *
 * Implements:
 * 1. Production Worker processing route: POST /api/v1/cf/process (First service: jpg-to-pdf)
 * 2. Production Health route: GET /api/v1/cf/health
 * 3. Safe structured telemetry (zero credential / zero content logging)
 * 4. Backward-compatible prototype routes under /api/cf-test/*
 * 5. Passes all other requests to env.ASSETS for SPA static asset delivery.
 */

import {
  SUPPORTED_WORKER_SERVICES,
  WorkerServiceName,
  executeWorkerService,
  uint8ArrayToBase64,
  base64ToUint8Array,
  WorkerJobResponse,
} from './cfProcessor';
import { processJpgToPdfWorker } from './engines/jpgToPdf';

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With',
};

const MAX_UPLOAD_BYTES = 52428800; // 50 MB strict limit

function jsonResponse(data: any, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Safe Structured Telemetry Logger
 * Logs only operational metrics. NEVER logs file contents, secrets, B2/Telegram keys, or user data.
 */
function logSafeTelemetry(data: {
  requestId: string;
  service: string;
  inputSizeBytes: number;
  durationMs: number;
  success: boolean;
  statusCode: number;
  errorCode?: string;
}) {
  const telemetryRecord = {
    timestamp: new Date().toISOString(),
    level: data.success ? 'info' : 'error',
    context: 'WORKER_PRODUCTION_PIPELINE',
    requestId: data.requestId,
    service: data.service,
    inputSizeBytes: data.inputSizeBytes,
    durationMs: data.durationMs,
    success: data.success,
    statusCode: data.statusCode,
    ...(data.errorCode ? { errorCode: data.errorCode } : {}),
  };

  if (data.success) {
    console.log(JSON.stringify(telemetryRecord));
  } else {
    console.error(JSON.stringify(telemetryRecord));
  }
}

export const ACTIVE_PRODUCTION_SERVICES: WorkerServiceName[] = [
  'jpg-to-pdf',
  'png-to-pdf',
  'rotate-pdf',
  'crop-pdf',
  'organize-pdf',
  'delete-pdf-pages',
  'extract-pdf-pages',
  'edit-pdf-metadata',
  'extract-pdf-text',
  'add-page-numbers',
  'merge-pdf',
  'split-pdf',
  // Wave 1 Easiest Services
  'delete-pdf-annotations',
  'flip-pdf',
  'split-pdf-in-half',
  'alternate-mix-pdf',
  'n-up-pdf',
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // =========================================================================
    // 1. PRODUCTION HEALTH ROUTE: GET /api/v1/cf/health
    // =========================================================================
    if (
      (url.pathname === '/api/v1/cf/health' ||
        url.pathname === '/api/v1/health' ||
        url.pathname === '/api/health') &&
      request.method === 'GET'
    ) {
      return jsonResponse({
        status: 'healthy',
        runtime: 'Cloudflare Worker (workerd)',
        version: '1.1.0',
        phase: 'Phase 3B Controlled Production Migration',
        activeProductionServices: ACTIVE_PRODUCTION_SERVICES,
        maxUploadBytes: MAX_UPLOAD_BYTES,
        maxUploadMb: 50,
      });
    }

    // =========================================================================
    // 2. PRODUCTION WORKER PROCESSING ROUTE: POST /api/v1/cf/process
    // =========================================================================
    if (url.pathname === '/api/v1/cf/process' && request.method === 'POST') {
      const startTime = performance.now();
      const requestId = crypto.randomUUID();
      let serviceName: string = '';
      let inputSizeBytes = 0;

      // Quick Content-Length check if available
      const contentLengthHeader = request.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredLen = parseInt(contentLengthHeader, 10);
        if (declaredLen > MAX_UPLOAD_BYTES) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: 'unknown',
            inputSizeBytes: declaredLen,
            durationMs,
            success: false,
            statusCode: 413,
            errorCode: 'PAYLOAD_TOO_LARGE',
          });
          return jsonResponse(
            {
              success: false,
              requestId,
              errorCode: 'PAYLOAD_TOO_LARGE',
              message: `Upload exceeds the 50 MB maximum limit (${(declaredLen / (1024 * 1024)).toFixed(2)} MB declared).`,
              maxAllowedBytes: MAX_UPLOAD_BYTES,
            },
            413
          );
        }
      }

      try {
        let inputBuffer: Uint8Array | null = null;
        let inputBuffers: Uint8Array[] | null = null;
        let options: any = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          serviceName = (formData.get('service') as string) || '';

          // Look for 'files' array first, fallback to 'file'
          const rawFiles = formData.getAll('files').length > 0
            ? formData.getAll('files')
            : formData.getAll('file');

          if (rawFiles.length > 0) {
            const buffers: Uint8Array[] = [];
            for (const item of rawFiles) {
              if (item && typeof item === 'object' && 'arrayBuffer' in item) {
                const ab = await (item as File).arrayBuffer();
                buffers.push(new Uint8Array(ab));
              }
            }
            if (buffers.length > 0) {
              inputBuffers = buffers;
              inputBuffer = buffers[0];
            }
          }

          const rawOptions = formData.get('options');
          if (rawOptions && typeof rawOptions === 'string') {
            try {
              options = JSON.parse(rawOptions);
            } catch {
              options = {};
            }
          }
        } else if (contentType.includes('application/json')) {
          const body = (await request.json()) as any;
          serviceName = body.service || '';
          options = body.options || {};

          if (Array.isArray(body.filesBase64) && body.filesBase64.length > 0) {
            const bufs = body.filesBase64.map((b64: string) => base64ToUint8Array(b64));
            inputBuffers = bufs;
            inputBuffer = bufs[0];
          } else if (body.fileBase64 && typeof body.fileBase64 === 'string') {
            inputBuffer = base64ToUint8Array(body.fileBase64);
            inputBuffers = [inputBuffer];
          }
        } else {
          // Direct binary stream with query param
          serviceName = url.searchParams.get('service') || '';
          const ab = await request.arrayBuffer();
          if (ab.byteLength > 0) {
            inputBuffer = new Uint8Array(ab);
            inputBuffers = [inputBuffer];
          }
        }

        const totalPayloadBytes = inputBuffers && inputBuffers.length > 0
          ? inputBuffers.reduce((sum, b) => sum + b.length, 0)
          : inputBuffer ? inputBuffer.length : 0;
        inputSizeBytes = totalPayloadBytes;

        // Security Validation 1: Service ID
        if (!serviceName) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: 'missing',
            inputSizeBytes,
            durationMs,
            success: false,
            statusCode: 400,
            errorCode: 'MISSING_SERVICE',
          });
          return jsonResponse(
            {
              success: false,
              requestId,
              errorCode: 'MISSING_SERVICE',
              message: 'Service identifier is required.',
            },
            400
          );
        }

        // Security Validation 2: Phase 3B restricts production route to the 6 whitelisted services
        if (!ACTIVE_PRODUCTION_SERVICES.includes(serviceName as WorkerServiceName)) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: serviceName,
            inputSizeBytes,
            durationMs,
            success: false,
            statusCode: 400,
            errorCode: 'UNSUPPORTED_SERVICE',
          });
          return jsonResponse(
            {
              success: false,
              requestId,
              service: serviceName,
              errorCode: 'UNSUPPORTED_SERVICE',
              message: `Service '${serviceName}' is not enabled for production Worker processing in Phase 3B. Active services: ${ACTIVE_PRODUCTION_SERVICES.join(', ')}.`,
            },
            400
          );
        }

        // Security Validation 3: Non-empty payload
        if ((!inputBuffers || inputBuffers.length === 0) && (!inputBuffer || inputBuffer.length === 0)) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: serviceName,
            inputSizeBytes: 0,
            durationMs,
            success: false,
            statusCode: 400,
            errorCode: 'EMPTY_PAYLOAD',
          });
          return jsonResponse(
            {
              success: false,
              requestId,
              service: serviceName,
              errorCode: 'EMPTY_PAYLOAD',
              message: 'No file data received in request.',
            },
            400
          );
        }

        // Security Validation 4: Strict 50 MB check on total actual buffer length
        if (totalPayloadBytes > MAX_UPLOAD_BYTES) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: serviceName,
            inputSizeBytes: totalPayloadBytes,
            durationMs,
            success: false,
            statusCode: 413,
            errorCode: 'PAYLOAD_TOO_LARGE',
          });
          return jsonResponse(
            {
              success: false,
              requestId,
              service: serviceName,
              errorCode: 'PAYLOAD_TOO_LARGE',
              message: `Payload exceeds maximum allowed size of 50 MB (${(totalPayloadBytes / (1024 * 1024)).toFixed(2)} MB received).`,
              maxAllowedBytes: MAX_UPLOAD_BYTES,
            },
            413
          );
        }

        // Security Validation 5: Magic byte signature verification by service
        let fileTypeValid = true;
        let expectedTypeMsg = '';

        if (serviceName === 'jpg-to-pdf') {
          const toCheck = inputBuffers && inputBuffers.length > 0 ? inputBuffers : (inputBuffer ? [inputBuffer] : []);
          fileTypeValid =
            toCheck.length > 0 &&
            toCheck.every((b) => b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff);
          expectedTypeMsg = 'Invalid file format. Only JPEG images are supported for jpg-to-pdf.';
        } else if (serviceName === 'png-to-pdf') {
          const toCheck = inputBuffers && inputBuffers.length > 0 ? inputBuffers : (inputBuffer ? [inputBuffer] : []);
          fileTypeValid =
            toCheck.length > 0 &&
            toCheck.every(
              (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
            );
          expectedTypeMsg = 'Invalid file format. Only PNG images are supported for png-to-pdf.';
        } else if (serviceName === 'merge-pdf' || serviceName === 'alternate-mix-pdf') {
          const toCheck = inputBuffers && inputBuffers.length > 0 ? inputBuffers : (inputBuffer ? [inputBuffer] : []);
          fileTypeValid =
            toCheck.length > 0 &&
            toCheck.every((b) => {
              if (b.length < 4) return false;
              const isPdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
              const isZip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
              return isPdf || isZip;
            });
          expectedTypeMsg = `Invalid file format. Only valid PDF files (%PDF) are supported for ${serviceName}.`;
        } else if (
          [
            'rotate-pdf',
            'crop-pdf',
            'organize-pdf',
            'delete-pdf-pages',
            'extract-pdf-pages',
            'edit-pdf-metadata',
            'extract-pdf-text',
            'add-page-numbers',
            'split-pdf',
            'delete-pdf-annotations',
            'flip-pdf',
            'split-pdf-in-half',
            'n-up-pdf',
          ].includes(serviceName)
        ) {
          fileTypeValid =
            inputBuffer !== null &&
            inputBuffer.length >= 5 &&
            inputBuffer[0] === 0x25 &&
            inputBuffer[1] === 0x50 &&
            inputBuffer[2] === 0x44 &&
            inputBuffer[3] === 0x46;
          expectedTypeMsg = `Invalid file format. Only valid PDF documents (%PDF) are supported for ${serviceName}.`;
        }

        if (!fileTypeValid) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: serviceName,
            inputSizeBytes: totalPayloadBytes,
            durationMs,
            success: false,
            statusCode: 400,
            errorCode: 'INVALID_FILE_TYPE',
          });
          return jsonResponse(
            {
              success: false,
              requestId,
              service: serviceName,
              errorCode: 'INVALID_FILE_TYPE',
              message: expectedTypeMsg,
            },
            400
          );
        }

        // Execution: Pure in-memory Worker execution (Zero native deps, zero branding)
        const isMultiBufferService =
          serviceName === 'jpg-to-pdf' ||
          serviceName === 'png-to-pdf' ||
          serviceName === 'merge-pdf' ||
          serviceName === 'alternate-mix-pdf';

        const targetInput =
          isMultiBufferService && inputBuffers
            ? (inputBuffers.length === 1 && serviceName !== 'alternate-mix-pdf' && serviceName !== 'merge-pdf'
                ? inputBuffers[0]
                : inputBuffers)
            : inputBuffer!;

        const result = await executeWorkerService(
          serviceName as WorkerServiceName,
          targetInput as any,
          options
        );
        const durationMs = Math.round(performance.now() - startTime);

        logSafeTelemetry({
          requestId,
          service: serviceName,
          inputSizeBytes: totalPayloadBytes,
          durationMs,
          success: true,
          statusCode: 200,
        });

        // Binary response if requested
        if (
          url.searchParams.get('format') === 'binary' ||
          request.headers.get('Accept') === 'application/pdf'
        ) {
          return new Response(result.outputBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
              'Content-Type': result.mimeType || 'application/pdf',
              'Content-Disposition': `attachment; filename="${result.outputFileName}"`,
              'X-Request-Id': requestId,
              'X-Execution-Time-Ms': String(durationMs),
              ...CORS_HEADERS,
            },
          });
        }

        // Structured JSON response
        const outputBase64 = uint8ArrayToBase64(result.outputBuffer);
        return jsonResponse(
          {
            success: true,
            requestId,
            service: result.service,
            outputBase64,
            outputSizeBytes: result.outputBuffer.length,
            mimeType: result.mimeType,
            outputFileName: result.outputFileName,
            metadata: result.metadata,
            executionTimeMs: durationMs,
          },
          200,
          { 'X-Request-Id': requestId }
        );
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - startTime);
        logSafeTelemetry({
          requestId,
          service: serviceName || 'jpg-to-pdf',
          inputSizeBytes,
          durationMs,
          success: false,
          statusCode: 500,
          errorCode: 'PROCESSING_ERROR',
        });
        return jsonResponse(
          {
            success: false,
            requestId,
            service: serviceName || 'jpg-to-pdf',
            errorCode: 'PROCESSING_ERROR',
            message: err?.message || 'Internal document processing error.',
            executionTimeMs: durationMs,
          },
          500,
          { 'X-Request-Id': requestId }
        );
      }
    }

    // =========================================================================
    // 3. TESTING / PROTOTYPE ROUTES: /api/cf-test/* (Preserved for compatibility)
    // =========================================================================
    if (url.pathname === '/api/cf-test/health' && request.method === 'GET') {
      return jsonResponse({
        status: 'healthy',
        runtime: 'Cloudflare Worker (workerd)',
        phase: 'Phase 2 Complete Compatibility Test',
        supportedServices: SUPPORTED_WORKER_SERVICES,
        totalSupportedServices: SUPPORTED_WORKER_SERVICES.length,
        maxUploadBytes: MAX_UPLOAD_BYTES,
      });
    }

    if (url.pathname === '/api/cf-test/process' && request.method === 'POST') {
      const startTime = performance.now();
      let serviceName: string = '';

      try {
        let inputBuffer: Uint8Array | null = null;
        let inputBuffers: Uint8Array[] | null = null;
        let options: any = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          serviceName = (formData.get('service') as string) || '';
          const rawFiles = formData.getAll('files').length > 0
            ? formData.getAll('files')
            : formData.getAll('file');

          if (rawFiles.length > 0) {
            const buffers: Uint8Array[] = [];
            for (const item of rawFiles) {
              if (item && typeof item === 'object' && 'arrayBuffer' in item) {
                const ab = await (item as File).arrayBuffer();
                buffers.push(new Uint8Array(ab));
              }
            }
            if (buffers.length > 0) {
              inputBuffers = buffers;
              inputBuffer = buffers[0];
            }
          }

          const rawOptions = formData.get('options');
          if (rawOptions && typeof rawOptions === 'string') {
            try {
              options = JSON.parse(rawOptions);
            } catch {
              options = {};
            }
          }
        } else if (contentType.includes('application/json')) {
          const body = (await request.json()) as any;
          serviceName = body.service || '';
          options = body.options || {};

          if (Array.isArray(body.filesBase64) && body.filesBase64.length > 0) {
            const bufs = body.filesBase64.map((b64: string) => base64ToUint8Array(b64));
            inputBuffers = bufs;
            inputBuffer = bufs[0];
          } else if (body.fileBase64 && typeof body.fileBase64 === 'string') {
            inputBuffer = base64ToUint8Array(body.fileBase64);
            inputBuffers = [inputBuffer];
          }
        } else {
          serviceName = url.searchParams.get('service') || '';
          const ab = await request.arrayBuffer();
          if (ab.byteLength > 0) {
            inputBuffer = new Uint8Array(ab);
            inputBuffers = [inputBuffer];
          }
        }

        if (!serviceName) {
          return jsonResponse({ success: false, errorCode: 'MISSING_SERVICE', message: 'Service identifier is required.' }, 400);
        }

        if (!SUPPORTED_WORKER_SERVICES.includes(serviceName as WorkerServiceName)) {
          return jsonResponse({ success: false, service: serviceName, errorCode: 'UNSUPPORTED_SERVICE', message: `Service '${serviceName}' is not enabled in Worker prototype.` }, 400);
        }

        if ((!inputBuffers || inputBuffers.length === 0) && (!inputBuffer || inputBuffer.length === 0)) {
          return jsonResponse({ success: false, service: serviceName, errorCode: 'EMPTY_PAYLOAD', message: 'No file data received.' }, 400);
        }

        const targetInput =
          (serviceName === 'jpg-to-pdf' || serviceName === 'png-to-pdf') && inputBuffers
            ? (inputBuffers.length === 1 ? inputBuffers[0] : inputBuffers)
            : inputBuffer!;

        const result = await executeWorkerService(serviceName as WorkerServiceName, targetInput as any, options);
        const executionTimeMs = Math.round(performance.now() - startTime);

        if (url.searchParams.get('format') === 'binary' || request.headers.get('Accept') === 'application/pdf') {
          return new Response(result.outputBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
              'Content-Type': result.mimeType,
              'Content-Disposition': `attachment; filename="${result.outputFileName}"`,
              'X-Execution-Time-Ms': String(executionTimeMs),
              ...CORS_HEADERS,
            },
          });
        }

        const outputBase64 = uint8ArrayToBase64(result.outputBuffer);
        return jsonResponse({
          success: true,
          service: result.service,
          outputBase64,
          outputSizeBytes: result.outputBuffer.length,
          mimeType: result.mimeType,
          outputFileName: result.outputFileName,
          metadata: result.metadata,
          executionTimeMs,
        } as WorkerJobResponse, 200);
      } catch (err: any) {
        return jsonResponse({
          success: false,
          service: serviceName,
          errorCode: 'PROCESSING_ERROR',
          message: err?.message || 'Processing error',
          executionTimeMs: Math.round(performance.now() - startTime),
        } as WorkerJobResponse, 500);
      }
    }

    // =========================================================================
    // 4. STATIC ASSET SERVING: Pass-through to env.ASSETS (SPA Frontend)
    // =========================================================================
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
