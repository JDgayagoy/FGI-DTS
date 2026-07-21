<?php

use App\Models\ShipmentEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pendingEmail(User $user): ShipmentEmail
{
    return ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-'.uniqid(),
        'from_address' => 'b@x.com',
        'subject' => 'FGI-009',
        'body_excerpt' => '...',
        'matched_ref' => 'FGI-009',
        'action_taken' => 'pending_review',
        'received_at' => now(),
        'processed_at' => now(),
    ]);
}

it('dismisses a shipment email', function () {
    $user = User::factory()->create();
    $email = pendingEmail($user);

    $this->actingAs($user)
        ->post("/shipment-emails/{$email->id}/dismiss")
        ->assertRedirect();

    expect($email->fresh()->action_taken)->toBe('dismissed');
});

it('marks a shipment email as shipment_created', function () {
    $user = User::factory()->create();
    $email = pendingEmail($user);

    $this->actingAs($user)
        ->post("/shipment-emails/{$email->id}/created")
        ->assertRedirect();

    expect($email->fresh()->action_taken)->toBe('shipment_created');
});

it('forbids touching another users email', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $email = pendingEmail($owner);

    $this->actingAs($other)
        ->post("/shipment-emails/{$email->id}/dismiss")
        ->assertForbidden();

    expect($email->fresh()->action_taken)->toBe('pending_review');
});

it('marks all notifications read', function () {
    $user = User::factory()->create();
    $email = pendingEmail($user);
    $user->notify(new App\Notifications\ShipmentEmailDetectedNotification($email));

    expect($user->unreadNotifications()->count())->toBe(1);

    $this->actingAs($user)->post('/notifications/read-all')->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});
