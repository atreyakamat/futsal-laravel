<?php

namespace App\Http\Controllers\Security;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class SecurityController extends Controller
{
    public function index()
    {
        return view('security.verify');
    }

    public function verify(Request $request)
    {
        $request->validate(['ticket_number' => 'required|string']);

        $bookings = Booking::where('ticket_number', $request->ticket_number)
            ->with('arena')
            ->get();

        if ($bookings->isEmpty()) {
            return redirect()->back()->with('error', 'Invalid ticket number.');
        }

        return view('security.verify', compact('bookings'));
    }

    public function confirmEntry(Request $request)
    {
        $request->validate(['booking_ref' => 'required|string']);

        Booking::where('booking_ref', $request->booking_ref)->update([
            'payment_status' => 'confirmed' // Or a new status like 'checked_in'
        ]);

        return redirect()->route('security.index')->with('success', 'Entry confirmed for booking: ' . $request->booking_ref);
    }
}
