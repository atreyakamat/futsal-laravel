<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class Arena extends Model {
    use HasFactory;
    protected $guarded = [];

    /**
     * Get all the pricing records for this arena.
     */
    public function pricings()
    {
        return $this->hasMany(Pricing::class);
    }
}
