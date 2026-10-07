/**
 * PRA PDF — Dedicated PDF Processing Server Configuration
 * A PRAVERSE Company
 * Server-to-server settings for heavy compute node.
 * Zero secret leakage.
 */

import path from 'path';
import fs from 'fs';
import { B2ProviderConfig, B2ProviderId } from '../server/config';

// Load .env if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
    (process as any).loadEnvFile(envPath);
  }
} catch {
  // Ignore in environments where env is already in process.env
}

function parseB2Config(prefix: B2ProviderId): B2ProviderConfig {
  let endpoint = process.env[`${prefix}_ENDPOINT`] || '';
  endpoint = endpoint.replace(/^https?:\/\//, '').trim();

  const region = (process.env[`${prefix}_REGION`] || '').trim();
  const bucketId = (process.env[`${prefix}_BUCKET_ID`] || '').trim();
  const bucketName = (process.env[`${prefix}_BUCKET_NAME`] || '').trim();
  const keyId = (process.env[`${prefix}_KEY_ID`] || '').trim();
  const applicationKey = (process.env[`${prefix}_APPLICATION_KEY`] || '').trim();

  const isConfigured = Boolean(endpoint && bucketName && keyId && applicationKey);

  return {
    id: prefix,
    endpoint,
    region: region || 'ca-east-006',
    bucketId,
    bucketName,
    keyId,
    applicationKey,
    isConfigured,
  };
}

const maxMb = parseInt(process.env.PROCESSOR_MAX_FILE_SIZE_MB || '50', 10) || 50;
const tempDir = path.resolve(process.cwd(), '.processor_tmp');

export const PROCESSOR_CONFIG = {
  host: (process.env.PROCESSOR_HOST || '127.0.0.1').trim(),
  port: parseInt(process.env.PROCESSOR_PORT || '3002', 10),
  sharedSecret: (process.env.PROCESSOR_SHARED_SECRET || 'pra-pdf-processor-internal-secret-2026').trim(),
  maxFileSizeMb: maxMb,
  maxFileSizeBytes: maxMb * 1024 * 1024,
  maxConcurrency: parseInt(process.env.PROCESSOR_MAX_CONCURRENCY || '1', 10) || 1,
  timeoutSeconds: parseInt(process.env.PROCESSOR_TIMEOUT_SECONDS || '300', 10) || 300,
  tempDir,
  b2Providers: {
    B2_1: parseB2Config('B2_1'),
    B2_2: parseB2Config('B2_2'),
    B2_3: parseB2Config('B2_3'),
    B2_4: parseB2Config('B2_4'),
  },
};
