<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    /**
     * Log an action against an optional subject model.
     *
     * @param  string  $action  Short verb: 'created', 'updated', 'archived', etc.
     * @param  string  $description  Human-readable sentence describing what happened.
     * @param  Model|null  $subject  The Eloquent model this action was performed on.
     * @param  array<string, mixed>  $properties  Optional old/new values or metadata.
     */
    public static function log(
        string $action,
        string $description,
        ?Model $subject = null,
        array $properties = [],
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject ? $subject->getKey() : null,
            'properties' => empty($properties) ? null : $properties,
            'ip_address' => Request::ip(),
        ]);
    }
}
