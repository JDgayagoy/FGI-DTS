<?php

use App\Http\Controllers\BrokerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\RoleManagementController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\ShipmentEmailController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::get('/secret-seed', function () {
    Artisan::call('db:seed', ['--class' => 'ShipmentTypeSeeder']);
    Artisan::call('db:seed', ['--class' => 'DocumentStatusListSeeder']);
    Artisan::call('db:seed', ['--class' => 'CustomDocSeeder']);
    Artisan::call('db:seed', ['--class' => 'ShipmentStatusListSeeder']);
    return 'Seeded successfully!';
});

Route::get('/run-scheduler-secret-fgi2026dts', function () {
    Artisan::call('schedule:run');
    return 'Scheduler executed';
});

Route::inertia('/', 'auth/login', [
    // 'canRegister' => Features::enabled(Features::registration()),
])->middleware('guest')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Public to authenticated users (no specific permission required)
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/shipment-emails/{shipmentEmail}/dismiss', [ShipmentEmailController::class, 'dismiss'])->name('shipment-emails.dismiss');
    Route::post('/shipment-emails/{shipmentEmail}/created', [ShipmentEmailController::class, 'markCreated'])->name('shipment-emails.created');

    Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');
    Route::get('/logs', [LogController::class, 'index'])->name('logs.index');

    // ======= RBAC Management =======
    Route::middleware('check.permission:manage-roles')->group(function () {
        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::put('/users/{user}/roles', [UserManagementController::class, 'updateRoles'])->name('users.roles.update');

        Route::get('/roles', [RoleManagementController::class, 'index'])->name('roles.index');
        Route::put('/roles/{role}/permissions', [RoleManagementController::class, 'updatePermissions'])->name('roles.permissions.update');
    });

    // User Creation (manage-users permission required)
    Route::post('/users', [UserManagementController::class, 'store'])
        ->middleware('check.permission:manage-users')
        ->name('users.store');

    // ======= Broker Management =======
    Route::get('brokers', [BrokerController::class, 'index'])
        ->middleware('check.permission:view-brokers')
        ->name('brokers.index');

    Route::get('brokers/{broker}', [BrokerController::class, 'show'])
        ->middleware('check.permission:view-brokers')
        ->name('brokers.show');

    Route::post('brokers', [BrokerController::class, 'store'])
        ->middleware('check.permission:add-brokers')
        ->name('brokers.store');

    Route::patch('brokers/{broker}', [BrokerController::class, 'update'])
        ->middleware('check.permission:edit-brokers')
        ->name('brokers.update');

    Route::delete('brokers/{broker}', [BrokerController::class, 'destroy'])
        ->middleware('check.permission:delete-brokers')
        ->name('brokers.destroy');

    // ======= Shipment & Document Management =======
    Route::post('shipments/documents/{shipment_doc_id}/upload', [ShipmentController::class, 'uploadDocument'])
        ->middleware('check.permission:upload-documents')
        ->name('shipments.documents.upload');

    Route::get('shipments/documents/{shipment_doc_id}/file', [ShipmentController::class, 'viewDocument'])
        ->middleware('check.permission:view-shipments')
        ->name('shipments.documents.file');

    Route::post('shipments/documents/{shipment_doc_id}/status', [ShipmentController::class, 'updateDocumentStatus'])
        ->middleware('check.permission:approve-documents,reject-documents,edit-shipments')
        ->name('shipments.documents.status');

    Route::patch('shipments/{shipment}/archive', [ShipmentController::class, 'archive'])
        ->middleware('check.permission:archive-shipments')
        ->name('shipments.archive');

    Route::patch('shipments/{shipment}/restore', [ShipmentController::class, 'restore'])
        ->name('shipments.restore');

    // View shipments
    Route::get('shipments', [ShipmentController::class, 'index'])
        ->middleware('check.permission:view-shipments')
        ->name('shipments.index');

    Route::get('shipments/{shipment}', [ShipmentController::class, 'show'])
        ->middleware('check.permission:view-shipments')
        ->name('shipments.show');

    // Create shipment
    Route::post('shipments', [ShipmentController::class, 'store'])
        ->middleware('check.permission:add-shipments')
        ->name('shipments.store');

    // Update shipment
    Route::patch('shipments/{shipment}', [ShipmentController::class, 'update'])
        ->middleware('check.permission:edit-shipments')
        ->name('shipments.update');

    // Delete shipment
    Route::delete('shipments/{shipment}', [ShipmentController::class, 'destroy'])
        ->middleware('check.permission:delete-shipments')
        ->name('shipments.destroy');
});

require __DIR__.'/settings.php';
