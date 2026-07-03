# FGI-DTS Test Coverage Implementation Plan

**Phase 1: Foundation** ✅ COMPLETED  
**Phases 2-7:** Ready to implement  

---

## Phase 1: Foundation (COMPLETED)

### ✅ Completed Tasks

1. **Created Test Helper Infrastructure**
   - `tests/Helpers/ShipmentTestHelper.php` — 11 helper methods for shipment testing
   - `tests/Helpers/PermissionTestHelper.php` — 13 helper methods for permission/role testing
   - `tests/Helpers/ActivityLogHelper.php` — 10 helper methods for activity log testing
   - `tests/Helpers/DocumentTestHelper.php` — 12 helper methods for document testing

2. **Added 40+ Global Helper Functions**
   - All helpers exposed in `tests/Pest.php` for convenient usage
   - Functions follow naming conventions: create*(), assert*(), get*()
   - All properly typed with return types and parameter hints

3. **Created Model Factories**
   - `ShipmentFactory.php` — with `archived()` state
   - `ShipmentDocumentFactory.php`
   - `BrokerFactory.php`
   - `CustomDocFactory.php`
   - `ShipmentTypeFactory.php`
   - `DocumentStatusFactory.php`
   - `DocumentStatusListFactory.php`
   - `ShipmentStatusListFactory.php`
   - `PermissionFactory.php`

4. **Enabled Test Database Features**
   - `RefreshDatabase` trait enabled in `Pest.php` for test isolation
   - Test database setup verified and working

### Helper Methods Available

#### Shipment Helpers
```php
createShipment($statusName, $overrides)
createShipmentWithDocuments($statusName, $documentCount, $shipmentOverrides, $documentOverrides)
createActiveShipment($overrides)
createArchivedShipment($overrides)
transitionShipmentStatus($shipment, $newStatusName)
createShipmentsWithStatuses(array $statuses)
getShipmentStatuses()
createShipmentWithApprovedDocuments($count)
assertShipmentHasStatus($shipment, $statusName)
assertShipmentIsArchived($shipment)
assertShipmentIsActive($shipment)
```

#### Permission Helpers
```php
createUserWithPermission($action, $resource)
createUserWithPermissions(array $permissions)
createUserWithRole($roleName)
createSuperAdmin()
createSupplyChainManager()
createLogisAssociate()
createBrandManager()
createUserWithoutPermissions()
grantPermissionToUser($user, $action, $resource)
removePermissionFromUser($user, $action, $resource)
getAllPermissions()
getAllRoles()
assertUserHasPermission($user, $action, $resource)
assertUserDoesNotHavePermission($user, $action, $resource)
clearUserPermissions($user)
```

#### Activity Log Helpers
```php
getUserActivityLogs($user)
getSubjectActivityLogs($subject)
getActivityLogsByAction($action)
getLatestActivityLog()
getLatestUserActivityLog($user)
assertActivityLogExists($user, $action, $subject)
assertActivityLogDoesNotExist($user, $action, $subject)
assertActivityLogHasProperties($log, $expectedProperties)
assertActivityLogDescriptionContains($log, $text)
countUserActivityLogs($user)
clearActivityLogs()
```

#### Document Helpers
```php
createDocument($shipment, $statusName, $overrides)
createDocuments($shipment, $count, $statusName, $overrides)
setDocumentStatus($document, $statusName, $changedBy)
createDocumentWithFile($shipment, $statusName, $fileData)
getDocumentsByStatus($shipment, $statusName)
getPendingDocuments($shipment)
assertDocumentHasStatus($document, $statusName)
assertDocumentHasNoPendingStatus($document)
getDocumentTypes()
getDocumentStatuses()
countDocumentsByStatus($shipment, $statusName)
```

---

## Phase 2: Shipment Module Tests (16 hours)

### Goal: 18 tests covering shipment CRUD, status lifecycle, and archiving

### 2.1 Create `tests/Feature/Shipments/ShipmentCreationTest.php` (6 tests)

```php
test('user can create shipment', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    $response = actingAs($user)->post(route('shipments.store'), [
        'year' => 2025,
        'month' => 3,
        'shipment_reference' => 'TEST-001',
        'brand' => 'TestBrand',
        'incoterm' => 'CIF',
        'brand_manager' => 'John Doe',
        'broker_id' => Broker::first()->broker_id,
        'shipment_type_id' => ShipmentType::first()->shipment_type_id,
    ]);
    
    $response->assertRedirect();
    expect(Shipment::where('shipment_reference', 'TEST-001')->exists())->toBeTrue();
    assertActivityLogExists($user, 'created', Shipment::where('shipment_reference', 'TEST-001')->first());
});

test('user without permission cannot create shipment', function () {
    $user = createUserWithoutPermissions();
    
    $response = actingAs($user)->post(route('shipments.store'), [
        'year' => 2025,
        'month' => 3,
        'shipment_reference' => 'TEST-002',
        'brand' => 'TestBrand',
        // ... other fields
    ]);
    
    $response->assertForbidden();
    expect(Shipment::where('shipment_reference', 'TEST-002')->exists())->toBeFalse();
});

test('shipment is created with processing status', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)->post(route('shipments.store'), [
        // ... required fields
    ]);
    
    $shipment = Shipment::latest()->first();
    assertShipmentHasStatus($shipment, 'Processing');
});

test('required fields must be present', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    $response = actingAs($user)->post(route('shipments.store'), []);
    
    $response->assertInvalid(['shipment_reference', 'brand', 'broker_id']);
});

test('shipment reference must be unique', function () {
    $user = createUserWithPermission('add', 'shipments');
    createShipment('Processing', ['shipment_reference' => 'DUP-001']);
    
    $response = actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'DUP-001',
        // ... other fields
    ]);
    
    $response->assertInvalid('shipment_reference');
});

test('year and month default to current', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'TEST-003',
        // ... other fields, no year/month
    ]);
    
    $shipment = Shipment::where('shipment_reference', 'TEST-003')->first();
    expect($shipment->year)->toBe(now()->year);
    expect($shipment->month)->toBe(now()->month);
});
```

### 2.2 Create `tests/Feature/Shipments/ShipmentStatusTransitionTest.php` (7 tests)

Tests document approval cascading to shipment, and proper activity logging.

### 2.3 Create `tests/Feature/Shipments/ShipmentArchiveTest.php` (5 tests)

Tests soft-delete via `archived_at`, scope filtering, and permission checks.

---

## Phase 3: Document Module Tests (12 hours)

### Goal: 11 tests covering document upload, status transitions, and file handling

### 3.1 Create `tests/Feature/Documents/DocumentUploadTest.php` (7 tests)
- PDF MIME type validation
- File size limits (10 MB)
- Old file deletion on replace
- Activity logging with file metadata
- Storage::fake() for file testing

### 3.2 Create `tests/Feature/Documents/DocumentStatusWorkflowTest.php` (4 tests)
- Null → Approved/Rejected transitions
- `is_current` flag management
- `changed_by` and `changed_at` tracking

---

## Phase 4: Dashboard & Reports Tests (10 hours)

### Goal: 9 tests verifying metrics accuracy and filtering

### 4.1 Create `tests/Feature/Dashboard/DashboardMetricsTest.php` (5 tests)
- Metrics accuracy (total, active, archived shipments)
- Document approval rate calculation
- Null dates handled gracefully
- Active shipments exclude archived

### 4.2 Create `tests/Feature/Reports/ReportsFilteringTest.php` (4 tests)
- Filter by brand, date range, archive status, broker
- Metrics aggregate correctly with filters
- No crashes on empty results

---

## Phase 5: Authorization Tests (8 hours)

### Goal: 6 tests verifying RBAC permission checks

### 5.1 Create `tests/Feature/Authorization/PermissionEnforcementTest.php` (6 tests)

```php
test('user with manage-rbac can manage roles', function () {
    $user = createSuperAdmin();
    
    actingAs($user)
        ->get(route('roles.index'))
        ->assertOk();
});

test('user without manage-rbac cannot manage roles', function () {
    $user = createBrandManager(); // No RBAC permissions
    
    actingAs($user)
        ->get(route('roles.index'))
        ->assertForbidden();
});

test('add-shipments gate enforces permission', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)
        ->post(route('shipments.store'), [ /* ... */ ])
        ->assertNotForbidden();
});

test('archive-shipments requires permission', function () {
    $user = createBrandManager(); // No archive permission
    $shipment = createShipment();
    
    actingAs($user)
        ->post(route('shipments.archive', $shipment))
        ->assertForbidden();
});

test('upload-documents gate enforces permission', function () {
    $user = createUserWithoutPermissions();
    
    actingAs($user)
        ->post(route('documents.upload'), [ /* ... */ ])
        ->assertForbidden();
});

test('approve-documents requires permission', function () {
    $user = createLogisAssociate(); // No approval permission
    $document = createDocument(createShipment());
    
    actingAs($user)
        ->post(route('documents.approve', $document))
        ->assertForbidden();
});
```

---

## Phase 6: Activity Logging Tests (8 hours)

### Goal: 6 tests verifying all mutations log correctly

### 6.1 Create `tests/Feature/ActivityLogging/ActivityLogVerificationTest.php` (6 tests)

```php
test('shipment creation logs activity', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)->post(route('shipments.store'), [
        'shipment_reference' => 'LOG-TEST',
        // ... other fields
    ]);
    
    $shipment = Shipment::where('shipment_reference', 'LOG-TEST')->first();
    assertActivityLogExists($user, 'created', $shipment);
});

test('document upload logs with file metadata', function () {
    $user = createUserWithPermission('upload', 'documents');
    $shipment = createShipment();
    
    actingAs($user)->post(route('documents.upload'), [
        'shipment_id' => $shipment->shipment_id,
        'custom_doc_id' => CustomDoc::first()->custom_doc_id,
        'file' => UploadedFile::fake()->pdf('test.pdf'),
    ]);
    
    $log = getLatestUserActivityLog($user);
    assertActivityLogHasProperties($log, [
        'file_name' => 'test.pdf',
        'file_size' => $log->properties['file_size'] ?? 0,
    ]);
});

test('document status change logs previous and new status', function () {
    $user = createUserWithPermission('approve', 'documents');
    $document = createDocument(createShipment());
    
    actingAs($user)->post(route('documents.approve', $document));
    
    $log = getLatestUserActivityLog($user);
    assertActivityLogHasProperties($log, [
        'previous_status' => null,
        'new_status' => 'Approved',
    ]);
});

test('activity log includes ip address', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)->post(route('shipments.store'), [
        // ... fields
    ]);
    
    $log = getLatestUserActivityLog($user);
    expect($log->ip_address)->not->toBeNull();
});

test('shipment archive logs change', function () {
    $user = createUserWithPermission('archive', 'shipments');
    $shipment = createShipment();
    
    actingAs($user)->post(route('shipments.archive', $shipment));
    
    assertActivityLogExists($user, 'archived', $shipment);
});

test('document rejection logs description', function () {
    $user = createUserWithPermission('reject', 'documents');
    $document = createDocument(createShipment());
    
    actingAs($user)->post(route('documents.reject', $document), [
        'reason' => 'Missing signature',
    ]);
    
    $log = getLatestUserActivityLog($user);
    assertActivityLogDescriptionContains($log, 'Missing signature');
});
```

---

## Phase 7: Documentation & CI/CD (8 hours)

### 7.1 Create `TESTING.md`
Developer guide on:
- How to run tests
- Test file organization
- When/how to use helpers
- Common patterns and pitfalls

### 7.2 Create GitHub Actions Workflow
`.github/workflows/tests.yml`:
- Trigger on push/PR to main/develop
- Run `php artisan test` with SQLite
- Upload coverage reports
- Cache composer/npm dependencies

### 7.3 Update Documentation
- `README.md` — add test running instructions
- Pull request template — require tests for core changes

---

## Execution Timeline

**Week 1 (20 hours):**
- Phase 2: Shipment module tests (16 hours)
- Phase 3: First 6 document tests (4 hours)

**Week 2 (24 hours):**
- Phase 3: Finish document tests (6 hours)
- Phase 4: Dashboard & Reports (10 hours)
- Phase 5: Authorization (8 hours)

**Week 3 (18 hours):**
- Phase 6: Activity logging (8 hours)
- Phase 7: Documentation & CI/CD (8 hours)
- Refinement & debugging (2 hours)

**Total: 62 hours across 2-3 developers**

---

## Success Criteria

✅ 65+ tests written  
✅ >80% coverage on critical business logic  
✅ All permission gates tested  
✅ All activity logging verified  
✅ CI/CD pipeline green  
✅ Documentation complete  

---

## Known Issues to Avoid

1. **Don't use hardcoded status IDs** — Always reference by name via factories/helpers
2. **Always set user context** — Use `actingAs($user)` before route calls
3. **RefreshDatabase is enabled** — Tests are isolated; don't skip it
4. **Real database only** — Don't mock DB calls; use factories instead
5. **Test mutation side effects** — Always verify activity logs, relationships are updated correctly

---

## Next Steps

1. Run `php artisan test` to verify helpers work
2. Begin Phase 2: Shipment creation tests
3. Use helper functions to minimize test code duplication
4. Commit after each test file completion
