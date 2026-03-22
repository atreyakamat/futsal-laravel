<?php

use App\Http\Controllers\ArenaController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\AuthController;
use App\Ai\Agents\BookingAssistant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', [ArenaController::class, 'index'])->name('home');
Route::get('/arena/{slug}', [ArenaController::class, 'show'])->name('arena.show');

// Auth Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/send-otp', [AuthController::class, 'sendOtp'])->name('send-otp');
Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->name('verify-otp');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// User Dashboard
Route::middleware(['auth'])->group(function () {
    Route::get('/my-bookings', function () {
        $bookings = \App\Models\Booking::where('user_id', auth()->id())
            ->with('arena')
            ->latest()
            ->get()
            ->groupBy('booking_ref');
        return view('booking.my-bookings', compact('bookings'));
    })->name('my-bookings');

    Route::get('/booking/ticket/{ref}', function ($ref) {
        $bookings = \App\Models\Booking::where('booking_ref', $ref)
            ->where('user_id', auth()->id())
            ->get();
        if ($bookings->isEmpty()) abort(404);
        
        $ticketService = app(\App\Services\TicketService::class);
        $pdfContent = $ticketService->generateTicketPdf($bookings->first());
        
        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="ticket.pdf"');
    })->name('booking.ticket.download');
});

// Ticket Verification (Public)
Route::get('/verify-ticket/{ticket_number}', function ($ticket_number) {
    $booking = \App\Models\Booking::where('ticket_number', $ticket_number)->with('arena')->firstOrFail();
    return view('booking.verify-public', compact('booking'));
})->name('ticket.verify.public');

Route::get('/checkout', [BookingController::class, 'checkout'])->name('booking.checkout');
Route::post('/process-booking', [BookingController::class, 'process'])->name('booking.process');
Route::get('/booking/success/{ref}', function ($ref) {
    $booking = \App\Models\Booking::where('booking_ref', $ref)->firstOrFail();
    return view('booking.success', compact('booking'));
})->name('booking.success');

// Admin & Super Admin Routes
Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    // Admin Booking (Migrated to Filament BookingResource\Pages\AdminBooking)
    // Route::get('/bookings/create', [App\Http\Controllers\Admin\AdminBookingController::class, 'create'])->name('bookings.create');
    // Route::post('/bookings', [App\Http\Controllers\Admin\AdminBookingController::class, 'store'])->name('bookings.store');

    // Approvals (Migrated to Filament ApprovalRequestResource)
    // Route::get('/approvals', [App\Http\Controllers\Admin\ApprovalController::class, 'index'])->name('approvals.index');
    // Route::post('/approvals/{approvalRequest}/approve', [App\Http\Controllers\Admin\ApprovalController::class, 'approve'])->name('approvals.approve');
    // Route::post('/approvals/confirm-free', [App\Http\Controllers\Admin\ApprovalController::class, 'confirmFreeBooking'])->name('approvals.confirm-free');
});

// Security Routes
Route::middleware(['auth'])->prefix('security')->name('security.')->group(function () {
    Route::get('/scan', function () {
        return view('security.scan');
    })->name('scan');
    Route::get('/verify', [App\Http\Controllers\Security\SecurityController::class, 'index'])->name('index');
    Route::post('/verify', [App\Http\Controllers\Security\SecurityController::class, 'verify'])->name('verify');
    Route::post('/confirm-entry', [App\Http\Controllers\Security\SecurityController::class, 'confirmEntry'])->name('confirm-entry');
});

Route::get('/chat', function () {
    $globalAiEnabled = \App\Models\Setting::where('key', 'global_ai_enabled')->first()->value ?? 'true';
    if ($globalAiEnabled !== 'true') {
        return redirect()->route('home')->with('error', 'AI Assistant is currently disabled globally by the administrator.');
    }
    return view('chat');
})->name('chat');

Route::post('/chat', function (Request $request) {
    $globalAiEnabled = \App\Models\Setting::where('key', 'global_ai_enabled')->first()->value ?? 'true';
    if ($globalAiEnabled !== 'true') {
        return response()->json(['reply' => 'AI Assistant is currently disabled globally.'], 403);
    }

    $prompt = $request->input('message');
    
    // Add user message to history
    $history = session()->get('chat_history', []);
    $history[] = ['role' => 'user', 'content' => $prompt];

    $provider = env('AI_PROVIDER', config('ai.default'));
    $model = env('AI_MODEL');

    $agent = new BookingAssistant();
    $response = $agent->prompt($prompt, provider: $provider, model: $model);
    
    $reply = (string) $response;

    // Add assistant message to history
    $history[] = ['role' => 'assistant', 'content' => $reply];
    
    // Keep only last 10 messages to save context
    if (count($history) > 10) {
        $history = array_slice($history, -10);
    }
    
    session()->put('chat_history', $history);
    
    return response()->json(['reply' => $reply]);
});
