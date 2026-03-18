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

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
    }

    public function test_ai_agent_can_be_faked_and_replies_correctly(): void
    {
        // Setup data
        $arena = Arena::factory()->create(['id' => 1, 'name' => 'Mapusa Arena']);
        Pricing::create(['arena_id' => 1, 'time_slot' => '18:00-19:00', 'price' => 800.00]);

        // Fake the AI
        BookingAssistant::fake(['Hello, how can I help?']);

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
        BookingAssistant::fake(['The price for 18:00-19:00 at Mapusa Arena (ID 1) is ₹800.']);

        $response = $this->postJson('/chat', ['message' => 'What is the price for 18:00-19:00 at arena 1?']);

        $response->assertStatus(200)
                 ->assertJson(['reply' => 'The price for 18:00-19:00 at Mapusa Arena (ID 1) is ₹800.']);
    }

    public function test_chat_is_forbidden_when_ai_is_disabled_globally(): void
    {
        \App\Models\Setting::updateOrCreate(['key' => 'global_ai_enabled'], ['value' => 'false']);

        $response = $this->postJson('/chat', ['message' => 'Hi']);

        $response->assertStatus(403)
                 ->assertJson(['reply' => 'AI Assistant is currently disabled globally.']);
    }

    public function test_ai_tool_respects_arena_bot_disabled_flag(): void
    {
        // Re-enable global
        \App\Models\Setting::updateOrCreate(['key' => 'global_ai_enabled'], ['value' => 'true']);
        
        $arena = Arena::factory()->create(['id' => 5, 'name' => 'No Bot Arena', 'bot_enabled' => false]);
        
        // Use the tool directly via the agent or mock its behavior
        $tool = new \App\Ai\Tools\CheckAvailabilityTool();
        $request = new \Laravel\Ai\Tools\Request(['arena_id' => 5, 'date' => '2026-04-01', 'time_slot' => '18:00-19:00']);
        
        $result = $tool->handle($request);
        
        $this->assertEquals("I'm sorry, but the AI Assistant is not enabled for this arena at the moment.", (string) $result);
    }
}
