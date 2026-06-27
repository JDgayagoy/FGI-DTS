<?php

use App\Models\User;
use App\Models\UserImapSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('shows the email integration page without exposing the password', function () {
    $user = User::factory()->create();
    UserImapSetting::create([
        'user_id' => $user->id,
        'imap_host' => 'imap.gmail.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => 'secret',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => true,
    ]);

    $this->actingAs($user)
        ->get('/settings/email-integration')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/email-integration')
            ->where('setting.has_password', true)
            ->missing('setting.password')
        );
});

it('creates settings on first save', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put('/settings/imap', [
        'imap_host' => 'imap.gmail.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => 'app-password',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => true,
    ])->assertRedirect();

    $setting = UserImapSetting::where('user_id', $user->id)->first();
    expect($setting)->not->toBeNull();
    expect($setting->password)->toBe('app-password');
});

it('keeps the existing password when none is submitted', function () {
    $user = User::factory()->create();
    UserImapSetting::create([
        'user_id' => $user->id,
        'imap_host' => 'imap.gmail.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => 'original',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => true,
    ]);

    $this->actingAs($user)->put('/settings/imap', [
        'imap_host' => 'imap.gmail.com',
        'imap_port' => 993,
        'username' => 'me@example.com',
        'password' => '',
        'encryption' => 'ssl',
        'poll_interval_min' => '5',
        'is_enabled' => true,
    ])->assertRedirect();

    expect(UserImapSetting::where('user_id', $user->id)->first()->password)->toBe('original');
});

it('deletes settings', function () {
    $user = User::factory()->create();
    UserImapSetting::create([
        'user_id' => $user->id,
        'imap_host' => 'h', 'imap_port' => 993, 'username' => 'u',
        'password' => 'p', 'encryption' => 'ssl', 'poll_interval_min' => '5', 'is_enabled' => false,
    ]);

    $this->actingAs($user)->delete('/settings/imap')->assertRedirect();
    expect(UserImapSetting::where('user_id', $user->id)->exists())->toBeFalse();
});
