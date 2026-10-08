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
    if (url.pathname === '/api/v1/cf/health' && request.method === 'GET') {
      return jsonResponse({
        status: 'healthy',
        runtime: 'Cloudflare Worker (workerd)',
        version: '1.0.0',
        phase: 'Phase 3A Controlled Production Migration',
        activeProductionServices: ['jpg-to-pdf'],
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
        let options: any = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          serviceName = (formData.get('service') as string) || '';
          const file = formData.get('file');

          if (file && typeof file === 'object' && 'arrayBuffer' in file) {
            const ab = await (file as File).arrayBuffer();
            inputBuffer = new Uint8Array(ab);
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

          if (body.fileBase64 && typeof body.fileBase64 === 'string') {
            inputBuffer = base64ToUint8Array(body.fileBase64);
          }
        } else {
          // Direct binary stream with query param
          serviceName = url.searchParams.get('service') || '';
          const ab = await request.arrayBuffer();
          if (ab.byteLength > 0) {
            inputBuffer = new Uint8Array(ab);
          }
        }

        inputSizeBytes = inputBuffer ? inputBuffer.length : 0;

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

        // Security Validation 2: Phase 3A restricts production route to jpg-to-pdf ONLY
        if (serviceName !== 'jpg-to-pdf') {
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
              message: `Service '${serviceName}' is not enabled for production Worker processing in Phase 3A. Only 'jpg-to-pdf' is active.`,
            },
            400
          );
        }

        // Security Validation 3: Non-empty payload
        if (!inputBuffer || inputBuffer.length === 0) {
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

        // Security Validation 4: Strict 50 MB check on actual buffer length
        if (inputBuffer.length > MAX_UPLOAD_BYTES) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: serviceName,
            inputSizeBytes: inputBuffer.length,
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
              message: `Payload exceeds maximum allowed size of 50 MB (${(inputBuffer.length / (1024 * 1024)).toFixed(2)} MB received).`,
              maxAllowedBytes: MAX_UPLOAD_BYTES,
            },
            413
          );
        }

        // Security Validation 5: Magic byte signature verification for JPEG (FF D8 FF)
        if (
          inputBuffer.length < 4 ||
          inputBuffer[0] !== 0xff ||
          inputBuffer[1] !== 0xd8 ||
          inputBuffer[2] !== 0xff
        ) {
          const durationMs = Math.round(performance.now() - startTime);
          logSafeTelemetry({
            requestId,
            service: serviceName,
            inputSizeBytes: inputBuffer.length,
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
              message: 'Invalid file format. Only JPEG images are supported for jpg-to-pdf.',
            },
            400
          );
        }

        // Execution: Pure in-memory JPG to PDF conversion (Zero native deps, zero branding)
        const result = await processJpgToPdfWorker(inputBuffer, options);
        const durationMs = Math.round(performance.now() - startTime);

        logSafeTelemetry({
          requestId,
          service: serviceName,
          inputSizeBytes: inputBuffer.length,
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
              'Content-Type': 'application/pdf',
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
        let options: any = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          serviceName = (formData.get('service') as string) || '';
          const file = formData.get('file');

          if (file && typeof file === 'object' && 'arrayBuffer' in file) {
            const ab = await (file as File).arrayBuffer();
            inputBuffer = new Uint8Array(ab);
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

          if (body.fileBase64 && typeof body.fileBase64 === 'string') {
            inputBuffer = base64ToUint8Array(body.fileBase64);
          }
        } else {
          serviceName = url.searchParams.get('service') || '';
          const ab = await request.arrayBuffer();
          if (ab.byteLength > 0) {
            inputBuffer = new Uint8Array(ab);
          }
        }

        if (!serviceName) {
          return jsonResponse({ success: false, errorCode: 'MISSING_SERVICE', message: 'Service identifier is required.' }, 400);
        }

        if (!SUPPORTED_WORKER_SERVICES.includes(serviceName as WorkerServiceName)) {
          return jsonResponse({ success: false, service: serviceName, errorCode: 'UNSUPPORTED_SERVICE', message: `Service '${serviceName}' is not enabled in Worker prototype.` }, 400);
        }

        if (!inputBuffer || inputBuffer.length === 0) {
          return jsonResponse({ success: false, service: serviceName, errorCode: 'EMPTY_PAYLOAD', message: 'No file data received.' }, 400);
        }

        const result = await executeWorkerService(serviceName as WorkerServiceName, inputBuffer, options);
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
