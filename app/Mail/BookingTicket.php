<?php

namespace App\Mail;

use App\Models\Booking;
use App\Services\SlotMergeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingTicket extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;
    public $qrCodeUrl;
    public $mergedSlots;
    public $totalAmount;
    public $duration;

    /**
     * Create a new message instance.
     */
    public function __construct($booking)
    {
        $this->booking = $booking;
        $this->qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . $booking->ticket_number;

        // Get all bookings with same booking_ref for merged slot display
        $allBookings = Booking::where('booking_ref', $booking->booking_ref)->get();
        $slots = $allBookings->pluck('time_slot')->toArray();

        $this->mergedSlots = SlotMergeService::mergeSlots($slots);
        $this->totalAmount = $allBookings->sum('amount');
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
        $pdfContent = $ticketService->generateTicketPdf($this->booking);

        return [
            Attachment::fromData(fn() => $pdfContent, 'Ticket-' . $this->booking->ticket_number . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
