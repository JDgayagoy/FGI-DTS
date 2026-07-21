<?php

use App\Models\Shipment;
use App\Models\ShipmentEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;

uses(RefreshDatabase::class);

it('enforces a unique uid per user', function () {
    $user = User::factory()->create();

    $make = fn () => ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-1',
        'from_address' => 'a@b.com',
        'subject' => 'hi',
        'body_excerpt' => '...',
        'action_taken' => 'skipped',
        'received_at' => now(),
        'processed_at' => now(),
    ]);

    $make();
    expect(fn () => $make())->toThrow(QueryException::class);
});

it('links to a shipment via shipment_id', function () {
    $user = User::factory()->create();
    $shipment = Shipment::factory()->create();

    $email = ShipmentEmail::create([
        'user_id' => $user->id,
        'shipment_id' => $shipment->shipment_id,
        'imap_message_uid' => 'UID-2',
        'from_address' => 'a@b.com',
        'subject' => 'FGI-001',
        'body_excerpt' => '...',
        'matched_ref' => $shipment->shipment_reference,
        'action_taken' => 'matched',
        'received_at' => now(),
        'processed_at' => now(),
    ]);

    expect($email->shipment->shipment_id)->toBe($shipment->shipment_id);
    expect($shipment->emails)->toHaveCount(1);
});
