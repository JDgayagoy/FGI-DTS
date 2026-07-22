<?php

use App\Models\User;
use App\Exceptions\StaleModelException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('prevents stale models from being updated', function () {
    $user = User::factory()->create(['name' => 'Original Name']);
    
    // Simulate User A and User B fetching the same record concurrently
    $userA = User::find($user->id);
    $userB = User::find($user->id);

    // User A updates the model successfully
    $userA->name = 'Updated by A';
    $userA->save();
    
    // User A's version is incremented
    expect($userA->version)->toBe(2);

    // User B attempts to update their stale instance
    $userB->name = 'Updated by B';
    
    // Attempting to save should throw StaleModelException
    $userB->save();
})->throws(StaleModelException::class);
