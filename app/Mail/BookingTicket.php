<?php

namespace App\Mail;

use App\Models\Booking;
use App\Services\SlotMergeService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class BookingTicket extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;
    public $bookings;
    public $qrCodeUrl;
    public $mergedSlots;
    public $totalAmount;
    public $duration;

    /**
     * Create a new message instance.
     *
     * @param Booking|Collection $bookings Single booking or collection of bookings with same booking_ref
     */
    public function __construct(Booking|Collection $bookings)
    {
        // Handle both single booking and collection
        if ($bookings instanceof Collection) {
            $this->bookings = $bookings;
            $this->booking = $bookings->first();
        } else {
            // Single booking passed - for backwards compatibility
            $this->booking = $bookings;
            $this->bookings = Booking::where('booking_ref', $bookings->booking_ref)->get();
        }

        $this->qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . $this->booking->ticket_number;

        // Use the collection directly - no extra query needed when collection is passed
        $slots = $this->bookings->pluck('time_slot')->toArray();

        $this->mergedSlots = SlotMergeService::mergeSlots($slots);
        $this->totalAmount = $this->bookings->sum('amount');
        $this->duration = SlotMergeService::getDurationText($slots);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your FutsalGoa Booking Ticket',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.bookings.ticket',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $ticketService = app(\App\Services\TicketService::class);
        // Pass the collection of bookings to avoid extra query in TicketService
        $pdfContent = $ticketService->generateTicketPdf($this->bookings);

        return [
            Attachment::fromData(fn() => $pdfContent, 'Ticket-' . $this->booking->ticket_number . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
