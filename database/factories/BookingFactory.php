<?php

namespace Database\Factories;

use App\Models\Arena;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Booking>
 */
class BookingFactory extends Factory
{
    protected $model = Booking::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $timeSlots = [
            '06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00',
            '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00',
            '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
            '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00',
        ];

        return [
            'arena_id' => Arena::factory(),
            'user_id' => null,
            'booking_ref' => 'REF-' . strtoupper(Str::random(8)),
            'ticket_number' => 'TKT-' . date('ymd') . '-' . strtoupper(Str::random(4)),
            'booking_date' => $this->faker->dateTimeBetween('now', '+30 days')->format('Y-m-d'),
            'time_slot' => $this->faker->randomElement($timeSlots),
            'customer_name' => $this->faker->name(),
            'customer_mobile' => '91' . $this->faker->numerify('##########'),
            'customer_email' => $this->faker->safeEmail(),
            'amount' => $this->faker->randomElement([500, 700, 800, 1000, 1200]),
            'payment_status' => 'confirmed',
            'payment_method' => $this->faker->randomElement(['online', 'cash', 'upi']),
            'checked_in' => false,
            'is_free_booking' => false,
        ];
    }

    /**
     * Indicate that the booking is pending.
     */
    public function pending(): static
    {
        return $this->state(fn(array $attributes) => [
            'payment_status' => 'pending',
        ]);
    }

    /**
     * Indicate that the booking is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn(array $attributes) => [
            'payment_status' => 'cancelled',
        ]);
    }

    /**
     * Indicate that the booking is a free booking.
     */
    public function free(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_free_booking' => true,
            'amount' => 0,
        ]);
    }

    /**
     * Indicate that the customer has checked in.
     */
    public function checkedIn(): static
    {
        return $this->state(fn(array $attributes) => [
            'checked_in' => true,
        ]);
    }

    /**
     * Associate booking with a user.
     */
    public function forUser(User $user): static
    {
        return $this->state(fn(array $attributes) => [
            'user_id' => $user->id,
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_mobile' => $user->mobile ?? $attributes['customer_mobile'],
        ]);
    }

    /**
     * Create consecutive slots for multi-slot booking.
     */
    public function consecutiveSlots(int $count = 2, string $startSlot = '18:00-19:00'): static
    {
        $slots = [];
        $startHour = (int) explode(':', $startSlot)[0];

        for ($i = 0; $i < $count; $i++) {
            $hour = $startHour + $i;
            $slots[] = sprintf('%02d:00-%02d:00', $hour, $hour + 1);
        }

        return $this->state(fn(array $attributes) => [
            'time_slot' => $slots[0], // Factory creates one at a time
        ]);
    }
}
