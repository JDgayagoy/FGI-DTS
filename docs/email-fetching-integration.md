# Email Fetching Integration

## Overview

The email fetching integration automatically polls a user's IMAP mailbox, scans for emails that reference FGI shipment numbers, and links them to the correct shipment records. Matched emails are stored in the database and surfaced in the UI as notifications or activity logs.

---

## Architecture

```
Schedule (every minute)
  └─ console.php → imap-poll
        └─ FetchUserImapEmailsJob (queued per user)
              ├─ Webklex IMAP Client → connect → fetch INBOX (unseen, since last sync, limit 50)
              ├─ Filter: subject must match /\bFGI-[A-Za-z0-9]+\b/i
              ├─ Dedup: skip if imap_message_uid already stored
              └─ ShipmentEmailProcessor
                    ├─ EmailShipmentParser → matched_ref + shipment
                    ├─ ShipmentEmail::create(...)
                    └─ (pending_review) → ShipmentEmailDetectedNotification → notifications table
```

---

## Database Schema

### `user_imap_settings`

Stores per-user IMAP credentials and polling configuration.

```php
// Migration: 2026_06_27_000100_create_user_imap_settings_table.php
Schema::create('user_imap_settings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
    $table->string('imap_host');
    $table->unsignedSmallInteger('imap_port')->default(993);
    $table->string('username');
    $table->text('password');                                          // stored encrypted
    $table->enum('encryption', ['ssl', 'tls', 'none'])->default('ssl');
    $table->enum('poll_interval_min', ['1', '5', '10'])->default('5');
    $table->boolean('is_enabled')->default(false);
    $table->timestamp('last_synced_at')->nullable();
    $table->timestamps();
});
```

### `shipment_emails`

Stores every processed email that matched the FGI reference pattern.

```php
// Migration: 2026_06_27_000200_create_shipment_emails_table.php
Schema::create('shipment_emails', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->unsignedBigInteger('shipment_id')->nullable();
    $table->foreign('shipment_id')->references('shipment_id')->on('shipments')->nullOnDelete();
    $table->string('imap_message_uid');
    $table->string('from_address');
    $table->string('from_name')->nullable();
    $table->string('subject');
    $table->text('body_excerpt');
    $table->string('matched_ref')->nullable();
    $table->enum('action_taken', [
        'matched', 'pending_review', 'dismissed', 'shipment_created', 'skipped',
    ]);
    $table->timestamp('received_at');
    $table->timestamp('processed_at')->nullable();
    $table->timestamps();

    $table->unique(['user_id', 'imap_message_uid']);  // dedup guard
});
```

---

## Models

### `UserImapSetting`

```php
// app/Models/UserImapSetting.php
class UserImapSetting extends Model
{
    protected $fillable = [
        'user_id', 'imap_host', 'imap_port', 'username', 'password',
        'encryption', 'poll_interval_min', 'is_enabled', 'last_synced_at',
    ];

    protected $hidden = ['password'];

    protected $appends = ['has_password'];

    protected function casts(): array
    {
        return [
            'password'      => 'encrypted',   // Laravel encrypted cast
            'is_enabled'    => 'boolean',
            'imap_port'     => 'integer',
            'last_synced_at'=> 'datetime',
        ];
    }

    public function getHasPasswordAttribute(): bool
    {
        return ! empty($this->attributes['password']);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

> The `password` is stored using Laravel's built-in `encrypted` cast, which transparently encrypts/decrypts via `APP_KEY`. It is never exposed in JSON responses (`$hidden`). The `has_password` appended attribute lets the frontend show a placeholder `••••••••` without exposing the raw value.

### `ShipmentEmail`

```php
// app/Models/ShipmentEmail.php
class ShipmentEmail extends Model
{
    protected $fillable = [
        'user_id', 'shipment_id', 'imap_message_uid', 'from_address',
        'from_name', 'subject', 'body_excerpt', 'matched_ref',
        'action_taken', 'received_at', 'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'received_at'  => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

---

## Scheduler

The schedule is defined in `routes/console.php`. It runs every minute via `php artisan schedule:run` (or a cron job in production).

```php
// routes/console.php
Schedule::call(function () {
    UserImapSetting::where('is_enabled', true)->each(function (UserImapSetting $setting) {
        $minute = now()->minute;
        $due = match ($setting->poll_interval_min) {
            '1'     => true,
            '5'     => $minute % 5 === 0,
            '10'    => $minute % 10 === 0,
            default => false,
        };

        if ($due) {
            FetchUserImapEmailsJob::dispatch($setting->user_id);
        }
    });
})->everyMinute()->name('imap-poll')->withoutOverlapping();
```

- **`withoutOverlapping()`** — prevents concurrent poll runs if a job takes longer than 1 minute.
- **`name('imap-poll')`** — visible in `php artisan schedule:list` and logs.
- The `match` expression respects each user's chosen interval (1 / 5 / 10 minutes) without separate schedules.

---

## Job: `FetchUserImapEmailsJob`

```php
// app/Jobs/FetchUserImapEmailsJob.php
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
                'host'          => $setting->imap_host,
                'port'          => $setting->imap_port,
                'encryption'    => $setting->encryption === 'none' ? false : $setting->encryption,
                'validate_cert' => true,
                'username'      => $setting->username,
                'password'      => $setting->password, // decrypted by cast
                'protocol'      => 'imap',
                'timeout'       => 15,
            ]);

            $client->connect();
            $folder = $client->getFolder('INBOX');

            $query = $folder->messages()->unseen();

            // Incremental sync — only fetch since the last successful sync
            if ($setting->last_synced_at) {
                $query->since($setting->last_synced_at->format('d-M-Y'));
            }

            $messages = $query
                ->fetchOrderDesc()
                ->limit(50)
                ->get();

            foreach ($messages as $message) {
                $subject = trim((string) $message->getSubject());

                // Pre-filter: skip emails that don't mention an FGI reference
                if (! preg_match('/\bFGI-[A-Za-z0-9]+\b/i', $subject)) {
                    continue;
                }

                $this->processMessage($setting, [
                    'uid'          => (string) $message->getUid(),
                    'from_address' => optional($message->getFrom()[0] ?? null)->mail ?? '',
                    'from_name'    => optional($message->getFrom()[0] ?? null)->personal,
                    'subject'      => $subject,
                    'body'         => $message->hasTextBody()
                        ? $message->getTextBody()
                        : strip_tags((string) $message->getHTMLBody()),
                    'received_at'  => Carbon::parse($message->getDate()),
                ]);
            }

            $setting->update(['last_synced_at' => now()]);

        } catch (\Throwable $e) {
            Log::error('IMAP fetch failed', [
                'user_id' => $this->userId,
                'error'   => $e->getMessage(),
            ]);

            return; // fail silently; the next poll will retry
        }
    }

    /**
     * @param array{uid:string,from_address:string,from_name:?string,subject:string,body:string,received_at:Carbon} $message
     */
    public function processMessage(UserImapSetting $setting, array $message): void
    {
        // Deduplication: skip if this UID was already stored for this user
        $exists = ShipmentEmail::where('user_id', $setting->user_id)
            ->where('imap_message_uid', $message['uid'])
            ->exists();

        if ($exists) {
            return;
        }

        app(ShipmentEmailProcessor::class)->process($setting->user, $message);
    }
}
```

**Key design decisions:**
| Decision | Reason |
|---|---|
| `timeout = 60` | IMAP connections can be slow; prevents premature queue kills |
| Subject pre-filter (`FGI-*`) | Avoids DB write for irrelevant emails before heavier parsing |
| `last_synced_at` window | Prevents full mailbox re-scan on every poll; incremental syncing |
| `limit(50)` | Guards against runaway fetches on busy mailboxes |
| `fetchOrderDesc()` | Processes newest emails first |
| Errors caught + logged | Network failures don't permanently kill the job; next poll retries |

---

## Service: `EmailShipmentParser`

Extracts a shipment reference from an email and attempts to match it to an existing `Shipment` record.

```php
// app/Services/EmailShipmentParser.php
class EmailShipmentParser
{
    /**
     * @return array{matched_ref: ?string, shipment: ?Shipment}
     */
    public function parse(string $from, string $subject, string $body): array
    {
        // Combine subject + first 1000 chars of body as the search target
        $haystack      = $subject . "\n" . mb_substr($body, 0, 1000);
        $haystackLower = mb_strtolower($haystack);

        // Longest refs first so "FGI-10" wins over "FGI-1"
        $shipments = Shipment::query()
            ->whereNotNull('shipment_reference')
            ->where('shipment_reference', '!=', '')
            ->orderByRaw('LENGTH(shipment_reference) DESC')
            ->get(['shipment_id', 'shipment_reference']);

        foreach ($shipments as $shipment) {
            $ref = $shipment->shipment_reference;
            if (str_contains($haystackLower, mb_strtolower($ref))) {
                return [
                    'matched_ref' => $ref,
                    'shipment'    => $shipment,
                ];
            }
        }

        // Fallback: extract any FGI-XXXX pattern even if no DB match
        if (preg_match('/\bFGI-[A-Za-z0-9]+\b/i', $haystack, $matches)) {
            return [
                'matched_ref' => mb_strtoupper($matches[0]),
                'shipment'    => null,
            ];
        }

        return ['matched_ref' => null, 'shipment' => null];
    }
}
```

---

## Service: `ShipmentEmailProcessor`

Orchestrates parsing → storing → notifying.

```php
// app/Services/ShipmentEmailProcessor.php
class ShipmentEmailProcessor
{
    public function __construct(private EmailShipmentParser $parser) {}

    /**
     * @param array{uid:string,from_address:string,from_name:?string,subject:string,body:string,received_at:Carbon} $message
     */
    public function process(User $user, array $message): ShipmentEmail
    {
        $parsed     = $this->parser->parse(
            from:    $message['from_address'],
            subject: $message['subject'],
            body:    $message['body'],
        );

        $matchedRef = $parsed['matched_ref'];
        $shipment   = $parsed['shipment'];

        // Determine action
        if ($matchedRef !== null && $shipment !== null) {
            $action = 'matched';         // ref found AND shipment exists in DB
        } elseif ($matchedRef !== null) {
            $action = 'pending_review';  // ref found but no matching shipment
        } else {
            $action = 'skipped';         // no ref at all (shouldn't reach here due to pre-filter)
        }

        $email = ShipmentEmail::create([
            'user_id'          => $user->id,
            'shipment_id'      => $shipment?->shipment_id,
            'imap_message_uid' => $message['uid'],
            'from_address'     => $message['from_address'],
            'from_name'        => $message['from_name'] ?? null,
            'subject'          => $message['subject'],
            'body_excerpt'     => mb_substr($message['body'], 0, 500),
            'matched_ref'      => $matchedRef,
            'action_taken'     => $action,
            'received_at'      => $message['received_at'],
            'processed_at'     => now(),
        ]);

        // Notify the user only when manual review is needed
        if ($action === 'pending_review') {
            $user->notify(new ShipmentEmailDetectedNotification($email));
        }

        return $email;
    }
}
```

### `action_taken` States

| Value | Meaning |
|---|---|
| `matched` | Email reference found AND matched to an existing shipment |
| `pending_review` | Reference found (FGI-XXXX) but no shipment in DB yet |
| `dismissed` | User manually dismissed the notification |
| `shipment_created` | User manually created a shipment from the email |
| `skipped` | Email passed the subject filter but parser found no reference |

---

## Notification: `ShipmentEmailDetectedNotification`

Sent via the `database` channel when an email is `pending_review`.

```php
// app/Notifications/ShipmentEmailDetectedNotification.php
class ShipmentEmailDetectedNotification extends Notification
{
    public function __construct(public ShipmentEmail $email) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'shipment_email_id' => $this->email->id,
            'from_address'      => $this->email->from_address,
            'from_name'         => $this->email->from_name,
            'subject'           => $this->email->subject,
            'matched_ref'       => $this->email->matched_ref,
            'body_excerpt'      => $this->email->body_excerpt,
            'received_at'       => $this->email->received_at?->toIso8601String(),
        ];
    }
}
```

> Notifications are stored in the `notifications` table (created by `2026_06_27_130829_create_notifications_table.php`).

---

## HTTP Layer

### Routes (`routes/settings.php`)

```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('settings/email-integration', [UserImapSettingController::class, 'show'])
        ->name('imap.show');

    Route::put('settings/imap', [UserImapSettingController::class, 'update'])
        ->name('imap.update');

    Route::post('settings/imap/test', [UserImapSettingController::class, 'test'])
        ->name('imap.test');

    Route::delete('settings/imap', [UserImapSettingController::class, 'destroy'])
        ->name('imap.destroy');
});
```

Also, from `web.php`:
```php
// Shipment email actions (notification panel)
Route::post('shipment-emails/{shipmentEmail}/dismiss',       [ShipmentEmailController::class, 'dismiss'])
    ->name('shipment-emails.dismiss');
Route::post('shipment-emails/{shipmentEmail}/mark-created',  [ShipmentEmailController::class, 'markCreated'])
    ->name('shipment-emails.mark-created');
```

### `UserImapSettingController`

```php
// app/Http/Controllers/Settings/UserImapSettingController.php

// GET settings/email-integration
public function show(Request $request): Response
{
    $setting = UserImapSetting::where('user_id', $request->user()->id)->first();

    $recentEmails = ShipmentEmail::where('user_id', $request->user()->id)
        ->latest('processed_at')
        ->take(10)
        ->get(['id', 'matched_ref', 'action_taken', 'processed_at'])
        ->map(fn ($e) => [
            'id'           => $e->id,
            'matched_ref'  => $e->matched_ref,
            'action_taken' => $e->action_taken,
            'processed_at' => $e->processed_at?->toIso8601String(),
        ]);

    return Inertia::render('settings/email-integration', [
        'setting'      => $setting,
        'recentEmails' => $recentEmails,
    ]);
}

// PUT settings/imap
public function update(UpdateImapSettingRequest $request): RedirectResponse
{
    $data = $request->validated();

    // Blank password = keep existing; don't overwrite with empty string
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

// POST settings/imap/test
public function test(Request $request): RedirectResponse
{
    $setting = UserImapSetting::where('user_id', $request->user()->id)->firstOrFail();

    try {
        $client = Client::make([/* same credentials as job */]);
        $client->connect();
        $client->disconnect();
        Inertia::flash('imapTest', ['ok' => true, 'message' => __('Connected successfully')]);
    } catch (\Throwable $e) {
        Inertia::flash('imapTest', ['ok' => false, 'message' => $this->sanitize($e->getMessage())]);
    }

    return back();
}

// DELETE settings/imap
public function destroy(Request $request): RedirectResponse
{
    UserImapSetting::where('user_id', $request->user()->id)->delete();
    Inertia::flash('toast', ['type' => 'success', 'message' => __('Email integration removed.')]);
    return back();
}

// Strips credentials from error messages before surfacing to the user
private function sanitize(string $message): string
{
    return preg_replace('/password[^\s]*/i', 'password', mb_substr($message, 0, 200));
}
```

### `ShipmentEmailController`

```php
// app/Http/Controllers/ShipmentEmailController.php

// POST shipment-emails/{shipmentEmail}/dismiss
public function dismiss(Request $request, ShipmentEmail $shipmentEmail): RedirectResponse
{
    $this->authorizeOwner($request, $shipmentEmail);
    $shipmentEmail->update(['action_taken' => 'dismissed']);
    $this->markRelatedNotificationRead($request, $shipmentEmail);
    return back();
}

// POST shipment-emails/{shipmentEmail}/mark-created
public function markCreated(Request $request, ShipmentEmail $shipmentEmail): RedirectResponse
{
    $this->authorizeOwner($request, $shipmentEmail);
    $shipmentEmail->update(['action_taken' => 'shipment_created']);
    $this->markRelatedNotificationRead($request, $shipmentEmail);
    return back();
}

private function authorizeOwner(Request $request, ShipmentEmail $email): void
{
    abort_unless($email->user_id === $request->user()->id, 403);
}

private function markRelatedNotificationRead(Request $request, ShipmentEmail $email): void
{
    $request->user()->unreadNotifications
        ->where('type', ShipmentEmailDetectedNotification::class)
        ->filter(fn ($n) => ($n->data['shipment_email_id'] ?? null) === $email->id)
        ->each->markAsRead();
}
```

### Form Request: `UpdateImapSettingRequest`

```php
// app/Http/Requests/Settings/UpdateImapSettingRequest.php
public function rules(): array
{
    return [
        'imap_host'        => ['required', 'string', 'max:255'],
        'imap_port'        => ['required', 'integer', 'min:1', 'max:65535'],
        'username'         => ['required', 'string', 'max:255'],
        'password'         => ['nullable', 'string', 'max:255'],
        'encryption'       => ['required', 'in:ssl,tls,none'],
        'poll_interval_min'=> ['required', 'in:1,5,10'],
        'is_enabled'       => ['required', 'boolean'],
    ];
}
```

---

## Frontend Page (`settings/email-integration.tsx`)

The Inertia page at `GET /settings/email-integration` renders the settings form and recent email activity.

**Props received from server:**
```ts
interface PageProps {
    setting: ImapSetting | null;      // null if never configured
    recentEmails: RecentEmail[];      // last 10 processed emails
    imapTest?: { ok: boolean; message: string };  // flash from test connection
}
```

**Key behaviors:**
- All fields are disabled when `is_enabled` is `false`.
- Password field shows `••••••••` placeholder when a password is already stored (`setting.has_password`). The actual value is never sent to the frontend. A new password is only submitted when the user types in the field (`passwordTouched` state).
- Test Connection fires `POST /settings/imap/test` and the result is flashed back via `Inertia::flash('imapTest', ...)`.
- Recent Activity table shows the last 10 processed emails with their action, matched reference, and timestamp.
- Remove Integration fires `DELETE /settings/imap` after a confirmation dialog.

---

## Running Locally

**Start the scheduler** (runs every minute in a loop):
```bash
php artisan schedule:work
```

**Or trigger manually:**
```bash
php artisan schedule:run
```

**Process the dispatched jobs:**
```bash
php artisan queue:work
```

**Or process a single job:**
```bash
php artisan queue:work --once --tries=1
```

**Inspect logs:**
```bash
php artisan pail
```

---

## Debugging Tips

### Force a re-sync for a user

Reset `last_synced_at` to 7 days ago to re-fetch recent emails:

```php
// php artisan tinker
App\Models\UserImapSetting::where('user_id', 5)->update([
    'last_synced_at' => now()->subDays(7),
]);
```

### Check stored emails for a user

```php
App\Models\ShipmentEmail::where('user_id', 5)
    ->latest('id')
    ->take(5)
    ->get(['id', 'subject', 'action_taken', 'matched_ref', 'shipment_id']);
```

### Check IMAP error logs

```bash
tail -f storage/logs/laravel.log | grep "IMAP fetch failed"
```

Or with Pail:
```bash
php artisan pail --filter="IMAP fetch failed"
```

---

## Security Notes

- Passwords are encrypted at rest using Laravel's `encrypted` cast (AES-256-CBC via `APP_KEY`).
- Passwords are in `$hidden` on the model — never serialized to JSON.
- The `sanitize()` method in `UserImapSettingController` strips credential-looking strings from error messages before surfacing them to the user.
- All settings routes require `auth` + `verified` middleware.
- `ShipmentEmailController` enforces ownership (`abort_unless($email->user_id === $user->id, 403)`).
- IMAP connections use `validate_cert: true` by default.

---

## Dependencies

| Package | Purpose |
|---|---|
| `webklex/php-imap` | IMAP client library (`Client` facade) |
| Laravel Queues | Async job dispatch |
| Laravel Scheduler | Cron-like polling via `schedule:run` |
| Laravel Notifications | `database` channel for `pending_review` alerts |
| Laravel Encrypted Cast | Transparent AES-256 password storage |
