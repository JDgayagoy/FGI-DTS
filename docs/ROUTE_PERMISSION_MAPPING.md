# Route Permission Mapping

## Overview

This document provides a comprehensive mapping of all protected routes to their required permissions. This serves as the single source of truth for route authorization and helps identify any permission gaps.

**Last Updated:** July 3, 2026  
**Status:** ✅ Enforced via `CheckPermission` Middleware

---

## Permission Naming Convention

**Format:** `{action}-{resource}` (lowercase, kebab-case)

### Standard Actions
- `view` — Read access to resource(s)
- `add` — Create new resources
- `edit` — Modify existing resources
- `delete` — Remove resources
- `archive` — Archive resources
- `approve` — Approve/accept resources
- `reject` — Reject/decline resources
- `manage` — Full management (create, read, update, delete)

### Resources
- `shipments`
- `documents`
- `brokers`
- `roles` (Roles & Permissions management)
- `users` (User management, but create uses `manage-users`)
- `logs`

---

## Dashboard & Reports

| Route | Method | Permission(s) | Controller | Status |
|-------|--------|---------------|-----------|--------|
| `/dashboard` | GET | None (public to auth users) | DashboardController@index | ✅ Auth only |
| `/reports` | GET | `view-reports` | ReportsController@index | ⚠️ TODO |
| `/logs` | GET | `view-logs` | LogController@index | ⚠️ TODO |

---

## Shipment Management

| Route | Method | Permission(s) | Controller | Status |
|-------|--------|---------------|-----------|--------|
| `/shipments` | GET | `view-shipments` | ShipmentController@index | ✅ Middleware added |
| `/shipments` | POST | `add-shipments` | ShipmentController@store | ✅ Middleware added |
| `/shipments/{shipment}` | GET | `view-shipments` | ShipmentController@show | ✅ Middleware added |
| `/shipments/{shipment}` | PATCH | `edit-shipments` | ShipmentController@update | ✅ Middleware added |
| `/shipments/{shipment}/archive` | PATCH | `archive-shipments` | ShipmentController@archive | ✅ Middleware added |

---

## Document Management

| Route | Method | Permission(s) | Controller | Status |
|-------|--------|---------------|-----------|--------|
| `/shipments/documents/{id}/upload` | POST | `upload-documents` | ShipmentController@uploadDocument | ✅ Middleware added |
| `/shipments/documents/{id}/file` | GET | `view-shipments` | ShipmentController@viewDocument | ✅ Middleware added |
| `/shipments/documents/{id}/status` | POST | Conditional (approve/reject/edit) | ShipmentController@updateDocumentStatus | ✅ Middleware added |

**Document Status Update Permissions:**
- Status ID 1 (Approved) → `approve-documents`
- Status ID 3 (Rejected) → `reject-documents`
- Other statuses → `edit-shipments`

---

## Broker Management

| Route | Method | Permission(s) | Controller | Status |
|-------|--------|---------------|-----------|--------|
| `/brokers` | GET | `view-brokers` | BrokerController@index | ✅ Middleware added |
| `/brokers` | POST | `add-brokers` | BrokerController@store | ✅ Middleware added |
| `/brokers/{broker}` | GET | `view-brokers` | BrokerController@show | ✅ Middleware added |
| `/brokers/{broker}` | PATCH | `edit-brokers` | BrokerController@update | ✅ Middleware added |
| `/brokers/{broker}` | DELETE | `delete-brokers` | BrokerController@destroy | ✅ Middleware added |

---

## User & Role Management (RBAC)

| Route | Method | Permission(s) | Controller | Status |
|-------|--------|---------------|-----------|--------|
| `/users` | GET | `manage-roles` | UserManagementController@index | ✅ Middleware added |
| `/users` | POST | `manage-users` | UserManagementController@store | ✅ Middleware added |
| `/users/{user}/roles` | PUT | `manage-roles` | UserManagementController@updateRoles | ✅ Middleware added |
| `/roles` | GET | `manage-roles` | RoleManagementController@index | ✅ Middleware added |
| `/roles/{role}/permissions` | PUT | `manage-roles` | RoleManagementController@updatePermissions | ✅ Middleware added |

---

## Permission-Only Routes (No Middleware)

These routes are public to authenticated & verified users (no specific permission required beyond auth):

- `GET /dashboard` — DashboardController@index
- `GET /reports` — ReportsController@index (TODO: add `view-reports` permission)
- `GET /logs` — LogController@index (TODO: add `view-logs` permission)

---

## Middleware Application

### Syntax

```php
Route::post('shipments', [ShipmentController::class, 'store'])
    ->middleware('check.permission:add-shipments')
    ->name('shipments.store');

// Multiple permissions (user needs at least one)
Route::post('documents/{id}/approve', [...])
    ->middleware('check.permission:approve-documents,edit-shipments')
    ->name('documents.approve');

// Grouped routes with same permission
Route::middleware('check.permission:view-shipments')->group(function () {
    Route::get('shipments', [ShipmentController::class, 'index']);
    Route::get('shipments/{shipment}', [ShipmentController::class, 'show']);
});
```

---

## Controller-Level Authorization (Secondary Defense)

All controllers retain `Gate::authorize()` calls as a secondary defensive layer:

```php
public function store(Request $request)
{
    // Primary: Middleware catches this at route layer
    // Secondary: Defensive check in controller
    Gate::authorize('add-shipments');
    
    // ... business logic
}
```

This is the **defense-in-depth** pattern:
1. Middleware blocks unauthorized requests before reaching controller
2. Gate check catches any middleware bypass (safety net)

---

## Testing

All routes with middleware are tested in:
- `tests/Feature/Authorization/PermissionMiddlewareTest.php` — Middleware enforcement
- `tests/Feature/Authorization/PermissionEnforcementTest.php` — End-to-end permission checks

**Test Coverage:**
- ✅ Unauthorized users receive 403 response
- ✅ Authorized users can access routes
- ✅ Middleware enforces before controller execution
- ✅ Multiple permissions allow any matching permission
- ✅ Super Admin bypasses all checks

---

## Audit Trail

All unauthorized access attempts are logged with:
- `user_id` — Who attempted
- `permissions_required` — What was required
- `route_name` — Which route
- `route_path` — Full URI path
- `method` — HTTP method
- `ip_address` — Request IP
- `user_agent` — Browser info

View logs in `storage/logs/laravel.log` or dashboard activity feed.

---

## Permissions Summary

**Total Permissions:** 19 (+ conditional logic in controllers)

### By Resource

#### Shipments (7)
- `view-shipments` ✅
- `add-shipments` ✅
- `edit-shipments` ✅
- `delete-shipments` ✅
- `archive-shipments` ✅

#### Documents (3)
- `upload-documents` ✅
- `approve-documents` ✅
- `reject-documents` ✅

#### Brokers (4)
- `view-brokers` ✅
- `add-brokers` ✅
- `edit-brokers` ✅
- `delete-brokers` ✅

#### RBAC (3)
- `manage-roles` ✅
- `manage-users` ✅

#### Reports & Logs (2)
- `view-reports` ⚠️ TODO
- `view-logs` ⚠️ TODO

---

## TODO Items

- [ ] Add `view-reports` permission middleware to `/reports` route
- [ ] Add `view-logs` permission middleware to `/logs` route
- [ ] Create tests for all permission enforcement scenarios
- [ ] Document permission seeding in database
- [ ] Create role-permission matrix documentation

---

## Quick Reference

### For Developers

1. **Adding a new protected route?**
   ```php
   Route::post('shipments', [...])
       ->middleware('check.permission:add-shipments')
       ->name('shipments.store');
   ```

2. **Fixing a 403 error?**
   - Check this mapping to find required permission
   - Verify user/role has the permission
   - Check `storage/logs/laravel.log` for details

3. **Adding a new permission?**
   - Update seeder: `database/seeders/PermissionSeeder.php`
   - Update this mapping document
   - Add middleware to route
   - Write test in `tests/Feature/Authorization/`

---

**End of Document**
