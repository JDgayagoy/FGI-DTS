<?php

use App\Models\User;

use function Pest\Laravel\actingAs;

it('renders the dashboard page and shows correct totals', function () {
    $user = User::factory()->create();

    actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertSee('Overview')
        ->assertSee('579') // Active Documents
        ->assertSee('900') // Active Shipments
        ->assertSee('Active Documents')
        ->assertSee('Uploaded Documents')
        ->assertSee('Invalid Documents')
        ->assertSee('Missing Documents')
        ->assertSee('Archived Documents')
        ->assertSee('Shipments')
        ->assertSee('2025-SKDEVAN-411'); // One of the shipping references
});

it('shows the correct tabs in the shipments section', function () {
    $user = User::factory()->create();

    actingAs($user)
        ->get(route('dashboard'))
        ->assertSee('All tasks')
        ->assertSee('Completed')
        ->assertSee('In Progress')
        ->assertSee('Pending Approval')
        ->assertSee('Incomplete');
});
