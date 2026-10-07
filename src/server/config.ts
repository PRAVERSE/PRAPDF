/**
 * PRA PDF — Backend Configuration Module
 * A PRAVERSE Company
 * Reads environment variables server-side. Never exposes secrets to frontend or logs.
 */

import path from 'path';
import fs from 'fs';

// Automatically load .env if present using native Node 24 loadEnvFile
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
    (process as any).loadEnvFile(envPath);
  }
} catch {
  // Ignore in environments where .env is already loaded or in container env
}

export type B2ProviderId = 'B2_1' | 'B2_2' | 'B2_3' | 'B2_4';

export interface B2ProviderConfig {
  id: B2ProviderId;
  endpoint: string;
  region: string;
  bucketId: string;
  bucketName: string;
  keyId: string;
  applicationKey: string;
  isConfigured: boolean;
}

export interface BackendConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  maxFileSizeMb: number;
  maxFileSizeBytes: number;
  dataDir: string;
  tempDir: string;
  defaultB2Provider: 'B2_1' | 'B2_2' | 'B2_3' | 'B2_4';
  b2Providers: Record<'B2_1' | 'B2_2' | 'B2_3' | 'B2_4', B2ProviderConfig>;
  telegram: {
    botToken: string;
    chatId: string;
    isConfigured: boolean;
  };
  processor: {
    baseUrl: string;
    sharedSecret: string;
    isConfigured: boolean;
  };
}

function parseB2Config(prefix: 'B2_1' | 'B2_2' | 'B2_3' | 'B2_4'): B2ProviderConfig {
  let endpoint = process.env[`${prefix}_ENDPOINT`] || '';
  // Normalize endpoint: strip https:// if present for S3 client
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

const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) || 50;
const dataDir = path.resolve(process.cwd(), '.pra_data');
const tempDir = path.resolve(dataDir, 'tmp');

export const CONFIG: BackendConfig = {
  env: (process.env.PRA_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  maxFileSizeMb: maxMb,
  maxFileSizeBytes: maxMb * 1024 * 1024,
  dataDir,
  tempDir,
  defaultB2Provider: (process.env.DEFAULT_B2_PROVIDER as any) || 'B2_2',
  b2Providers: {
    B2_1: parseB2Config('B2_1'),
    B2_2: parseB2Config('B2_2'),
    B2_3: parseB2Config('B2_3'),
    B2_4: parseB2Config('B2_4'),
  },
  telegram: {
    botToken: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID || '').trim(),
    isConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  },
  processor: {
    baseUrl: (process.env.PROCESSOR_BASE_URL || '').trim(),
    sharedSecret: (process.env.PROCESSOR_SHARED_SECRET || 'pra-pdf-processor-internal-secret-2026').trim(),
    isConfigured: Boolean((process.env.PROCESSOR_BASE_URL || '').trim()),
  },
};

/**
 * Redacts secret keys, tokens, and passwords from objects before logging
 */
export function redactSecrets<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const copy: any = Array.isArray(obj) ? [...obj] : { ...obj };

  const secretKeys = [
    'token',
    'bottoken',
    'applicationkey',
    'key',
    'keyid',
    'password',
    'secret',
    'sharedsecret',
    'authorization',
  ];

  for (const k of Object.keys(copy)) {
    const lower = k.toLowerCase();
    if (secretKeys.some((s) => lower.includes(s))) {
      copy[k] = '[REDACTED]';
    } else if (typeof copy[k] === 'object' && copy[k] !== null) {
      copy[k] = redactSecrets(copy[k]);
    }
  }

  return copy;
}
