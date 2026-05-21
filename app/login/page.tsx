export default function LoginPage() {
  return (
    <main className="grid" style={{ maxWidth: 560, margin: '0 auto' }}>
      <section className="hero-card">
        <span className="pill">OTP authentication</span>
        <h1 className="display">Login with your mobile or email</h1>
        <p className="meta">
          The OTP flow writes to MySQL and returns you to the verification step with a short-lived code.
        </p>

        <form className="form" action="/api/auth/send-otp" method="post">
          <div className="field">
            <label htmlFor="identifier">Email or mobile</label>
            <input id="identifier" name="identifier" type="text" required placeholder="name@example.com or 9876543210" />
          </div>
          <button className="button" type="submit">
            Send OTP
          </button>
        </form>
      </section>
    </main>
  );
}