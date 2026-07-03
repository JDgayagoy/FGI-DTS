<?php

namespace Tests\Helpers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ActivityLogHelper
{
    /**
     * Get all activity logs for a user
     */
    public static function getUserActivityLogs(User $user): array
    {
        return ActivityLog::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    /**
     * Get activity logs for a specific subject (model)
     */
    public static function getSubjectActivityLogs(Model $subject): array
    {
        $subjectClass = $subject::class;

        return ActivityLog::where('subject_type', $subjectClass)
            ->where('subject_id', $subject->getKey())
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    /**
     * Get activity logs by action type
     */
    public static function getActivityLogsByAction(string $action): array
    {
        return ActivityLog::where('action', $action)
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    /**
     * Get the latest activity log entry
     */
    public static function getLatestActivityLog(): ?ActivityLog
    {
        return ActivityLog::orderBy('created_at', 'desc')->first();
    }

    /**
     * Get the latest activity log for a user
     */
    public static function getLatestUserActivityLog(User $user): ?ActivityLog
    {
        return ActivityLog::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Assert activity log entry exists for action
     */
    public static function assertActivityLogExists(User $user, string $action, Model $subject): void
    {
        $subjectClass = $subject::class;
        $subjectId = $subject->getKey();
        $exists = ActivityLog::where('user_id', $user->id)
            ->where('action', $action)
            ->where('subject_type', $subjectClass)
            ->where('subject_id', $subjectId)
            ->exists();

        if (! $exists) {
            throw new \Exception(
                "Expected activity log entry for user {$user->id}, "
                ."action '{$action}', subject {$subjectClass}#{$subjectId}"
            );
        }
    }

    /**
     * Assert activity log entry does not exist
     */
    public static function assertActivityLogDoesNotExist(User $user, string $action, Model $subject): void
    {
        $subjectClass = $subject::class;
        $subjectId = $subject->getKey();
        $exists = ActivityLog::where('user_id', $user->id)
            ->where('action', $action)
            ->where('subject_type', $subjectClass)
            ->where('subject_id', $subjectId)
            ->exists();

        if ($exists) {
            throw new \Exception(
                "Expected no activity log entry for user {$user->id}, "
                ."action '{$action}', subject {$subjectClass}#{$subjectId}"
            );
        }
    }

    /**
     * Assert activity log has specific properties
     */
    public static function assertActivityLogHasProperties(
        ActivityLog $log,
        array $expectedProperties
    ): void {
        $logProperties = $log->properties ?? [];

        foreach ($expectedProperties as $key => $value) {
            if (! isset($logProperties[$key])) {
                throw new \Exception("Expected activity log to have property '{$key}'");
            }

            if ($logProperties[$key] !== $value) {
                throw new \Exception(
                    "Expected activity log property '{$key}' to be '{$value}', "
                    ."got '{$logProperties[$key]}'"
                );
            }
        }
    }

    /**
     * Assert activity log description contains text
     */
    public static function assertActivityLogDescriptionContains(ActivityLog $log, string $text): void
    {
        if (! str_contains($log->description ?? '', $text)) {
            throw new \Exception(
                "Expected activity log description to contain '{$text}', "
                ."got '{$log->description}'"
            );
        }
    }

    /**
     * Count activity logs for a user
     */
    public static function countUserActivityLogs(User $user): int
    {
        return ActivityLog::where('user_id', $user->id)->count();
    }

    /**
     * Clear all activity logs (for test cleanup)
     */
    public static function clearActivityLogs(): void
    {
        ActivityLog::truncate();
    }
}
