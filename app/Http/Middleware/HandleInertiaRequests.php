<?php

namespace App\Http\Middleware;

use App\Notifications\ShipmentEmailDetectedNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user() ? $request->user()->roles->pluck('role_name') : [],
                'permissions' => $request->user() ? $request->user()->roles->flatMap->permissions->pluck('name')->unique()->values() : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'notifications' => fn () => $request->user()
                ? $request->user()->unreadNotifications()
                    ->where('type', ShipmentEmailDetectedNotification::class)
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn ($n) => [
                        'id' => $n->id,
                        'data' => is_string($n->data) ? json_decode($n->data, true) : $n->data,
                        'read_at' => $n->read_at,
                        'created_at' => $n->created_at?->toIso8601String(),
                    ])
                : [],
            'unread_notification_count' => fn () => $request->user()
                ? $request->user()->unreadNotifications()
                    ->where('type', ShipmentEmailDetectedNotification::class)
                    ->count()
                : 0,
        ];
    }
}
