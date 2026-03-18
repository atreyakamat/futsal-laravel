<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Booking extends Model {
    protected $guarded = [];

    /**
     * Get the arena that the booking belongs to.
     */
    public function arena()
    {
        return $this->belongsTo(Arena::class);
    }
}
