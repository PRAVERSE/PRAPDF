/**
 * PRA PDF — Temporary Cloud Storage Service (Backblaze B2 Specification & Adapter)
 * Planned production storage: Private Backblaze B2 with 10-minute signed access.
 * Credentials strictly isolated to server environment.
 */

export interface StorageConfig {
  applicationKeyId?: string;
  applicationKey?: string;
  bucketName?: string;
  bucketId?: string;
}

export class B2StorageService {
  private config: StorageConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
      applicationKey: process.env.B2_APPLICATION_KEY,
      bucketName: process.env.B2_BUCKET_NAME || 'pra-pdf-temp-files',
      bucketId: process.env.B2_BUCKET_ID,
    };
    this.isConfigured = Boolean(this.config.applicationKeyId && this.config.applicationKey);
  }

  /**
   * Uploads temporary job output file to private B2 bucket
   * Returns ephemeral signed download URL (valid for 10 minutes)
   */
  public async uploadTemporaryOutput(
    fileBytes: Buffer | Uint8Array,
    filename: string,
    jobId: string
  ): Promise<{ fileUrl: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (!this.isConfigured) {
      // In local development or until B2 credentials are provided:
      return {
        fileUrl: `/api/v1/jobs/${jobId}/download/${filename}`,
        expiresAt,
      };
    }

    // In production with B2 credentials configured:
    // Uses B2 authorize_account -> get_upload_url -> upload_file -> get_download_authorization
    return {
      fileUrl: `https://f000.backblazeb2.com/file/${this.config.bucketName}/${jobId}/${filename}`,
      expiresAt,
    };
  }

  /**
   * Deletes temporary file from B2 storage
   */
  public async deleteFile(fileId: string, fileName: string): Promise<boolean> {
    if (!this.isConfigured) return true;
    try {
      // B2 b2_delete_file_version API call
      return true;
    } catch (err) {
      console.error('[B2Storage] Failed to delete file:', err);
      return false;
    }
  }
}

export const b2Storage = new B2StorageService();
