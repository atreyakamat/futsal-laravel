<?php

namespace App\Ai\Agents;

use App\Ai\Tools\CheckAvailabilityTool;
use App\Ai\Tools\GetPricingTool;
use App\Ai\Tools\BookSlotTool;
use App\Ai\Tools\GetDayScheduleTool;
use App\Models\Arena;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Messages\UserMessage;
use Laravel\Ai\Messages\AssistantMessage;
use Laravel\Ai\Promptable;
use Stringable;
use Illuminate\Support\Facades\Session;

class BookingAssistant implements Agent, Conversational, HasTools
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        $arenas = Arena::where('status', 'active')->get(['id', 'name']);
        $arenaList = $arenas->map(fn($a) => "[CHOICE: {$a->name}]")->implode(' ');
        
        return "You are the 'FutsalGoa' AI Concierge. You must guide users through a booking flow.
        
        STRICT FLOW:
        1. GREETING: Welcome them and list arenas: {$arenaList}.
        2. AFTER ARENA PICKED: Ask for the date. Suggest [CHOICE: Today] [CHOICE: Tomorrow].
        3. AFTER DATE PICKED: 
           - Use 'GetDayScheduleTool' to see all slots.
           - List all slots. For 'Available' slots, wrap them in [CHOICE: HH:MM-HH:MM]. 
           - For 'Booked' or 'Reserved' slots, just list them as text (e.g., '18:00-19:00 (Booked) ❌'). 
           - Users CANNOT click booked slots.
        4. AFTER SLOT PICKED: Use 'BookSlotTool' to reserve it and provide the checkout link.
        
        STRICT RULES:
        - NEVER suggest a booked slot as a choice.
        - If a user tries to book a booked slot manually, tell them it's unavailable and show the schedule again.
        - IMPORTANT: Final message MUST include the checkout URL for the auto-redirect to work.
        - Use ⚽, 🏟️, and 📅 emojis.";
    }

    public function messages(): iterable
    {
        $history = Session::get('chat_history', []);
        $messages = [];
        foreach ($history as $msg) {
            $messages[] = ($msg['role'] === 'user') ? new UserMessage($msg['content']) : new AssistantMessage($msg['content']);
        }
        return $messages;
    }

    public function tools(): iterable
    {
        return [
            new CheckAvailabilityTool,
            new GetPricingTool,
            new BookSlotTool,
            new GetDayScheduleTool,
        ];
    }
}
