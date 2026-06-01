<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\RoleManagementController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');

    Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
    Route::put('/users/{user}/roles', [UserManagementController::class, 'updateRoles'])->name('users.roles.update');

    Route::get('/roles', [RoleManagementController::class, 'index'])->name('roles.index');
    Route::put('/roles/{role}/permissions', [RoleManagementController::class, 'updatePermissions'])->name('roles.permissions.update');

    // These MUST be above Route::resource
    Route::post('shipments/documents/{shipment_doc_id}/upload', [ShipmentController::class, 'uploadDocument'])
        ->name('shipments.documents.upload');

    Route::get('shipments/documents/{shipment_doc_id}/file', [ShipmentController::class, 'viewDocument'])
        ->name('shipments.documents.file');

    Route::post('shipments/documents/{shipment_doc_id}/status', [ShipmentController::class, 'updateDocumentStatus'])
        ->name('shipments.documents.status');

    Route::patch('shipments/{shipment}/archive', [ShipmentController::class, 'archive'])
        ->name('shipments.archive');

    // Resource route LAST
    Route::resource('shipments', ShipmentController::class)->parameters([
        'shipments' => 'shipment:shipment_id',
    ]);
});
require __DIR__.'/settings.php';
