/**
 * Startup Environment Variable Validation
 * Ensures all required environment variables are present.
 * Fails fast in production to prevent misconfigured deployments.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'COOKIE_SECRET',
  'PAYU_MERCHANT_KEY',
  'PAYU_MERCHANT_SALT',
  'SMS_PROVIDER'
];

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    if (isProduction && !isBuildPhase) {
      const errorMsg = `[ENV VALIDATION] Fatal: Missing required environment variables: ${missing.join(', ')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      console.warn(`[ENV VALIDATION] Warning: Missing variables: ${missing.join(', ')}`);
    }
  } else {
    console.info('[ENV VALIDATION] All required environment variables are present.');
  }
}

// Run immediately upon import
validateEnv();
