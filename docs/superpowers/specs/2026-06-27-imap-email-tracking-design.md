---
title: IMAP Email Tracking Integration
date: 2026-06-27
status: approved
---

# IMAP Email Tracking Integration

## Overview

Per-user opt-in IMAP inbox integration. Polls the user's email inbox on a configurable schedule, scans emails for known shipment reference patterns, and either links matched emails to existing shipments or notifies the user to review and optionally create a new shipment ticket. Disabled by default.

**Stack additions:** `webklex/php-imap`, Laravel DB notifications, Laravel scheduler

---

## 1. Data Model

### `user_imap_settings`
| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK → users | unique, one config per user |
| `imap_host` | string | e.g. `imap.gmail.com` |
| `imap_port` | unsignedSmallInt | e.g. `993` |
| `username` | string | email address |
| `password` | text | stored via `encrypt()` |
| `encryption` | enum: `ssl\|tls\|none` | default `ssl` |
| `poll_interval_min` | enum: `1\|5\|10` | default `5` |
| `is_enabled` | boolean | default `false` |
| `last_synced_at` | nullable timestamp | |
| `created_at` / `updated_at` | timestamps | |

### `shipment_emails`
| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK → users | who fetched it |
| `shipment_id` | nullable FK → shipments | null if no match |
| `imap_message_uid` | string | IMAP UID — idempotency key, unique per user |
| `from_address` | string | |
| `from_name` | nullable string | |
| `subject` | string | |
| `body_excerpt` | text | first 500 chars of plain-text body |
| `matched_ref` | nullable string | the ref string found (e.g. `FGI-001`) |
| `action_taken` | enum: `matched\|pending_review\|dismissed\|shipment_created\|skipped` | |
| `received_at` | timestamp | from email Date header |
| `processed_at` | timestamp | when job ran |

**Idempotency:** `imap_message_uid` + `user_id` = unique index. Prevents re-processing on every poll.

---

## 2. Backend Architecture

### New Files
```
app/Models/UserImapSetting.php
app/Models/ShipmentEmail.php
app/Jobs/FetchUserImapEmailsJob.php
app/Services/EmailShipmentParser.php
app/Services/ShipmentEmailProcessor.php
app/Notifications/ShipmentEmailDetectedNotification.php
app/Http/Controllers/UserImapSettingController.php
app/Http/Controllers/NotificationController.php
app/Http/Controllers/ShipmentEmailController.php
database/migrations/xxxx_create_user_imap_settings_table.php
database/migrations/xxxx_create_shipment_emails_table.php
```

### `FetchUserImapEmailsJob`
- Receives `user_id`
- Loads `UserImapSetting`, decrypts password
- Opens IMAP connection via `webklex/php-imap`
- Fetches unseen messages (UNSEEN flag)
- For each message: skip if UID already in `shipment_emails` for this user
- Passes to `EmailShipmentParser` → `ShipmentEmailProcessor`
- Updates `last_synced_at` on `UserImapSetting`
- On IMAP connection failure: log error, do not throw (prevents queue poison)

### `EmailShipmentParser`
- Accepts: `from`, `subject`, `body` (plain text)
- Scans subject first, then body (first 1000 chars)
- Regex against all `shipment_reference` values in DB for current user's accessible shipments. At current scale (hundreds of shipments) a simple `LIKE` query per candidate ref is acceptable; if volume grows, extract candidate refs from email first via pattern regex, then query only those.
- Returns: `{ matched_ref: string|null, shipment: Shipment|null }`
- If no ref found: returns `{ matched_ref: null, shipment: null }`

### `ShipmentEmailProcessor`
```
matched_ref found + shipment exists
  → create ShipmentEmail (action_taken: matched, shipment_id set)
  → optional: add to shipment activity log

matched_ref found + no shipment
  → create ShipmentEmail (action_taken: pending_review)
  → fire ShipmentEmailDetectedNotification → user

no matched_ref
  → create ShipmentEmail (action_taken: skipped)
  → silent, no notification
```

### `ShipmentEmailDetectedNotification`
- Channel: `database` only (no mail, no broadcast)
- Payload stored in `notifications.data`:
  ```json
  {
    "shipment_email_id": 42,
    "from_address": "broker@fastcargo.com",
    "from_name": "Fast Cargo",
    "subject": "RE: FGI-001 ETA Update",
    "matched_ref": "FGI-001",
    "body_excerpt": "...",
    "received_at": "2026-06-27T14:14:00Z"
  }
  ```

### Scheduler (`routes/console.php`)
```php
Schedule::call(function () {
    UserImapSetting::where('is_enabled', true)->each(function ($setting) {
        $due = match ($setting->poll_interval_min) {
            1  => true,
            5  => now()->minute % 5 === 0,
            10 => now()->minute % 10 === 0,
        };
        if ($due) {
            FetchUserImapEmailsJob::dispatch($setting->user_id);
        }
    });
})->everyMinute();
```

### IMAP Library
`webklex/laravel-imap` — Laravel-native IMAP client. Add to `composer.json`. Config via `config/imap.php` (default account unused; credentials passed per-job).

### Credential Security
- Password encrypted via `encrypt()` on `UserImapSetting::saving()` model hook
- Decrypted via `decrypt()` inside job only
- Password never returned in any API or Inertia response
- If credential exists, settings GET returns `has_password: true` — frontend renders `••••••••`

---

## 3. Settings UI

**File:** `resources/js/pages/settings/email-integration.tsx` (new page)
**Layout:** added to `resources/js/layouts/settings/layout.tsx` sub-nav as "Email Integration"

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Email Integration                                           │
│ Connect your inbox to automatically track shipment emails.  │
├─────────────────────────────────────────────────────────────┤
│ [Toggle] Enable email tracking                              │
├─────────────────────────────────────────────────────────────┤
│ IMAP Host       [                    ]                      │
│ Port            [993]  Encryption [SSL ▾]                   │
│ Username        [                    ]                      │
│ Password        [••••••••            ]  (use app password)  │
│                                                             │
│ Poll Interval   ○ Every 1 min                               │
│                 ● Every 5 mins                              │
│                 ○ Every 10 mins                             │
├─────────────────────────────────────────────────────────────┤
│ [Test Connection]                       [Save Settings]     │
│ ✓ Connected successfully  (inline, green, after test)       │
├─────────────────────────────────────────────────────────────┤
│ Last synced: 3 minutes ago                                  │
│                                                             │
│ Recent Activity                                             │
│ ● matched        FGI-001  Jun 27, 2:14 PM                  │
│ ● pending review FGI-009  Jun 27, 1:50 PM                  │
│ ● skipped        —        Jun 27, 1:49 PM                  │
└─────────────────────────────────────────────────────────────┘
```

### Behaviors
- Toggle off → fields disabled, polling stops, credentials preserved in DB
- "Test Connection" → `POST /settings/imap/test`, synchronous, inline result below button
  - Success: `text-green-600` "Connected successfully"
  - Failure: `text-red-600` + IMAP error message (sanitized)
- "Save Settings" → `PUT /settings/imap`, Inertia form submit
- Password field: only sent to server when user explicitly types a new value — detect via `hasChanged` flag
- Form disabled when toggle is off

### Routes
```
GET    /settings/imap              → UserImapSettingController@show
PUT    /settings/imap              → UserImapSettingController@update
POST   /settings/imap/test         → UserImapSettingController@test
DELETE /settings/imap              → UserImapSettingController@destroy
```

---

## 4. Notification System

### Header Bell (`app-header.tsx`)
- Bell icon (`lucide: Bell`) with unread count badge
- Badge: `absolute -top-1 -right-1 size-4 rounded-full bg-blue-600 text-white text-[10px] font-bold`
- Hidden when count = 0
- Unread count injected via `HandleInertiaRequests::share()` — available on every page without extra fetch

### Notification Dropdown
- Opens on bell click as a `Popover` (shadcn)
- Width: `w-80`, max height `max-h-96 overflow-y-auto`
- Header: "Notifications" + "Mark all read" button (`text-xs text-blue-600`)
- Each row:
  - Unread: `bg-blue-50` left border `border-l-2 border-blue-600`
  - Read: `bg-white`
  - Content: title "New shipment email" + `from_address` + relative time
  - Click: marks read + opens Email Detail Modal
- Footer: "View all" link → `/notifications` (full page, future scope)

### Email Detail Modal
Triggered by notification click. Uses existing `ModalShell` component.

```
┌──────────────────────────────────────────────┐
│ Shipment Email Detected                  [✕] │
├──────────────────────────────────────────────┤
│ From      broker@fastcargo.com               │
│ Subject   RE: FGI-001 ETA Update             │
│ Received  Jun 27, 2026 · 2:14 PM             │
│ Ref found FGI-001                            │
├──────────────────────────────────────────────┤
│ [scrollable body excerpt, max-h-[300px]]     │
├──────────────────────────────────────────────┤
│                [Dismiss]  [Create Shipment]  │
└──────────────────────────────────────────────┘
```

**"Create Shipment":**
- Closes this modal
- Opens existing Add Shipment modal with `shipment_reference` pre-filled from `matched_ref`
- On shipment save success: `POST /shipment-emails/{id}/created` → sets `action_taken = shipment_created`

**"Dismiss":**
- `POST /shipment-emails/{id}/dismiss` → sets `action_taken = dismissed`
- Removes notification from dropdown

### Notification Routes
```
GET  /notifications                       → NotificationController@index (Inertia shared)
POST /notifications/{id}/read             → NotificationController@markRead
POST /notifications/read-all              → NotificationController@markAllRead
POST /shipment-emails/{id}/dismiss        → ShipmentEmailController@dismiss
POST /shipment-emails/{id}/created        → ShipmentEmailController@markCreated
```

### Inertia Share (HandleInertiaRequests)
```php
'notifications' => fn () => auth()->user()?->unreadNotifications()
    ->where('type', ShipmentEmailDetectedNotification::class)
    ->latest()
    ->take(10)
    ->get()
    ->toArray(),
'unread_notification_count' => fn () => auth()->user()?->unreadNotifications()->count() ?? 0,
```

---

## 5. Shipment Activity Log (Matched Emails)

When `action_taken = matched`, the email is linked to an existing shipment. The shipment detail modal/view should show an "Email Activity" section.

**Shipment modal — new "Emails" tab:**
```
┌─────────────────────────────────────────────┐
│ [Documents]  [Emails]                       │  (History tab: out of scope)
├─────────────────────────────────────────────┤
│ broker@fastcargo.com                        │
│ RE: FGI-001 ETA Update · Jun 27, 2:14 PM   │
│ "Goods have cleared customs as of..."       │
├─────────────────────────────────────────────┤
│ agent@dhl.com                               │
│ FGI-001 BL Released · Jun 26, 9:02 AM      │
│ "Please find the released BL attached..."  │
└─────────────────────────────────────────────┘
```
- Only shown if shipment has linked `shipment_emails`
- Clicking a row expands body excerpt inline (no modal)

---

## 6. Scope Boundaries

**In scope:**
- `app/Models/UserImapSetting.php`
- `app/Models/ShipmentEmail.php`
- `app/Jobs/FetchUserImapEmailsJob.php`
- `app/Services/EmailShipmentParser.php`
- `app/Services/ShipmentEmailProcessor.php`
- `app/Notifications/ShipmentEmailDetectedNotification.php`
- `app/Http/Controllers/UserImapSettingController.php`
- `app/Http/Controllers/NotificationController.php`
- `app/Http/Controllers/ShipmentEmailController.php`
- `database/migrations/` — 2 new tables
- `routes/console.php` — scheduler entry
- `routes/web.php` — new routes
- `app/Http/Middleware/HandleInertiaRequests.php` — share notifications
- `resources/js/pages/settings/email-integration.tsx` (new)
- `resources/js/layouts/settings/layout.tsx` — add sub-nav item
- `resources/js/components/app-header.tsx` — bell icon + dropdown
- `resources/js/components/notifications/notification-dropdown.tsx` (new)
- `resources/js/components/notifications/email-detail-modal.tsx` (new)
- `resources/js/components/shipments/document-dialog.tsx` or shipment modal — add Emails tab

**Out of scope:**
- Real-time push (websockets, broadcasting) — polling via Inertia shared props is sufficient
- Email reply / send from FGI-DTS — read-only
- Attachment parsing / PDF extraction from emails
- Non-IMAP protocols (SMTP, POP3)
- `/notifications` full page — stub only for now

---

## 7. Success Criteria

1. IMAP settings page saves, encrypts, and loads credentials correctly (password never exposed)
2. "Test Connection" returns success/failure within 5 seconds
3. Scheduler dispatches `FetchUserImapEmailsJob` at correct intervals (1/5/10 min)
4. Same email UID never processed twice per user
5. Matched email → linked to correct shipment in `shipment_emails`
6. Unmatched email with ref → notification appears in bell dropdown for correct user
7. "Create Shipment" from notification → Add Shipment modal pre-fills ref field
8. "Dismiss" removes notification from dropdown immediately
9. Matched emails appear in shipment Emails tab
10. Disabling IMAP toggle stops polling without deleting credentials
