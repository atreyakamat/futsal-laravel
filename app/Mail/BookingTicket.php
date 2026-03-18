<?php

namespace App\Mail;

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

    /**
     * Create a new message instance.
     */
    public function __construct($booking)
    {
        $this->booking = $booking;
        $this->qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . $booking->ticket_number;
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
        return [];
    }
}
