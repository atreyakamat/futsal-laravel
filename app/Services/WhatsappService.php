<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Arena;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class WhatsappService
{
    /**
     * Send a booking confirmation message via WhatsApp using Aisensy API.
     */
    public function sendBookingConfirmation(string $bookingRef): bool
    {
        $bookings = Booking::where('booking_ref', $bookingRef)->with('arena')->get();

        if ($bookings->isEmpty()) {
            return false;
        }

        $firstBooking = $bookings->first();
        $arena = $firstBooking->arena;
        $customerName = $firstBooking->customer_name;
        $customerMobile = $firstBooking->customer_mobile;
        
        // Ensure mobile has country code for Aisensy
        if (!str_starts_with($customerMobile, '91') && strlen($customerMobile) === 10) {
            $customerMobile = '91' . $customerMobile;
        }

        $date = date('d M Y', strtotime($firstBooking->booking_date));
        $slots = $bookings->pluck('time_slot')->implode(', ');
        $paymentStatus = $firstBooking->payment_status === 'confirmed' ? '✅ Received' : '❌ Pending (Pay at Arena)';
        
        $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=" . $firstBooking->ticket_number;
        $successUrl = route('booking.success', ['ref' => $bookingRef]);
        
        // Aisensy Precise Payload
        $payload = [
            'apiKey' => env('AISENSY_API_KEY'),
            'campaignName' => env('AISENSY_CAMPAIGN_NAME', 'FutsalTicketBook'),
            'destination' => $customerMobile,
            'userName' => "Agnel Futsal Arena",
            'templateParams' => [
                $customerName,
                $arena->name,
                $date . " (" . $slots . ")",
                $paymentStatus
            ],
            'source' => 'FutsalGoa Platform',
            'media' => [
                'url' => $qrCodeUrl,
                'filename' => "Ticket_" . $firstBooking->ticket_number . ".png"
            ],
            'buttons' => [
                [
                    'type' => 'button',
                    'sub_type' => 'URL',
                    'index' => 0,
                    'parameters' => [
                        [
                            'type' => 'text',
                            'text' => $bookingRef // Dynamically fill the URL parameter if your button is setup as site.com/success/{{1}}
                        ]
                    ]
                ]
            ],
            'paramsFallbackValue' => [
                'FirstName' => $customerName
            ]
        ];

        Log::info("Attempting to send Aisensy WhatsApp to {$customerMobile} for campaign: " . $payload['campaignName']);

        try {
            $response = Http::post('https://backend.aisensy.com/campaign/t1/api/v2', $payload);
            
            if ($response->successful()) {
                Log::info("WhatsApp sent successfully via Aisensy. Response: " . $response->body());
                return true;
            } else {
                Log::error("Aisensy API Error: " . $response->status() . " - " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("Aisensy Connection Exception: " . $e->getMessage());
        }

        return false;
    }
}
