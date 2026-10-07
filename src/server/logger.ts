/**
 * PRA PDF — Structured Backend Logger
 * A PRAVERSE Company
 * Formats events as structured JSON lines with jobId traceability and zero secret leakage.
 */

import { redactSecrets } from './config';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogPayload {
  event: string;
  jobId?: string;
  durationMs?: number;
  message?: string;
  [key: string]: any;
}

export class Logger {
  private context: string;

  constructor(context: string = 'Server') {
    this.context = context;
  }

  private write(level: LogLevel, payload: LogPayload): void {
    const safePayload = redactSecrets(payload);
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      ...safePayload,
    };

    const serialized = JSON.stringify(logEntry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public info(event: string, meta: Omit<LogPayload, 'event'> = {}): void {
    this.write('info', { event, ...meta });
  }

  public warn(event: string, meta: Omit<LogPayload, 'event'> = {}): void {
    this.write('warn', { event, ...meta });
  }

  public error(event: string, meta: Omit<LogPayload, 'event'> = {}): void {
    this.write('error', { event, ...meta });
  }

  public debug(event: string, meta: Omit<LogPayload, 'event'> = {}): void {
    if (process.env.PRA_DEBUG === 'true' || process.env.PRA_ENV === 'development') {
      this.write('debug', { event, ...meta });
    }
  }
}

export const logger = new Logger('PRA_PDF');
