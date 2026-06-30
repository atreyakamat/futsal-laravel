import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Agnel Arena',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-dark text-white pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-8 text-primary uppercase italic tracking-tighter">Terms of Service</h1>
        
        <div className="space-y-8 text-white/70 leading-relaxed font-medium">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the Agnel Arena platform, you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Booking and Payments</h2>
            <p className="mb-4">
              All bookings are subject to availability. By completing a booking, you agree to pay the total amount shown.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payments are processed securely via third-party gateways (PayU).</li>
              <li>Booking slots are locked for 5 minutes during the checkout process. If payment is not completed, the slot will be released.</li>
              <li>You must present the booking QR code or reference ID at the venue for access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Cancellations and Refunds</h2>
            <p className="mb-4">
              Our cancellation and refund policies vary depending on the specific arena and time of cancellation.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cancellations made 24 hours prior to the slot may be eligible for a partial refund.</li>
              <li>No-shows will not be refunded under any circumstances.</li>
              <li>If the arena cancels a booking due to unforeseen circumstances, a full refund will be initiated.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Code of Conduct</h2>
            <p>
              Users are expected to maintain good conduct at the physical venues. Any damage to the turf or facilities 
              will be charged to the person who made the booking. The arenas reserve the right to deny entry if rules are violated.
            </p>
          </section>

          <div className="pt-8 border-t border-white/10">
            <p className="text-sm">Last updated: June 2026</p>
            <Link href="/" className="inline-block mt-4 text-primary hover:underline font-bold">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
