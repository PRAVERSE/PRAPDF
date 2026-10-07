/**
 * PRA PDF — Storage Provider Abstraction Types
 * A PRAVERSE Company
 */

export interface StorageObjectMetadata {
  key: string;
  size: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
}

export interface StorageUploadResult {
  key: string;
  size: number;
  etag?: string;
  providerId: string;
}

export interface StorageProvider {
  readonly id: string;
  readonly isConfigured: boolean;

  upload(
    key: string,
    content: Buffer | Uint8Array,
    contentType?: string
  ): Promise<StorageUploadResult>;

  download(key: string): Promise<Buffer>;

  delete(key: string): Promise<boolean>;

  exists(key: string): Promise<boolean>;

  getMetadata(key: string): Promise<StorageObjectMetadata | null>;

  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
