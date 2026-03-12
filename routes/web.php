<?php

use App\Ai\Agents\BookingAssistant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/chat', function () {
    return view('chat');
});

Route::post('/chat', function (Request $request) {
    $prompt = $request->input('message');
    
    $response = (new BookingAssistant)->prompt($prompt);
    
    return response()->json([
        'reply' => (string) $response
    ]);
});
