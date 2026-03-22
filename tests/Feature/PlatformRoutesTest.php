<?php

namespace Tests\Feature;

use App\Models\Arena;
use App\Models\Pricing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Tests\TestCase;

class PlatformRoutesTest extends TestCase
{
    use RefreshDatabase, WithoutMiddleware;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create basic data for tests
        $this->arena = Arena::factory()->create([
            'name' => 'Test Arena',
            'slug' => 'test-arena',
            'status' => 'active'
        ]);

        Pricing::create([
            'arena_id' => $this->arena->id,
            'time_slot' => '18:00-19:00',
            'price' => 1000
        ]);
    }

    public function test_home_page_loads_successfully()
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertSee('Test Arena');
    }

    public function test_arena_show_page_loads_successfully()
    {
        $response = $this->get('/arena/test-arena');
        $response->assertStatus(200);
    }

    public function test_checkout_page_redirects_if_missing_parameters()
    {
        $response = $this->get('/checkout');
        $response->assertRedirect(route('home'));
    }

    public function test_checkout_page_loads_with_parameters()
    {
        $response = $this->get('/checkout?arena_id=' . $this->arena->id . '&date=2026-04-01&slots=' . urlencode('["18:00-19:00"]'));
        $response->assertStatus(200);
        $response->assertSee('1,000');
    }

    public function test_process_booking_validates_and_redirects_on_success()
    {
        $response = $this->post('/process-booking', [
            'arena_id' => $this->arena->id,
            'date' => '2026-04-01',
            'slots' => '["18:00-19:00"]',
            'customer_name' => 'John Doe',
            'customer_mobile' => '1234567890',
            'customer_email' => 'john@example.com'
        ]);

        $response->assertStatus(302);
        $response->assertRedirectToRoute('booking.success', ['ref' => \App\Models\Booking::first()->booking_ref]);
        
        $this->assertDatabaseHas('bookings', [
            'customer_name' => 'John Doe',
            'arena_id' => $this->arena->id,
            'time_slot' => '18:00-19:00'
        ]);
    }

    public function test_api_slots_status()
    {
        $response = $this->getJson('/api/slots/status?arena_id=' . $this->arena->id . '&date=2026-04-01');
        
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'arena',
            'date',
            'slots' => [
                '*' => ['time_slot', 'price', 'status']
            ]
        ]);
    }

    public function test_api_status_validation_fails_for_invalid_arena()
    {
        $response = $this->getJson('/api/slots/status?arena_id=999&date=2026-04-01');
        $response->assertStatus(422);
    }

    public function test_api_lock_slots_validation()
    {
        $response = $this->postJson('/api/slots/lock', [
            'arena_id' => $this->arena->id,
            'date' => '2026-04-01',
            'slots' => ['18:00-19:00']
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }

    public function test_double_booking_prevention_on_process()
    {
        // First booking
        \App\Models\Booking::create([
            'arena_id' => $this->arena->id,
            'booking_date' => '2026-04-01',
            'time_slot' => '18:00-19:00',
            'booking_ref' => 'REF-OLD',
            'customer_name' => 'Old Customer',
            'customer_mobile' => '0000000000',
            'amount' => 1000,
            'payment_status' => 'confirmed',
            'ticket_number' => 'TKT-OLD'
        ]);

        // Attempt second booking for same slot
        $response = $this->from('/checkout')->post('/process-booking', [
            'arena_id' => $this->arena->id,
            'date' => '2026-04-01',
            'slots' => '["18:00-19:00"]',
            'customer_name' => 'New Customer',
            'customer_mobile' => '1111111111'
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['slots']);
    }
}
