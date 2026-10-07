/**
 * PRA PDF — Backblaze B2 Storage Provider (S3-Compatible API)
 * A PRAVERSE Company
 * Encapsulates Backblaze B2 operations via S3 SDK. Zero credential leakage.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { B2ProviderConfig } from '../config';
import { StorageObjectMetadata, StorageProvider, StorageUploadResult } from './types';
import { logger } from '../logger';

export class B2StorageProvider implements StorageProvider {
  public readonly id: string;
  public readonly isConfigured: boolean;
  private readonly config: B2ProviderConfig;
  private readonly client: S3Client | null = null;

  constructor(config: B2ProviderConfig) {
    this.id = config.id;
    this.config = config;
    this.isConfigured = config.isConfigured;

    if (this.isConfigured) {
      const endpointUrl = config.endpoint.startsWith('http')
        ? config.endpoint
        : `https://${config.endpoint}`;

      this.client = new S3Client({
        endpoint: endpointUrl,
        region: config.region || 'ca-east-006',
        credentials: {
          accessKeyId: config.keyId,
          secretAccessKey: config.applicationKey,
        },
        forcePathStyle: true,
      });
    }
  }

  private ensureConfigured(): S3Client {
    if (!this.client || !this.isConfigured) {
      throw new Error(`Storage provider [${this.id}] is not configured with credentials.`);
    }
    return this.client;
  }

  /**
   * Upload object with bounded retries
   */
  public async upload(
    key: string,
    content: Buffer | Uint8Array,
    contentType: string = 'application/octet-stream'
  ): Promise<StorageUploadResult> {
    const client = this.ensureConfigured();
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        });

        const response = await client.send(command);

        logger.info('B2_UPLOAD_COMPLETED', {
          providerId: this.id,
          key,
          sizeBytes: buffer.length,
          etag: response.ETag,
        });

        return {
          key,
          size: buffer.length,
          etag: response.ETag,
          providerId: this.id,
        };
      } catch (err: any) {
        lastError = err;
        logger.warn('B2_UPLOAD_RETRY', {
          providerId: this.id,
          key,
          attempt: attempt + 1,
          error: err?.message || 'Upload error',
        });
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    }

    logger.error('B2_UPLOAD_FAILED', {
      providerId: this.id,
      key,
      error: lastError?.message || 'Upload failed',
    });
    throw new Error(`Failed to upload to B2 provider [${this.id}] after ${maxRetries + 1} attempts.`);
  }

  /**
   * Download object from B2
   */
  public async download(key: string): Promise<Buffer> {
    const client = this.ensureConfigured();

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const response = await client.send(command);
      if (!response.Body) {
        throw new Error(`Empty response body for key: ${key}`);
      }

      // Convert stream to Buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const fileBuffer = Buffer.concat(chunks);
      return fileBuffer;
    } catch (err: any) {
      logger.error('B2_DOWNLOAD_FAILED', {
        providerId: this.id,
        key,
        error: err?.message || 'Download failed',
      });
      throw new Error(`Failed to download object [${key}] from provider [${this.id}]: ${err?.message}`);
    }
  }

  /**
   * Delete object from B2
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.isConfigured) return true;
    const client = this.client!;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });
      await client.send(command);
      logger.info('B2_DELETE_COMPLETED', { providerId: this.id, key });
      return true;
    } catch (err: any) {
      logger.warn('B2_DELETE_WARNING', {
        providerId: this.id,
        key,
        error: err?.message || 'Delete error',
      });
      return false;
    }
  }

  /**
   * Check if object exists
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConfigured) return false;
    const client = this.client!;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });
      await client.send(command);
      return true;
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
        return false;
      }
      return false;
    }
  }

  /**
   * Get metadata
   */
  public async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    if (!this.isConfigured) return null;
    const client = this.client!;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });
      const res = await client.send(command);
      return {
        key,
        size: res.ContentLength || 0,
        contentType: res.ContentType,
        lastModified: res.LastModified,
        etag: res.ETag,
      };
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Generate signed temporary download URL (default 10 minutes = 600s)
   */
  public async getSignedDownloadUrl(key: string, expiresInSeconds: number = 600): Promise<string> {
    const client = this.ensureConfigured();

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(client, command, {
        expiresIn: expiresInSeconds,
      });

      return signedUrl;
    } catch (err: any) {
      logger.error('B2_PRESIGN_FAILED', {
        providerId: this.id,
        key,
        error: err?.message || 'Presign error',
      });
      throw new Error(`Failed to generate signed download URL: ${err?.message}`);
    }
  }
}
