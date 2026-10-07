/**
 * PRA PDF — SQLite Job Persistence Store
 * A PRAVERSE Company
 * Powered by Node.js native zero-dependency SQLite (DatabaseSync).
 * Provides ACID durability, survives process restarts, zero raw file bytes in DB.
 */

import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { JobRecord, JobStatus } from './types';
import { logger } from '../logger';

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite');

export class JobStore {
  private db: any;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(CONFIG.dataDir, 'jobs.db');
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(finalPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        input_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_provider TEXT NOT NULL,
        input_storage_key TEXT NOT NULL,
        output_storage_key TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        expires_at TEXT,
        error_code TEXT,
        error_message TEXT,
        processing_metadata TEXT,
        telegram_metadata TEXT,
        cleanup_state TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
    `);
  }

  private rowToRecord(row: any): JobRecord {
    return {
      jobId: row.job_id,
      serviceId: row.service_id,
      originalFilename: row.original_filename,
      inputSize: Number(row.input_size),
      mimeType: row.mime_type,
      storageProvider: row.storage_provider,
      inputStorageKey: row.input_storage_key,
      outputStorageKey: row.output_storage_key || undefined,
      status: row.status as JobStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
      expiresAt: row.expires_at || undefined,
      errorCode: row.error_code || undefined,
      errorMessage: row.error_message || undefined,
      processingMetadata: row.processing_metadata ? JSON.parse(row.processing_metadata) : undefined,
      telegramMetadata: row.telegram_metadata ? JSON.parse(row.telegram_metadata) : undefined,
      cleanupState: row.cleanup_state ? JSON.parse(row.cleanup_state) : undefined,
    };
  }

  public insert(record: JobRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        job_id, service_id, original_filename, input_size, mime_type,
        storage_provider, input_storage_key, output_storage_key, status,
        created_at, updated_at, completed_at, expires_at, error_code,
        error_message, processing_metadata, telegram_metadata, cleanup_state
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    stmt.run(
      record.jobId,
      record.serviceId,
      record.originalFilename,
      record.inputSize,
      record.mimeType,
      record.storageProvider,
      record.inputStorageKey,
      record.outputStorageKey || null,
      record.status,
      record.createdAt,
      record.updatedAt,
      record.completedAt || null,
      record.expiresAt || null,
      record.errorCode || null,
      record.errorMessage || null,
      record.processingMetadata ? JSON.stringify(record.processingMetadata) : null,
      record.telegramMetadata ? JSON.stringify(record.telegramMetadata) : null,
      record.cleanupState ? JSON.stringify(record.cleanupState) : null
    );

    logger.info('JOB_CREATED', {
      jobId: record.jobId,
      serviceId: record.serviceId,
      size: record.inputSize,
    });
  }

  public get(jobId: string): JobRecord | null {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE job_id = ?');
    const row = stmt.get(jobId);
    if (!row) return null;
    return this.rowToRecord(row);
  }

  public update(jobId: string, updates: Partial<JobRecord>): JobRecord | null {
    const existing = this.get(jobId);
    if (!existing) return null;

    const merged: JobRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE jobs SET
        service_id = ?,
        original_filename = ?,
        input_size = ?,
        mime_type = ?,
        storage_provider = ?,
        input_storage_key = ?,
        output_storage_key = ?,
        status = ?,
        updated_at = ?,
        completed_at = ?,
        expires_at = ?,
        error_code = ?,
        error_message = ?,
        processing_metadata = ?,
        telegram_metadata = ?,
        cleanup_state = ?
      WHERE job_id = ?
    `);

    stmt.run(
      merged.serviceId,
      merged.originalFilename,
      merged.inputSize,
      merged.mimeType,
      merged.storageProvider,
      merged.inputStorageKey,
      merged.outputStorageKey || null,
      merged.status,
      merged.updatedAt,
      merged.completedAt || null,
      merged.expiresAt || null,
      merged.errorCode || null,
      merged.errorMessage || null,
      merged.processingMetadata ? JSON.stringify(merged.processingMetadata) : null,
      merged.telegramMetadata ? JSON.stringify(merged.telegramMetadata) : null,
      merged.cleanupState ? JSON.stringify(merged.cleanupState) : null,
      jobId
    );

    return merged;
  }

  /**
   * Find jobs that have expired or need cleanup
   */
  public findJobsForCleanup(currentTimeIso: string): JobRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE (expires_at IS NOT NULL AND expires_at <= ? AND status NOT IN ('CLEANED'))
         OR (status = 'CLEANUP_PENDING')
      LIMIT 100
    `);
    const rows = stmt.all(currentTimeIso);
    return rows.map((r: any) => this.rowToRecord(r));
  }

  public delete(jobId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM jobs WHERE job_id = ?');
    stmt.run(jobId);
    return true;
  }
}

export const jobStore = new JobStore();
