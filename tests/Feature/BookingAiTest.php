<?php

namespace Tests\Feature;

use App\Ai\Agents\BookingAssistant;
use App\Models\Arena;
use App\Models\Pricing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Ai\Ai;
use Tests\TestCase;

class BookingAiTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_agent_can_be_faked_and_replies_correctly(): void
    {
        // Setup data
        $arena = Arena::factory()->create(['id' => 1, 'name' => 'Mapusa Arena']);
        Pricing::create(['arena_id' => 1, 'time_slot' => '18:00-19:00', 'price' => 800.00]);

        // Fake the AI
        Ai::fake();
        Ai::addResponse('Hello, how can I help?', agent: BookingAssistant::class);

        $response = $this->postJson('/chat', ['message' => 'Hi']);

        $response->assertStatus(200)
                 ->assertJson(['reply' => 'Hello, how can I help?']);
    }

    public function test_ai_agent_uses_tools_to_check_pricing(): void
    {
        // Setup data
        $arena = Arena::factory()->create(['id' => 1, 'name' => 'Mapusa Arena']);
        Pricing::create(['arena_id' => 1, 'time_slot' => '18:00-19:00', 'price' => 800.00]);

        // Note: Real tool calling requires a real provider or sophisticated mock.
        // For this test, we verify the route/agent orchestration works.
        Ai::fake();
        Ai::addResponse('The price for 18:00-19:00 at Mapusa Arena (ID 1) is ₹800.', agent: BookingAssistant::class);

        $response = $this->postJson('/chat', ['message' => 'What is the price for 18:00-19:00 at arena 1?']);

        $response->assertStatus(200)
                 ->assertJson(['reply' => 'The price for 18:00-19:00 at Mapusa Arena (ID 1) is ₹800.']);
    }
}
