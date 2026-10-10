/**
 * PRA PDF — Standalone API Server Instance
 * A PRAVERSE Company
 * Wraps HTTP requests for tests and server entry points.
 * Enforces strict 50 MB limits, healthy API status, and zero-AI confirmations.
 */

import http from 'http';
import { MAX_FILE_SIZE_BYTES } from '../services/core/fileValidator';

export function createApiServer(): http.Server {
  return http.createServer((req, res) => {
    // 1. Upfront strict Content-Length 50 MB verification
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_FILE_SIZE_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Payload too large. File exceeds the 50 MB maximum limit (${(contentLength / (1024 * 1024)).toFixed(2)} MB received).`,
          },
          maxAllowedBytes: MAX_FILE_SIZE_BYTES,
          maxFileLimit: '50 MB',
          message: `Payload too large. File exceeds the 50 MB maximum limit (${(contentLength / (1024 * 1024)).toFixed(2)} MB received).`,
        })
      );
      return;
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;

    // 2. Health check endpoints (/api/health and /api/v1/health)
    if (pathname === '/api/health' || pathname === '/api/v1/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          status: 'healthy',
          product: 'PRA PDF',
          company: 'A PRAVERSE Company',
          version: '1.0.0',
          maxFileLimit: '50 MB',
          maxFileSizeMb: 50,
          maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
          zeroAI: true,
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // 3. Fallback endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        message: 'PRA PDF API Gateway',
        maxFileLimit: '50 MB',
        zeroAI: true,
      })
    );
  });
}
