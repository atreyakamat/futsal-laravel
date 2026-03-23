<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\Booking;
use App\Http\Controllers\Api\SlotController;

// Slot Routes (web middleware ensures stable session IDs for lock ownership)
Route::middleware('web')->group(function () {
    Route::get('/slots/status', [SlotController::class, 'status']);
    Route::post('/slots/lock', [SlotController::class, 'lock']);
    Route::post('/slots/unlock', [SlotController::class, 'unlock']);
});

// Security Routes
Route::middleware(['auth'])->prefix('security')->group(function () {
    Route::get('/verify/{ticket_number}', function ($ticket_number) {
        $booking = Booking::where('ticket_number', $ticket_number)
            ->with('arena')
            ->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Invalid ticket number.']);
        }

        return response()->json(['success' => true, 'booking' => $booking]);
    });

    Route::post('/confirm-entry', function (Request $request) {
        $ticket_number = $request->input('ticket_number');
        
        $booking = Booking::where('ticket_number', $ticket_number)->first();
        
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Ticket not found.']);
        }

        if ($booking->checked_in) {
            return response()->json(['success' => false, 'message' => 'Already checked in.']);
        }

        $booking->update([
            'checked_in' => true,
            'checked_in_at' => now(),
            'checked_in_by' => auth()->id()
        ]);

        return response()->json(['success' => true, 'message' => 'Entry confirmed.']);
    });
});
