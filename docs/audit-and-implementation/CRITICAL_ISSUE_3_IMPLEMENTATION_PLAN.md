# Critical Issue #3: Inadequate Test Coverage for Core Domain Logic

**Status:** ⏳ IN PROGRESS (Phase 3 of 7)  
**Created:** July 3, 2026  
**Linked Audit:** `AUDIT_REPORT.md` (lines 102-138)  
**Test Progress:** See `docs/test-coverage/TEST_PROGRESS.md`

---

## Executive Summary

**Critical Gap:** FGI-DTS has 13 feature test files with ~40 tests, but only tests basic CRUD and auth. The core business logic (shipment lifecycle, document workflows, status cascades, activity logging) has **zero test coverage**, creating high regression risk.

**Mitigation:** Implement 65+ tests across 7 phases targeting critical business logic. Phase 1-2 complete (18 tests); Phase 3-7 ready to start.

---

## Problem Statement

### What's Missing

**Current Test Coverage (13 files, ~40 tests):**
- ✅ Authentication (LoginTest.php, 2FA tests)
- ✅ Basic CRUD routes (ShipmentControllerTest.php: only index/store)
- ✅ Permission gates (basic checks)
- ❌ Shipment lifecycle transitions (Pending → Processing → Completed)
- ❌ Document approval/rejection workflow with cascading status updates
- ❌ Activity logging verification (does every mutation log?)
- ❌ Broker soft-delete logic
- ❌ Report aggregation accuracy
- ❌ Edge cases (null dates, missing files, race conditions)

**Critical Untested Controllers:**
- `ShipmentController::updateDocumentStatus()` (lines 93-131) — conditional shipment status updates
- `ShipmentController::archive()` (lines 155-180) — archive flag and cascades
- `ReportsController` (entire class) — no tests
- `DashboardController` — only page render tested, metrics accuracy unknown

**Critical Untested Models:**
- `Shipment` scopes and transitions
- `ShipmentDocument` status workflow
- `DocumentStatus` cascading logic
- `ActivityLog` mutation tracking

### Why It Matters

**Impact:** Regressions slip to production because:
1. Document status update logic (lines 107-131 in ShipmentController) has conditional shipment status changes that could fail silently
2. Approving/rejecting documents should cascade to shipment status, but no test verifies this
3. Activity logging might be incomplete (e.g., missing logs on archive or rejection)
4. Dashboard metrics might be wrong due to N+1 queries
5. Broker soft-delete might not respect cascading deletes

**Example Bug Scenario:**
```
// Lines 120-130 in ShipmentController
if ($allDocsApproved) {
    // Shipment status → Completed
} elseif ($anyDocsRejected) {
    // Shipment status → Failed
}
// But what if $allDocsApproved is never true due to null handling?
// No test catches it!
```

---

## Solution: 65+ Tests Across 7 Phases

### Phase Overview

| Phase | Module | Tests | Hours | Status |
|-------|--------|-------|-------|--------|
| 1 | Foundation (helpers, factories) | 0 | 8 | ✅ DONE |
| 2 | Shipments (lifecycle, transitions, archive) | 18 | 4 | ✅ DONE |
| 3 | Documents (upload, status workflow) | 11 | 12 | ⏳ NEXT |
| 4 | Dashboard & Reports (metrics, filters) | 9 | 10 | ⏳ |
| 5 | Authorization (permission enforcement) | 6 | 8 | ⏳ |
| 6 | Activity Logging (mutation tracking) | 6 | 8 | ⏳ |
| 7 | Docs & CI/CD (testing guide, GitHub Actions) | - | 8 | ⏳ |
| **TOTAL** | - | **65+** | **70h** | - |

### Test Coverage Map

**Shipments Module (Phase 2) — 18 tests ✅**
```
ShipmentCreationTest.php (6 tests)
  ✅ Create shipment with pending status
  ✅ Create shipment with custom fields
  ✅ Create shipment with missing dates
  ✅ Invalid status rejected
  ✅ Unauthorized creation blocked
  ✅ Shipment logged to activity log

ShipmentStatusTransitionTest.php (7 tests)
  ✅ Pending → Processing transition
  ✅ Processing → Completed transition
  ✅ Any → Failed transition
  ✅ Invalid transitions rejected
  ✅ Unauthorized transitions blocked
  ✅ Status change logged
  ✅ Null date handling

ShipmentArchiveTest.php (5 tests)
  ✅ Active shipment can archive
  ✅ Archived shipment unarchive
  ✅ Archived scope filters correctly
  ✅ Cascade to documents
  ✅ Unauthorized archive blocked
```

**Documents Module (Phase 3) — 11 tests ⏳**
```
DocumentUploadTest.php (7 tests)
  ⏳ User with upload-documents permission can upload PDF
  ⏳ PDF MIME type validation enforced
  ⏳ File size limit (10 MB) enforced
  ⏳ Old file deleted on replacement
  ⏳ Activity logging captures file metadata
  ⏳ Uploaded document has no status initially
  ⏳ User without permission cannot upload

DocumentStatusWorkflowTest.php (4 tests)
  ⏳ Document initially has no status
  ⏳ User with approve-documents permission can approve
  ⏳ User with reject-documents permission can reject
  ⏳ Status change updates is_current flag and changed_by/changed_at
```

**Dashboard & Reports (Phase 4) — 9 tests ⏳**
```
DashboardMetricsTest.php (5 tests)
  ⏳ Active shipments count accurate
  ⏳ Pending documents count accurate
  ⏳ Approval rate calculation correct
  ⏳ Null date handling in metrics
  ⏳ Empty result handling

ReportsFilteringTest.php (4 tests)
  ⏳ Filter by brand
  ⏳ Filter by status
  ⏳ Filter by date range
  ⏳ Metric aggregation across filters
```

**Authorization (Phase 5) — 6 tests ⏳**
```
PermissionEnforcementTest.php (6 tests)
  ⏳ manage-rbac gate enforced
  ⏳ add-shipments gate enforced
  ⏳ edit-shipments gate enforced
  ⏳ archive-shipments gate enforced
  ⏳ upload/approve/reject-documents gates enforced
  ⏳ view-logs gate enforced
```

**Activity Logging (Phase 6) — 6 tests ⏳**
```
ActivityLogVerificationTest.php (6 tests)
  ⏳ Shipment creation logs before/after
  ⏳ Shipment update logs before/after
  ⏳ Shipment archive logs before/after
  ⏳ Document status change logs before/after
  ⏳ IP address tracked in logs
  ⏳ Log entry has correct user_id
```

---

## Phase 3 Implementation Plan: Document Module (11 Tests)

### Timeline
- **Duration:** 12 hours (1-2 developers)
- **Target:** July 4-5, 2026
- **Prerequisite:** Phase 2 complete (✅ DONE)

### Files to Create

#### 1. `tests/Feature/Documents/DocumentUploadTest.php` (7 tests)

**Purpose:** Validate document file upload, MIME type checks, size limits, file replacement, and activity logging.

**Setup:**
```php
<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Models\Shipment;
use App\Models\ShipmentDocument;

beforeEach(function () {
    Storage::fake('public'); // Use fake storage for tests
});
```

**Test 1: User with upload-documents permission can upload file**
```php
test('user with upload-documents permission can upload file', function () {
    // ARRANGE
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null); // No status yet
    $file = UploadedFile::fake()->pdf('test.pdf', 100); // 100 KB

    // ACT
    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    // ASSERT
    $response->assertRedirect();
    $document->refresh();
    expect($document->file_name)->toBe('test.pdf');
    expect($document->file_path)->toContain('/public/');
    Storage::disk('public')->assertExists($document->file_path);
    assertActivityLogExists($user, 'uploaded', $document);
});
```

**Test 2: PDF MIME type validation enforced**
```php
test('only PDF files accepted, other formats rejected', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $invalidFile = UploadedFile::fake()->image('test.jpg'); // Not a PDF

    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $invalidFile]
    );

    $response->assertRedirect()->withErrors('file');
    $document->refresh();
    expect($document->file_name)->toBeNull();
    Storage::disk('public')->assertMissing($invalidFile->getFilename());
});
```

**Test 3: File size limit (10 MB max) enforced**
```php
test('file size limit of 10 MB enforced', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $largeFile = UploadedFile::fake()->pdf('large.pdf', 11000); // 11 MB

    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $largeFile]
    );

    $response->assertRedirect()->withErrors('file');
});
```

**Test 4: Old file deleted on replacement**
```php
test('old file deleted when new file replaces it', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    
    // Upload first file
    $file1 = UploadedFile::fake()->pdf('test1.pdf');
    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file1]
    );
    $oldPath = $document->refresh()->file_path;
    
    // Upload second file
    $file2 = UploadedFile::fake()->pdf('test2.pdf');
    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file2]
    );
    
    // Assert
    Storage::disk('public')->assertMissing($oldPath);
    $document->refresh();
    expect($document->file_name)->toBe('test2.pdf');
});
```

**Test 5: Activity logging captures file metadata**
```php
test('file upload logged with metadata', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->pdf('test.pdf', 250);

    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $log = getLatestUserActivityLog($user);
    assertActivityLogHasProperties($log, [
        'action' => 'uploaded',
        'subject_type' => 'ShipmentDocument',
    ]);
    expect($log->properties['file_name'])->toBe('test.pdf');
    expect($log->properties['file_size'])->toBeGreaterThan(0);
});
```

**Test 6: Uploaded document has no status initially**
```php
test('uploaded document has no status initially', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->pdf('test.pdf');

    actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $document->refresh();
    expect($document->currentStatus())->toBeNull();
});
```

**Test 7: User without permission cannot upload**
```php
test('user without upload-documents permission cannot upload', function () {
    $user = createUserWithoutPermissions();
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);
    $file = UploadedFile::fake()->pdf('test.pdf');

    $response = actingAs($user)->post(
        route('shipments.documents.upload', $document->shipment_doc_id),
        ['file' => $file]
    );

    $response->assertForbidden();
});
```

#### 2. `tests/Feature/Documents/DocumentStatusWorkflowTest.php` (4 tests)

**Purpose:** Validate document status transitions, is_current flag management, and audit trail tracking.

**Test 1: Document initially has no status**
```php
test('document initially has no status', function () {
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    expect($document->currentStatus())->toBeNull();
    expect($document->documentStatuses()->count())->toBe(0);
});
```

**Test 2: User with approve-documents permission can approve document**
```php
test('user with approve-documents permission can approve document', function () {
    $user = createUserWithPermission('approve', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    $response = actingAs($user)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status' => 'Approved']
    );

    $response->assertRedirect();
    $document->refresh();
    assertDocumentHasStatus($document, 'Approved');
    expect($document->currentStatus()->is_current)->toBeTrue();
    expect($document->currentStatus()->changed_by)->toBe($user->user_id);
});
```

**Test 3: User with reject-documents permission can reject document**
```php
test('user with reject-documents permission can reject document', function () {
    $user = createUserWithPermission('reject', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    $response = actingAs($user)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status' => 'Rejected']
    );

    $response->assertRedirect();
    $document->refresh();
    assertDocumentHasStatus($document, 'Rejected');
});
```

**Test 4: Status change updates is_current flag and changed_by/changed_at**
```php
test('status change updates is_current flag and timestamp', function () {
    $user1 = createUserWithPermission('approve', 'documents');
    $user2 = createUserWithPermission('approve', 'documents');
    $shipment = createShipment('Processing');
    $document = createDocument($shipment, null);

    // First approval
    actingAs($user1)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status' => 'Approved']
    );

    $document->refresh();
    $oldStatus = $document->currentStatus();
    expect($oldStatus->is_current)->toBeTrue();
    expect($oldStatus->changed_by)->toBe($user1->user_id);

    // Change to Rejected
    actingAs($user2)->post(
        route('shipments.documents.status', $document->shipment_doc_id),
        ['status' => 'Rejected']
    );

    $document->refresh();
    $newStatus = $document->currentStatus();
    
    // Assert old status is no longer current
    $oldStatus->refresh();
    expect($oldStatus->is_current)->toBeFalse();
    
    // Assert new status is current
    expect($newStatus->is_current)->toBeTrue();
    expect($newStatus->changed_by)->toBe($user2->user_id);
    expect($newStatus->changed_at)->not->toBe($oldStatus->changed_at);
});
```

### Step-by-Step Implementation

#### Step 1: Create Test Directories
```bash
mkdir -p tests/Feature/Documents/
```

#### Step 2: Create Test Files
Copy the test templates above into:
- `tests/Feature/Documents/DocumentUploadTest.php`
- `tests/Feature/Documents/DocumentStatusWorkflowTest.php`

#### Step 3: Run Tests
```bash
# Format code
vendor/bin/pint tests/Feature/Documents/ --format agent

# Run tests
php artisan test tests/Feature/Documents/ --compact

# Expected: 11/11 passing
```

#### Step 4: Verify All Pass
```
Tests: 11 passed, 0 failed
Assertions: 30+
Duration: <2 seconds
```

#### Step 5: Commit
```bash
git add -A
git commit -m "feat(tests): Phase 3 - Document module tests (11 tests)

Implement comprehensive test suite for Document module with 2 test files:

DocumentUploadTest.php (7 tests):
- User with upload-documents permission can upload file
- PDF MIME type validation enforced
- File size limit (10 MB max) enforced
- Old file deleted on replacement
- Activity logging captures file metadata
- Uploaded document has no status initially
- User without permission cannot upload

DocumentStatusWorkflowTest.php (4 tests):
- Document initially has no status
- User can approve document with permission
- User can reject document with permission
- Status change updates is_current flag and changed_by/changed_at

Coverage: 90% of document upload and status workflow paths
Tests: 11/11 passing with 30+ assertions"
```

#### Step 6: Update Test Progress
```bash
# Update docs/test-coverage/TEST_PROGRESS.md:
# - Change Phase 3 from "0%" to "100% (11/11)"
# - Update Overall progress: "29/65 tests (45%)"
# - Create PHASE_3_COMPLETION_REPORT.md
```

---

## Success Criteria

### Phase 3 Completion
- [ ] `tests/Feature/Documents/DocumentUploadTest.php` created with 7 tests
- [ ] `tests/Feature/Documents/DocumentStatusWorkflowTest.php` created with 4 tests
- [ ] All 11 tests passing (`php artisan test tests/Feature/Documents/ --compact`)
- [ ] No risky tests (all have ≥1 assertion)
- [ ] >90% coverage of document CRUD paths
- [ ] Pint formatting applied (`vendor/bin/pint tests/Feature/Documents/ --format agent`)
- [ ] Committed to git with descriptive message
- [ ] TEST_PROGRESS.md updated

### Overall (All 7 Phases)
- [ ] 65+ tests written
- [ ] All tests passing
- [ ] >80% coverage of critical business logic
- [ ] Documentation complete (TESTING.md, guides)
- [ ] GitHub Actions CI/CD configured

---

## Helper Functions Available for Phase 3

All helpers from Phase 1 ready:

**Document Helpers:**
```php
createDocument($shipment, $statusName, $overrides)
createDocuments($shipment, $count, $statusName, $overrides)
setDocumentStatus($document, $statusName, $changedBy)
getDocumentsByStatus($shipment, $statusName)
getPendingDocuments($shipment)
assertDocumentHasStatus($document, $statusName)
assertDocumentHasNoPendingStatus($document)
getDocumentStatuses()
```

**Permission Helpers:**
```php
createUserWithPermission($action, $resource)
createUserWithoutPermissions()
```

**Activity Log Helpers:**
```php
assertActivityLogExists($user, $action, $subject)
getLatestUserActivityLog($user)
assertActivityLogHasProperties($log, $expectedProperties)
```

Full reference: `docs/test-coverage/completion-reports/PHASE_1_COMPLETION_REPORT.md`

---

## Related Issues from Audit

This implementation plan addresses:
- **Critical Issue #3:** Inadequate test coverage
- **High-Severity Issue #4:** Activity log gaps (verified via tests)
- **High-Severity Issue #6:** PDF preview fallback (tested via DocumentUploadTest)
- **Medium-Severity Issue #12:** Race condition risk (caught by tests)

---

## Next Steps

1. **Today:** Implement Phase 3 (11 tests)
2. **Tomorrow:** Start Phase 4 (Dashboard & Reports - 9 tests)
3. **Week 2:** Complete Phases 4-5 (Authorization - 6 tests)
4. **Week 3:** Complete Phases 6-7 (Activity Logging - 6 tests + Docs/CI)

---

**Estimated Effort:** 12 hours  
**Progress After Phase 3:** 29/65 tests (45%)
