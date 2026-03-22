<?php

namespace App\Ai\Tools;

use App\Models\Booking;
use App\Models\SlotLock;
use App\Models\Pricing;
use App\Models\Arena;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetDayScheduleTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Get the full list of time slots for an arena on a specific date, indicating which are Available and which are Booked/Reserved.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $arenaId = $request['arena_id'];
        $date = $request['date'];

        $arena = Arena::find($arenaId);
        if (!$arena || !$arena->bot_enabled) {
            return "I'm sorry, but the AI Assistant is not enabled for this arena.";
        }

        // Get all pricing slots configured for this arena
        $slots = Pricing::where('arena_id', $arenaId)->orderBy('time_slot')->get();

        if ($slots->isEmpty()) {
            return "No slots are configured for {$arena->name} yet.";
        }

        // Get existing bookings for that date
        $bookedSlots = Booking::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->whereIn('payment_status', ['confirmed', 'pending'])
            ->pluck('time_slot')
            ->toArray();

        // Get active locks
        $lockedSlots = SlotLock::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('expires_at', '>', now())
            ->pluck('time_slot')
            ->toArray();

        $result = "Schedule for {$arena->name} on {$date}:\n";
        
        foreach ($slots as $slot) {
            $status = 'Available';
            if (in_array($slot->time_slot, $bookedSlots)) {
                $status = 'Booked';
            } elseif (in_array($slot->time_slot, $lockedSlots)) {
                $status = 'Reserved (in cart)';
            }
            
            $result .= "- {$slot->time_slot}: {$status} (₹{$slot->price})\n";
        }

        return $result;
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'arena_id' => $schema->integer()->description('The ID of the arena')->required(),
            'date' => $schema->string()->description('The date in YYYY-MM-DD format')->required(),
        ];
    }
}
