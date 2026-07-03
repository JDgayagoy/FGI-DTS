<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        // Share user permissions with all Inertia responses
        Inertia::share([
            'userPermissions' => fn () => Auth::check() ? Auth::user()->getPermissionNames() : [],
        ]);
        Gate::define('manage-rbac', fn (User $user) => $user->hasPermission('manage_roles', 'rbac'));
        Gate::define('add-shipments', fn (User $user) => $user->hasPermission('add', 'shipments'));
        Gate::define('edit-shipments', fn (User $user) => $user->hasPermission('edit', 'shipments'));
        Gate::define('archive-shipments', fn (User $user) => $user->hasPermission('archive', 'shipments'));
        Gate::define('create-user', fn (User $user) => $user->hasPermission('manage_users', 'rbac'));
        Gate::define('view-logs', fn (User $user) => $user->hasPermission('view', 'logs'));
        Gate::define('view-brokers', fn (User $user) => $user->hasPermission('view', 'brokers'));
        Gate::define('add-brokers', fn (User $user) => $user->hasPermission('add', 'brokers'));
        Gate::define('edit-brokers', fn (User $user) => $user->hasPermission('edit', 'brokers'));
        Gate::define('delete-brokers', fn (User $user) => $user->hasPermission('delete', 'brokers'));
        Gate::define('upload-documents', fn (User $user) => $user->hasPermission('upload', 'documents'));
        Gate::define('approve-documents', fn (User $user) => $user->hasPermission('approve', 'documents'));
        Gate::define('reject-documents', fn (User $user) => $user->hasPermission('reject', 'documents'));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn (): ?Password => app()->isProduction()
                ? Password::min(12)
                    ->mixedCase()
                    ->letters()
                    ->numbers()
                    ->symbols()
                    ->uncompromised()
                : null,
        );
    }
}
