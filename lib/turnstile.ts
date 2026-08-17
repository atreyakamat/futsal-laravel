/**
 * Cloudflare Turnstile verification for the admin login routes.
 *
 * Deliberately fails OPEN (does not block login) whenever TURNSTILE_SECRET_KEY
 * isn't configured, or the verification request to Cloudflare itself fails —
 * this is a new, opt-in control being rolled out onto routes that must keep
 * working before the key is ever set. Once TURNSTILE_SECRET_KEY is set
 * (paired with NEXT_PUBLIC_TURNSTILE_SITE_KEY on the client, which is what
 * actually makes the widget render), verification starts enforcing for real.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<{ success: boolean; skipped?: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false };
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteIp) body.set('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error('[Turnstile] siteverify returned', res.status);
      return { success: false };
    }

    const data = await res.json();
    return { success: Boolean(data?.success) };
  } catch (err) {
    console.error('[Turnstile] Verification request failed, failing open:', err);
    return { success: true, skipped: true };
  }
}
