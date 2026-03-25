<?php

namespace App\Services;

use App\Models\Booking;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class TicketService
{
    /**
     * Generate PDF ticket for booking(s).
     * Supports both single booking and grouped bookings (same booking_ref).
     *
     * @param Booking|Collection $booking Single booking or collection of bookings
     * @return string PDF content
     */
    public function generateTicketPdf(Booking|Collection $booking)
    {
        // Handle collection of bookings (grouped by booking_ref)
        if ($booking instanceof Collection) {
            return $this->generateGroupedTicketPdf($booking);
        }

        // Single booking - check if there are more with same booking_ref
        $allBookings = Booking::where('booking_ref', $booking->booking_ref)->get();

        if ($allBookings->count() > 1) {
            return $this->generateGroupedTicketPdf($allBookings);
        }

        // Single slot booking
        $data = [
            'booking' => $booking,
            'arena' => $booking->arena,
            'qrCode' => "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . $booking->ticket_number,
            'mergedSlots' => SlotMergeService::formatSlot($booking->time_slot),
            'totalAmount' => $booking->amount,
            'duration' => SlotMergeService::getDurationText([$booking->time_slot]),
        ];

        $pdf = Pdf::loadView('emails.bookings.ticket-pdf', $data);

        return $pdf->output();
    }

    /**
     * Generate PDF ticket for grouped bookings (multiple consecutive slots).
     *
     * @param Collection $bookings Collection of bookings with same booking_ref
     * @return string PDF content
     */
    protected function generateGroupedTicketPdf(Collection $bookings)
    {
        $firstBooking = $bookings->first();
        $slots = $bookings->pluck('time_slot')->toArray();

        $data = [
            'booking' => $firstBooking,
            'arena' => $firstBooking->arena,
            'qrCode' => "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . $firstBooking->ticket_number,
            'mergedSlots' => SlotMergeService::mergeSlots($slots),
            'totalAmount' => $bookings->sum('amount'),
            'duration' => SlotMergeService::getDurationText($slots),
        ];

        $pdf = Pdf::loadView('emails.bookings.ticket-pdf', $data);

        return $pdf->output();
    }

    /**
     * Save ticket PDF to storage.
     *
     * @param Booking $booking
     * @return string File path
     */
    public function saveTicketPdf(Booking $booking)
    {
        $pdfContent = $this->generateTicketPdf($booking);
        $fileName = 'tickets/' . $booking->ticket_number . '.pdf';
        Storage::disk('public')->put($fileName, $pdfContent);

        return $fileName;
    }

    /**
     * Get merged slot display for a booking reference.
     *
     * @param string $bookingRef
     * @return array ['mergedSlots' => string, 'totalAmount' => float, 'duration' => string]
     */
    public static function getMergedSlotData(string $bookingRef): array
    {
        $bookings = Booking::where('booking_ref', $bookingRef)->get();
        $slots = $bookings->pluck('time_slot')->toArray();

        return [
            'mergedSlots' => SlotMergeService::mergeSlots($slots),
            'totalAmount' => $bookings->sum('amount'),
            'duration' => SlotMergeService::getDurationText($slots),
            'slotCount' => count($slots),
        ];
    }
}
