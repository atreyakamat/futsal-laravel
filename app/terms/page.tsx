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
              <li>Payments are processed securely via third-party gateways (PayU), except where an arena accepts payment at the venue.</li>
              <li>Booking slots are locked for 10 minutes during the checkout process. If payment is not completed, the slot will be released.</li>
              <li>You must present the booking QR code or reference ID at the venue for access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Cancellations and Rescheduling</h2>
            <p className="mb-4">
              <strong className="text-white">No refunds are issued for cancellations, under any circumstances</strong> — including no-shows. Rescheduling to a new slot is offered instead as the standard remedy. (An individual arena may, at its own discretion, opt back into offering refund-eligible cancellations; where that applies, refund terms will be shown to you at checkout for that arena.)
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may cancel a confirmed booking up until the arena's configured cancellation cutoff (shown at checkout and in your booking) before the slot start. No refund is issued.</li>
              <li>You may instead reschedule a confirmed booking to a new slot, subject to all of the following: at least 24 hours before the original slot's start time; only once per booking; the new slots must be contiguous (back-to-back) and on a single date; the new date must be within 30 days of the original booking date; and the new slots' total price must not exceed the original total. A new ticket is issued for the rescheduled booking and the original ticket is void.</li>
              <li>If the arena cancels a booking due to unforeseen circumstances, a full refund will be initiated regardless of the above.</li>
              <li>Agnel Arena's management may, at its discretion, issue a refund outside of the above policy in exceptional cases.</li>
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
            <p className="text-sm">Last updated: August 2026</p>
            <Link href="/" className="inline-block mt-4 text-primary hover:underline font-bold">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
