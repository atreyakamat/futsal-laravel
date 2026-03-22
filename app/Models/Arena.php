<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class Arena extends Model {
    use HasFactory;
    
    protected $fillable = [
        'name',
        'slug',
        'address',
        'contact_email',
        'contact_phone',
        'logo_url',
        'cover_image',
        'description',
        'status',
        'bot_enabled',
        'gmaps_link',
        'admin_id',
        'security_id',
    ];

    /**
     * Get all the pricing records for this arena.
     */
    public function pricings()
    {
        return $this->hasMany(Pricing::class);
    }

    /**
     * Get the admin user for this arena.
     */
    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Get the security user for this arena.
     */
    public function security()
    {
        return $this->belongsTo(User::class, 'security_id');
    }

    /**
     * Get the multiple images for this arena.
     */
    public function images()
    {
        return $this->hasMany(ArenaImage::class)->orderBy('sort_order');
    }
}
