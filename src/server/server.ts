/**
 * PRA PDF — Backend Foundation Server
 * A PRAVERSE Company
 * Initializes HTTP server, starts cleanup scheduler, and attaches API Router.
 */

import http from 'http';
import { CONFIG } from './config';
import { ApiRouter } from './api/router';
import { cleanupService } from './cleanup/cleanupService';
import { logger } from './logger';

export function createApiServer(): http.Server {
  const server = http.createServer((req, res) => {
    ApiRouter.handle(req, res);
  });
  return server;
}

export function startServer(port: number = CONFIG.port): http.Server {
  const server = createApiServer();

  server.listen(port, () => {
    logger.info('SERVER_STARTED', {
      port,
      env: CONFIG.env,
      maxFileSizeMb: CONFIG.maxFileSizeMb,
      defaultB2Provider: CONFIG.defaultB2Provider,
      telegramConfigured: CONFIG.telegram.isConfigured,
      processorConfigured: CONFIG.processor.isConfigured,
    });

    // Start 60-second automated cleanup sweep
    cleanupService.start(60000);
  });

  const shutdown = () => {
    logger.info('SERVER_SHUTTING_DOWN');
    cleanupService.stop();
    server.close(() => {
      logger.info('SERVER_STOPPED');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

// Auto-start if executed directly
if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startServer(CONFIG.port);
}
