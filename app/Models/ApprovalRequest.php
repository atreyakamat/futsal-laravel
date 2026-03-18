<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalRequest extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'data',
        'reason',
        'otp',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'data' => 'array',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
