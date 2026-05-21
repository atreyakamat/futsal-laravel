export default function SecurityScanPage() {
  return (
    <main className="grid" style={{ maxWidth: 560, margin: '0 auto' }}>
      <section className="hero-card">
        <span className="pill">Security portal</span>
        <h1 className="display">Look up a ticket</h1>
        <p className="meta">Use the ticket number to open the verification screen.</p>
        <form className="form" action="/security/verify" method="get">
          <div className="field">
            <label htmlFor="ticket_number">Ticket number</label>
            <input id="ticket_number" name="ticket_number" type="text" required />
          </div>
          <button className="button" type="submit">
            Verify ticket
          </button>
        </form>
      </section>
    </main>
  );
}