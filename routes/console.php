<?php

use App\Jobs\FetchUserImapEmailsJob;
use App\Models\UserImapSetting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    UserImapSetting::where('is_enabled', true)->each(function (UserImapSetting $setting) {
        $minute = now()->minute;
        $due = match ($setting->poll_interval_min) {
            '1' => true,
            '5' => $minute % 5 === 0,
            '10' => $minute % 10 === 0,
            default => false,
        };

        if ($due) {
            FetchUserImapEmailsJob::dispatch($setting->user_id);
        }
    });
})->everyMinute()->name('imap-poll')->withoutOverlapping();
