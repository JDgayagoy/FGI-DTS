<?php

use App\Models\User;
use App\Models\UserImapSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('encrypts the password at rest and decrypts on read', function () {
    $user = User::factory()->create();

    $setting = UserImapSetting::create([
        'user_id' => $user->id,
        'imap_host' => 'imap.gmail.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => 'secret-app-password',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => true,
    ]);

    // Decrypted through the model
    expect($setting->fresh()->password)->toBe('secret-app-password');

    // Raw column value is NOT the plaintext
    $raw = DB::table('user_imap_settings')->where('id', $setting->id)->value('password');
    expect($raw)->not->toBe('secret-app-password');
});

it('hides the password and exposes has_password', function () {
    $user = User::factory()->create();
    $setting = UserImapSetting::create([
        'user_id' => $user->id,
        'imap_host' => 'imap.gmail.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => 'secret',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => false,
    ]);

    expect($setting->toArray())->not->toHaveKey('password');
    expect($setting->has_password)->toBeTrue();
});
