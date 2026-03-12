<?php

namespace App\Ai\Agents;

use App\Ai\Tools\CheckAvailabilityTool;
use App\Ai\Tools\GetPricingTool;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class BookingAssistant implements Agent, Conversational, HasTools
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return 'You are a helpful futsal booking assistant. Your job is to help users find available time slots and check prices for our futsal arenas. Always ask for the date, time slot, and arena if they do not provide them. The arenas are: 1 for Mapusa, 2 for Assagao, 3 for Panjim. Be friendly and concise.';
    }

    /**
     * Get the list of messages comprising the conversation so far.
     *
     * @return Message[]
     */
    public function messages(): iterable
    {
        return [];
    }

    /**
     * Get the tools available to the agent.
     *
     * @return Tool[]
     */
    public function tools(): iterable
    {
        return [
            new CheckAvailabilityTool,
            new GetPricingTool,
        ];
    }
}
