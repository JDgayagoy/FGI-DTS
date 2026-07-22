<?php

use App\Models\Shipment;
use App\Models\User;
use App\Notifications\ShipmentEmailDetectedNotification;
use App\Services\ShipmentEmailProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function sampleMessage(array $overrides = []): array
{
    return array_merge([
        'uid' => 'UID-100',
        'from_address' => 'broker@fastcargo.com',
        'from_name' => 'Fast Cargo',
        'subject' => 'Hello',
        'body' => 'body text',
        'received_at' => now(),
    ], $overrides);
}

it('marks matched and links the shipment, no notification', function () {
    Notification::fake();
    $user = User::factory()->create();
    $shipment = Shipment::factory()->create(['shipment_reference' => 'FGI-001']);

    $email = app(ShipmentEmailProcessor::class)->process(
        $user,
        sampleMessage(['subject' => 'RE: FGI-001 ETA']),
    );

    expect($email->action_taken)->toBe('matched');
    expect($email->shipment_id)->toBe($shipment->shipment_id);
    expect($email->matched_ref)->toBe('FGI-001');
    Notification::assertNothingSent();
});

it('marks pending_review and notifies when ref has no shipment', function () {
    Notification::fake();
    $user = User::factory()->create();
    Shipment::factory()->create(['shipment_reference' => 'FGI-001']);

    $email = app(ShipmentEmailProcessor::class)->process(
        $user,
        sampleMessage(['uid' => 'UID-101', 'subject' => 'About FGI-999']),
    );
    expect($email->action_taken)->toBe('pending_review');
    expect($email->shipment_id)->toBeNull();
    expect($email->matched_ref)->toBe('FGI-999');
    Notification::assertSentTo($user, ShipmentEmailDetectedNotification::class);
});

it('marks skipped and is silent when no ref found', function () {
    Notification::fake();
    $user = User::factory()->create();

    $email = app(ShipmentEmailProcessor::class)->process(
        $user,
        sampleMessage(['uid' => 'UID-102', 'subject' => 'Just a hello']),
    );

    expect($email->action_taken)->toBe('skipped');
    expect($email->shipment_id)->toBeNull();
    Notification::assertNothingSent();
});

it('stores a 500-char body excerpt', function () {
    Notification::fake();
    $user = User::factory()->create();

    $email = app(ShipmentEmailProcessor::class)->process(
        $user,
        sampleMessage(['uid' => 'UID-103', 'body' => str_repeat('x', 900)]),
    );

    expect(mb_strlen($email->body_excerpt))->toBe(500);
});
