<?php

namespace App\Ai\Tools;

use App\Models\Pricing;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GetPricingTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Get the pricing in INR for a specific time slot at a given arena.';
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $arenaId = $request['arena_id'];
        $timeSlot = $request['time_slot'];

        $arena = \App\Models\Arena::find($arenaId);
        if (!$arena || !$arena->bot_enabled) {
            return "I'm sorry, but the AI Assistant is not enabled for this arena at the moment.";
        }

        $pricing = Pricing::where('arena_id', $arenaId)
            ->where('time_slot', $timeSlot)
            ->first();

        if (!$pricing) {
            return "Pricing information is not available for slot {$timeSlot} at the selected arena.";
        }

        return "The price for slot {$timeSlot} is ₹{$pricing->price}.";
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'arena_id' => $schema->integer()->description('The ID of the arena (e.g., 1 for Mapusa, 2 for Assagao, 3 for Panjim)')->required(),
            'time_slot' => $schema->string()->description('The time slot to get pricing for in HH:MM-HH:MM format (e.g., 18:00-19:00)')->required(),
        ];
    }
}
