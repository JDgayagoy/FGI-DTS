<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateImapSettingRequest;
use App\Models\ShipmentEmail;
use App\Models\UserImapSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Webklex\IMAP\Facades\Client;

class UserImapSettingController extends Controller
{
    public function show(Request $request): Response
    {
        $setting = UserImapSetting::where('user_id', $request->user()->id)->first();

        $recentEmails = ShipmentEmail::where('user_id', $request->user()->id)
            ->latest('processed_at')
            ->take(10)
            ->get(['id', 'matched_ref', 'action_taken', 'processed_at'])
            ->map(fn ($e) => [
                'id' => $e->id,
                'matched_ref' => $e->matched_ref,
                'action_taken' => $e->action_taken,
                'processed_at' => $e->processed_at?->toIso8601String(),
            ]);

        return Inertia::render('settings/email-integration', [
            'setting' => $setting,
            'recentEmails' => $recentEmails,
        ]);
    }

    public function update(UpdateImapSettingRequest $request): RedirectResponse
    {
        $data = $request->validated();

        // Drop password from the payload when blank — preserves the stored value.
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $setting = UserImapSetting::firstOrNew(['user_id' => $request->user()->id]);
        $setting->fill($data);
        $setting->user_id = $request->user()->id;
        $setting->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Email integration saved.')]);

        return back();
    }

    public function test(Request $request): RedirectResponse
    {
        $setting = UserImapSetting::where('user_id', $request->user()->id)->firstOrFail();

        try {
            $client = Client::make([
                'host' => $setting->imap_host,
                'port' => $setting->imap_port,
                'encryption' => $setting->encryption === 'none' ? false : $setting->encryption,
                'validate_cert' => true,
                'username' => $setting->username,
                'password' => $setting->password,
                'protocol' => 'imap',
            ]);
            $client->connect();
            $client->disconnect();

            Inertia::flash('imapTest', ['ok' => true, 'message' => __('Connected successfully')]);
        } catch (\Throwable $e) {
            Inertia::flash('imapTest', ['ok' => false, 'message' => $this->sanitize($e->getMessage())]);
        }

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        UserImapSetting::where('user_id', $request->user()->id)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Email integration removed.')]);

        return back();
    }

    private function sanitize(string $message): string
    {
        // Strip anything that looks like credentials from the surfaced error.
        return preg_replace('/password[^\s]*/i', 'password', mb_substr($message, 0, 200));
    }
}
