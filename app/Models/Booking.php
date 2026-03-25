<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'checked_in' => 'boolean',
        'is_free_booking' => 'boolean',
        'booking_date' => 'date',
    ];

    /**
     * Get the arena that the booking belongs to.
     */
    public function arena()
    {
        return $this->belongsTo(Arena::class);
    }

    /**
     * Get the user that owns the booking.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
