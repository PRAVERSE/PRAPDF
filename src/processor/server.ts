/**
 * PRA PDF — Dedicated PDF Processing Server
 * A PRAVERSE Company
 * Heavy processing node listening on port 3002.
 */

import http from 'http';
import { PROCESSOR_CONFIG } from './config';
import { ProcessorRouter } from './routes';
import { procLogger } from './logger';

export function createProcessorServer(): http.Server {
  const server = http.createServer((req, res) => {
    ProcessorRouter.handle(req, res);
  });
  return server;
}

export function startProcessorServer(
  port: number = PROCESSOR_CONFIG.port,
  host: string = PROCESSOR_CONFIG.host
): http.Server {
  const server = createProcessorServer();

  server.listen(port, host, () => {
    procLogger.info('PROCESSOR_SERVER_STARTED', {
      host,
      port,
      maxFileSizeMb: PROCESSOR_CONFIG.maxFileSizeMb,
      concurrency: PROCESSOR_CONFIG.maxConcurrency,
      supportedService: 'compress-pdf',
    });
  });

  const shutdown = () => {
    procLogger.info('PROCESSOR_SERVER_STOPPING');
    server.close(() => {
      procLogger.info('PROCESSOR_SERVER_STOPPED');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startProcessorServer(PROCESSOR_CONFIG.port, PROCESSOR_CONFIG.host);
}
