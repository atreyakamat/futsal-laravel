<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Arena;
use App\Models\Booking;
use App\Models\Pricing;
use App\Models\ApprovalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class AdminBookingController extends Controller
{
    public function create()
    {
        $arenas = Arena::all();
        return view('admin.bookings.create', compact('arenas'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'arena_id' => 'required|exists:arenas,id',
            'date' => 'required|date',
            'slots' => 'required|array',
            'customer_name' => 'required|string',
            'customer_mobile' => 'required|string',
            'is_free' => 'boolean',
            'reason' => 'required_if:is_free,1|string|nullable'
        ]);

        $data = $request->all();

        if ($request->is_free) {
            ApprovalRequest::create([
                'user_id' => auth()->id(),
                'type' => 'free_booking',
                'data' => $data,
                'reason' => $request->reason,
                'status' => 'pending',
                'otp' => rand(100000, 999999)
            ]);

            return redirect()->back()->with('success', 'Free booking request sent to Super Admin for approval.');
        }

        // Normal admin booking (paid)
        $bookingRef = 'ADM-' . strtoupper(Str::random(8));
        
        DB::transaction(function () use ($request, $bookingRef) {
            foreach ($request->slots as $slot) {
                $price = Pricing::where('arena_id', $request->arena_id)->where('time_slot', $slot)->first()->price;

                Booking::create([
                    'arena_id' => $request->arena_id,
                    'booking_date' => $request->date,
                    'time_slot' => $slot,
                    'booking_ref' => $bookingRef,
                    'customer_name' => $request->customer_name,
                    'customer_mobile' => $request->customer_mobile,
                    'amount' => $price,
                    'payment_status' => 'confirmed',
                    'payment_method' => 'admin_backend',
                    'ticket_number' => 'TKT-' . date('ymd') . '-' . strtoupper(Str::random(4))
                ]);
            }
        });

        return redirect()->back()->with('success', 'Booking created successfully. Ref: ' . $bookingRef);
    }
}
