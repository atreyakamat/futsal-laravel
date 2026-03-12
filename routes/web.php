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

Route::get('/chat', function () {
    return view('chat');
})->name('chat');

Route::post('/chat', function (Request $request) {
    $prompt = $request->input('message');
    $response = (new BookingAssistant)->prompt($prompt);
    return response()->json(['reply' => (string) $response]);
});
