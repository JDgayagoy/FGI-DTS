<?php

use App\Jobs\FetchUserImapEmailsJob;
use App\Models\Shipment;
use App\Models\ShipmentEmail;
use App\Models\User;
use App\Models\UserImapSetting;
use App\Services\ShipmentEmailProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Webklex\IMAP\Facades\Client;
use Webklex\PHPIMAP\Client as ImapClient;
use Webklex\PHPIMAP\Folder;
use Webklex\PHPIMAP\Query\WhereQuery;
use Webklex\PHPIMAP\Support\MessageCollection;

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

it('fetches newest unseen messages before applying the inbox limit', function () {
    $user = User::factory()->create();
    $setting = imapSetting($user);
    $setting->forceFill([
        'last_synced_at' => Carbon::parse('2026-06-30 10:00:00'),
    ])->save();

    $calls = [];

    $query = Mockery::mock(WhereQuery::class);
    $query->shouldReceive('unseen')->once()->andReturnUsing(function () use ($query, &$calls) {
        $calls[] = 'unseen';

        return $query;
    });
    $query->shouldReceive('since')->once()->with('30-Jun-2026')->andReturnUsing(function (string $date) use ($query, &$calls) {
        $calls[] = "since:{$date}";

        return $query;
    });
    $query->shouldReceive('fetchOrderDesc')->once()->andReturnUsing(function () use ($query, &$calls) {
        $calls[] = 'fetchOrderDesc';

        return $query;
    });
    $query->shouldReceive('limit')->once()->with(50)->andReturnUsing(function (int $limit) use ($query, &$calls) {
        $calls[] = "limit:{$limit}";

        return $query;
    });
    $query->shouldReceive('get')->once()->andReturnUsing(function () use (&$calls) {
        $calls[] = 'get';

        return new MessageCollection;
    });

    $folder = Mockery::mock(Folder::class);
    $folder->shouldReceive('messages')->once()->andReturn($query);

    $client = Mockery::mock(ImapClient::class);
    $client->shouldReceive('connect')->once();
    $client->shouldReceive('getFolder')->once()->with('INBOX')->andReturn($folder);

    Client::shouldReceive('make')->once()->andReturn($client);

    (new FetchUserImapEmailsJob($user->id))->handle(app(ShipmentEmailProcessor::class));

    expect($calls)->toBe([
        'unseen',
        'since:30-Jun-2026',
        'fetchOrderDesc',
        'limit:50',
        'get',
    ]);
});

it('processes fetched messages when the shipment reference is followed by extra subject text', function () {
    $user = User::factory()->create();
    Shipment::factory()->create(['shipment_reference' => 'FGI-001']);
    imapSetting($user);

    $message = new class
    {
        public function getSubject(): string
        {
            return 'FGI-001 TRACKING UPDATE';
        }

        public function getUid(): string
        {
            return 'UID-TRACKING-UPDATE';
        }

        public function getFrom(): array
        {
            return [(object) ['mail' => 'broker@example.com', 'personal' => 'Broker']];
        }

        public function hasTextBody(): bool
        {
            return true;
        }

        public function getTextBody(): string
        {
            return 'Container moved today.';
        }

        public function getDate(): Carbon
        {
            return Carbon::parse('2026-07-01 10:00:00');
        }
    };

    $query = Mockery::mock(WhereQuery::class);
    $query->shouldReceive('unseen')->once()->andReturn($query);
    $query->shouldReceive('fetchOrderDesc')->once()->andReturn($query);
    $query->shouldReceive('limit')->once()->with(50)->andReturn($query);
    $query->shouldReceive('get')->once()->andReturn(new MessageCollection([$message]));

    $folder = Mockery::mock(Folder::class);
    $folder->shouldReceive('messages')->once()->andReturn($query);

    $client = Mockery::mock(ImapClient::class);
    $client->shouldReceive('connect')->once();
    $client->shouldReceive('getFolder')->once()->with('INBOX')->andReturn($folder);

    Client::shouldReceive('make')->once()->andReturn($client);

    (new FetchUserImapEmailsJob($user->id))->handle(app(ShipmentEmailProcessor::class));

    expect(ShipmentEmail::where('user_id', $user->id)->first())
        ->subject->toBe('FGI-001 TRACKING UPDATE')
        ->matched_ref->toBe('FGI-001')
        ->action_taken->toBe('matched');
});
