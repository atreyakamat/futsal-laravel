<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Services\WhatsappService;
use App\Mail\BookingTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendBookingNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $bookingRef;
    protected $customerEmail;

    /**
     * Create a new job instance.
     */
    public function __construct(string $bookingRef, ?string $customerEmail = null)
    {
        $this->bookingRef = $bookingRef;
        $this->customerEmail = $customerEmail;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsappService $whatsappService): void
    {
        // 1. Send WhatsApp notification
        try {
            $whatsappService->sendBookingConfirmation($this->bookingRef);
        } catch (\Exception $e) {
            Log::error("Failed to send WhatsApp in job for {$this->bookingRef}: " . $e->getMessage());
        }

        // 2. Send Email Ticket
        if ($this->customerEmail) {
            try {
                $allBookings = Booking::where('booking_ref', $this->bookingRef)->with('arena')->get();
                if ($allBookings->isNotEmpty()) {
                    Mail::to($this->customerEmail)->send(new BookingTicket($allBookings));
                }
            } catch (\Exception $e) {
                Log::error("Failed to send Email in job for {$this->bookingRef}: " . $e->getMessage());
            }
        }
    }
}
