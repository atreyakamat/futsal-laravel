import { query, queryOne } from '@/lib/db';

export async function isLockedOut(identifier: string): Promise<boolean> {
  const record = await queryOne<{ locked_until: string | null }>(
    'SELECT locked_until FROM otp_attempts WHERE identifier = ? LIMIT 1',
    [identifier]
  );
  if (!record || !record.locked_until) return false;
  
  const lockedUntil = new Date(record.locked_until);
  if (lockedUntil > new Date()) {
    return true;
  }
  
  // If lockout expired, reset it
  if (lockedUntil <= new Date()) {
    await resetAttempts(identifier);
  }
  return false;
}

export async function recordFailedAttempt(identifier: string): Promise<number> {
  const now = new Date();
  const record = await queryOne<{ id: number; attempts: number }>(
    'SELECT id, attempts FROM otp_attempts WHERE identifier = ? LIMIT 1',
    [identifier]
  );

  if (!record) {
    await query(
      'INSERT INTO otp_attempts (identifier, attempts, last_attempt) VALUES (?, 1, ?)',
      [identifier, now]
    );
    return 1;
  }

  const newAttempts = record.attempts + 1;
  let lockedUntil: Date | null = null;
  if (newAttempts >= 5) {
    // lock out for 15 minutes
    lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
  }

  await query(
    'UPDATE otp_attempts SET attempts = ?, last_attempt = ?, locked_until = ? WHERE id = ?',
    [newAttempts, now, lockedUntil, record.id]
  );

  return newAttempts;
}

export async function resetAttempts(identifier: string): Promise<void> {
  await query('DELETE FROM otp_attempts WHERE identifier = ?', [identifier]);
}

export async function canSendOtp(identifier: string): Promise<boolean> {
  const locked = await isLockedOut(identifier);
  if (locked) return false;
  
  // Enforce a 60 seconds cool-down between requests
  const lastOtp = await queryOne<{ created_at: string | Date | null }>(
    'SELECT created_at FROM user_otps WHERE identifier = ? LIMIT 1',
    [identifier]
  );
  if (lastOtp && lastOtp.created_at) {
    const timePassed = Date.now() - new Date(lastOtp.created_at).getTime();
    if (timePassed < 60 * 1000) {
      return false;
    }
  }
  return true;
}
