<?php

use App\Http\Controllers\ArenaController;
use App\Http\Controllers\BookingController;
use App\Ai\Agents\BookingAssistant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', [ArenaController::class, 'index'])->name('home');
Route::get('/arena/{slug}', [ArenaController::class, 'show'])->name('arena.show');

Route::get('/checkout', [BookingController::class, 'checkout'])->name('booking.checkout');
Route::post('/process-booking', [BookingController::class, 'process'])->name('booking.process');
Route::get('/booking/success/{ref}', function ($ref) {
    $booking = \App\Models\Booking::where('booking_ref', $ref)->firstOrFail();
    return view('booking.success', compact('booking'));
})->name('booking.success');

// Admin & Super Admin Routes
Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    // Admin Booking
    Route::get('/bookings/create', [App\Http\Controllers\Admin\AdminBookingController::class, 'create'])->name('bookings.create');
    Route::post('/bookings', [App\Http\Controllers\Admin\AdminBookingController::class, 'store'])->name('bookings.store');

    // Approvals (Super Admin Only)
    Route::get('/approvals', [App\Http\Controllers\Admin\ApprovalController::class, 'index'])->name('approvals.index');
    Route::post('/approvals/{approvalRequest}/approve', [App\Http\Controllers\Admin\ApprovalController::class, 'approve'])->name('approvals.approve');
    Route::post('/approvals/confirm-free', [App\Http\Controllers\Admin\ApprovalController::class, 'confirmFreeBooking'])->name('approvals.confirm-free');
});

// Security Routes
Route::middleware(['auth'])->prefix('security')->name('security.')->group(function () {
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
    
    $provider = env('AI_PROVIDER', config('ai.default'));
    $model = env('AI_MODEL');

    $agent = new BookingAssistant();
    $response = $agent->prompt($prompt, provider: $provider, model: $model);
    
    return response()->json(['reply' => (string) $response]);
});
