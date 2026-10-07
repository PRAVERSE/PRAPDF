/**
 * PRA PDF — Processing Server Structured Logger
 * A PRAVERSE Company
 * Formats events with jobId, serviceId, durationMs, and scrubs all credentials.
 */

import { redactSecrets } from '../server/config';

export class ProcessorLogger {
  private log(level: 'info' | 'warn' | 'error', event: string, meta: Record<string, any> = {}): void {
    const safeMeta = redactSecrets(meta);
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: 'PROCESSOR',
      event,
      ...safeMeta,
    };

    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(`[PROCESSOR] ${serialized}`);
    } else if (level === 'warn') {
      console.warn(`[PROCESSOR] ${serialized}`);
    } else {
      console.log(`[PROCESSOR] ${serialized}`);
    }
  }

  public info(event: string, meta: Record<string, any> = {}): void {
    this.log('info', event, meta);
  }

  public warn(event: string, meta: Record<string, any> = {}): void {
    this.log('warn', event, meta);
  }

  public error(event: string, meta: Record<string, any> = {}): void {
    this.log('error', event, meta);
  }
}

export const procLogger = new ProcessorLogger();
