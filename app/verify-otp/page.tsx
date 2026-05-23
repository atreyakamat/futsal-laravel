type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyOtpPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const identifier = typeof resolvedSearchParams.identifier === 'string' ? resolvedSearchParams.identifier : '';
  const hasError = resolvedSearchParams.error === '1';

  return (
    <main className="grid" style={{ maxWidth: 560, margin: '0 auto' }}>
      <section className="hero-card">
        <span className="pill">OTP verification</span>
        <h1 className="display">Enter the 6-digit code</h1>
        <p className="meta">The OTP is stored in PostgreSQL for 10 minutes, matching the original Laravel behavior.</p>

        {hasError ? <div className="notice error">Invalid or expired OTP. Try again.</div> : null}

        <form className="form" action="/api/auth/verify-otp" method="post">
          <input type="hidden" name="identifier" value={identifier} />
          <div className="field">
            <label htmlFor="otp">OTP</label>
            <input id="otp" name="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" required placeholder="123456" />
          </div>
          <button className="button" type="submit">
            Verify OTP
          </button>
        </form>
      </section>
    </main>
  );
}