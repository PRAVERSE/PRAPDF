/**
 * PRA PDF — Storage Manager
 * A PRAVERSE Company
 * Manages B2 storage providers (B2_1, B2_2, B2_3, B2_4) and enforces safe storage key generation.
 */

import { CONFIG, B2ProviderId } from '../config';
import { StorageProvider } from './types';
import { B2StorageProvider } from './b2Provider';

export class StorageManager {
  private providers: Map<B2ProviderId, StorageProvider> = new Map();
  private defaultProviderId: B2ProviderId;

  constructor() {
    this.defaultProviderId = CONFIG.defaultB2Provider;

    // Register all configured B2 providers
    for (const [id, cfg] of Object.entries(CONFIG.b2Providers)) {
      const providerId = id as B2ProviderId;
      this.providers.set(providerId, new B2StorageProvider(cfg));
    }
  }

  /**
   * Register or override a provider (useful for testing)
   */
  public registerProvider(id: B2ProviderId, provider: StorageProvider): void {
    this.providers.set(id, provider);
  }

  /**
   * Retrieves storage provider by ID or returns default provider (B2_2)
   */
  public getProvider(providerId?: B2ProviderId): StorageProvider {
    const id = providerId || this.defaultProviderId;
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Storage provider [${id}] is not registered.`);
    }
    return provider;
  }

  /**
   * Lists status of all storage providers
   */
  public getProvidersStatus(): Record<string, { isConfigured: boolean; id: string }> {
    const status: Record<string, { isConfigured: boolean; id: string }> = {};
    for (const [id, provider] of this.providers.entries()) {
      status[id] = {
        id,
        isConfigured: provider.isConfigured,
      };
    }
    return status;
  }

  /**
   * Generates safe input storage key: jobs/{jobId}/input/{safeFileId}
   */
  public generateInputKey(jobId: string, safeFileId: string): string {
    this.assertSafeSegment(jobId, 'jobId');
    this.assertSafeSegment(safeFileId, 'fileId');
    return `jobs/${jobId}/input/${safeFileId}`;
  }

  /**
   * Generates safe output storage key: jobs/{jobId}/output/{safeFileId}
   */
  public generateOutputKey(jobId: string, safeFileId: string): string {
    this.assertSafeSegment(jobId, 'jobId');
    this.assertSafeSegment(safeFileId, 'fileId');
    return `jobs/${jobId}/output/${safeFileId}`;
  }

  /**
   * Validates storage key against path traversal and unauthorized structures
   */
  public validateStorageKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;

    // Reject null bytes, backslashes, path traversal sequences
    if (key.includes('\0') || key.includes('\\') || key.includes('..')) {
      return false;
    }

    // Must strictly match jobs/{jobId}/{input|output}/{safeFileId}
    const safeKeyRegex = /^jobs\/[a-zA-Z0-9_\-]{8,64}\/(input|output)\/[a-zA-Z0-9_\-\.]{1,128}$/;
    return safeKeyRegex.test(key);
  }

  /**
   * Validates that an identifier contains no path traversal or suspicious characters
   */
  private assertSafeSegment(segment: string, fieldName: string): void {
    if (!segment || typeof segment !== 'string') {
      throw new Error(`Invalid ${fieldName}: value is empty or not a string.`);
    }

    if (segment.includes('/') || segment.includes('\\') || segment.includes('..') || segment.includes('\0')) {
      throw new Error(`Path traversal or forbidden characters detected in ${fieldName}.`);
    }

    const safeRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if (!safeRegex.test(segment)) {
      throw new Error(`Forbidden characters in ${fieldName}: ${segment}`);
    }
  }
}

export const storageManager = new StorageManager();
