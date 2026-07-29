/**
 * Structured Production Logger for Agnel Arena
 *
 * Implements structured JSON logging with automatic redaction of secrets,
 * passwords, OTP codes, and API tokens.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'audit';

const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'secret',
  'payu_key',
  'payu_salt',
  'authorization',
  'token',
  'cookie',
]);

function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export function logEvent(level: LogLevel, message: string, metadata: Record<string, any> = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const timestamp = new Date().toISOString();
  const safeMetadata = redactSensitiveData(metadata);

  const payload = {
    timestamp,
    level,
    message,
    ...safeMetadata,
  };

  if (isProduction) {
    console.log(JSON.stringify(payload));
  } else {
    const color =
      level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : level === 'audit' ? '\x1b[36m' : '\x1b[32m';
    console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${message}`, Object.keys(safeMetadata).length ? safeMetadata : '');
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, any>) => logEvent('info', msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => logEvent('warn', msg, meta),
  error: (msg: string, meta?: Record<string, any>) => logEvent('error', msg, meta),
  audit: (msg: string, meta?: Record<string, any>) => logEvent('audit', msg, meta),
};
