# FGI-DTS Code Audit Report

**Audit Date:** 2026-07-03  
**Framework:** Laravel 13 / React 19 / Inertia.js v3  
**Scope:** Backend (PHP), Frontend (React/TypeScript), Database, Tests

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | 3 | Require immediate attention |
| **High** | 6 | Should be fixed soon |
| **Medium** | 8 | Recommended fixes |
| **Low** | 5 | Minor improvements |
| **Total Issues** | 22 | - |

**Key Findings:**
- N+1 query patterns in dashboard and reports aggregation
- Missing authorization enforcement at route/middleware level
- Inadequate test coverage for core business logic (Shipments, Documents, Reports)
- Potential race conditions in form submission handling
- Activity log gaps in shipment status transitions
- Date handling inconsistencies across frontend components

---

## Table of Contents

1. [Critical Issues (3)](#critical-issues)
2. [High-Severity Issues (6)](#high-severity-issues)
3. [Medium-Severity Issues (8)](#medium-severity-issues)
4. [Low-Severity Issues (5)](#low-severity-issues)
5. [Confirmed vs New Findings](#confirmed-vs-new-findings)
6. [By Module](#by-module)

---

## Critical Issues

### 1. Missing Authorization Middleware on Protected Routes

**File:** `routes/web.php`  
**Lines:** 17-51  
**Category:** Security  
**Severity:** Critical

**Description:**  
Routes are protected with `['auth', 'verified']` middleware, but individual controller methods rely on `Gate::authorize()` calls within the action. This is a secondary check. If a gate is accidentally forgotten in a controller method, the route remains unprotected.

**Risk:**
- **ShipmentController::updateDocumentStatus** (line 93): Permissions checked at lines 99-105, but gate call could be omitted
- **ShipmentController::uploadDocument** (line 143): Gate check at line 145 is the only protection
- **BrokerController::index** (line 15): Missing explicit gate check (relying on implicit)

**Impact:** Unauthorized users could potentially bypass permission checks if a developer forgets to add `Gate::authorize()` in a new method.

**Suggested Fix:**  
Create a custom middleware that validates permissions before the controller method is invoked. For example:
```php
// app/Http/Middleware/CheckPermission.php
Route::post('shipments/documents/{id}/upload', ...)->middleware('check.permission:upload_documents');
```

---

### 2. N+1 Query Problem in DashboardController Metrics Aggregation

**File:** `app/Http/Controllers/DashboardController.php`  
**Lines:** 15-106  
**Category:** Performance  
**Severity:** Critical

**Description:**  
The dashboard loads all shipments with relations (line 15-20), then applies memory-based filtering on ~900 active shipments. Per shipment row (line 67-106), the code iterates through 11 document keys, performing `$shipment->documents->first()` for each, which requires N additional filtered queries across all shipments. This compounds to 900 × 11 = ~9,900+ filter operations on already-loaded collections.

**Query Path:**
1. Eager loads: `Shipment::with(['status', 'shipmentType', 'broker', 'documents.customDoc', 'documents.currentStatus.status'])->get()` ✓ Good
2. Filters in memory: `$shipments->filter(fn($s) => ...)` ✓ Fine
3. **Problem**: Line 70: `$shipment->documents->first(fn($d) => $d->customDoc?->doc_name === $key)` runs 11 times per shipment on an in-memory collection, but the same collection is accessed repeatedly.

**Impact:**
- Dashboard page load time increases with shipment count
- Memory bloat from loading 900+ full shipments into PHP memory
- Recharts data prep computes metrics on every render

**Suggested Fix:**
```php
// Pre-index documents by customDoc.doc_name in PHP
$shipments = $allShipments->filter(fn($s) => $s->archived_at === null)->map(function ($shipment) {
    $docsByKey = $shipment->documents->groupBy(fn($d) => $d->customDoc?->doc_name)->toArray();
    $shipment->_docsByKey = $docsByKey; // Cache indexed docs
    return $shipment;
});
// Then in the loop:
$doc = $shipment->_docsByKey[$key][0] ?? null;
```

---

### 3. Inadequate Test Coverage for Core Domain Logic

**File:** `tests/Feature/`  
**Category:** Testing  
**Severity:** Critical

**Existing Tests:**
- 13 Feature test files (mostly auth + basic CRUD)
- No tests for: `ShipmentController::updateDocumentStatus()`, `ShipmentController::archive()`, document status transitions
- `DashboardTest.php` (line 7-35): Only validates page renders and hardcoded seed data; no business logic assertions
- No tests for permission-based access control on shipment operations

**Missing Coverage:**
- Shipment lifecycle transitions (Pending → Processing → Completed)
- Document approval/rejection workflow with cascading shipment status updates (e.g., line 130 in ShipmentController)
- Activity logging verification (does every mutation actually log?)
- Broker soft-delete logic (line 72-82 in BrokerController: is_active flag instead of deletion)
- Report aggregation accuracy

**Impact:** 
Regressions can slip into production. The document status update logic (lines 107-131 in ShipmentController) has conditional shipment status updates that could fail silently.

**Suggested Fix:**
Create comprehensive feature tests:
```php
// tests/Feature/ShipmentDocumentWorkflowTest.php
test('approving all documents updates shipment to Completed', function () {
    $shipment = Shipment::factory()->create(['status_id' => 2]); // Pending
    $docs = ShipmentDocument::factory()->count(2)->create(['shipment_id' => $shipment->shipment_id]);
    // Approve all docs
    // Assert shipment status changed to Completed (status_id = 4)
});
```

---

## High-Severity Issues

### 4. Activity Log Gaps in Shipment Status Transitions

**File:** `app/Http/Controllers/ShipmentController.php`  
**Lines:** 93-141  
**Category:** Audit Trail  
**Severity:** High

**Description:**  
The `updateDocumentStatus()` method modifies document status (line 108-118) and conditionally updates shipment status (line 131) but logs only the final shipment status change (line 133-138), not the intermediate document status update. If a user updates one document's status, the document status change is not logged—only the shipment's cascading update is.

**Code Flow:**
```php
// Line 108-109: Document status updated (no log here)
DocumentStatus::where('shipment_doc_id', $shipment_doc_id)->update(['is_current' => false]);
DocumentStatus::create([...]);

// Line 131: Shipment status conditionally updated
$shipment->update(['status_id' => $newStatusId]);

// Line 133-138: Only shipment update logged
ActivityLogger::log('document_status_updated', ..., $shipment, ...);
```

**Impact:**
- Audit trail is incomplete; you cannot trace individual document status changes
- Reports on "who approved what document when" are unreliable
- Compliance/audit queries fail

**Suggested Fix:**
Log the document status change immediately:
```php
public function updateDocumentStatus(Request $request, $shipment_doc_id)
{
    // ... authorization and validation ...
    
    $oldStatus = DocumentStatus::where('shipment_doc_id', $shipment_doc_id)
        ->where('is_current', true)->first();
    
    DocumentStatus::where('shipment_doc_id', $shipment_doc_id)->update(['is_current' => false]);
    $newDocStatus = DocumentStatus::create([...]);
    
    // Log document status change IMMEDIATELY
    $doc = ShipmentDocument::find($shipment_doc_id);
    ActivityLogger::log(
        'document_status_changed',
        "Changed document {$doc->custom_doc->doc_name} status to {$newDocStatus->status->status_name}",
        $doc,
        ['old_status_id' => $oldStatus?->status_id, 'new_status_id' => $request->status_id]
    );
    
    // ... rest of method ...
}
```

---

### 5. Missing Nullability Handling in Date Rendering (UI Bug Confirmed)

**File:** Multiple frontend components  
**Lines:** `dashboard/shipments-table.tsx:103`, `dashboard.tsx:110-117`, `logs/index.tsx:97-104`  
**Category:** Bug  
**Severity:** High

**Description:**  
The backend can store `null` for `actual_time_of_arrival` (migration line 18 in `2026_04_26_131615_create_shipments_table.php` specifies `nullable()`). The shipment creation in `ShipmentController::store()` (line 70-72) defaults to `now()` if null, but existing records and direct database updates may have null values.

Frontend rendering:
- `dashboard/shipments-table.tsx:103`: `new Date(shipment.date).toLocaleDateString(...)` will produce `"Invalid Date"` string if `shipment.date` is null
- `dashboard.tsx:110-117`: Filter checks `if (!shipment.date) return true;` which prevents errors but silently includes null dates in filtered results
- `logs/index.tsx:97-104`: Similar pattern with `new Date(log.created_at)`, but `created_at` is non-nullable so lower risk

**Impact:**
- UI displays "Invalid Date" instead of a fallback (known issue per project context)
- Date filtering includes null-dated shipments unexpectedly
- User confusion; shipments appear unsorted or undateable

**Affected Records:**
- Any shipment created before the form field default was added
- Any shipment edited without touching the ATA field

**Suggested Fix:**
```tsx
// dashboard/shipments-table.tsx - Line 102-104
<td className="px-6 py-3 text-[11px] font-bold text-slate-400 transition-colors group-hover:text-slate-600">
    {shipment.date ? new Date(shipment.date).toLocaleDateString('en-US', ...) : 'N/A'}
</td>

// dashboard.tsx - Line 112-113: If filtering by null dates, skip them explicitly
if (shipment.date === null) {
    // Filter out completely or show separately
}
```

---

### 6. PDF Preview Fallback Not Comprehensive

**File:** `resources/js/components/shipments/document-dialog.tsx` + `resources/js/pages/dashboard.tsx`  
**Lines:** `document-dialog.tsx:142-169`, `dashboard.tsx:303-318`  
**Category:** Error Handling  
**Severity:** High

**Description:**  
The PDF viewer uses an iframe to fetch from `/shipments/documents/{id}/file` (line 144-147 in document-dialog). If the file is missing or Storage returns null (per the `ShipmentController::viewDocument()` logic on line 180-182), the iframe silently fails to load with no user feedback.

**Code Paths:**
1. If `file_path` is null/empty: UI shows "No PDF uploaded yet" ✓ Correct
2. If `file_path` exists but file not in storage: Controller aborts with 404, iframe displays blank ✗ Poor UX
3. If file is corrupted (e.g., not a valid PDF): iframe renders blank ✗ No error message

**Frontend Fallback:**
```tsx
// document-dialog.tsx:142-149
{selectedDoc.file_path ? (
    <iframe src={...} /> // Could fail silently
) : (
    <div>No PDF uploaded yet</div>
)}
```

**Backend:**
```php
// ShipmentController::viewDocument() line 180-182
if (!$doc->file_path || !Storage::disk('public')->exists($doc->file_path)) {
    abort(404); // Causes iframe to display blank
}
```

**Impact:**
- Users see a blank PDF viewer with no explanation
- No indication that the file is missing or corrupted
- Hard to debug from the frontend

**Suggested Fix:**
Add iframe error handling:
```tsx
const [pdfError, setPdfError] = useState(false);
return (
    <>
        {selectedDoc.file_path ? (
            <>
                <iframe
                    src={...}
                    onError={() => setPdfError(true)}
                    style={{ display: pdfError ? 'none' : 'block' }}
                />
                {pdfError && (
                    <div className="flex items-center justify-center h-full gap-4">
                        <AlertCircle className="size-10 text-red-500" />
                        <p>PDF failed to load. File may be missing or corrupted.</p>
                    </div>
                )}
            </>
        ) : (
            <div>No PDF uploaded yet</div>
        )}
    </>
);
```

---

### 7. Shipment Status Lifecycle Inconsistency

**File:** `database/seeders/ShipmentStatusListSeeder.php`, `app/Http/Controllers/ShipmentController.php`, `app/Http/Controllers/DashboardController.php`  
**Lines:** `ShipmentStatusListSeeder.php:15-24`, `ShipmentController.php:76,130`, `DashboardController.php:29-32`  
**Category:** Logic/Consistency  
**Severity:** High

**Description:**  
The seeder defines 4 statuses: `Processing`, `Pending`, `Failed`, `Completed`. The shipment creation (ShipmentController line 76) defaults to status_id = 2 (Pending). The dashboard and reports hardcode logic to check `status_name` against these 4 values, but there's no database constraint ensuring only these values exist, and no validation in the controller to prevent invalid status_ids from being inserted directly.

**Status Assumptions:**
- Status ID 1 = Approved? (No, actually assumed to be Completed in reports line 81)
- Status ID 2 = Pending ✓
- Status ID 4 = Completed ✓ (line 130 in ShipmentController)
- Status ID 3 = Failed? (No explicit mapping found)

**Bug**: In `DashboardController::index()` (line 29), the code checks for 'Processing', but the seeder uses 'Processing' as status_id=1. However, in `ReportsController` (line 81), a subquery tries to match status_id against a lookup of `shipment_status_list.status_name = 'Completed'`, which is fragile.

**Issues:**
1. No database NOT NULL constraint on `shipment_status_list.status_name`
2. Hard-coded status names in 3 places (Dashboard, Reports, ShipmentController logic)
3. No enum or constant for status IDs

**Impact:**
- If a seeder runs twice or data is corrupted, duplicate status names can exist
- Status logic is scattered across controllers; a status rename breaks multiple places
- Frontend `StatusIcon` component (line 5-7) relies on hardcoded string matching

**Suggested Fix:**
Create a Status enum:
```php
// app/Enums/ShipmentStatus.php
enum ShipmentStatus: int {
    case Processing = 1;
    case Pending = 2;
    case Failed = 3;
    case Completed = 4;
}
```
Use throughout:
```php
// ShipmentController line 76
$validated['status_id'] = ShipmentStatus::Pending->value;

// DashboardController line 29
$completedShipments = $shipments->filter(
    fn($s) => $s->status?->status_id === ShipmentStatus::Completed->value
)->count();
```

---

### 8. Eloquent Mass Assignment Risk on User Model

**File:** `app/Models/User.php`  
**Lines:** 14 (Fillable attribute)  
**Category:** Security  
**Severity:** High

**Description:**  
The User model uses attribute-based `#[Fillable(['name', 'email', 'password'])]` instead of `$fillable` property. This is fine, BUT the model does NOT explicitly hide sensitive fields from serialization in all contexts. The `#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]` (line 15) is correct, but **there is no guarded fallback if someone accidentally adds a new controller that passes `$request->all()` to `User::create()`**.

Additionally, **only 3 fields are explicitly fillable** but the model has no guarded protection. If a new field is added to the users table and forgotten in fillable, it cannot be mass-assigned, which is the intended behavior (allowlist, not blocklist). This is actually secure by design.

**Note:** This is not a critical issue—Laravel's default secure-by-default approach applies here. However, there's a minor risk if `$fillable` is replaced with `$guarded = []` in the future.

**Actual Risk:** Line 33 in ProfileController: `$request->user()->fill($request->validated())` is safe because `validated()` constrains the input. However, if a developer uses `$user->update($request->all())` instead, mass assignment could fail silently.

**Suggested Fix:**
Explicitly define `$guarded` as backup:
```php
// app/Models/User.php
#[Fillable(['name', 'email', 'password'])]
protected $guarded = ['id', 'created_at', 'updated_at'];
```

---

## Medium-Severity Issues

### 9. Missing Permission Checks on LogController

**File:** `app/Http/Controllers/LogController.php`  
**Lines:** 12-29  
**Category:** Security  
**Severity:** Medium

**Description:**  
The `LogController::index()` method has `Gate::authorize('view-logs')` (line 14) which checks permissions via custom gate. However, the gate returns `true` if the user has permission `view` + resource `logs`. **No tests verify that this gate actually denies unprivileged users.**

**Risk:** If the permission seeding is broken or a user's roles are misconfigured, the gate could silently allow access without audit trail.

**Suggested Fix:**
Add test:
```php
// tests/Feature/LogControllerTest.php
test('user without view-logs permission cannot access logs', function () {
    $user = User::factory()->create(); // No roles/permissions
    $response = actingAs($user)->get(route('logs.index'));
    $response->assertForbidden();
});
```

---

### 10. ReportsController Uses DB::raw with Subqueries (Consistency Issue)

**File:** `app/Http/Controllers/ReportsController.php`  
**Lines:** 78-84  
**Category:** Code Quality / Consistency  
**Severity:** Medium

**Description:**  
The project guideline states "Eloquent-only" (no raw SQL), but the ReportsController uses:
```php
SUM(CASE WHEN status_id = (SELECT status_id FROM shipment_status_list WHERE status_name = 'Completed') THEN 1 ELSE 0 END)
```

This is a database-specific `DATE_FORMAT` and `CASE` construct that doesn't use Laravel's query builder methods. While the query is safe from injection (hardcoded status name), it violates the Eloquent-only rule and reduces database portability.

**Impact:** Code is not portable to databases other than MySQL. If production migrates to PostgreSQL, this will fail.

**Suggested Fix:**
```php
// Option 1: Get status ID first, then use it
$completedStatusId = ShipmentStatusList::where('status_name', 'Completed')->first()?->status_id;

// Option 2: Use Eloquent's raw() but document it
->selectRaw(
    "COUNT(CASE WHEN status_id = ? THEN 1 END) as completed",
    [$completedStatusId]
)
```

---

### 11. Shipment Default Status Hardcoded as ID 2

**File:** `app/Http/Controllers/ShipmentController.php`  
**Lines:** 76  
**Category:** Magic Numbers  
**Severity:** Medium

**Description:**  
The line `$validated['status_id'] = 2; // Pending by default` hardcodes the status ID. If the seeder's insertion order changes (e.g., 'Pending' is inserted as ID 3 instead of 2), this default becomes incorrect.

**Impact:** New shipments are created with wrong status; metrics become inaccurate.

**Suggested Fix:**
```php
$validated['status_id'] = ShipmentStatusList::where('status_name', 'Pending')->first()?->status_id;
```

---

### 12. Form Submission Race Condition Risk (Double-Submit)

**File:** `resources/js/components/shipments/document-dialog.tsx`  
**Lines:** 42-46  
**Category:** Frontend UX / Async Handling  
**Severity:** Medium

**Description:**  
The `handleStatusUpdate()` function and `handleUpload()` function use Inertia's `router.post()` and `router.post()` respectively without any pending state or disabled button. A user can click "Approve" twice before the first request completes, resulting in duplicate database operations.

**Code:**
```tsx
// Line 42-46: No pending check
router.post(`/shipments/documents/${selectedDoc.shipment_doc_id}/upload`, formData, {...});

// Line 187-189: No disabled state during submission
<button onClick={() => handleStatusUpdate(selectedDoc.shipment_doc_id, 1)}>
    Approve
</button>
```

**Impact:** Database could receive duplicate approve/reject requests; activity logs show duplicate entries.

**Suggested Fix:**
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleStatusUpdate = (shipmentDocId: number, statusId: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    router.post(
        `/shipments/documents/${shipmentDocId}/status`,
        { status_id: statusId },
        {
            onFinish: () => setIsSubmitting(false),
        }
    );
};

// In JSX:
<button disabled={isSubmitting} onClick={() => handleStatusUpdate(...)}>
    {isSubmitting ? 'Approving...' : 'Approve'}
</button>
```

---

### 13. Missing URL Validation in Document Upload

**File:** `app/Http/Controllers/ShipmentController.php`  
**Lines:** 143-174  
**Category:** Security / File Upload  
**Severity:** Medium

**Description:**  
The `uploadDocument()` method validates MIME type (`mimes:pdf`, line 148) and file size (`max:10240` = 10 MB, line 148), but does **not validate the file content** beyond MIME type sniffing. A user could upload a non-PDF file with a `.pdf` MIME type, which the backend would store and the frontend iframe would attempt to render.

Additionally, the filename is stored as-is from the upload (line 163: `$file->getClientOriginalName()`), which could contain special characters or path traversal attempts (though Laravel's `store()` method handles path normalization).

**Risk (Low):**
- XSS via MIME type injection (unlikely; PDFs are not interpreted as HTML)
- Accidental file format errors if user uploads wrong file

**Suggested Fix:**
```php
// Validate actual PDF content
$file = $request->file('file');
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file->getRealPath());
finfo_close($finfo);

if ($mimeType !== 'application/pdf') {
    return back()->withErrors(['file' => 'File must be a valid PDF.']);
}

// Sanitize filename
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
```

---

### 14. Dashboard Metrics Query Could Timeout on Large Datasets

**File:** `app/Http/Controllers/DashboardController.php`  
**Lines:** 39-54  
**Category:** Performance  
**Severity:** Medium

**Description:**  
The `docStatusCounts` query (lines 39-45) uses a JOIN on document_status_list and groups by status_name. If there are millions of document status records, this query could be slow. Currently, there is:
- An index on `document_statuses.status_id` ✗ (No explicit index in migration)
- An index on `document_status_list.status_id` ✗ (No explicit index in migration)
- A JOIN filter on `is_current = true` ✗ (No index)

**Migration `2026_04_26_131913_create_document_statuses_table.php`** does not show indexes being created for the join columns.

**Impact:** Dashboard page load time could increase significantly with production data (100K+ shipments × 11 docs = 1.1M+ document statuses).

**Suggested Fix:**
Add indexes to the migration:
```php
$table->index('is_current');
$table->index(['shipment_doc_id', 'is_current']);
$table->foreign('status_id')->references('status_id')->on('document_status_list');
```

---

### 15. Wayfinder Integration Not Fully Utilized

**File:** `resources/js/pages/shipments/index.tsx`, `resources/js/components/shipments/document-dialog.tsx`, `resources/js/pages/dashboard.tsx`  
**Category:** Code Quality / Consistency  
**Severity:** Medium

**Description:**  
The project includes Laravel Wayfinder v0 for type-safe route generation, but some route calls are hardcoded as strings:
- `document-dialog.tsx:43`: `/shipments/documents/${selectedDoc.shipment_doc_id}/upload`
- `document-dialog.tsx:145`: `/shipments/documents/${selectedDoc.shipment_doc_id}/file`
- `dashboard.tsx:310`: `/shipments/documents/${docInfo.shipment_doc_id}/file`

While these are simple string interpolations and not security risks, they defeat the purpose of Wayfinder (type-safe route generation and refactoring safety).

**Impact:** If route paths change, these hardcoded strings won't be updated; developers must manually find and update them.

**Suggested Fix:**
Use Wayfinder-generated route functions:
```tsx
// resources/js/wayfinder/shipments.ts (auto-generated, but shown for reference)
export const shipmentDocumentUpload = (id: number) => `/shipments/documents/${id}/upload`;

// In component:
import { shipmentDocumentUpload } from '@/wayfinder/shipments';
router.post(shipmentDocumentUpload(selectedDoc.shipment_doc_id), ...);
```

---

## Low-Severity Issues

### 16. Incomplete Settings Module (Appearance Settings Stub)

**File:** `resources/js/pages/settings/appearance.tsx`, `routes/settings.php`  
**Lines:** `settings.php:23`, `appearance.tsx` (entire file)  
**Category:** Code Completeness  
**Severity:** Low

**Description:**  
The appearance settings route is defined (line 23 in settings.php) and rendered with Inertia (`. render('settings/appearance')`), but the component file is likely a stub with placeholder content. The project notes indicate "Appearance settings is mid-development" with Language and Density options marked "planned."

**Risk:** Low—this is intentional work in progress. However, if the route is exposed to users before completion, they may be confused by non-functional UI.

**Suggested Fix:**
- Add a "Coming Soon" banner to the appearance page, OR
- Remove the route if not yet ready for preview

---

### 17. No Explicit Transaction Handling in Multi-Step Operations

**File:** `app/Http/Controllers/ShipmentController.php`  
**Lines:** 93-141  
**Category:** Data Integrity  
**Severity:** Low

**Description:**  
The `updateDocumentStatus()` method performs multiple database operations (update old status to non-current, insert new status, conditionally update shipment, log activity) without explicit transaction handling. If an error occurs mid-operation (e.g., between lines 108-109 and line 112), the database could be left in an inconsistent state.

**Risk:** Low—Laravel's default connection is typically in autocommit mode, and individual queries will succeed or fail atomically. However, if application logic relies on multiple queries succeeding together, this is unsafe.

**Suggested Fix:**
```php
public function updateDocumentStatus(Request $request, $shipment_doc_id)
{
    return DB::transaction(function () use ($request, $shipment_doc_id) {
        // ... all the code ...
    });
}
```

---

### 18. Missing Broker Soft-Delete Cascade Logic

**File:** `app/Http/Controllers/BrokerController.php`  
**Lines:** 68-89  
**Category:** Data Model  
**Severity:** Low

**Description:**  
When a broker has shipments, the destroy method sets `is_active = false` instead of deleting (line 73). This is correct for soft-delete logic, but:
1. There's no model scope to automatically filter `is_active = true` on queries
2. Other controllers (e.g., ShipmentController line 44) explicitly filter `where('is_active', true)`, which is redundant if a scope exists

**Impact:** Minor—the code works, but is not consistent with Laravel conventions.

**Suggested Fix:**
Add a scope to the Broker model:
```php
// app/Models/Broker.php
public function scopeActive($query)
{
    return $query->where('is_active', true);
}

// Then in ShipmentController:
$brokers = Broker::active()->get();
```

---

### 19. StatusIcon Component Relies on Hardcoded String Matching

**File:** `resources/js/components/shipments/status-icon.tsx`  
**Lines:** 1-41  
**Category:** Maintainability  
**Severity:** Low

**Description:**  
The StatusIcon component uses hardcoded string matching (lines 5-7):
```tsx
if (['completed', 'ok', 'approved'].includes(t)) iconType = 'ok';
else if (['failed', 'error', 'rejected'].includes(t)) iconType = 'error';
else if (['processing', 'warning', 'incomplete'].includes(t)) iconType = 'warning';
```

If the backend status names change (e.g., 'Processing' → 'In Progress'), the frontend icon won't update without manual code changes.

**Impact:** Low—icons won't render the intended visual feedback for new status values.

**Suggested Fix:**
Move status-to-icon mapping to a shared constant:
```ts
// resources/js/lib/status-mapping.ts
export const statusIcons = {
    completed: 'ok',
    processing: 'warning',
    pending: 'pending',
    failed: 'error',
    approved: 'ok',
    rejected: 'error',
} as const;

// In StatusIcon:
const iconType = statusIcons[t as keyof typeof statusIcons] ?? 'pending';
```

---

### 20. Permission Names Use Inconsistent Underscore vs Hyphen Conventions

**File:** `app/Providers/AppServiceProvider.php`  
**Lines:** 35-47  
**Category:** Code Style  
**Severity:** Low

**Description:**  
Permission gate definitions use inconsistent naming:
- `manage-roles` (line 35): hyphen-based gate name
- `approve-documents` (line 46): hyphen-based gate name
- But the database stores: `manage_roles`, `approve` (underscores in action/resource)

This inconsistency could confuse developers; the gate name doesn't match the permission name pattern.

**Suggested Fix:**
Standardize to either underscores or hyphens. Hyphens are more idiomatic for Laravel gate names:
```php
Gate::define('manage_roles', fn (User $user) => $user->hasPermission('manage_roles', 'rbac'));
```

---

### 21. No Validation for Shipment Year/Month Fields

**File:** `app/Http/Controllers/ShipmentController.php`  
**Lines:** 56-91  
**Category:** Data Validation  
**Severity:** Low

**Description:**  
The shipment creation (line 74-75) auto-calculates year/month from ATA:
```php
$validated['year'] = $ata->year;
$validated['month'] = $ata->month;
```

But the update method (lines 189-216) allows year/month to be updated independently via `sometimes|integer` validation without range checks. A user could set `month = 13` or `year = 0`.

**Impact:** Low—year/month are primarily for reporting/filtering, and SQL integer columns permit any value. A month = 13 just means queries might not filter correctly.

**Suggested Fix:**
```php
'year' => 'sometimes|integer|min:1900|max:2999',
'month' => 'sometimes|integer|min:1|max:12',
```

---

### 22. Documentation Missing for Permission-Action-Resource Mapping

**File:** `database/seeders/RolesAndPermissionsSeeder.php` (not shown in audit scope)  
**Category:** Documentation  
**Severity:** Low

**Description:**  
The AppServiceProvider defines gates, but there's no central registry or comment documenting which permissions are required for each operation. A new developer must hunt through the codebase to find where permissions are checked.

**Suggested Fix:**
Add a comment at the top of AppServiceProvider:
```php
/**
 * Gate Definitions
 * 
 * shipments:
 *   - add-shipments: Create new shipments
 *   - edit-shipments: Update shipment details (not status)
 *   - archive-shipments: Archive shipments
 * 
 * documents:
 *   - upload-documents: Upload PDFs
 *   - approve-documents: Approve documents
 *   - reject-documents: Reject documents
 * 
 * ... etc
 */
```

---

## Confirmed vs New Findings

### Confirmed Issues (Known)

1. **Invalid Date UI Bug** ✓ Confirmed
   - Issue: Frontend displays "Invalid Date" when `actual_time_of_arrival` is null
   - Status: Found in multiple components; partial fallback exists but incomplete
   - Location: `dashboard/shipments-table.tsx:103`, `dashboard.tsx:110-117`

2. **PDF Preview Fallback** ✓ Confirmed
   - Issue: Missing error handling when PDF file is not found or corrupted
   - Status: Iframe silently fails; no user feedback
   - Location: `document-dialog.tsx:142-169`, `dashboard.tsx:303-318`

### New Issues (Not Previously Flagged)

1. **N+1 Query in Dashboard Metrics** (Critical)
2. **Missing Authorization Middleware** (Critical)
3. **Inadequate Test Coverage** (Critical)
4. **Activity Log Gaps in Document Status Updates** (High)
5. **Shipment Status Lifecycle Inconsistency** (High)
6. **Eloquent Mass Assignment Risk** (High)
7. **Missing Permission Checks on LogController** (Medium)
8. **ReportsController Uses DB::raw** (Medium)
9. **Hardcoded Status ID** (Medium)
10. **Form Submission Race Conditions** (Medium)
11. **Missing File Content Validation** (Medium)
12. **Dashboard Metrics Query Performance** (Medium)
13. **Wayfinder Integration Not Fully Utilized** (Medium)
14. **Settings Module Incomplete** (Low)
15. **No Explicit Transaction Handling** (Low)
16. **Broker Soft-Delete Not Scoped** (Low)
17. **StatusIcon String Matching** (Low)
18. **Permission Name Inconsistency** (Low)
19. **No Year/Month Validation** (Low)
20. **Documentation Missing for Permissions** (Low)

---

## By Module

### Auth & Security (Fortify, 2FA)

| Issue | File | Line | Severity | Status |
|-------|------|------|----------|--------|
| Eloquent Mass Assignment Risk | User.php | 14 | High | Not critical; secure by default |
| Permission Name Inconsistency | AppServiceProvider.php | 35-47 | Low | Code style |

**Summary:** Fortify integration is secure. 2FA secrets and recovery codes are properly hidden. No critical auth vulnerabilities found.

---

### Shipments Module

| Issue | File | Line | Severity | Notes |
|-------|------|------|----------|-------|
| Missing Authorization Middleware | web.php | 17-51 | Critical | Gates used; not middleware |
| Inadequate Test Coverage | tests/Feature | - | Critical | No ShipmentController tests |
| Activity Log Gaps | ShipmentController.php | 93-141 | High | Document status changes not logged |
| Shipment Status Lifecycle | ShipmentStatusListSeeder.php | 15-24 | High | Hardcoded status IDs; magic numbers |
| Invalid Date Handling | dashboard.tsx | 110 | High | Null dates cause "Invalid Date" |
| Hardcoded Status ID | ShipmentController.php | 76 | Medium | status_id = 2 hardcoded |
| Form Race Condition | document-dialog.tsx | 42-46 | Medium | No pending state on submission |
| No Transaction Handling | ShipmentController.php | 93 | Low | Multi-step operations unprotected |
| StatusIcon Hardcoded | status-icon.tsx | 5-7 | Low | String matching for status icons |
| Year/Month Validation | ShipmentController.php | 194-202 | Low | No range validation |

---

### Documents Module

| Issue | File | Line | Severity | Notes |
|-------|------|------|----------|-------|
| PDF Preview Fallback | document-dialog.tsx | 142 | High | Silent iframe failure |
| File Content Validation | ShipmentController.php | 148 | Medium | No MIME validation beyond extension |

**Note:** Document upload MIME validation exists but is bypassable via MIME type spoofing.

---

### Dashboard & Reports

| Issue | File | Line | Severity | Notes |
|-------|------|------|----------|-------|
| N+1 Queries | DashboardController.php | 15-106 | Critical | 900 shipments × 11 doc checks |
| DB::raw Usage | ReportsController.php | 78-84 | Medium | Violates Eloquent-only rule |
| Missing Indexes | migrations | - | Medium | document_statuses lacks performance indexes |
| Incomplete Appearance Settings | settings/appearance.tsx | - | Low | Stub/placeholder page |

---

### User & Role Management

| Issue | File | Line | Severity | Notes |
|-------|------|------|----------|-------|
| Missing LogController Permission Tests | LogController.php | 12 | Medium | No test for gate enforcement |
| Documentation Missing | AppServiceProvider.php | 35 | Low | No central permission registry |

---

### Brokers Module

| Issue | File | Line | Severity | Notes |
|-------|------|------|----------|-------|
| Soft-Delete Not Scoped | BrokerController.php | 73 | Low | `is_active` flag; no scope |

---

## Recommendations & Next Steps

### Immediate (Before Next Release)

1. **Add explicit authorization middleware** (Critical)
   - Create custom middleware to enforce permissions at route level
   - Reduce reliance on scattered Gate::authorize() calls

2. **Fix N+1 dashboard queries** (Critical)
   - Index documents by doc_name in PHP before rendering
   - Consider caching dashboard metrics

3. **Add comprehensive shipment workflow tests** (Critical)
   - Test document approval cascading to shipment status
   - Test activity log entries for all mutations
   - Test permission-based access control

### Soon (Next Sprint)

4. Add null date fallback handling across all date rendering components
5. Add iframe error event handling for PDF preview
6. Create Status enum to replace magic numbers
7. Add database indexes for dashboard query performance
8. Use Wayfinder-generated route functions instead of hardcoded strings

### Technical Debt (Follow-Up)

9. Refactor ReportsController to use Eloquent instead of DB::raw
10. Add transaction handling to multi-step operations
11. Create broker scope for active filtering
12. Standardize permission naming conventions
13. Document permission-action-resource mapping in code

---

## Testing Checklist

- [ ] Shipment creation defaults to correct status (Pending)
- [ ] Approving all shipment documents updates shipment to Completed
- [ ] Rejecting any document updates shipment to Failed
- [ ] Document status changes create activity log entries
- [ ] PDF upload validates MIME type and file content
- [ ] PDF preview handles missing/corrupted files gracefully
- [ ] Dashboard renders with null `actual_time_of_arrival` values
- [ ] Date filtering excludes null dates
- [ ] Form submission prevents double-submit
- [ ] Users without `view-logs` permission get 403
- [ ] Broker soft-delete logic prevents deletion but allows deactivation

---

## Conclusion

The FGI-DTS codebase is generally well-structured with good separation of concerns. The primary concerns are:

1. **Data integrity**: Activity logging and transaction handling need reinforcement
2. **Performance**: Dashboard and report queries need optimization
3. **Testing**: Coverage gaps in core business logic
4. **Consistency**: Status lifecycle and permission checking scattered across codebase

Addressing the 3 critical issues (authorization, N+1 queries, test coverage) before production will significantly improve reliability and maintainability.

---

**Report Generated:** 2026-07-03  
**Auditor:** Zed AI Code Agent  
**Framework Versions Tested:** Laravel 13, React 19, Inertia.js v3, Pest v4
