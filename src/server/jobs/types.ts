/**
 * PRA PDF — Job Model & Lifecycle Types
 * A PRAVERSE Company
 */

export type JobStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'UPLOADING'
  | 'BACKING_UP'
  | 'QUEUED'
  | 'PROCESSING'
  | 'UPLOADING_OUTPUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CLEANUP_PENDING'
  | 'CLEANED';

export interface TelegramJobMetadata {
  backedUp: boolean;
  messageId?: number;
  fileId?: string;
  chatId?: string;
  timestamp?: string;
  error?: string;
}

export interface CleanupJobMetadata {
  b2InputDeleted?: boolean;
  b2OutputDeleted?: boolean;
  telegramPurged?: boolean;
  cleanedAt?: string;
  lastAttemptAt?: string;
  retryCount?: number;
}

export interface JobRecord {
  jobId: string;
  serviceId: string;
  originalFilename: string;
  inputSize: number;
  mimeType: string;
  storageProvider: string;
  inputStorageKey: string;
  outputStorageKey?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expiresAt?: string;
  errorCode?: string;
  errorMessage?: string;
  processingMetadata?: Record<string, any>;
  telegramMetadata?: TelegramJobMetadata;
  cleanupState?: CleanupJobMetadata;
}

export interface CreateJobInput {
  serviceId: string;
  originalFilename: string;
  inputSize: number;
  mimeType: string;
  storageProvider?: string;
  options?: Record<string, any>;
}
