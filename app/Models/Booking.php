<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Booking extends Model {
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
}
