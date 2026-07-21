<?php

use App\Models\Shipment;
use App\Services\EmailShipmentParser;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('matches a ref found in the subject', function () {
    $s = Shipment::factory()->create(['shipment_reference' => 'FGI-001']);

    $result = app(EmailShipmentParser::class)->parse(
        from: 'broker@x.com',
        subject: 'RE: FGI-001 ETA Update',
        body: 'no ref here',
    );

    expect($result['matched_ref'])->toBe('FGI-001');
    expect($result['shipment']->shipment_id)->toBe($s->shipment_id);
});

it('matches a ref found in the body when subject is clean', function () {
    Shipment::factory()->create(['shipment_reference' => 'FGI-002']);

    $result = app(EmailShipmentParser::class)->parse(
        from: 'broker@x.com',
        subject: 'Shipment update',
        body: 'Please note reference FGI-002 has cleared customs.',
    );

    expect($result['matched_ref'])->toBe('FGI-002');
});

it('returns nulls when no ref is present', function () {
    Shipment::factory()->create(['shipment_reference' => 'FGI-003']);

    $result = app(EmailShipmentParser::class)->parse(
        from: 'broker@x.com',
        subject: 'Hello',
        body: 'Nothing relevant.',
    );

    expect($result['matched_ref'])->toBeNull();
    expect($result['shipment'])->toBeNull();
});

it('prefers the longer ref on overlapping matches', function () {
    Shipment::factory()->create(['shipment_reference' => 'FGI-1']);
    $long = Shipment::factory()->create(['shipment_reference' => 'FGI-10']);

    $result = app(EmailShipmentParser::class)->parse(
        from: 'x@x.com',
        subject: 'Update on FGI-10',
        body: '',
    );

    expect($result['shipment']->shipment_id)->toBe($long->shipment_id);
});
