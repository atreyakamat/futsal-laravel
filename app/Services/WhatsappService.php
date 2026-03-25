<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class WhatsappService
{
    /**
     * Send a booking confirmation message via WhatsApp using AISENSY API.
     */
    public function sendBookingConfirmation(string $bookingRef): bool
    {
        $bookings = Booking::where('booking_ref', $bookingRef)->with('arena')->get();

        if ($bookings->isEmpty()) {
            return false;
        }

        $apiKey = config('services.aisensy.api_key');
        $campaignName = config('services.aisensy.campaign_name');

        if (empty($apiKey)) {
            Log::warning('AISENSY API key not configured. Skipping WhatsApp notification.');
            return false;
        }

        $firstBooking = $bookings->first();
        $arena = $firstBooking->arena;
        $customerName = $firstBooking->customer_name;
        $customerMobile = $firstBooking->customer_mobile;

        // Ensure mobile has country code for AISENSY
        $mobileDigits = preg_replace('/[^0-9]/', '', $customerMobile);
        if (strlen($mobileDigits) === 10) {
            $mobileDigits = '91' . $mobileDigits;
        }

        $date = date('d M Y', strtotime($firstBooking->booking_date));

        // Use SlotMergeService to display merged consecutive slots
        $slots = $bookings->pluck('time_slot')->toArray();
        $mergedSlots = SlotMergeService::mergeSlots($slots);

        $paymentStatus = $firstBooking->payment_status === 'confirmed' ? 'Received' : 'Pending (Pay at Arena)';

        $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=" . $firstBooking->ticket_number;

        // AISENSY Payload matching template parameters
        $payload = [
            'apiKey' => $apiKey,
            'campaignName' => $campaignName,
            'destination' => $mobileDigits,
            'userName' => $arena->name,
            'templateParams' => [
                $customerName,
                $arena->name,
                $date . " (" . $mergedSlots . ")",
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
                            'text' => $bookingRef
                        ]
                    ]
                ]
            ],
            'paramsFallbackValue' => [
                'FirstName' => $customerName
            ]
        ];

        Log::info("Attempting to send AISENSY WhatsApp to {$mobileDigits} for campaign: {$campaignName}");

        try {
            $response = Http::post('https://backend.aisensy.com/campaign/t1/api/v2', $payload);

            if ($response->successful()) {
                Log::info("WhatsApp sent successfully via AISENSY. Response: " . $response->body());
                return true;
            }

            Log::error("AISENSY API Error: " . $response->status() . " - " . $response->body());
        } catch (\Exception $e) {
            Log::error("AISENSY Connection Exception: " . $e->getMessage());
        }

        return false;
    }
}
