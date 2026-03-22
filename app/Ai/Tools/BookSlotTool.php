<?php

namespace App\Ai\Tools;

use App\Models\Booking;
use App\Models\SlotLock;
use App\Models\Arena;
use App\Models\Pricing;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;
use Illuminate\Support\Facades\Session;

class BookSlotTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Initiate a booking for a specific slot. This will lock the slot and provide a checkout link.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $arenaId = $request['arena_id'];
        $date = $request['date'];
        $timeSlot = $request['time_slot'];

        $arena = Arena::find($arenaId);
        if (!$arena || !$arena->bot_enabled) {
            return "I'm sorry, but booking is not enabled for this arena through the assistant.";
        }

        // Check if pricing exists for this slot
        $pricing = Pricing::where('arena_id', $arenaId)
            ->where('time_slot', $timeSlot)
            ->first();

        if (!$pricing) {
            return "I'm sorry, but we don't have pricing setup for {$timeSlot}. Please choose a common time slot.";
        }

        // Check availability
        $isBooked = Booking::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('time_slot', $timeSlot)
            ->whereIn('payment_status', ['confirmed', 'pending'])
            ->exists();

        if ($isBooked) {
            return "Too late! The slot {$timeSlot} on {$date} was just booked.";
        }

        // Create a lock
        SlotLock::updateOrCreate(
            [
                'arena_id' => $arenaId,
                'booking_date' => $date,
                'time_slot' => $timeSlot,
            ],
            [
                'session_id' => Session::getId(),
                'expires_at' => now()->addMinutes(2),
            ]
        );

        $checkoutUrl = route('booking.checkout', [
            'arena_id' => $arenaId,
            'date' => $date,
            'slots' => json_encode([$timeSlot])
        ]);

        return "Great! I've reserved the {$timeSlot} slot at {$arena->name} for you. It's locked for the next 2 minutes. You can complete your payment here: {$checkoutUrl}";
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'arena_id' => $schema->integer()->description('The ID of the arena')->required(),
            'date' => $schema->string()->description('The booking date in YYYY-MM-DD format')->required(),
            'time_slot' => $schema->string()->description('The time slot in HH:MM-HH:MM format')->required(),
        ];
    }
}
