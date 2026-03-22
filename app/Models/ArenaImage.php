<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArenaImage extends Model
{
    protected $fillable = ['arena_id', 'image_path', 'sort_order'];

    public function arena()
    {
        return $this->belongsTo(Arena::class);
    }
}
