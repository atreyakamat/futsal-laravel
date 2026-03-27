<?php

namespace Tests\Feature;

use App\Models\Arena;
use App\Models\Booking;
use App\Models\User;
use App\Models\UserOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerFeatureTest extends TestCase
{
    use RefreshDatabase, WithoutMiddleware;

    /** @test */
    public function user_can_request_otp()
    {
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class);

        $response = $this->postJson('/send-otp', [
            'identifier' => 'test@example.com'
        ]);

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertDatabaseHas('user_otps', [
            'identifier' => 'test@example.com'
        ]);
    }

    /** @test */
    public function user_can_login_with_valid_otp()
    {
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class);

        // First request OTP
        $this->postJson('/send-otp', ['identifier' => 'test@example.com']);
        
        // Retrieve the generated OTP from DB
        $userOtp = UserOtp::where('identifier', 'test@example.com')->first();
        
        // We can't directly read the hashed OTP, so we'll just mock the db entry with a known hash
        $knownOtp = '1234';
        $userOtp->update(['otp' => Hash::make($knownOtp)]);

        $response = $this->postJson('/verify-otp', [
            'identifier' => 'test@example.com',
            'otp' => $knownOtp
        ]);

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);

        $this->assertAuthenticated();
    }

    /** @test */
    public function user_can_view_their_dashboard()
    {
        $user = User::factory()->create();
        $arena = Arena::create(['name' => 'Test', 'slug' => 'test']);
        
        Booking::create([
            'arena_id' => $arena->id,
            'user_id' => $user->id,
            'booking_date' => now()->format('Y-m-d'),
            'time_slot' => '18:00-19:00',
            'customer_name' => 'John Doe',
            'customer_mobile' => '9999999999',
            'amount' => 1000,
            'payment_status' => 'confirmed',
            'ticket_number' => 'TKT-TEST',
            'booking_ref' => 'REF-TEST'
        ]);

        $this->actingAs($user)
             ->get('/my-bookings')
             ->assertStatus(200)
             ->assertSee('REF-TEST');
    }

    /** @test */
    public function public_can_verify_valid_ticket()
    {
        $arena = Arena::create(['name' => 'Test Arena', 'slug' => 'test-arena']);
        
        Booking::create([
            'arena_id' => $arena->id,
            'booking_date' => now()->format('Y-m-d'),
            'time_slot' => '18:00-19:00',
            'customer_name' => 'John Doe',
            'customer_mobile' => '9999999999',
            'amount' => 1000,
            'payment_status' => 'confirmed',
            'ticket_number' => 'TKT-PUBLIC-123'
        ]);

        $this->get('/verify-ticket/TKT-PUBLIC-123')
             ->assertStatus(200)
             ->assertSee('VALID')
             ->assertSee('TICKET')
             ->assertSee('Test Arena');
    }
}
