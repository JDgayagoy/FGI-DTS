<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserImapSetting extends Model
{
    protected $fillable = [
        'user_id',
        'imap_host',
        'imap_port',
        'username',
        'password',
        'encryption',
        'poll_interval_min',
        'is_enabled',
        'last_synced_at',
    ];

    protected $hidden = ['password'];

    protected $appends = ['has_password'];

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'is_enabled' => 'boolean',
            'imap_port' => 'integer',
            'last_synced_at' => 'datetime',
        ];
    }

    public function getHasPasswordAttribute(): bool
    {
        return ! empty($this->attributes['password']);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
