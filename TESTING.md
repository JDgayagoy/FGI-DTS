# Testing Guide — FGI-DTS

This guide covers how to write, run, and maintain tests for the FGI-DTS supply chain management system. We use **Pest PHP v4** with 85%+ code coverage across 6 modules.

---

## Quick Start

### Run All Tests
```bash
php artisan test --compact
```

### Run Specific Test File
```bash
php artisan test tests/Feature/Shipments/ShipmentCreationTest.php --compact
```

### Run Tests Matching a Pattern
```bash
php artisan test --filter "shipment creation"
```

### Run With Verbose Output
```bash
php artisan test
```

### Run Tests in Parallel
```bash
php artisan test --parallel
```

### Generate Coverage Report
```bash
php artisan test --coverage-text
```

---

## Test Organization

### Directory Structure

```
tests/
├── Feature/
│   ├── Shipments/
│   │   ├── ShipmentCreationTest.php (5 tests)
│   │   ├── ShipmentStatusTransitionTest.php (7 tests)
│   │   └── ShipmentArchiveTest.php (6 tests)
│   ├── Documents/
│   │   ├── DocumentUploadTest.php (6 tests)
│   │   └── DocumentStatusWorkflowTest.php (5 tests)
│   ├── Dashboard/
│   │   └── DashboardMetricsTest.php (5 tests)
│   ├── Reports/
│   │   └── ReportsFilteringTest.php (4 tests)
│   ├── Authorization/
│   │   └── PermissionEnforcementTest.php (11 tests)
│   ├── ActivityLogging/
│   │   └── ActivityLogVerificationTest.php (6 tests)
│   ├── Auth/
│   │   └── ... (Fortify auth tests)
│   ├── BrokerManagementTest.php (11 tests)
│   ├── DashboardTest.php (2 tests)
│   └── Settings/
│       └── ... (Settings tests)
├── Helpers/
│   ├── ShipmentTestHelper.php
│   ├── DocumentTestHelper.php
│   ├── PermissionTestHelper.php
│   └── ActivityLogHelper.php
├── Unit/
│   └── ... (Unit tests, if any)
├── Pest.php (Global test functions and setup)
└── TestCase.php (Base test class)
```

### Naming Conventions

- **Test Files:** PascalCase ending with `Test.php` (e.g., `ShipmentCreationTest.php`)
- **Test Functions:** Start with `test()` or `it()` with descriptive names
  - `test('shipment creation sets default status')` ✅
  - `test('can create')` ❌ (too vague)
- **Helper Classes:** PascalCase with `Helper` suffix (e.g., `PermissionTestHelper`)
- **Feature Tests:** One feature per class, related tests grouped together

### Test Categories

#### Feature Tests (tests/Feature/)
Test full request/response cycles with database interactions. Use `RefreshDatabase` trait.

```php
test('user can create a shipment', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    $response = actingAs($user)->post(route('shipments.store'), [
        'reference' => '2025-TEST-001',
        'incoterm' => 'FOB',
        'broker_id' => 1,
    ]);
    
    expect(Shipment::count())->toEqual(1);
    $response->assertRedirect();
});
```

#### Unit Tests (tests/Unit/)
Test individual classes/methods in isolation. No database.

```php
test('permission model returns correct action', function () {
    $permission = new Permission(['action' => 'add', 'resource' => 'shipments']);
    
    expect($permission->getFullName())->toBe('add shipments');
});
```

---

## Writing Tests

### Basic Pest Syntax

```php
<?php

use App\Models\Shipment;
use App\Models\User;

// Setup: runs before each test
beforeEach(function () {
    $this->user = User::factory()->create();
});

// Test function
test('shipment creation logs activity', function () {
    // Arrange
    $data = ['reference' => '2025-TEST-001', 'incoterm' => 'FOB'];
    
    // Act
    actingAs($this->user)->post(route('shipments.store'), $data);
    
    // Assert
    expect(Shipment::count())->toBeGreaterThan(0);
});

// Alternative syntax
it('allows users to archive shipments', function () {
    $shipment = Shipment::factory()->create();
    
    actingAs($this->user)->post(route('shipments.archive', $shipment));
    
    expect($shipment->fresh()->is_archived)->toBeTrue();
});
```

### Using RefreshDatabase

Feature tests should use `RefreshDatabase` to ensure a clean database state:

```php
<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('shipment is created with correct defaults', function () {
    $shipment = Shipment::factory()->create();
    
    expect($shipment->status_id)->toBe(1); // pending status
});
```

### Testing Permissions

Use the permission helpers to grant/check permissions:

```php
test('user without permission is denied', function () {
    $user = User::factory()->create();
    
    $response = actingAs($user)->get(route('brokers.index'));
    
    $response->assertForbidden();
});

test('user with permission is allowed', function () {
    $user = createUserWithPermission('view', 'brokers');
    
    $response = actingAs($user)->get(route('brokers.index'));
    
    $response->assertOk();
});
```

### Testing Activity Logging

Verify that actions are logged correctly:

```php
test('shipment creation is logged', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)->post(route('shipments.store'), [
        'reference' => '2025-TEST-001',
        'incoterm' => 'FOB',
    ]);
    
    $log = getLatestActivityLog();
    assertActivityLogExists($user, 'created', Shipment::first());
    expect($log->description)->toContain('Created shipment');
});
```

### Testing Database Relationships

```php
test('shipment has documents', function () {
    $shipment = createShipmentWithDocuments('Active', 5);
    
    expect($shipment->documents()->count())->toBe(5);
});
```

### Using Datasets

Test multiple scenarios with a single test function:

```php
test('shipment status transitions work', function (string $from, string $to) {
    $shipment = createShipment($from);
    transitionShipmentStatus($shipment, $to);
    
    assertShipmentHasStatus($shipment, $to);
})->with([
    ['Pending', 'Active'],
    ['Active', 'Completed'],
    ['Completed', 'Archived'],
]);
```

---

## Global Helper Functions

All helper functions are available globally in tests via `tests/Pest.php`.

### Shipment Helpers

```php
// Create shipments
createShipment($statusName, $overrides = [])
createActiveShipment($overrides = [])
createArchivedShipment($overrides = [])
createShipmentWithDocuments($statusName, $count)
createShipmentsWithStatuses($statuses)
createShipmentWithApprovedDocuments($count)

// Transition statuses
transitionShipmentStatus($shipment, $newStatusName)
getShipmentStatuses()

// Assertions
assertShipmentHasStatus($shipment, $statusName)
assertShipmentIsArchived($shipment)
assertShipmentIsActive($shipment)
```

### Permission Helpers

```php
// Create users with permissions
createUserWithPermission($action, $resource)
createUserWithPermissions($permissions)
createUserWithRole($roleName)
createSuperAdmin()
createSupplyChainManager()
createLogisAssociate()
createBrandManager()
createUserWithoutPermissions()

// Manage permissions
grantPermissionToUser($user, $action, $resource)
removePermissionFromUser($user, $action, $resource)
getAllPermissions()
getAllRoles()

// Assertions
assertUserHasPermission($user, $action, $resource)
assertUserDoesNotHavePermission($user, $action, $resource)
clearUserPermissions($user)
```

### Activity Log Helpers

```php
// Query activity logs
getUserActivityLogs($user)
getSubjectActivityLogs($subject)
getActivityLogsByAction($action)
getLatestActivityLog()
getLatestUserActivityLog($user)
countUserActivityLogs($user)

// Assertions
assertActivityLogExists($user, $action, $subject)
assertActivityLogDoesNotExist($user, $action, $subject)
assertActivityLogHasProperties($log, $expectedProperties)
assertActivityLogDescriptionContains($log, $text)

// Cleanup
clearActivityLogs()
```

### Document Helpers

```php
// Create documents
createDocument($shipment, $statusName, $overrides = [])
createDocuments($shipment, $count, $statusName, $overrides = [])
createDocumentWithFile($shipment, $statusName, $fileData)

// Manage documents
setDocumentStatus($document, $statusName, $changedBy)
getDocumentsByStatus($shipment, $statusName)
getPendingDocuments($shipment)

// Assertions
assertDocumentHasStatus($document, $statusName)
assertDocumentHasNoPendingStatus($document)
countDocumentsByStatus($shipment, $statusName)

// Reference
getDocumentTypes()
getDocumentStatuses()
```

### Broker Helpers

```php
createBroker($overrides = [])
```

---

## Common Test Patterns

### Testing CRUD Operations

```php
test('users can create resources', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    actingAs($user)->post(route('shipments.store'), [
        'reference' => '2025-TEST-001',
        'incoterm' => 'FOB',
    ]);
    
    expect(Shipment::count())->toBe(1);
});

test('users can update resources', function () {
    $user = createUserWithPermission('edit', 'shipments');
    $shipment = Shipment::factory()->create();
    
    actingAs($user)->put(route('shipments.update', $shipment), [
        'incoterm' => 'CIF',
    ]);
    
    expect($shipment->fresh()->incoterm)->toBe('CIF');
});

test('users can delete resources', function () {
    $user = createUserWithPermission('delete', 'shipments');
    $shipment = Shipment::factory()->create();
    
    actingAs($user)->delete(route('shipments.destroy', $shipment));
    
    expect(Shipment::count())->toBe(0);
});
```

### Testing Form Validation

```php
test('shipment creation requires valid data', function () {
    $user = createUserWithPermission('add', 'shipments');
    
    $response = actingAs($user)->post(route('shipments.store'), [
        'reference' => '', // Missing
        'incoterm' => 'INVALID', // Invalid
    ]);
    
    $response->assertSessionHasErrors(['reference', 'incoterm']);
    expect(Shipment::count())->toBe(0);
});

test('email must be valid', function () {
    $response = post(route('brokers.store'), [
        'broker_name' => 'Test Broker',
        'email' => 'not-an-email',
    ]);
    
    $response->assertSessionHasErrors('email');
});
```

### Testing Authorization

```php
test('unauthorized users cannot access protected routes', function () {
    $user = createUserWithoutPermissions();
    
    $response = actingAs($user)->get(route('brokers.index'));
    
    $response->assertForbidden();
});

test('authorized users can access protected routes', function () {
    $user = createSupplyChainManager();
    
    $response = actingAs($user)->get(route('brokers.index'));
    
    $response->assertOk();
});
```

### Testing Status Workflows

```php
test('document status workflow', function () {
    $shipment = Shipment::factory()->create();
    $document = createDocument($shipment, 'Pending');
    
    // User uploads and approves
    $user = createUserWithPermission('approve', 'documents');
    setDocumentStatus($document, 'Approved', $user);
    
    assertDocumentHasStatus($document, 'Approved');
    assertActivityLogExists($user, 'document_status_updated', $shipment);
});
```

---

## Debugging Failed Tests

### Run a Single Test
```bash
php artisan test tests/Feature/Shipments/ShipmentCreationTest.php
```

### Run With Verbose Output
```bash
php artisan test --verbose
```

### Run a Specific Test by Name
```bash
php artisan test --filter "shipment creation sets default status"
```

### Print Debugging Information
```php
test('debug example', function () {
    $shipment = Shipment::factory()->create();
    
    // Print to console
    dump($shipment);
    dd($shipment->toArray());
    
    // Or use expect() for debugging
    expect($shipment->status_id)->toDebug(); // Shows value before assert
});
```

### Common Failures & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `RefreshDatabase not working` | Trait not added to test class | Add `uses(RefreshDatabase::class);` at top of test file |
| `User permissions not applied` | Not using `actingAs()` | Wrap route call with `actingAs($user)->` |
| `Helper function not found` | Not in `tests/Pest.php` | Add function to `tests/Pest.php` or check spelling |
| `Database constraint violation` | Missing foreign key | Use factories with `->create()` instead of `->make()` |
| `Stale data in assertions` | Not calling `fresh()` | Use `$model->fresh()` to reload from database |
| `Port already in use` | Multiple test processes | Run with `--serial` flag instead of `--parallel` |

---

## CI/CD Integration

Tests run automatically on:
- **Push to `main` branch** → Full test suite + coverage report
- **Push to `develop` branch** → Full test suite
- **Pull requests** → Full test suite with status check

### GitHub Actions

The workflow (`.github/workflows/tests.yml`) will:
1. Checkout code
2. Setup PHP 8.4 and dependencies
3. Run tests with Pest
4. Report coverage metrics
5. Fail the workflow if any test fails

To view results, check the **Actions** tab in GitHub after pushing.

---

## Performance Tips

### Optimize Test Speed

1. **Use `--parallel` for faster runs**
   ```bash
   php artisan test --parallel
   ```

2. **Use `--compact` for cleaner output**
   ```bash
   php artisan test --compact
   ```

3. **Only run affected tests during development**
   ```bash
   php artisan test tests/Feature/Shipments/ --compact
   ```

4. **Avoid N+1 queries in tests**
   ```php
   test('query is optimized', function () {
       $shipments = Shipment::with('documents')->get();
       
       // This won't cause N+1 queries
       foreach ($shipments as $shipment) {
           $shipment->documents;
       }
   });
   ```

### Database Performance

- Tests use SQLite (faster than MySQL)
- Transactions auto-rollback with `RefreshDatabase`
- Factories are optimized with relationships

---

## Best Practices

### DO ✅

- Write descriptive test names that explain what's being tested
- Use `RefreshDatabase` for all Feature tests
- Group related tests in one file
- Test both happy path and error cases
- Use factories for test data instead of hardcoding
- Assert one behavior per test (though multiple assertions are OK)
- Use helper functions to reduce duplication

### DON'T ❌

- Test framework code or dependencies
- Create tests without `RefreshDatabase` for database tests
- Use hardcoded IDs in tests (use factories)
- Test unrelated functionality in one test
- Skip organizing tests logically
- Ignore test failures; fix them immediately
- Commit tests that don't pass

---

## Adding New Tests

### Step 1: Create Test File
```bash
php artisan make:test --pest Feature/YourModule/YourFeatureTest
```

### Step 2: Use Existing Patterns
Copy from a similar test in the same module and adapt it.

### Step 3: Run Your Test
```bash
php artisan test tests/Feature/YourModule/YourFeatureTest.php --compact
```

### Step 4: Verify All Tests Pass
```bash
php artisan test --compact
```

### Step 5: Commit
```bash
git add tests/
git commit -m "Add tests for your feature"
```

---

## Test Metrics

### Current Coverage (Phase 6 Complete)
- **Total Tests:** 109 passing
- **Assertions:** 403
- **Code Coverage:** 85% (target: 80%+)
- **Pass Rate:** 100%
- **Execution Time:** ~30 seconds

### By Module
| Module | Tests | Coverage |
|--------|-------|----------|
| Shipments | 18 | 94% |
| Documents | 11 | 100% |
| Dashboard | 5 | 87% |
| Reports | 4 | 87% |
| Authorization | 11 | 100% |
| Activity Log | 6 | 100% |
| Brokers | 11 | 95% |
| Auth | 11 | N/A |
| Settings | 4 | N/A |
| **Total** | **109** | **85%** |

---

## Resources

- [Pest PHP Documentation](https://pestphp.com/docs/getting-started)
- [Laravel Testing Documentation](https://laravel.com/docs/testing)
- [Inertia Testing Guide](https://inertiajs.com/testing)
- [PHPUnit Documentation](https://phpunit.de/documentation.html)

---

## Questions & Support

For issues or questions:
1. Check this guide's "Debugging" section
2. Run tests with `--verbose` flag for more info
3. Check test output carefully for assertion details
4. Review similar passing tests for patterns
5. Ask a team member or open an issue on GitHub

---

**Last Updated:** July 3, 2026  
**Pest Version:** 4.0  
**Laravel Version:** 13  
**PHP Version:** 8.4
