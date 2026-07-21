<?php

use App\Models\User;

use function Pest\Laravel\actingAs;

it('renders the dashboard page and shows correct totals', function () {
    $user = User::factory()->create();

    $response = actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();

    // Verify the component name
    expect($response->getOriginalContent()->getData()['page']['component'])
        ->toBe('dashboard');
});

it('shows the correct tabs in the shipments section', function () {
    $user = User::factory()->create();

    $response = actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();

    // Verify required props are present
    $props = $response->getOriginalContent()->getData()['page']['props'];
    expect($props)->toHaveKeys(['metrics', 'shipmentRows']);
});
