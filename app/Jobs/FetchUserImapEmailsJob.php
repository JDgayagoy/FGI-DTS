<?php

namespace App\Jobs;

use App\Models\ShipmentEmail;
use App\Models\UserImapSetting;
use App\Services\ShipmentEmailProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Webklex\IMAP\Facades\Client;

class FetchUserImapEmailsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;

    public function __construct(public int $userId) {}

    public function handle(ShipmentEmailProcessor $processor): void
    {
        $setting = UserImapSetting::where('user_id', $this->userId)
            ->where('is_enabled', true)
            ->first();

        if (! $setting) {
            return;
        }

        try {
            $client = Client::make([
                'host' => $setting->imap_host,
                'port' => $setting->imap_port,
                'encryption' => $setting->encryption === 'none' ? false : $setting->encryption,
                'validate_cert' => true,
                'username' => $setting->username,
                'password' => $setting->password, // decrypted by cast
                'protocol' => 'imap',
            ]);

            $client->connect();
            $folder = $client->getFolder('INBOX');
            $messages = $folder->messages()->unseen()->limit(50)->get();

            foreach ($messages as $message) {
                $this->processMessage($setting, [
                    'uid' => (string) $message->getUid(),
                    'from_address' => optional($message->getFrom()[0] ?? null)->mail ?? '',
                    'from_name' => optional($message->getFrom()[0] ?? null)->personal,
                    'subject' => (string) $message->getSubject(),
                    'body' => $message->hasTextBody()
                        ? $message->getTextBody()
                        : strip_tags((string) $message->getHTMLBody()),
                    'received_at' => Carbon::parse($message->getDate()),
                ]);
            }

            $setting->update(['last_synced_at' => now()]);
        } catch (\Throwable $e) {
            Log::error('IMAP fetch failed', [
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
            ]);

            return;
        }
    }

    /**
     * @param  array{uid:string,from_address:string,from_name:?string,subject:string,body:string,received_at:Carbon}  $message
     */
    public function processMessage(UserImapSetting $setting, array $message): void
    {
        $exists = ShipmentEmail::where('user_id', $setting->user_id)
            ->where('imap_message_uid', $message['uid'])
            ->exists();

        if ($exists) {
            return;
        }

        app(ShipmentEmailProcessor::class)->process($setting->user, $message);
    }
}
