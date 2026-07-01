<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\ShipmentDocument;
use App\Models\DocumentStatus;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $allShipments = Shipment::with([
            'status',
            'shipmentType',
            'documents.customDoc',
            'documents.currentStatus.status',
        ])->get();

        $totalShipments = $allShipments->count();
        $archivedShipments = $allShipments->filter(fn($s) => $s->archived_at !== null)->count();
        $activeShipments = $totalShipments - $archivedShipments;

        // Use ONLY active shipments for the table and subsequent metrics
        $shipments = $allShipments->filter(fn($s) => $s->archived_at === null);

        $completedShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Completed')->count();
        $pendingShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Pending')->count();
        $processingShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Processing')->count();
        $failedShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Failed')->count();

        $allShipmentDocIds = ShipmentDocument::whereIn('shipment_id', $shipments->pluck('shipment_id'))
            ->pluck('shipment_doc_id');

        $totalDocs = $allShipmentDocIds->count();

        $docStatusCounts = DocumentStatus::where('is_current', true)
            ->whereIn('shipment_doc_id', $allShipmentDocIds)
            ->join('document_status_list', 'document_statuses.status_id', '=', 'document_status_list.status_id')
            ->select('document_status_list.status_name', DB::raw('count(*) as count'))
            ->groupBy('document_status_list.status_name')
            ->get()
            ->pluck('count', 'status_name');

        $approvedDocs = $docStatusCounts->get('Approved', 0);
        $rejectedDocs = $docStatusCounts->get('Rejected', 0);
        $explicitPendingDocs = $docStatusCounts->get('Pending', 0);

        $docsWithAnyStatus = DocumentStatus::where('is_current', true)
            ->whereIn('shipment_doc_id', $allShipmentDocIds)
            ->distinct('shipment_doc_id')
            ->count('shipment_doc_id');

        $docsWithNoStatus = $totalDocs - $docsWithAnyStatus;
        $pendingDocs = $explicitPendingDocs + $docsWithNoStatus;
        $uploadedDocs = $docsWithAnyStatus;
        $missingDocs = $docsWithNoStatus;

        $completionRate = $totalDocs > 0
            ? round(($approvedDocs / $totalDocs) * 100)
            : 0;

        $docKeys = ['SH', 'SSDT', 'FAN', 'TAN', 'SAD', 'BL', 'FE', 'IV', 'PL', 'CI', 'DH'];

        $shipmentRows = $shipments->map(function ($shipment) use ($docKeys) {
            $docs = [];
            foreach ($docKeys as $key) {
                $doc = $shipment->documents->first(fn($d) => $d->customDoc?->doc_name === $key);
                $statusName = $doc?->currentStatus?->status?->status_name;

                $docs[$key] = [
                    'status' => match ($statusName) {
                        'Approved' => 'ok',
                        'Rejected' => 'error',
                        'Pending' => 'pending',
                        default => 'missing',
                    },
                    'shipment_doc_id' => $doc?->shipment_doc_id,
                    'file_path' => $doc?->file_path ?? null,
                    'file_name' => $doc?->file_name ?? null,
                    'doc_full_name' => $doc?->customDoc?->doc_full_name ?? $key,
                ];
            }

            $docStatuses = array_column($docs, 'status');
            $status = 'completed';
            if (in_array('error', $docStatuses)) {
                $status = 'error';
            } elseif (in_array('missing', $docStatuses)) {
                $status = 'pending';
            } elseif (in_array('pending', $docStatuses)) {
                $status = 'pending';
            }

            return [
                'shipment_id' => $shipment->shipment_id,
                'ref' => $shipment->shipment_reference,
                'date' => $shipment->actual_time_of_arrival,
                'broker' => $shipment->broker?->broker_name ?? 'N/A',
                'incoterm' => $shipment->incoterm,
                'status' => $status,
                'docs' => $docs,
            ];
        });

        return Inertia::render('dashboard', [
            'metrics' => [
                'totalShipments' => $totalShipments,
                'activeShipments' => $activeShipments,
                'archivedShipments' => $archivedShipments,
                'completedShipments' => $completedShipments,
                'pendingShipments' => $pendingShipments,
                'processingShipments' => $processingShipments,
                'failedShipments' => $failedShipments,
                'totalDocs' => $totalDocs,
                'approvedDocs' => $approvedDocs,
                'pendingDocs' => $pendingDocs,
                'rejectedDocs' => $rejectedDocs,
                'uploadedDocs' => $uploadedDocs,
                'missingDocs' => $missingDocs,
                'completionRate' => $completionRate,
            ],
            'shipmentRows' => $shipmentRows,
        ]);
    }
}