/**
 * Startup Environment Variable Validation
 * Ensures all required environment variables are present and secure.
 * Fails fast in production to prevent misconfigured deployments.
 */

// Hard required — app cannot start without these
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'COOKIE_SECRET',
];

// Soft required — warn but allow startup (features degrade gracefully)
const SOFT_REQUIRED_ENV_VARS = [
  'PAYU_MERCHANT_KEY',
  'PAYU_MERCHANT_SALT',
  'RESEND_API_KEY',
  'SMS_PROVIDER',
  'SENTRY_DSN',
];

const PRODUCTION_REQUIRED_VARS = [
  'NEXT_PUBLIC_APP_URL',
];

function validateCookieSecret(secret: string): { valid: boolean; reason?: string } {
  if (secret === 'agnelarena-super-secret-key-change-me-in-prod') {
    return { valid: false, reason: 'COOKIE_SECRET uses default insecure value' };
  }
  if (secret.length < 32) {
    return { valid: false, reason: 'COOKIE_SECRET must be at least 32 characters' };
  }
  const hasUpper = /[A-Z]/.test(secret);
  const hasLower = /[a-z]/.test(secret);
  const hasNumber = /[0-9]/.test(secret);
  const hasSpecial = /[^A-Za-z0-9]/.test(secret);
  if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
    return { valid: false, reason: 'COOKIE_SECRET must contain upper, lower, number, and special character' };
  }
  return { valid: true };
}

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  const missing: string[] = [];
  const weak: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Soft-required: always warn but never crash
  const missingSoft = SOFT_REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missingSoft.length > 0) {
    console.warn(`[ENV VALIDATION] Optional vars not set (features degraded): ${missingSoft.join(', ')}`);
  }

  if (isProduction && !isBuildPhase) {
    for (const envVar of PRODUCTION_REQUIRED_VARS) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    const cookieSecret = process.env.COOKIE_SECRET;
    if (cookieSecret) {
      const validation = validateCookieSecret(cookieSecret);
      if (!validation.valid) {
        weak.push(`COOKIE_SECRET: ${validation.reason}`);
      }
    }
  }

  if (missing.length > 0 || weak.length > 0) {
    if (isProduction && !isBuildPhase) {
      const errorMsg = [
        missing.length > 0 ? `Missing required environment variables: ${missing.join(', ')}` : '',
        weak.length > 0 ? `Weak configuration: ${weak.join('; ')}` : '',
      ].filter(Boolean).join('; ');
      console.error(`[ENV VALIDATION] Fatal: ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      if (missing.length > 0) {
        console.warn(`[ENV VALIDATION] Warning: Missing variables: ${missing.join(', ')}`);
      }
      if (weak.length > 0) {
        console.warn(`[ENV VALIDATION] Warning: ${weak.join('; ')}`);
      }
    }
  } else {
    console.info('[ENV VALIDATION] All required environment variables are present and secure.');
  }
}

export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.resend.com https://sentry.io https://*.payu.in",
      "frame-src https://www.google.com https://test.payu.in https://secure.payu.in",
      "form-action 'self' https://test.payu.in https://secure.payu.in https://*.payu.in",
      "base-uri 'self'",
    ].join('; '),
  };
}

// Run immediately upon import
validateEnv();
