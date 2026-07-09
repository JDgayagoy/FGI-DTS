<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class LogController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('view-logs');

        $logs = ActivityLog::with('user')
            ->when($request->get('user_id'), fn ($q, $userId) => $q->where('user_id', $userId))
            ->when($request->get('action'), fn ($q, $action) => $q->where('action', $action))
            ->when($request->get('date_from'), fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->get('date_to'), fn ($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->latest()
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('logs/index', [
            'logs' => $logs,
            'filters' => $request->only(['user_id', 'action', 'date_from', 'date_to']),
            'permissions' => Permission::pluck('name', 'permission_id')->toArray(),
        ]);
    }
}
