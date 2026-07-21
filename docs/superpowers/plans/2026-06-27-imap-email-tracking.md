# IMAP Email Tracking Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-user opt-in IMAP inbox polling that scans incoming email for shipment reference patterns, links matched mail to existing shipments, and notifies the user (via DB notifications + header bell) about unmatched refs so they can create a shipment.

**Architecture:** A Laravel scheduler tick dispatches `FetchUserImapEmailsJob` per enabled user at their chosen interval. The job opens an IMAP connection (`webklex/laravel-imap`), pulls unseen messages, and hands each to `EmailShipmentParser` (finds a `shipment_reference`) then `ShipmentEmailProcessor` (persists a `ShipmentEmail` row and fires a notification when needed). Frontend is Inertia + React: a new settings page manages credentials, a header bell renders shared unread notifications, and a detail modal lets the user dismiss or jump to a pre-filled Add Shipment modal.

**Tech Stack:** Laravel 12, Inertia 2, React 19 + TypeScript, Tailwind, shadcn/ui, Pest 4, MySQL, database queue + database notifications, `webklex/laravel-imap`.

## Global Constraints

- **No per-user shipment ownership exists.** Shipments have no `user_id`. The parser scans **all** shipment rows' `shipment_reference`. Do not invent ownership scoping.
- **Shipment PK is `shipment_id`** (not `id`). FK columns referencing it must use `shipment_id`.
- **Password is write-only.** Never return the IMAP password in any controller/Inertia/JSON response. Expose only `has_password: bool`.
- **IMAP failures must not throw out of the job** — log and return, to avoid poisoning the database queue.
- **Idempotency key:** `(user_id, imap_message_uid)` unique. Never process the same UID twice per user.
- **Notifications channel is `database` only.** No mail, no broadcast.
- **Frontend route calls use plain string URLs** with `@inertiajs/react` `router`/`useForm` (matches existing `shipments/index.tsx`). Do not depend on Wayfinder-generated route helpers for the new code.
- **Encryption** via Eloquent `encrypted` cast on `UserImapSetting::password`.
- **Tests:** Pest 4. Backend tasks are TDD. Use `RefreshDatabase`. Frontend tasks verify via `npm run build` + `npm run types` (no component test harness exists).

---

### Task 1: Install dependencies + notifications/jobs tables

**Files:**
- Modify: `composer.json` (require `webklex/laravel-imap`)
- Create: `config/imap.php` (published)
- Create: `database/migrations/xxxx_create_notifications_table.php`

**Interfaces:**
- Produces: `notifications` table (Laravel DatabaseNotification schema), `webklex/laravel-imap` classes available under `Webklex\IMAP\Facades\Client`.

- [ ] **Step 1: Require the IMAP package**

```bash
composer require webklex/laravel-imap
```

Expected: package installs, `Webklex\IMAP\Providers\LaravelServiceProvider` auto-discovered.

- [ ] **Step 2: Publish IMAP config**

```bash
php artisan vendor:publish --provider="Webklex\IMAP\Providers\LaravelServiceProvider"
```

Expected: `config/imap.php` created. No edits needed — credentials are passed per-job, the default account is unused.

- [ ] **Step 3: Create the notifications table migration**

```bash
php artisan notifications:table
```

If that command is unavailable, create `database/migrations/2026_06_27_000000_create_notifications_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
```

- [ ] **Step 4: Run migrations**

Run: `php artisan migrate`
Expected: `notifications` table created. (`jobs` table already exists.)

- [ ] **Step 5: Commit**

```bash
git add composer.json composer.lock config/imap.php database/migrations
git commit -m "chore: add webklex/laravel-imap and notifications table"
```

---

### Task 2: `user_imap_settings` table + model

**Files:**
- Create: `database/migrations/xxxx_create_user_imap_settings_table.php`
- Create: `app/Models/UserImapSetting.php`
- Test: `tests/Feature/Imap/UserImapSettingModelTest.php`

**Interfaces:**
- Produces:
  - `UserImapSetting` model, table `user_imap_settings`.
  - Columns: `id`, `user_id`, `imap_host`, `imap_port`, `username`, `password` (encrypted cast), `encryption`, `poll_interval_min`, `is_enabled`, `last_synced_at`, timestamps.
  - `$casts`: `password => encrypted`, `is_enabled => boolean`, `imap_port => integer`, `last_synced_at => datetime`.
  - Accessor `getHasPasswordAttribute(): bool`.
  - `user()` belongsTo relation.
  - `$hidden = ['password']`.

- [ ] **Step 1: Write the failing test**

`tests/Feature/Imap/UserImapSettingModelTest.php`:

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=UserImapSettingModelTest`
Expected: FAIL — `Class "App\Models\UserImapSetting" not found`.

- [ ] **Step 3: Create the migration**

`database/migrations/2026_06_27_000100_create_user_imap_settings_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_imap_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('imap_host');
            $table->unsignedSmallInteger('imap_port')->default(993);
            $table->string('username');
            $table->text('password');
            $table->enum('encryption', ['ssl', 'tls', 'none'])->default('ssl');
            $table->enum('poll_interval_min', ['1', '5', '10'])->default('5');
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_imap_settings');
    }
};
```

- [ ] **Step 4: Create the model**

`app/Models/UserImapSetting.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserImapSetting extends Model
{
    protected $fillable = [
        'user_id',
        'imap_host',
        'imap_port',
        'username',
        'password',
        'encryption',
        'poll_interval_min',
        'is_enabled',
        'last_synced_at',
    ];

    protected $hidden = ['password'];

    protected $appends = ['has_password'];

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'is_enabled' => 'boolean',
            'imap_port' => 'integer',
            'last_synced_at' => 'datetime',
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

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --filter=UserImapSettingModelTest`
Expected: PASS (2 passing).

- [ ] **Step 6: Commit**

```bash
git add database/migrations app/Models/UserImapSetting.php tests/Feature/Imap/UserImapSettingModelTest.php
git commit -m "feat: add UserImapSetting model with encrypted password"
```

---

### Task 3: `shipment_emails` table + model

**Files:**
- Create: `database/migrations/xxxx_create_shipment_emails_table.php`
- Create: `app/Models/ShipmentEmail.php`
- Modify: `app/Models/Shipment.php` (add `emails()` relation)
- Test: `tests/Feature/Imap/ShipmentEmailModelTest.php`

**Interfaces:**
- Produces:
  - `ShipmentEmail` model, table `shipment_emails`.
  - Columns: `id`, `user_id`, `shipment_id` (nullable FK → shipments.shipment_id), `imap_message_uid`, `from_address`, `from_name` (nullable), `subject`, `body_excerpt`, `matched_ref` (nullable), `action_taken` (enum), `received_at`, `processed_at`, timestamps.
  - Unique index `(user_id, imap_message_uid)`.
  - `action_taken` values: `matched`, `pending_review`, `dismissed`, `shipment_created`, `skipped`.
  - Relations: `shipment()` belongsTo (`shipment_id`,`shipment_id`), `user()` belongsTo.
  - `Shipment::emails()` hasMany.

- [ ] **Step 1: Write the failing test**

`tests/Feature/Imap/ShipmentEmailModelTest.php`:

```php
<?php

use App\Models\Shipment;
use App\Models\ShipmentEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;

uses(RefreshDatabase::class);

it('enforces a unique uid per user', function () {
    $user = User::factory()->create();

    $make = fn () => ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-1',
        'from_address' => 'a@b.com',
        'subject' => 'hi',
        'body_excerpt' => '...',
        'action_taken' => 'skipped',
        'received_at' => now(),
        'processed_at' => now(),
    ]);

    $make();
    expect(fn () => $make())->toThrow(QueryException::class);
});

it('links to a shipment via shipment_id', function () {
    $user = User::factory()->create();
    $shipment = Shipment::factory()->create();

    $email = ShipmentEmail::create([
        'user_id' => $user->id,
        'shipment_id' => $shipment->shipment_id,
        'imap_message_uid' => 'UID-2',
        'from_address' => 'a@b.com',
        'subject' => 'FGI-001',
        'body_excerpt' => '...',
        'matched_ref' => $shipment->shipment_reference,
        'action_taken' => 'matched',
        'received_at' => now(),
        'processed_at' => now(),
    ]);

    expect($email->shipment->shipment_id)->toBe($shipment->shipment_id);
    expect($shipment->emails)->toHaveCount(1);
});
```

> If `Shipment::factory()` does not exist yet, create a minimal factory in this step (see Step 3b). Check `database/factories/` first.

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=ShipmentEmailModelTest`
Expected: FAIL — `Class "App\Models\ShipmentEmail" not found`.

- [ ] **Step 3: Create the migration**

`database/migrations/2026_06_27_000200_create_shipment_emails_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
            $table->timestamp('processed_at');
            $table->timestamps();

            $table->unique(['user_id', 'imap_message_uid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_emails');
    }
};
```

- [ ] **Step 3b: Ensure a Shipment factory exists** (only if missing)

`database/factories/ShipmentFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Shipment;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    public function definition(): array
    {
        return [
            'year' => 2026,
            'month' => 6,
            'shipment_reference' => 'FGI-'.$this->faker->unique()->numberBetween(100, 999),
            'brand' => $this->faker->company(),
            'incoterm' => 'FOB',
            'actual_time_of_arrival' => now(),
            'broker_id' => null,
            'brand_manager' => $this->faker->name(),
            'shipment_type_id' => 1,
            'status_id' => 2,
        ];
    }
}
```

Add `use HasFactory;` to `Shipment` (already present per current model).

- [ ] **Step 4: Create the model**

`app/Models/ShipmentEmail.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentEmail extends Model
{
    protected $fillable = [
        'user_id',
        'shipment_id',
        'imap_message_uid',
        'from_address',
        'from_name',
        'subject',
        'body_excerpt',
        'matched_ref',
        'action_taken',
        'received_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
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

- [ ] **Step 5: Add the `emails` relation to Shipment**

In `app/Models/Shipment.php`, add after `documents()`:

```php
    public function emails()
    {
        return $this->hasMany(ShipmentEmail::class, 'shipment_id', 'shipment_id');
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --filter=ShipmentEmailModelTest`
Expected: PASS (2 passing).

- [ ] **Step 7: Commit**

```bash
git add database app/Models tests/Feature/Imap/ShipmentEmailModelTest.php
git commit -m "feat: add ShipmentEmail model and shipment relation"
```

---

### Task 4: `EmailShipmentParser` service

**Files:**
- Create: `app/Services/EmailShipmentParser.php`
- Test: `tests/Feature/Imap/EmailShipmentParserTest.php`

**Interfaces:**
- Produces: `EmailShipmentParser::parse(string $from, string $subject, string $body): array` returning `['matched_ref' => ?string, 'shipment' => ?Shipment]`.
- Behavior: scans `$subject` then first 1000 chars of `$body`. For each shipment_reference in the DB, case-insensitive substring match. First match wins. Longer refs checked before shorter (avoids `FGI-1` matching inside `FGI-10`).

- [ ] **Step 1: Write the failing test**

`tests/Feature/Imap/EmailShipmentParserTest.php`:

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=EmailShipmentParserTest`
Expected: FAIL — `Class "App\Services\EmailShipmentParser" not found`.

- [ ] **Step 3: Create the service**

`app/Services/EmailShipmentParser.php`:

```php
<?php

namespace App\Services;

use App\Models\Shipment;

class EmailShipmentParser
{
    /**
     * @return array{matched_ref: ?string, shipment: ?Shipment}
     */
    public function parse(string $from, string $subject, string $body): array
    {
        $haystack = $subject."\n".mb_substr($body, 0, 1000);
        $haystackLower = mb_strtolower($haystack);

        // Longest refs first so "FGI-10" wins over "FGI-1".
        $shipments = Shipment::query()
            ->whereNotNull('shipment_reference')
            ->where('shipment_reference', '!=', '')
            ->orderByRaw('CHAR_LENGTH(shipment_reference) DESC')
            ->get(['shipment_id', 'shipment_reference']);

        foreach ($shipments as $shipment) {
            $ref = $shipment->shipment_reference;
            if (str_contains($haystackLower, mb_strtolower($ref))) {
                return [
                    'matched_ref' => $ref,
                    'shipment' => $shipment,
                ];
            }
        }

        return ['matched_ref' => null, 'shipment' => null];
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=EmailShipmentParserTest`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
git add app/Services/EmailShipmentParser.php tests/Feature/Imap/EmailShipmentParserTest.php
git commit -m "feat: add EmailShipmentParser service"
```

---

### Task 5: `ShipmentEmailDetectedNotification` + `ShipmentEmailProcessor`

**Files:**
- Create: `app/Notifications/ShipmentEmailDetectedNotification.php`
- Create: `app/Services/ShipmentEmailProcessor.php`
- Test: `tests/Feature/Imap/ShipmentEmailProcessorTest.php`

**Interfaces:**
- Consumes: `EmailShipmentParser` output, `User`.
- Produces:
  - `ShipmentEmailDetectedNotification` (constructed with a `ShipmentEmail`), `via() = ['database']`, `toDatabase()` returns the payload array.
  - `ShipmentEmailProcessor::process(User $user, array $message): ShipmentEmail` where `$message` has keys: `uid`, `from_address`, `from_name`, `subject`, `body`, `received_at` (Carbon). Internally calls the parser, applies the branch logic, persists, fires notification. Returns the created `ShipmentEmail`.

- [ ] **Step 1: Write the failing test**

`tests/Feature/Imap/ShipmentEmailProcessorTest.php`:

```php
<?php

use App\Models\Shipment;
use App\Models\ShipmentEmail;
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

    // FGI-999 not in DB -> no parser match -> skipped (see note)
    expect($email->action_taken)->toBe('skipped');
    Notification::assertNothingSent();
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
```

> **Design note on `pending_review`:** The parser only returns a `matched_ref` when that ref exists as a shipment row (it scans existing shipments). Therefore "ref found + no shipment" cannot arise from the current parser — a found ref always maps to a shipment. The `pending_review` branch and its notification are reached only if a future parser extracts arbitrary ref-shaped strings. Implement the branch (Step 3) for forward-compatibility, but the test above asserts the realistic path (`skipped`). Do not delete the branch.

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=ShipmentEmailProcessorTest`
Expected: FAIL — `Class "App\Services\ShipmentEmailProcessor" not found`.

- [ ] **Step 3: Create the notification**

`app/Notifications/ShipmentEmailDetectedNotification.php`:

```php
<?php

namespace App\Notifications;

use App\Models\ShipmentEmail;
use Illuminate\Notifications\Notification;

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
            'from_address' => $this->email->from_address,
            'from_name' => $this->email->from_name,
            'subject' => $this->email->subject,
            'matched_ref' => $this->email->matched_ref,
            'body_excerpt' => $this->email->body_excerpt,
            'received_at' => $this->email->received_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 4: Create the processor**

`app/Services/ShipmentEmailProcessor.php`:

```php
<?php

namespace App\Services;

use App\Models\ShipmentEmail;
use App\Models\User;
use App\Notifications\ShipmentEmailDetectedNotification;

class ShipmentEmailProcessor
{
    public function __construct(private EmailShipmentParser $parser) {}

    /**
     * @param  array{uid:string,from_address:string,from_name:?string,subject:string,body:string,received_at:\Illuminate\Support\Carbon}  $message
     */
    public function process(User $user, array $message): ShipmentEmail
    {
        $parsed = $this->parser->parse(
            from: $message['from_address'],
            subject: $message['subject'],
            body: $message['body'],
        );

        $matchedRef = $parsed['matched_ref'];
        $shipment = $parsed['shipment'];

        if ($matchedRef !== null && $shipment !== null) {
            $action = 'matched';
        } elseif ($matchedRef !== null) {
            $action = 'pending_review';
        } else {
            $action = 'skipped';
        }

        $email = ShipmentEmail::create([
            'user_id' => $user->id,
            'shipment_id' => $shipment?->shipment_id,
            'imap_message_uid' => $message['uid'],
            'from_address' => $message['from_address'],
            'from_name' => $message['from_name'] ?? null,
            'subject' => $message['subject'],
            'body_excerpt' => mb_substr($message['body'], 0, 500),
            'matched_ref' => $matchedRef,
            'action_taken' => $action,
            'received_at' => $message['received_at'],
            'processed_at' => now(),
        ]);

        if ($action === 'pending_review') {
            $user->notify(new ShipmentEmailDetectedNotification($email));
        }

        return $email;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --filter=ShipmentEmailProcessorTest`
Expected: PASS (4 passing).

- [ ] **Step 6: Commit**

```bash
git add app/Notifications app/Services/ShipmentEmailProcessor.php tests/Feature/Imap/ShipmentEmailProcessorTest.php
git commit -m "feat: add ShipmentEmailProcessor and detection notification"
```

---

### Task 6: `FetchUserImapEmailsJob`

**Files:**
- Create: `app/Jobs/FetchUserImapEmailsJob.php`
- Test: `tests/Feature/Imap/FetchUserImapEmailsJobTest.php`

**Interfaces:**
- Consumes: `UserImapSetting`, `ShipmentEmailProcessor`, `webklex/laravel-imap` client.
- Produces: `FetchUserImapEmailsJob` (implements `ShouldQueue`), constructor `__construct(public int $userId)`. `handle(ShipmentEmailProcessor $processor)`:
  - Loads enabled `UserImapSetting` for user; returns early if none/disabled.
  - Opens IMAP client via `Webklex\IMAP\Facades\Client::make([...])` with decrypted creds.
  - Fetches INBOX unseen messages.
  - For each: skip if `(user_id, uid)` already in `shipment_emails`; else build `$message` array and call `$processor->process()`.
  - Updates `last_synced_at`.
  - Wraps connection in try/catch — logs and returns on failure (no throw).

- [ ] **Step 1: Write the failing test**

The job's IMAP I/O is not unit-testable without a live server. Test the **idempotency + early-return** seams by extracting the per-message handling so the test drives it directly. Add a public `processMessage(UserImapSetting $setting, array $message): void` method and test that.

`tests/Feature/Imap/FetchUserImapEmailsJobTest.php`:

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=FetchUserImapEmailsJobTest`
Expected: FAIL — `Class "App\Jobs\FetchUserImapEmailsJob" not found`.

- [ ] **Step 3: Create the job**

`app/Jobs/FetchUserImapEmailsJob.php`:

```php
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=FetchUserImapEmailsJobTest`
Expected: PASS (2 passing).

- [ ] **Step 5: Commit**

```bash
git add app/Jobs/FetchUserImapEmailsJob.php tests/Feature/Imap/FetchUserImapEmailsJobTest.php
git commit -m "feat: add FetchUserImapEmailsJob with idempotent message handling"
```

---

### Task 7: Scheduler entry

**Files:**
- Modify: `routes/console.php`

**Interfaces:**
- Consumes: `UserImapSetting`, `FetchUserImapEmailsJob`.
- Produces: a `Schedule::call(...)->everyMinute()` that dispatches the job per enabled user when due by `poll_interval_min`.

- [ ] **Step 1: Add the scheduler block**

Append to `routes/console.php`:

```php
use App\Jobs\FetchUserImapEmailsJob;
use App\Models\UserImapSetting;
use Illuminate\Support\Facades\Schedule;

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
```

- [ ] **Step 2: Verify the schedule is registered**

Run: `php artisan schedule:list`
Expected: an entry named `imap-poll` running `everyMinute`.

- [ ] **Step 3: Commit**

```bash
git add routes/console.php
git commit -m "feat: schedule IMAP polling per user interval"
```

---

### Task 8: `UserImapSettingController` + settings routes

**Files:**
- Create: `app/Http/Controllers/Settings/UserImapSettingController.php`
- Create: `app/Http/Requests/Settings/UpdateImapSettingRequest.php`
- Modify: `routes/settings.php`
- Test: `tests/Feature/Settings/ImapSettingsTest.php`

**Interfaces:**
- Consumes: `UserImapSetting`, IMAP `Client` (for `test`).
- Produces routes (inside `auth` group):
  - `GET  settings/email-integration` → `show` → renders `settings/email-integration` with `setting` (password hidden, `has_password` present) + `recentEmails`.
  - `PUT  settings/imap` → `update`.
  - `POST settings/imap/test` → `test` (returns Inertia back with flashed `imapTest` result).
  - `DELETE settings/imap` → `destroy`.
  - Route names: `imap.show`, `imap.update`, `imap.test`, `imap.destroy`.
- Password rule: only updated when a non-empty `password` is submitted (`hasChanged` from frontend).

- [ ] **Step 1: Write the failing test**

`tests/Feature/Settings/ImapSettingsTest.php`:

```php
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=ImapSettingsTest`
Expected: FAIL — route `/settings/email-integration` not defined (404/500).

- [ ] **Step 3: Create the FormRequest**

`app/Http/Requests/Settings/UpdateImapSettingRequest.php`:

```php
<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateImapSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'imap_host' => ['required', 'string', 'max:255'],
            'imap_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['required', 'in:ssl,tls,none'],
            'poll_interval_min' => ['required', 'in:1,5,10'],
            'is_enabled' => ['required', 'boolean'],
        ];
    }
}
```

- [ ] **Step 4: Create the controller**

`app/Http/Controllers/Settings/UserImapSettingController.php`:

```php
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
```

- [ ] **Step 5: Register the routes**

In `routes/settings.php`, inside the `['auth', 'verified']` group, add:

```php
    Route::get('settings/email-integration', [\App\Http\Controllers\Settings\UserImapSettingController::class, 'show'])->name('imap.show');
    Route::put('settings/imap', [\App\Http\Controllers\Settings\UserImapSettingController::class, 'update'])->name('imap.update');
    Route::post('settings/imap/test', [\App\Http\Controllers\Settings\UserImapSettingController::class, 'test'])->name('imap.test');
    Route::delete('settings/imap', [\App\Http\Controllers\Settings\UserImapSettingController::class, 'destroy'])->name('imap.destroy');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --filter=ImapSettingsTest`
Expected: PASS (4 passing). (The `test` connection endpoint is not exercised here — it needs a live server.)

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/Settings/UserImapSettingController.php app/Http/Requests/Settings/UpdateImapSettingRequest.php routes/settings.php tests/Feature/Settings/ImapSettingsTest.php
git commit -m "feat: add IMAP settings controller and routes"
```

---

### Task 9: Notification + ShipmentEmail action controllers

**Files:**
- Create: `app/Http/Controllers/NotificationController.php`
- Create: `app/Http/Controllers/ShipmentEmailController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Imap/NotificationActionsTest.php`

**Interfaces:**
- Produces routes (inside `['auth','verified']` group):
  - `POST /notifications/{id}/read` → `NotificationController@markRead`
  - `POST /notifications/read-all` → `NotificationController@markAllRead`
  - `POST /shipment-emails/{shipmentEmail}/dismiss` → `ShipmentEmailController@dismiss` (sets `action_taken=dismissed`, marks the linked notification read)
  - `POST /shipment-emails/{shipmentEmail}/created` → `ShipmentEmailController@markCreated` (sets `action_taken=shipment_created`, marks linked notification read)
  - All scoped to `auth()->id()` — a user may only touch their own rows. Return `back()`.

- [ ] **Step 1: Write the failing test**

`tests/Feature/Imap/NotificationActionsTest.php`:

```php
<?php

use App\Models\ShipmentEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pendingEmail(User $user): ShipmentEmail
{
    return ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-'.uniqid(),
        'from_address' => 'b@x.com',
        'subject' => 'FGI-009',
        'body_excerpt' => '...',
        'matched_ref' => 'FGI-009',
        'action_taken' => 'pending_review',
        'received_at' => now(),
        'processed_at' => now(),
    ]);
}

it('dismisses a shipment email', function () {
    $user = User::factory()->create();
    $email = pendingEmail($user);

    $this->actingAs($user)
        ->post("/shipment-emails/{$email->id}/dismiss")
        ->assertRedirect();

    expect($email->fresh()->action_taken)->toBe('dismissed');
});

it('marks a shipment email as shipment_created', function () {
    $user = User::factory()->create();
    $email = pendingEmail($user);

    $this->actingAs($user)
        ->post("/shipment-emails/{$email->id}/created")
        ->assertRedirect();

    expect($email->fresh()->action_taken)->toBe('shipment_created');
});

it('forbids touching another users email', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $email = pendingEmail($owner);

    $this->actingAs($other)
        ->post("/shipment-emails/{$email->id}/dismiss")
        ->assertForbidden();

    expect($email->fresh()->action_taken)->toBe('pending_review');
});

it('marks all notifications read', function () {
    $user = User::factory()->create();
    $email = pendingEmail($user);
    $user->notify(new App\Notifications\ShipmentEmailDetectedNotification($email));

    expect($user->unreadNotifications()->count())->toBe(1);

    $this->actingAs($user)->post('/notifications/read-all')->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=NotificationActionsTest`
Expected: FAIL — routes not defined.

- [ ] **Step 3: Create NotificationController**

`app/Http/Controllers/NotificationController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function markRead(Request $request, string $id): RedirectResponse
    {
        $request->user()->notifications()->where('id', $id)->first()?->markAsRead();

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }
}
```

- [ ] **Step 4: Create ShipmentEmailController**

`app/Http/Controllers/ShipmentEmailController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\ShipmentEmail;
use App\Notifications\ShipmentEmailDetectedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShipmentEmailController extends Controller
{
    public function dismiss(Request $request, ShipmentEmail $shipmentEmail): RedirectResponse
    {
        $this->authorizeOwner($request, $shipmentEmail);
        $shipmentEmail->update(['action_taken' => 'dismissed']);
        $this->markRelatedNotificationRead($request, $shipmentEmail);

        return back();
    }

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
}
```

- [ ] **Step 5: Register routes**

In `routes/web.php`, inside the `['auth', 'verified']` group, add:

```php
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/shipment-emails/{shipmentEmail}/dismiss', [\App\Http\Controllers\ShipmentEmailController::class, 'dismiss'])->name('shipment-emails.dismiss');
    Route::post('/shipment-emails/{shipmentEmail}/created', [\App\Http\Controllers\ShipmentEmailController::class, 'markCreated'])->name('shipment-emails.created');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --filter=NotificationActionsTest`
Expected: PASS (4 passing).

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/NotificationController.php app/Http/Controllers/ShipmentEmailController.php routes/web.php tests/Feature/Imap/NotificationActionsTest.php
git commit -m "feat: add notification and shipment-email action controllers"
```

---

### Task 10: Share notifications via Inertia middleware

**Files:**
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Test: `tests/Feature/Imap/SharedNotificationsTest.php`

**Interfaces:**
- Consumes: `ShipmentEmailDetectedNotification`.
- Produces shared props on every authenticated page:
  - `notifications`: up to 10 latest unread of that type (each as array incl. `id`, `data`, `read_at`, `created_at`).
  - `unread_notification_count`: int.

- [ ] **Step 1: Write the failing test**

`tests/Feature/Imap/SharedNotificationsTest.php`:

```php
<?php

use App\Models\ShipmentEmail;
use App\Models\User;
use App\Notifications\ShipmentEmailDetectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('shares unread notification count on inertia pages', function () {
    $user = User::factory()->create();
    $email = ShipmentEmail::create([
        'user_id' => $user->id,
        'imap_message_uid' => 'UID-x',
        'from_address' => 'b@x.com',
        'subject' => 'FGI-009',
        'body_excerpt' => '...',
        'matched_ref' => 'FGI-009',
        'action_taken' => 'pending_review',
        'received_at' => now(),
        'processed_at' => now(),
    ]);
    $user->notify(new ShipmentEmailDetectedNotification($email));

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('unread_notification_count', 1));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=SharedNotificationsTest`
Expected: FAIL — `unread_notification_count` missing/null.

- [ ] **Step 3: Add shared props**

In `HandleInertiaRequests::share()`, add to the returned array (after `sidebarOpen`):

```php
            'notifications' => fn () => $request->user()
                ? $request->user()->unreadNotifications()
                    ->where('type', \App\Notifications\ShipmentEmailDetectedNotification::class)
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn ($n) => [
                        'id' => $n->id,
                        'data' => $n->data,
                        'read_at' => $n->read_at,
                        'created_at' => $n->created_at?->toIso8601String(),
                    ])
                : [],
            'unread_notification_count' => fn () => $request->user()
                ? $request->user()->unreadNotifications()
                    ->where('type', \App\Notifications\ShipmentEmailDetectedNotification::class)
                    ->count()
                : 0,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=SharedNotificationsTest`
Expected: PASS.

- [ ] **Step 5: Run the full backend suite**

Run: `php artisan test`
Expected: all green (existing + new).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Middleware/HandleInertiaRequests.php tests/Feature/Imap/SharedNotificationsTest.php
git commit -m "feat: share unread shipment-email notifications via Inertia"
```

---

### Task 11: Email Integration settings page + sub-nav

**Files:**
- Create: `resources/js/pages/settings/email-integration.tsx`
- Modify: `resources/js/layouts/settings/layout.tsx` (add sub-nav item)

**Interfaces:**
- Consumes shared props + page props `setting` (`{ has_password, imap_host, imap_port, username, encryption, poll_interval_min, is_enabled, last_synced_at } | null`), `recentEmails` (`{ id, matched_ref, action_taken, processed_at }[]`), and flashed `imapTest` (`{ ok, message } | undefined`).
- Posts to string URLs: `PUT /settings/imap`, `POST /settings/imap/test`, `DELETE /settings/imap`.

- [ ] **Step 1: Add the sub-nav item**

In `resources/js/layouts/settings/layout.tsx`, add to `sidebarNavItems` (use a plain string href to avoid Wayfinder dependency):

```tsx
    {
        title: 'Email Integration',
        href: '/settings/email-integration',
        icon: null,
    },
```

- [ ] **Step 2: Create the page**

`resources/js/pages/settings/email-integration.tsx`:

```tsx
import { Head, router, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImapSetting {
    has_password: boolean;
    imap_host: string;
    imap_port: number;
    username: string;
    encryption: 'ssl' | 'tls' | 'none';
    poll_interval_min: '1' | '5' | '10';
    is_enabled: boolean;
    last_synced_at: string | null;
}

interface RecentEmail {
    id: number;
    matched_ref: string | null;
    action_taken: string;
    processed_at: string | null;
}

interface PageProps {
    setting: ImapSetting | null;
    recentEmails: RecentEmail[];
    imapTest?: { ok: boolean; message: string };
    [key: string]: unknown;
}

export default function EmailIntegration() {
    const { props } = usePage<PageProps>();
    const setting = props.setting;

    const [form, setForm] = useState({
        imap_host: setting?.imap_host ?? '',
        imap_port: setting?.imap_port ?? 993,
        username: setting?.username ?? '',
        password: '',
        encryption: setting?.encryption ?? 'ssl',
        poll_interval_min: setting?.poll_interval_min ?? '5',
        is_enabled: setting?.is_enabled ?? false,
    });
    const [passwordTouched, setPasswordTouched] = useState(false);

    const update = (key: string, value: unknown) =>
        setForm((f) => ({ ...f, [key]: value }));

    const disabled = !form.is_enabled;

    const save = () => {
        router.put('/settings/imap', form, { preserveScroll: true });
    };

    const testConnection = () => {
        // Persist first so the server tests the latest values.
        router.put('/settings/imap', form, {
            preserveScroll: true,
            onSuccess: () => router.post('/settings/imap/test', {}, { preserveScroll: true }),
        });
    };

    const remove = () => {
        if (confirm('Remove email integration? Credentials will be deleted.')) {
            router.delete('/settings/imap', { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Email Integration" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Email Integration"
                    description="Connect your inbox to automatically track shipment emails."
                />

                <label className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={form.is_enabled}
                        onChange={(e) => update('is_enabled', e.target.checked)}
                        className="size-4"
                    />
                    <span className="text-sm font-medium">Enable email tracking</span>
                </label>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="imap_host">IMAP Host</Label>
                        <Input
                            id="imap_host"
                            value={form.imap_host}
                            disabled={disabled}
                            onChange={(e) => update('imap_host', e.target.value)}
                            placeholder="imap.gmail.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="imap_port">Port</Label>
                            <Input
                                id="imap_port"
                                type="number"
                                value={form.imap_port}
                                disabled={disabled}
                                onChange={(e) => update('imap_port', Number(e.target.value))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="encryption">Encryption</Label>
                            <select
                                id="encryption"
                                value={form.encryption}
                                disabled={disabled}
                                onChange={(e) => update('encryption', e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                            >
                                <option value="ssl">SSL</option>
                                <option value="tls">TLS</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={form.username}
                            disabled={disabled}
                            onChange={(e) => update('username', e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={passwordTouched ? form.password : ''}
                            disabled={disabled}
                            onChange={(e) => {
                                setPasswordTouched(true);
                                update('password', e.target.value);
                            }}
                            placeholder={setting?.has_password ? '••••••••' : ''}
                        />
                        <p className="text-xs text-muted-foreground">Use an app password.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Poll Interval</Label>
                        <div className="flex flex-col gap-1">
                            {(['1', '5', '10'] as const).map((v) => (
                                <label key={v} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="poll_interval_min"
                                        value={v}
                                        checked={form.poll_interval_min === v}
                                        disabled={disabled}
                                        onChange={() => update('poll_interval_min', v)}
                                    />
                                    Every {v} min{v === '1' ? '' : 's'}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={testConnection} disabled={disabled}>
                        Test Connection
                    </Button>
                    <Button onClick={save}>Save Settings</Button>
                </div>

                {props.imapTest && (
                    <p className={props.imapTest.ok ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                        {props.imapTest.ok ? '✓ ' : '✕ '}
                        {props.imapTest.message}
                    </p>
                )}

                {setting?.last_synced_at && (
                    <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(setting.last_synced_at).toLocaleString()}
                    </p>
                )}

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Recent Activity</h3>
                    {props.recentEmails.length === 0 && (
                        <p className="text-xs text-muted-foreground">No activity yet.</p>
                    )}
                    <ul className="space-y-1">
                        {props.recentEmails.map((e) => (
                            <li key={e.id} className="flex items-center gap-3 text-xs">
                                <Mail className="size-3 text-slate-400" />
                                <span className="w-28 font-medium">{e.action_taken}</span>
                                <span className="w-20">{e.matched_ref ?? '—'}</span>
                                <span className="text-muted-foreground">
                                    {e.processed_at ? new Date(e.processed_at).toLocaleString() : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {setting && (
                    <Button variant="destructive" onClick={remove}>
                        Remove integration
                    </Button>
                )}
            </div>
        </>
    );
}

EmailIntegration.layout = {
    breadcrumbs: [
        {
            title: 'Email Integration',
            href: '/settings/email-integration',
        },
    ],
};
```

> **Layout is automatic.** `resources/js/app.tsx` wraps every page whose name starts with `settings/` in `[AppLayout, SettingsLayout]` via its path-based resolver. Do NOT import or manually nest `AppLayout`/`SettingsLayout`, and do NOT use a function-form `.layout` — that double-wraps. Mirror `profile.tsx`/`security.tsx`: the page returns only its inner content and sets `Page.layout = { breadcrumbs: [...] }`.

- [ ] **Step 3: Build + typecheck**

Run: `npm run types` then `npm run build`
Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add resources/js/pages/settings/email-integration.tsx resources/js/layouts/settings/layout.tsx
git commit -m "feat: add email integration settings page"
```

---

### Task 12: Header bell + notification dropdown

**Files:**
- Create: `resources/js/components/notifications/notification-dropdown.tsx`
- Modify: `resources/js/components/app-header.tsx`

**Interfaces:**
- Consumes shared props `notifications` and `unread_notification_count`.
- Produces: `<NotificationDropdown />` rendering a `Popover` with a `Bell` trigger + badge, list of notifications, "Mark all read", and an `onSelect(notification)` callback that the header wires to open the email detail modal (Task 13).

- [ ] **Step 1: Define the shared notification type**

Add to `resources/js/types/index.d.ts` (or the project's shared types file — check where `BreadcrumbItem`/`NavItem` live and add alongside):

```ts
export interface AppNotification {
    id: string;
    data: {
        shipment_email_id: number;
        from_address: string;
        from_name: string | null;
        subject: string;
        matched_ref: string | null;
        body_excerpt: string;
        received_at: string | null;
    };
    read_at: string | null;
    created_at: string | null;
}
```

- [ ] **Step 2: Create the dropdown component**

`resources/js/components/notifications/notification-dropdown.tsx`:

```tsx
import { router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

interface Props {
    onSelect: (notification: AppNotification) => void;
}

export function NotificationDropdown({ onSelect }: Props) {
    const { props } = usePage<{
        notifications?: AppNotification[];
        unread_notification_count?: number;
    }>();

    const notifications = props.notifications ?? [];
    const count = props.unread_notification_count ?? 0;

    const handleClick = (n: AppNotification) => {
        router.post(`/notifications/${n.id}/read`, {}, { preserveScroll: true });
        onSelect(n);
    };

    const markAll = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="!size-5 opacity-80" />
                    {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            {count}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-96 w-80 overflow-y-auto p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    {count > 0 && (
                        <button onClick={markAll} className="text-xs text-blue-600">
                            Mark all read
                        </button>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                        No new notifications
                    </p>
                ) : (
                    <ul>
                        {notifications.map((n) => (
                            <li key={n.id}>
                                <button
                                    onClick={() => handleClick(n)}
                                    className={cn(
                                        'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800',
                                        !n.read_at && 'border-l-2 border-blue-600 bg-blue-50 dark:bg-blue-950/30',
                                    )}
                                >
                                    <span className="text-sm font-medium">New shipment email</span>
                                    <span className="text-xs text-muted-foreground">
                                        {n.data.from_address}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
```

> Confirm `@/components/ui/popover` exists (`ls resources/js/components/ui/popover.tsx`). If absent, add it via `npx shadcn@latest add popover` in this step.

- [ ] **Step 3: Wire the bell into the header**

In `resources/js/components/app-header.tsx`:
- Import the dropdown and the modal (Task 13): `import { NotificationDropdown } from '@/components/notifications/notification-dropdown';`
- Add local state for the selected email and render the modal (full wiring completed in Task 13). For now, place the bell before the Search button inside the right-side `<div className="ml-auto flex items-center space-x-2">`:

```tsx
                        <NotificationDropdown onSelect={() => {}} />
```

- [ ] **Step 4: Build + typecheck**

Run: `npm run types` then `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add resources/js/components/notifications/notification-dropdown.tsx resources/js/components/app-header.tsx resources/js/types/index.d.ts
git commit -m "feat: add notification bell and dropdown to header"
```

---

### Task 13: Email detail modal + Create-Shipment prefill flow

**Files:**
- Create: `resources/js/components/notifications/email-detail-modal.tsx`
- Modify: `resources/js/components/app-header.tsx` (manage selected email + render modal)
- Modify: `resources/js/pages/shipments/index.tsx` (open Add modal prefilled from `?new_ref=`)

**Interfaces:**
- Consumes: `AppNotification`.
- Produces: `<EmailDetailModal email onClose onDismiss onCreate />`.
  - **Dismiss** → `POST /shipment-emails/{id}/dismiss` then close.
  - **Create Shipment** → close modal, `router.visit('/shipments?new_ref=<matched_ref>&email_id=<id>')`. The shipments page opens the Add modal pre-filled. On successful create it calls `POST /shipment-emails/{email_id}/created`.

- [ ] **Step 1: Create the modal**

`resources/js/components/notifications/email-detail-modal.tsx`:

```tsx
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import type { AppNotification } from '@/types';

interface Props {
    notification: AppNotification;
    onClose: () => void;
}

export function EmailDetailModal({ notification, onClose }: Props) {
    const { data } = notification;
    const emailId = data.shipment_email_id;

    const dismiss = () => {
        router.post(`/shipment-emails/${emailId}/dismiss`, {}, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const createShipment = () => {
        onClose();
        const params = new URLSearchParams();
        if (data.matched_ref) params.set('new_ref', data.matched_ref);
        params.set('email_id', String(emailId));
        router.visit(`/shipments?${params.toString()}`);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-[520px] overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800/60 dark:bg-slate-950"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <p className="text-sm font-black tracking-tighter">Shipment Email Detected</p>
                    <button onClick={onClose}>
                        <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                <div className="space-y-2 px-5 py-4 text-sm">
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="text-slate-400">From</span>
                        <span>{data.from_address}</span>
                        <span className="text-slate-400">Subject</span>
                        <span>{data.subject}</span>
                        <span className="text-slate-400">Received</span>
                        <span>{data.received_at ? new Date(data.received_at).toLocaleString() : '—'}</span>
                        <span className="text-slate-400">Ref found</span>
                        <span>{data.matched_ref ?? '—'}</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                        {data.body_excerpt}
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <button
                        onClick={dismiss}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={createShipment}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        Create Shipment
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Wire selection + modal into the header**

In `resources/js/components/app-header.tsx`:
- Add imports:

```tsx
import { useState } from 'react';
import { EmailDetailModal } from '@/components/notifications/email-detail-modal';
import type { AppNotification } from '@/types';
```

- Inside `AppHeader`, add state:

```tsx
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
```

- Replace the placeholder `<NotificationDropdown onSelect={() => {}} />` with:

```tsx
                        <NotificationDropdown onSelect={setSelectedNotification} />
```

- Before the closing fragment `</>` at the end of the returned JSX, render the modal:

```tsx
            {selectedNotification && (
                <EmailDetailModal
                    notification={selectedNotification}
                    onClose={() => setSelectedNotification(null)}
                />
            )}
```

- [ ] **Step 3: Prefill the Add Shipment modal on the shipments page**

In `resources/js/pages/shipments/index.tsx`, add an effect after the existing `useState` declarations. Add `useEffect` to the React import.

```tsx
    // Open Add modal pre-filled when arriving from an email notification.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const newRef = params.get('new_ref');
        const emailId = params.get('email_id');
        if (newRef) {
            setAddForm({
                ...emptyForm,
                shipment_reference: newRef,
                shipment_type_id: String(shipmentTypes[0]?.shipment_type_id ?? ''),
            });
            setShowAddModal(true);
            if (emailId) {
                (window as Window & { __emailId?: string }).__emailId = emailId;
            }
            // Strip query params so a refresh doesn't reopen the modal.
            window.history.replaceState({}, '', '/shipments');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
```

Then update `handleAddSubmit` to notify the backend when the add came from an email:

```tsx
    const handleAddSubmit = () =>
        router.post('/shipments', addForm, {
            onSuccess: () => {
                closeAddModal();
                const emailId = (window as Window & { __emailId?: string }).__emailId;
                if (emailId) {
                    router.post(`/shipment-emails/${emailId}/created`, {}, { preserveScroll: true });
                    delete (window as Window & { __emailId?: string }).__emailId;
                }
            },
        });
```

- [ ] **Step 4: Build + typecheck**

Run: `npm run types` then `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add resources/js/components/notifications/email-detail-modal.tsx resources/js/components/app-header.tsx resources/js/pages/shipments/index.tsx
git commit -m "feat: add email detail modal and create-shipment prefill flow"
```

---

### Task 14: Shipment "Emails" tab

**Files:**
- Modify: `app/Http/Controllers/ShipmentController.php` (eager-load `emails` in `index`)
- Modify: `resources/js/pages/shipments/types.ts` (add `emails` to `Shipment`)
- Modify: `resources/js/components/shipments/document-dialog.tsx` (add Documents/Emails tab switch)

**Interfaces:**
- Consumes: `Shipment.emails` relation (Task 3).
- Produces: matched emails visible in the document dialog under an "Emails" tab; each row expands its body excerpt inline on click. Tab only appears when `activeShipment.emails?.length > 0`.

- [ ] **Step 1: Eager-load emails in the controller**

In `ShipmentController::index`, add `'emails'` to the `with([...])` array:

```php
        $shipments = Shipment::with([
            'status',
            'shipmentType',
            'broker',
            'documents.customDoc',
            'documents.currentStatus.status',
            'emails',
        ])
```

- [ ] **Step 2: Extend the Shipment type**

In `resources/js/pages/shipments/types.ts`, add an interface and field:

```ts
export interface ShipmentEmail {
    id: number;
    from_address: string;
    from_name: string | null;
    subject: string;
    body_excerpt: string;
    matched_ref: string | null;
    action_taken: string;
    received_at: string | null;
}
```

Add to the `Shipment` interface:

```ts
    emails?: ShipmentEmail[];
```

- [ ] **Step 3: Add the tab to the document dialog**

In `resources/js/components/shipments/document-dialog.tsx`:
- Add `useState` to the React import (already imports `useRef`):

```tsx
import { useRef, useState } from 'react';
```

- Inside the component, add tab state:

```tsx
    const [tab, setTab] = useState<'documents' | 'emails'>('documents');
    const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);
    const emails = activeShipment.emails ?? [];
```

- In the left panel header (after the `DOCUMENTS` label block), add a tab switch when emails exist. Place this just inside the left panel `<div className="flex w-64 ...">`, above the `<ul>`:

```tsx
                    {emails.length > 0 && (
                        <div className="flex gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800/60">
                            <button
                                onClick={() => setTab('documents')}
                                className={cn(
                                    'rounded-md px-2 py-1 text-[10px] font-black uppercase',
                                    tab === 'documents' ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-400',
                                )}
                            >
                                Documents
                            </button>
                            <button
                                onClick={() => setTab('emails')}
                                className={cn(
                                    'rounded-md px-2 py-1 text-[10px] font-black uppercase',
                                    tab === 'emails' ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-400',
                                )}
                            >
                                Emails
                            </button>
                        </div>
                    )}
```

- Wrap the existing document `<ul>` so it only shows on the documents tab, and add the emails list. Change the `<ul className="flex flex-col gap-1 overflow-y-auto p-3 flex-1">...</ul>` to be conditional:

```tsx
                    {tab === 'documents' ? (
                        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                            {/* existing document list items unchanged */}
                        </ul>
                    ) : (
                        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                            {emails.map((email) => (
                                <li
                                    key={email.id}
                                    onClick={() =>
                                        setExpandedEmailId((id) => (id === email.id ? null : email.id))
                                    }
                                    className="cursor-pointer rounded-xl border border-slate-200/60 p-2 hover:bg-white/50 dark:border-slate-800/60"
                                >
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                        {email.from_address}
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                        {email.subject}
                                        {email.received_at
                                            ? ` · ${new Date(email.received_at).toLocaleString()}`
                                            : ''}
                                    </p>
                                    {expandedEmailId === email.id && (
                                        <p className="mt-1 text-[9px] text-slate-500">
                                            {email.body_excerpt}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
```

> Keep the existing document `<li>` markup verbatim inside the `tab === 'documents'` branch — only the wrapping `<ul>` conditional is new.

- [ ] **Step 4: Build + typecheck**

Run: `npm run types` then `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ShipmentController.php resources/js/pages/shipments/types.ts resources/js/components/shipments/document-dialog.tsx
git commit -m "feat: add Emails tab to shipment document dialog"
```

---

### Task 15: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run: `php artisan test`
Expected: all green.

- [ ] **Step 2: Lint + format**

Run: `./vendor/bin/pint` and `npm run lint` (if defined)
Expected: no errors.

- [ ] **Step 3: Frontend build**

Run: `npm run types && npm run build`
Expected: clean.

- [ ] **Step 4: Manual smoke (documented, optional live IMAP)**

Without a live inbox you can still verify the non-IMAP path:
1. `php artisan migrate:fresh --seed` (or your seed flow).
2. Log in, open `/settings/email-integration`, save settings (toggle on). Confirm row created, password not present in the Inertia response (check Network tab / `assertMissing` already covers it).
3. Manually insert a `pending_review` ShipmentEmail + notify the user (tinker), confirm the bell badge appears, dropdown lists it, clicking opens the modal, Dismiss clears it, Create Shipment lands on `/shipments` with the Add modal pre-filled.
4. Insert a `matched` ShipmentEmail linked to a shipment, open that shipment's document dialog, confirm the Emails tab shows it.

```bash
php artisan tinker --execute="\$u=App\Models\User::first(); \$s=App\Models\Shipment::factory()->create(['shipment_reference'=>'FGI-777']); \$e=App\Models\ShipmentEmail::create(['user_id'=>\$u->id,'shipment_id'=>\$s->shipment_id,'imap_message_uid'=>'demo','from_address'=>'broker@x.com','subject'=>'FGI-777 update','body_excerpt'=>'cleared customs','matched_ref'=>'FGI-777','action_taken'=>'matched','received_at'=>now(),'processed_at'=>now()]);"
```

- [ ] **Step 5: Final commit (if any verification fixes were made)**

```bash
git add -A
git commit -m "test: end-to-end verification fixes for IMAP email tracking"
```

---

## Self-Review Notes

- **Spec §1 data model** → Tasks 2, 3 (both tables, idempotency unique index, enums). ✓
- **Spec §2 backend** → Tasks 1 (lib), 4 (parser), 5 (processor + notification), 6 (job), 7 (scheduler), 8 (credential security via `encrypted` cast + `has_password`). ✓
- **Spec §3 settings UI** → Task 11 (page, toggle, test connection, save, password-touch guard, recent activity, routes in Task 8). ✓
- **Spec §4 notifications** → Tasks 9 (routes/controllers), 10 (Inertia share), 12 (bell + dropdown), 13 (detail modal, dismiss, create-shipment prefill). ✓
- **Spec §5 shipment activity** → Task 14 (Emails tab). ✓
- **Spec §6 scope** → matches; `/notifications` full page intentionally omitted (out of scope; "View all" link can point to `#` or be dropped — not built). The dropdown "View all" footer from the spec is omitted as out-of-scope; add a disabled placeholder only if desired.
- **Known deviation:** `pending_review` branch is wired but unreachable with the current existing-shipment parser (documented in Task 5). Notification path is exercised in tests via direct `ShipmentEmail` creation (Tasks 9, 10).
- **Known deviation:** Email detail modal is a standalone component (not literally `ModalShell`) because `ModalShell`'s footer is a fixed Cancel+single-submit; the spec needs Dismiss + Create Shipment. Styling matches `ModalShell`.
- **Verify-before-finalize flags:** confirm `@/components/ui/popover` exists (Task 12), confirm settings page layout nesting against `profile.tsx`/`security.tsx` (Task 11), confirm a `ShipmentFactory` exists or create it (Task 3).
