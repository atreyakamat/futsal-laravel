<?php

namespace App\Ai\Tools;

use App\Models\Booking;
use App\Models\SlotLock;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class CheckAvailabilityTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Check if a specific time slot at a given arena is available for booking on a particular date.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $arenaId = $request->get('arena_id');
        $date = $request->get('date');
        $timeSlot = $request->get('time_slot');

        // Check if there is an existing confirmed booking
        $isBooked = Booking::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('time_slot', $timeSlot)
            ->whereIn('payment_status', ['confirmed', 'pending'])
            ->exists();

        if ($isBooked) {
            return "The slot {$timeSlot} on {$date} is currently booked or pending payment.";
        }

        // Check if it's temporarily locked
        $isLocked = SlotLock::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('time_slot', $timeSlot)
            ->where('expires_at', '>', now())
            ->exists();

        if ($isLocked) {
            return "The slot {$timeSlot} on {$date} is currently in someone's checkout cart.";
        }

        return "The slot {$timeSlot} on {$date} is available for booking!";
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'arena_id' => $schema->integer()->description('The ID of the arena (e.g., 1 for Mapusa, 2 for Assagao, 3 for Panjim)')->required(),
            'date' => $schema->string()->description('The booking date in YYYY-MM-DD format')->required(),
            'time_slot' => $schema->string()->description('The time slot to check in HH:MM-HH:MM format (e.g., 18:00-19:00)')->required(),
        ];
    }
}
