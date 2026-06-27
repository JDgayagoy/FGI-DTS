<?php

use App\Models\ShipmentEmail;
use App\Models\User;
use App\Notifications\ShipmentEmailDetectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('shares unread notification count on inertia pages', function () {
    $user = User::factory()->create();
    $email = ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-x',
        'from_address' => 'b@x.com',
        'subject' => 'FGI-009',
        'body_excerpt' => '...',
        'matched_ref' => 'FGI-009',
        'action_taken' => 'pending_review',
        'received_at' => now(),
        'processed_at' => now(),
    ]);
    $user->notify(new ShipmentEmailDetectedNotification($email));

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('unread_notification_count', 1));
});
