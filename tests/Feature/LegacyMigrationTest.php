<?php

namespace Tests\Feature;

use App\Models\Arena;
use App\Models\Booking;
use App\Models\Pricing;
use App\Models\Setting;
use App\Models\User;
use App\Models\ApprovalRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Livewire\Livewire;
use App\Filament\Resources\BookingResource\Pages\AdminBooking;
use App\Filament\Resources\ApprovalRequestResource\Pages\GlobalSettings;

class LegacyMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $superAdmin;
    protected $security;
    protected $arena;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@futsalgoa.com',
            'password' => bcrypt('password'),
            'role' => 'admin'
        ]);

        $this->superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@futsalgoa.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin'
        ]);

        $this->security = User::create([
            'name' => 'Security User',
            'email' => 'security@futsalgoa.com',
            'password' => bcrypt('password'),
            'role' => 'security'
        ]);

        $this->arena = Arena::create([
            'name' => 'Test Arena',
            'slug' => 'test-arena',
            'address' => '123 Test St',
            'contact_phone' => '1234567890',
            'status' => 'active'
        ]);

        Pricing::create(['arena_id' => $this->arena->id, 'time_slot' => '18:00-19:00', 'price' => 1000]);
        Pricing::create(['arena_id' => $this->arena->id, 'time_slot' => '19:00-20:00', 'price' => 1000]);
        
        Setting::create(['key' => 'global_ai_enabled', 'value' => 'true']);
    }

    /** @test */
    public function admin_can_create_a_paid_booking()
    {
        $this->actingAs($this->admin);

        Livewire::test(AdminBooking::class)
            ->set('data.arena_id', $this->arena->id)
            ->set('data.date', now()->format('Y-m-d'))
            ->set('data.slots', ['18:00-19:00', '19:00-20:00'])
            ->set('data.customer_name', 'John Doe')
            ->set('data.customer_mobile', '9876543210')
            ->set('data.is_free', false)
            ->call('submitBooking')
            ->assertHasNoErrors();

        $this->assertEquals(2, Booking::where('customer_name', 'John Doe')->count());
    }

    /** @test */
    public function admin_can_request_a_free_booking_for_approval()
    {
        $this->actingAs($this->admin);

        Livewire::test(AdminBooking::class)
            ->set('data.arena_id', $this->arena->id)
            ->set('data.date', now()->format('Y-m-d'))
            ->set('data.slots', ['18:00-19:00'])
            ->set('data.customer_name', 'Free User')
            ->set('data.customer_mobile', '9876543210')
            ->set('data.is_free', true)
            ->set('data.reason', 'VIP Guest')
            ->call('submitBooking');

        $this->assertEquals(1, ApprovalRequest::where('type', 'free_booking')->count());
        $this->assertEquals('pending', ApprovalRequest::first()->status);
    }

    /** @test */
    public function super_admin_can_approve_free_booking_request()
    {
        $request = ApprovalRequest::create([
            'user_id' => $this->admin->id,
            'type' => 'free_booking',
            'data' => [
                'arena_id' => $this->arena->id,
                'date' => now()->format('Y-m-d'),
                'slots' => ['18:00-19:00'],
                'customer_name' => 'Free VIP',
                'customer_mobile' => '9876543210'
            ],
            'reason' => 'VIP Guest',
            'status' => 'pending',
            'otp' => '123456'
        ]);

        $this->actingAs($this->superAdmin);

        $request->update([
            'status' => 'approved',
            'approved_by' => $this->superAdmin->id,
            'approved_at' => now(),
        ]);

        $this->assertEquals('approved', $request->fresh()->status);
    }

    /** @test */
    public function admin_can_confirm_free_booking_with_otp_after_approval()
    {
        $uniqueName = 'Free VIP ' . uniqid();
        $request = ApprovalRequest::create([
            'user_id' => $this->admin->id,
            'type' => 'free_booking',
            'data' => [
                'arena_id' => $this->arena->id,
                'date' => now()->format('Y-m-d'),
                'slots' => ['18:00-19:00'],
                'customer_name' => $uniqueName,
                'customer_mobile' => '9876543210'
            ],
            'reason' => 'VIP Guest',
            'status' => 'approved',
            'otp' => '123456'
        ]);

        $this->actingAs($this->admin);

        Livewire::test(AdminBooking::class)
            ->set('otpData.request_id', $request->id)
            ->set('otpData.otp', '123456')
            ->call('confirmFreeBooking')
            ->assertHasNoErrors();

        $this->assertEquals(1, Booking::where('customer_name', $uniqueName)->count());
        $this->assertEquals('completed', $request->fresh()->status);
    }

    /** @test */
    public function global_ai_toggle_works()
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(GlobalSettings::class)
            ->set('data.global_ai_enabled', false)
            ->call('save');

        $this->assertEquals('false', Setting::where('key', 'global_ai_enabled')->first()->value);
        $this->postJson('/chat', ['message' => 'hi'])->assertStatus(403);
    }

    /** @test */
    public function security_can_confirm_entry()
    {
        $booking = Booking::create([
            'arena_id' => $this->arena->id,
            'booking_date' => now()->format('Y-m-d'),
            'time_slot' => '18:00-19:00',
            'booking_ref' => 'REF-123',
            'customer_name' => 'Checkin User',
            'customer_mobile' => '9876543210',
            'amount' => 1000,
            'payment_status' => 'confirmed',
            'payment_method' => 'online',
            'ticket_number' => 'TKT-123',
            'checked_in' => false
        ]);

        $this->actingAs($this->security);

        $booking->update([
            'checked_in' => true,
            'checked_in_at' => now(),
            'checked_in_by' => $this->security->id,
        ]);

        $this->assertTrue($booking->fresh()->checked_in);
    }
}
