<?php

use App\Jobs\FetchUserImapEmailsJob;
use App\Models\Shipment;
use App\Models\ShipmentEmail;
use App\Models\User;
use App\Models\UserImapSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function imapSetting(User $user): UserImapSetting
{
    return UserImapSetting::create([
        'user_id' => $user->id,
        'imap_host' => 'imap.example.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => 'secret',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => true,
    ]);
}

function imapMessage(array $o = []): array
{
    return array_merge([
        'uid' => 'UID-1',
        'from_address' => 'b@x.com',
        'from_name' => 'B',
        'subject' => 'FGI-001',
        'body' => 'hi',
        'received_at' => now(),
    ], $o);
}

it('processes a new message into a shipment_email', function () {
    $user = User::factory()->create();
    Shipment::factory()->create(['shipment_reference' => 'FGI-001']);
    $setting = imapSetting($user);

    $job = new FetchUserImapEmailsJob($user->id);
    $job->processMessage($setting, imapMessage());

    expect(ShipmentEmail::where('user_id', $user->id)->count())->toBe(1);
});

it('skips a uid already processed for the user', function () {
    $user = User::factory()->create();
    $setting = imapSetting($user);

    ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-1',
        'from_address' => 'b@x.com',
        'subject' => 'x',
        'body_excerpt' => 'x',
        'action_taken' => 'skipped',
        'received_at' => now(),
        'processed_at' => now(),
    ]);

    $job = new FetchUserImapEmailsJob($user->id);
    $job->processMessage($setting, imapMessage());

    expect(ShipmentEmail::where('user_id', $user->id)->count())->toBe(1);
});
