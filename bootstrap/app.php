<?php

use App\Exceptions\StaleModelException;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'check.permission' => CheckPermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (StaleModelException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->with('stale_error', 'Couldn\'t save changes. Your data is behind — someone else may have edited this record. Please reload and try again.');
            }

            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 409);
            }

            return back()->with('error', $e->getMessage());
        });
    })->create();
