<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentEmail extends Model
{
    use \App\Traits\HasOptimisticLocking;

    protected $fillable = [
        'user_id',
        'shipment_id',
        'imap_message_uid',
        'from_address',
        'from_name',
        'subject',
        'body_excerpt',
        'matched_ref',
        'action_taken',
        'received_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
