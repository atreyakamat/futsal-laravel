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
        $arenaChoices = $arenas->map(fn($a) => "[CHOICE: {$a->name}]")->implode(' ');
        
        return "You are the 'FutsalGoa' AI Concierge.
        
        FLOW:
        1. Start by listing arenas exactly like this: {$arenaChoices}.
        2. When an arena is chosen, ask for the date. Suggest [CHOICE: Today] [CHOICE: Tomorrow].
        3. When a date is chosen, use 'GetDayScheduleTool'.
           - List all available slots as [CHOICE: HH:MM-HH:MM].
           - List booked slots as text only (e.g., 18:00-19:00 Booked ❌).
        4. When they pick a slot, use 'BookSlotTool' and give them the checkout link.
        
        STRICT RULES:
        - ONLY use [CHOICE: text] for things the user can click.
        - ALWAYS format dates as YYYY-MM-DD for tools.
        - NEVER suggest a booked slot as a [CHOICE].
        - Use emojis ⚽🏟️. Keep responses short.";
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
