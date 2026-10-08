/**
 * PRA PDF — Processing Server Workspace Manager
 * A PRAVERSE Company
 * Manages isolated per-job temporary directories with strict path traversal protection.
 */

import fs from 'fs';
import path from 'path';
import { PROCESSOR_CONFIG } from './config';
import { procLogger } from './logger';

export class WorkspaceManager {
  private baseDir: string;

  constructor() {
    this.baseDir = PROCESSOR_CONFIG.tempDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Asserts that a job ID contains no path traversal sequences
   */
  private validateJobId(jobId: string): void {
    if (!jobId || typeof jobId !== 'string') {
      throw new Error('Invalid jobId: empty or not a string.');
    }
    if (jobId.includes('..') || jobId.includes('/') || jobId.includes('\\') || jobId.includes('\0')) {
      throw new Error(`Path traversal detected in jobId: ${jobId}`);
    }
    const safeRegex = /^[a-zA-Z0-9_\-]{8,64}$/;
    if (!safeRegex.test(jobId)) {
      throw new Error(`Invalid characters in jobId: ${jobId}`);
    }
  }

  /**
   * Prepares isolated workspace for a job
   */
  public prepareWorkspace(
    jobId: string,
    inputExt: string = '.pdf',
    outputExt: string = '.pdf'
  ): {
    dir: string;
    inputPath: string;
    outputPath: string;
  } {
    this.validateJobId(jobId);
    const dir = path.join(this.baseDir, jobId);

    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });

    const safeInputExt = inputExt.startsWith('.') ? inputExt : `.${inputExt}`;
    const safeOutputExt = outputExt.startsWith('.') ? outputExt : `.${outputExt}`;

    return {
      dir,
      inputPath: path.join(dir, `input${safeInputExt}`),
      outputPath: path.join(dir, `output${safeOutputExt}`),
    };
  }

  /**
   * Safely purges job workspace
   */
  public cleanupWorkspace(jobId: string): boolean {
    try {
      this.validateJobId(jobId);
      const dir = path.join(this.baseDir, jobId);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return true;
    } catch (err: any) {
      procLogger.warn('WORKSPACE_CLEANUP_WARNING', { jobId, error: err?.message });
      return false;
    }
  }
}

export const workspaceManager = new WorkspaceManager();
