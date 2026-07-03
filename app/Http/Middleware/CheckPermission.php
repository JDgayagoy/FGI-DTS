<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     *
     * @throws AuthorizationException
     */
    public function handle(Request $request, Closure $next, string ...$permissions): mixed
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Super Admin bypass: allow all permissions
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        // Check if user has ANY of the provided permissions
        foreach ($permissions as $permission) {
            if ($this->userHasPermission($user, $permission)) {
                return $next($request);
            }
        }

        // Log unauthorized attempt
        $this->logUnauthorizedAttempt($request, $permissions);

        throw new AuthorizationException('Unauthorized action');
    }

    /**
     * Check if user has the given permission.
     */
    private function userHasPermission(mixed $user, string $permission): bool
    {
        return Gate::forUser($user)->allows($permission);
    }

    /**
     * Log unauthorized access attempt.
     */
    private function logUnauthorizedAttempt(Request $request, array $permissions): void
    {
        Log::warning('Unauthorized access attempt', [
            'user_id' => $request->user()->id,
            'permissions_required' => $permissions,
            'route_name' => $request->route()->getName(),
            'route_path' => $request->route()->uri(),
            'method' => $request->getMethod(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
