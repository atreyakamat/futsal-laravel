<?php

namespace App\Services;

use App\Models\Booking;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class TicketService
{
    /**
     * Generate PDF ticket for a booking
     */
    public function generateTicketPdf(Booking $booking)
    {
        $data = [
            'booking' => $booking,
            'arena' => $booking->arena,
            'qrCode' => "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . $booking->ticket_number
        ];

        $pdf = Pdf::loadView('emails.bookings.ticket-pdf', $data);
        
        return $pdf->output();
    }

    /**
     * Save ticket PDF to storage
     */
    public function saveTicketPdf(Booking $booking)
    {
        $pdfContent = $this->generateTicketPdf($booking);
        $fileName = 'tickets/' . $booking->ticket_number . '.pdf';
        Storage::disk('public')->put($fileName, $pdfContent);
        
        return $fileName;
    }
}
