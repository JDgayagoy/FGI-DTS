<?php

namespace App\Http\Controllers;

use App\Models\Broker;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class BrokerController extends Controller
{
    public function index()
    {
        Gate::authorize('view-brokers');

        $brokers = Broker::all();

        return Inertia::render('brokers/index', [
            'brokers' => $brokers,
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('add-brokers');

        $validated = $request->validate([
            'broker_name' => 'required|string|max:255|unique:brokers,broker_name',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $broker = Broker::create($validated);

        ActivityLogger::log('created', "Created broker \"{$broker->broker_name}\".", $broker);

        return redirect()->back()->with('success', 'Broker created successfully.');
    }

    public function update(Request $request, Broker $broker)
    {
        Gate::authorize('edit-brokers');

        $validated = $request->validate([
            'broker_name' => 'required|string|max:255|unique:brokers,broker_name,'.$broker->broker_id.',broker_id',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'version' => 'required|integer',
        ]);

        $version = $validated['version'];
        unset($validated['version']);
        $broker->syncOriginalAttribute('version', $version);

        $old = $broker->only(array_keys($validated));
        $broker->update($validated);

        ActivityLogger::log(
            'updated',
            "Updated broker \"{$broker->broker_name}\".",
            $broker,
            ['old' => $old, 'new' => $validated],
        );

        return redirect()->back()->with('success', 'Broker updated successfully.');
    }

    public function destroy(Broker $broker)
    {
        Gate::authorize('delete-brokers');

        if ($broker->shipments()->exists()) {
            $broker->update(['is_active' => false]);

            ActivityLogger::log(
                'deactivated',
                "Deactivated broker \"{$broker->broker_name}\" (has existing shipments).",
                $broker,
            );

            return redirect()->back()->with('success', 'Broker has shipments, so they were deactivated instead of deleted.');
        }

        ActivityLogger::log('deleted', "Deleted broker \"{$broker->broker_name}\".", $broker);

        $broker->delete();

        return redirect()->back()->with('success', 'Broker deleted successfully.');
    }
}
