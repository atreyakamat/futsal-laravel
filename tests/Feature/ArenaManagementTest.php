<?php

namespace Tests\Feature;

use App\Models\Arena;
use App\Models\Pricing;
use App\Models\User;
use App\Models\Booking;
use App\Filament\Resources\PricingResource\Pages\BulkCreatePricing;
use App\Filament\Resources\BookingResource\Pages\AdminBooking;
use App\Filament\Resources\ArenaResource;
use App\Filament\Resources\PricingResource;
use App\Filament\Resources\BookingResource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Livewire\Livewire;

class ArenaManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $admin;
    protected User $security;
    protected Arena $arena;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create(['role' => 'super_admin']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->security = User::factory()->create(['role' => 'security']);
        
        $this->arena = Arena::create([
            'name' => 'Test Arena',
            'slug' => 'test-arena',
            'status' => 'active',
        ]);
    }

    /** @test */
    public function super_admin_can_access_bulk_pricing_setup()
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(BulkCreatePricing::class)
            ->assertStatus(200)
            ->set('data.arena_id', $this->arena->id)
            ->set('data.times', ['06:00-07:00', '07:00-08:00'])
            ->set('data.keep_same_pricing', true)
            ->set('data.price', 1000)
            ->call('submit')
            ->assertHasNoErrors();

        $this->assertDatabaseHas('pricings', [
            'arena_id' => $this->arena->id,
            'time_slot' => '06:00-07:00',
            'price' => 1000,
        ]);
        
        $this->assertDatabaseHas('pricings', [
            'arena_id' => $this->arena->id,
            'time_slot' => '07:00-08:00',
            'price' => 1000,
        ]);
    }

    /** @test */
    public function admin_can_create_booking_with_custom_pricing()
    {
        $this->actingAs($this->admin);

        // First create some pricing
        Pricing::create(['arena_id' => $this->arena->id, 'time_slot' => '18:00-19:00', 'price' => 800]);

        Livewire::test(AdminBooking::class)
            ->assertStatus(200)
            ->set('data.arena_id', $this->arena->id)
            ->set('data.date', now()->addDay()->format('Y-m-d'))
            ->set('data.slots', ['18:00-19:00'])
            ->set('data.customer_name', 'Test Customer')
            ->set('data.customer_mobile', '9876543210')
            ->set('data.keep_same_pricing', false)
            ->set('data.custom_prices', [
                ['time_slot' => '18:00-19:00', 'price' => 950] // Overriding default 800
            ])
            ->call('submitBooking')
            ->assertHasNoErrors();

        $this->assertDatabaseHas('bookings', [
            'arena_id' => $this->arena->id,
            'customer_name' => 'Test Customer',
            'amount' => 950,
            'time_slot' => '18:00-19:00',
        ]);
    }

    /** @test */
    public function super_admin_can_assign_staff_to_arena()
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(ArenaResource\Pages\EditArena::class, [
            'record' => $this->arena->getRouteKey(),
        ])
            ->assertFormFieldIsVisible('admin_id')
            ->assertFormFieldIsVisible('security_id')
            ->set('data.admin_id', $this->admin->id)
            ->set('data.security_id', $this->security->id)
            ->call('save')
            ->assertHasNoErrors();

        $this->arena->refresh();
        $this->assertEquals($this->admin->id, $this->arena->admin_id);
        $this->assertEquals($this->security->id, $this->arena->security_id);
    }

    /** @test */
    public function pages_load_without_relationship_errors()
    {
        $this->actingAs($this->superAdmin);

        // Test Pricing List
        $this->get(PricingResource::getUrl('index'))->assertStatus(200);
        
        // Test Booking List
        $this->get(BookingResource::getUrl('index'))->assertStatus(200);
        
        // Test Arena List
        $this->get(ArenaResource::getUrl('index'))->assertStatus(200);
        
        // Test Bulk Pricing Setup
        $this->get(PricingResource::getUrl('bulk-create'))->assertStatus(200);
        
        // Test Admin Booking
        $this->get(BookingResource::getUrl('admin-booking'))->assertStatus(200);
    }
}
