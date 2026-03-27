<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Services\PaymentService;
use App\Services\SlotService;
use App\Jobs\SendBookingNotificationsJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    protected $paymentService;
    protected $slotService;

    public function __construct(PaymentService $paymentService, SlotService $slotService)
    {
        $this->paymentService = $paymentService;
        $this->slotService = $slotService;
    }

    /**
     * Redirect to PayU payment page
     */
    public function checkout(string $bookingRef)
    {
        $bookings = Booking::where('booking_ref', $bookingRef)->get();
        
        if ($bookings->isEmpty()) {
            return redirect()->route('home')->with('error', 'Booking not found.');
        }

        $firstBooking = $bookings->first();
        $totalAmount = $bookings->sum('amount');

        $params = [
            'txnid' => $bookingRef,
            'amount' => number_format($totalAmount, 2, '.', ''),
            'productinfo' => 'Futsal Arena Booking: ' . $bookingRef,
            'firstname' => $firstBooking->customer_name,
            'email' => $firstBooking->customer_email ?: 'no-email@futsalgoa.com',
            'phone' => $firstBooking->customer_mobile,
            'surl' => route('payment.callback'),
            'furl' => route('payment.callback'),
        ];

        $hash = $this->paymentService->generateHash($params);
        $payuUrl = $this->paymentService->getPaymentUrl();
        $merchantKey = $this->paymentService->getMerchantKey();

        return view('booking.payu_redirect', compact('params', 'hash', 'payuUrl', 'merchantKey'));
    }

    /**
     * Handle PayU callback
     */
    public function callback(Request $request)
    {
        $status = $request->input('status');
        $bookingRef = $request->input('txnid');
        $mihpayid = $request->input('mihpayid');
        $hash = $request->input('hash');

        Log::info("PayU Callback received for {$bookingRef}. Status: {$status}");

        if ($status === 'success') {
            DB::transaction(function () use ($bookingRef, $mihpayid) {
                $bookings = Booking::where('booking_ref', $bookingRef)->get();
                
                foreach ($bookings as $booking) {
                    $booking->update([
                        'payment_status' => 'confirmed',
                        'payu_mihpayid' => $mihpayid,
                    ]);
                }

                $first = $bookings->first();
                // Invalidate cache
                $this->slotService->invalidateAvailabilityCache($first->arena_id, $first->booking_date);
                
                // Dispatch notifications
                SendBookingNotificationsJob::dispatch($bookingRef, $first->customer_email);
            });

            return redirect()->route('booking.success', ['ref' => $bookingRef]);
        }

        // Payment failed or cancelled
        Booking::where('booking_ref', $bookingRef)->update(['payment_status' => 'failed']);
        
        return redirect()->route('home')->with('error', 'Payment failed or was cancelled. Please try again.');
    }
}
