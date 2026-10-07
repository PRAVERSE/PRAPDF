/**
 * PRA PDF — Processing Server Authentication Middleware
 * A PRAVERSE Company
 * Validates server-to-server shared secret.
 * Rejects unauthorized calls with HTTP 401 PROCESSOR_UNAUTHORIZED.
 */

import { IncomingMessage } from 'http';
import { PROCESSOR_CONFIG } from './config';

export function verifyProcessorAuth(req: IncomingMessage): {
  authorized: boolean;
  errorCode?: string;
  errorMessage?: string;
} {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return {
      authorized: false,
      errorCode: 'PROCESSOR_UNAUTHORIZED',
      errorMessage: 'Missing Authorization header.',
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authorized: false,
      errorCode: 'PROCESSOR_UNAUTHORIZED',
      errorMessage: 'Invalid Authorization header format. Expected "Bearer <token>".',
    };
  }

  const token = parts[1].trim();
  if (!PROCESSOR_CONFIG.sharedSecret || token !== PROCESSOR_CONFIG.sharedSecret) {
    return {
      authorized: false,
      errorCode: 'PROCESSOR_UNAUTHORIZED',
      errorMessage: 'Invalid shared secret.',
    };
  }

  return { authorized: true };
}
