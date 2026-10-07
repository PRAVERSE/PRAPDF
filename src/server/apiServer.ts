/**
 * PRA PDF — Lightweight API & Processing Gateway Server
 * A PRAVERSE Company
 * Re-exports and integrates with the complete Backend Foundation server.
 */

import http from 'http';
import { CONFIG } from './config';
import { createApiServer, startServer } from './server';
import { cleanupService } from './cleanup/cleanupService';

export const PORT = CONFIG.port;
export const MAX_FILE_SIZE_BYTES = CONFIG.maxFileSizeBytes;
export const TEMP_DIR = CONFIG.tempDir;

export { createApiServer };

export function runCleanupSweep(): number {
  cleanupService.runSweep();
  return 1;
}

if (process.argv[1] && process.argv[1].endsWith('apiServer.ts')) {
  startServer(PORT);
}
