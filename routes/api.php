<?php

use App\Http\Controllers\Api\SlotController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function () {
    Route::get('/slots/status', [SlotController::class, 'status']);
    Route::post('/slots/lock', [SlotController::class, 'lock']);
    Route::post('/slots/unlock', [SlotController::class, 'unlock']);
});
