<?php

namespace App\Http\Controllers;

use App\Models\Arena;
use App\Models\Pricing;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

use App\Services\WhatsappService;

class BookingController extends Controller
{
    protected $whatsappService;

    public function __construct(WhatsappService $whatsappService)
    {
        $this->whatsappService = $whatsappService;
    }

    public function checkout(Request $request)
    {
        $arenaId = $request->query('arena_id');
        $date = $request->query('date');
        $slots = json_decode($request->query('slots', '[]'), true);

        if (!$arenaId || !$date || empty($slots)) {
            return redirect()->route('home');
        }

        $arena = Arena::findOrFail($arenaId);
        
        $pricing = Pricing::where('arena_id', $arenaId)
            ->whereIn('time_slot', $slots)
            ->get();

        $total = $pricing->sum('price');

        return view('booking.checkout', compact('arena', 'date', 'slots', 'pricing', 'total'));
    }

    public function process(Request $request)
    {
        $request->validate([
            'arena_id' => 'required',
            'date' => 'required|date',
            'slots' => 'required',
            'customer_name' => 'required|string|max:100',
            'customer_mobile' => 'required|string|max:15',
            'customer_email' => 'nullable|email|max:100',
        ]);

        $arenaId = $request->arena_id;
        $date = $request->date;
        $slots = json_decode($request->slots, true);
        $bookingRef = 'REF-' . strtoupper(Str::random(8));

        \Illuminate\Support\Facades\DB::transaction(function () use ($slots, $arenaId, $date, $bookingRef, $request) {
            foreach ($slots as $slot) {
                // Ensure pricing exists or fail
                $pricing = Pricing::where('arena_id', $arenaId)->where('time_slot', $slot)->firstOrFail();

                // Prevent double booking
                $isBooked = Booking::where('arena_id', $arenaId)
                    ->where('booking_date', $date)
                    ->where('time_slot', $slot)
                    ->whereIn('payment_status', ['confirmed', 'pending'])
                    ->exists();

                if ($isBooked) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'slots' => "Slot {$slot} has already been booked."
                    ]);
                }

                Booking::create([
                    'arena_id' => $arenaId,
                    'booking_date' => $date,
                    'time_slot' => $slot,
                    'booking_ref' => $bookingRef,
                    'customer_name' => $request->customer_name,
                    'customer_mobile' => $request->customer_mobile,
                    'customer_email' => $request->customer_email,
                    'amount' => $pricing->price,
                    'payment_status' => 'confirmed', // Auto-confirming for now as we don't have real PayU keys
                    'payment_method' => 'online',
                    'ticket_number' => 'TKT-' . date('ymd') . '-' . strtoupper(Str::random(4))
                ]);
            }

            // Release locks
            \App\Models\SlotLock::where('session_id', session()->getId())->delete();
            
            // Send WhatsApp notification
            $this->whatsappService->sendBookingConfirmation($bookingRef);

            // Send Email Ticket
            try {
                if ($request->customer_email) {
                    \Illuminate\Support\Facades\Mail::to($request->customer_email)
                        ->send(new \App\Mail\BookingTicket(Booking::where('booking_ref', $bookingRef)->first()));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send ticket email: ' . $e->getMessage());
            }
        });

        return redirect()->route('booking.success', ['ref' => $bookingRef]);
    }
}
