<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\ActivityLog;
use App\Models\Broker;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\ActivityLogHelper;
use Tests\Helpers\DocumentTestHelper;
use Tests\Helpers\PermissionTestHelper;
use Tests\Helpers\ShipmentTestHelper;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        // Seed all required test data (statuses, permissions, roles, etc.)
        $this->seedTestData();
    })
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

expect()->extend('toNotBeNull', function () {
    return $this->not->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

// ============================================================================
// GLOBAL SHIPMENT HELPERS
// ============================================================================

function createShipment(string $statusName = 'Processing', array $overrides = [])
{
    return ShipmentTestHelper::createShipment($statusName, $overrides);
}

function createShipmentWithDocuments(
    string $statusName = 'Processing',
    int $documentCount = 3,
    array $shipmentOverrides = [],
    array $documentOverrides = []
) {
    return ShipmentTestHelper::createShipmentWithDocuments(
        $statusName,
        $documentCount,
        $shipmentOverrides,
        $documentOverrides
    );
}

function createActiveShipment(array $overrides = [])
{
    return ShipmentTestHelper::createActiveShipment($overrides);
}

function createArchivedShipment(array $overrides = [])
{
    return ShipmentTestHelper::createArchivedShipment($overrides);
}

function transitionShipmentStatus(Shipment $shipment, string $newStatusName)
{
    return ShipmentTestHelper::transitionShipmentStatus($shipment, $newStatusName);
}

function createShipmentsWithStatuses(array $statuses): array
{
    return ShipmentTestHelper::createShipmentsWithStatuses($statuses);
}

function getShipmentStatuses(): array
{
    return ShipmentTestHelper::getShipmentStatuses();
}

function createShipmentWithApprovedDocuments(int $count = 3)
{
    return ShipmentTestHelper::createShipmentWithApprovedDocuments($count);
}

function assertShipmentHasStatus(Shipment $shipment, string $statusName): void
{
    ShipmentTestHelper::assertShipmentHasStatus($shipment, $statusName);
}

function assertShipmentIsArchived(Shipment $shipment): void
{
    ShipmentTestHelper::assertShipmentIsArchived($shipment);
}

function assertShipmentIsActive(Shipment $shipment): void
{
    ShipmentTestHelper::assertShipmentIsActive($shipment);
}

// ============================================================================
// GLOBAL PERMISSION HELPERS
// ============================================================================
// These are thin wrappers that delegate to PermissionTestHelper to keep
// test logic organized in reusable helper classes.

function createUserWithPermission(string $action, string $resource)
{
    return PermissionTestHelper::createUserWithPermission($action, $resource);
}

function createUserWithPermissions(array $permissions)
{
    return PermissionTestHelper::createUserWithPermissions($permissions);
}

function createUserWithRole(string $roleName)
{
    return PermissionTestHelper::createUserWithRole($roleName);
}

function createSuperAdmin()
{
    return PermissionTestHelper::createSuperAdmin();
}

function createSupplyChainManager()
{
    return PermissionTestHelper::createSupplyChainManager();
}

function createLogisAssociate()
{
    return PermissionTestHelper::createLogisAssociate();
}

function createBrandManager()
{
    return PermissionTestHelper::createBrandManager();
}

function createUserWithoutPermissions()
{
    return PermissionTestHelper::createUserWithoutPermissions();
}

function grantPermissionToUser(User $user, string $action, string $resource): void
{
    PermissionTestHelper::grantPermissionToUser($user, $action, $resource);
}

function removePermissionFromUser(User $user, string $action, string $resource): void
{
    PermissionTestHelper::removePermissionFromUser($user, $action, $resource);
}

function getAllPermissions(): array
{
    return PermissionTestHelper::getAllPermissions();
}

function getAllRoles(): array
{
    return PermissionTestHelper::getAllRoles();
}

function assertUserHasPermission(User $user, string $action, string $resource): void
{
    PermissionTestHelper::assertUserHasPermission($user, $action, $resource);
}

function assertUserDoesNotHavePermission(User $user, string $action, string $resource): void
{
    PermissionTestHelper::assertUserDoesNotHavePermission($user, $action, $resource);
}

function clearUserPermissions(User $user): void
{
    PermissionTestHelper::clearUserPermissions($user);
}

// ============================================================================
// GLOBAL ACTIVITY LOG HELPERS
// ============================================================================

function getUserActivityLogs(User $user): array
{
    return ActivityLogHelper::getUserActivityLogs($user);
}

function getSubjectActivityLogs(Model $subject): array
{
    return ActivityLogHelper::getSubjectActivityLogs($subject);
}

function getActivityLogsByAction(string $action): array
{
    return ActivityLogHelper::getActivityLogsByAction($action);
}

function getLatestActivityLog(): ?ActivityLog
{
    return ActivityLogHelper::getLatestActivityLog();
}

function getLatestUserActivityLog(User $user): ?ActivityLog
{
    return ActivityLogHelper::getLatestUserActivityLog($user);
}

function assertActivityLogExists(User $user, string $action, Model $subject): void
{
    ActivityLogHelper::assertActivityLogExists($user, $action, $subject);
}

function assertActivityLogDoesNotExist(User $user, string $action, Model $subject): void
{
    ActivityLogHelper::assertActivityLogDoesNotExist($user, $action, $subject);
}

function assertActivityLogHasProperties(ActivityLog $log, array $expectedProperties): void
{
    ActivityLogHelper::assertActivityLogHasProperties($log, $expectedProperties);
}

function assertActivityLogDescriptionContains(ActivityLog $log, string $text): void
{
    ActivityLogHelper::assertActivityLogDescriptionContains($log, $text);
}

function countUserActivityLogs(User $user): int
{
    return ActivityLogHelper::countUserActivityLogs($user);
}

function clearActivityLogs(): void
{
    ActivityLogHelper::clearActivityLogs();
}

// ============================================================================
// GLOBAL DOCUMENT HELPERS
// ============================================================================

function createDocument(
    Shipment $shipment,
    ?string $statusName = null,
    array $overrides = []
) {
    return DocumentTestHelper::createDocument($shipment, $statusName, $overrides);
}

function createDocuments(
    Shipment $shipment,
    int $count = 3,
    ?string $statusName = null,
    array $overrides = []
): array {
    return DocumentTestHelper::createDocuments($shipment, $count, $statusName, $overrides);
}

function setDocumentStatus(
    ShipmentDocument $document,
    string $statusName,
    ?int $changedBy = null
) {
    return DocumentTestHelper::setDocumentStatus($document, $statusName, $changedBy);
}

function createDocumentWithFile(
    Shipment $shipment,
    ?string $statusName = null,
    array $fileData = []
) {
    return DocumentTestHelper::createDocumentWithFile($shipment, $statusName, $fileData);
}

function getDocumentsByStatus(Shipment $shipment, string $statusName): array
{
    return DocumentTestHelper::getDocumentsByStatus($shipment, $statusName);
}

function getPendingDocuments(Shipment $shipment): array
{
    return DocumentTestHelper::getPendingDocuments($shipment);
}

function assertDocumentHasStatus(ShipmentDocument $document, string $statusName): void
{
    DocumentTestHelper::assertDocumentHasStatus($document, $statusName);
}

function assertDocumentHasNoPendingStatus(ShipmentDocument $document): void
{
    DocumentTestHelper::assertDocumentHasNoPendingStatus($document);
}

function getDocumentTypes(): array
{
    return DocumentTestHelper::getDocumentTypes();
}

function getDocumentStatuses(): array
{
    return DocumentTestHelper::getDocumentStatuses();
}

function countDocumentsByStatus(Shipment $shipment, string $statusName): int
{
    return DocumentTestHelper::countDocumentsByStatus($shipment, $statusName);
}

// ============================================================================
// GLOBAL BROKER HELPERS
// ============================================================================

function createBroker(array $overrides = [])
{
    return Broker::factory()->create($overrides);
}
