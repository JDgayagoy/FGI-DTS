<?php

namespace App\Http\Controllers;

use App\Models\Broker;
use App\Models\DocumentStatus;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
// use App\Http\Controllers\Log;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
<<<<<<< HEAD
        $allShipments = Shipment::with([
=======
        $brokerId = $request->query('broker_id');

        $shipments = Shipment::with([
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
            'status',
            'shipmentType',
            'broker',
            'documents.customDoc',
            'documents.currentStatus.status',
        ])
            ->active()
            ->when($brokerId, fn ($query) => $query->where('broker_id', $brokerId))
            ->get();

<<<<<<< HEAD
        $totalShipments = $allShipments->count();
        $archivedShipments = $allShipments->filter(fn($s) => $s->archived_at !== null)->count();
        $activeShipments = $totalShipments - $archivedShipments;

        // Use ONLY active shipments for the table and subsequent metrics
        $shipments = $allShipments->filter(fn($s) => $s->archived_at === null);

        $completedShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Completed')->count();
        $pendingShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Pending')->count();
        $processingShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Processing')->count();
        $failedShipments = $shipments->filter(fn($s) => $s->status?->status_name === 'Failed')->count();
=======
        $totalShipments = $shipments->count();
        $activeShipments = $totalShipments;

        $completedShipments = $shipments->filter(fn ($s) => $s->status?->status_name === 'Completed')->count();
        $pendingShipments = $shipments->filter(fn ($s) => $s->status?->status_name === 'Pending')->count();
        $processingShipments = $shipments->filter(fn ($s) => $s->status?->status_name === 'Processing')->count();
        $failedShipments = $shipments->filter(fn ($s) => $s->status?->status_name === 'Failed')->count();
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e

        $allDocs = $shipments->flatMap->documents;

        $totalDocs = $allDocs->count();
        $uploadedDocs = $allDocs->filter(fn($doc) => !empty($doc->file_path))->count();
        $missingDocs = $allDocs->filter(fn($doc) => empty($doc->file_path))->count();
        $rejectedDocs = $allDocs->filter(fn($doc) => $doc->currentStatus?->status?->status_name === 'Rejected')->count();
        
        $activeDocs = $uploadedDocs + $missingDocs;

        $completionRate = $totalDocs > 0
            ? round(($uploadedDocs / $totalDocs) * 100)
            : 0;

        $chartData = collect();
        
        $latestDateStr = Shipment::max('created_at');
        $referenceDate = $latestDateStr ? \Carbon\Carbon::parse($latestDateStr) : now();
        $thirtyDaysAgo = (clone $referenceDate)->subDays(29)->startOfDay();
        
        $recentShipments = Shipment::with('status')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->where('created_at', '<=', $referenceDate->endOfDay())
            ->get()
            ->groupBy(fn($s) => $s->created_at->format('Y-m-d'));

        for ($i = 29; $i >= 0; $i--) {
            $date = (clone $referenceDate)->subDays($i)->format('Y-m-d');
            $dayShipments = $recentShipments->get($date, collect());
            
            $chartData->push([
                'date' => $date,
                'total' => $dayShipments->count(),
                'completed' => $dayShipments->filter(fn($s) => $s->status?->status_name === 'Completed')->count(),
            ]);
        }

        $docKeys = ['SH', 'SSDT', 'FAN', 'TAN', 'SAD', 'BL', 'FE', 'IV', 'PL', 'CI', 'DH'];

        $shipmentRows = $shipments->map(function ($shipment) use ($docKeys) {
            // Index this shipment's documents by doc_name once, instead of
            // re-scanning the collection for every key in $docKeys.
            $docsByKey = $shipment->documents->keyBy(fn($d) => $d->customDoc?->doc_name);

            $docs = [];
            foreach ($docKeys as $key) {
<<<<<<< HEAD
                $doc = $docsByKey->get($key);
=======
                $doc = $shipment->documents->first(fn ($d) => $d->customDoc?->doc_name === $key);
>>>>>>> 4f28a96f5f13a3d2109e7031a2906e997c357c9e
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
                'archivedShipments' => Shipment::withoutGlobalScope('active')->whereNotNull('archived_at')->count(),
                'completedShipments' => $completedShipments,
                'pendingShipments' => $pendingShipments,
                'processingShipments' => $processingShipments,
                'failedShipments' => $failedShipments,
                'totalDocs' => $activeDocs,
                'approvedDocs' => $allDocs->filter(fn($doc) => $doc->currentStatus?->status?->status_name === 'Approved')->count(),
                'pendingDocs' => $missingDocs,
                'rejectedDocs' => $rejectedDocs,
                'uploadedDocs' => $uploadedDocs,
                'missingDocs' => $missingDocs,
                'completionRate' => $completionRate,
            ],
            'chartData' => $chartData,
            'shipmentRows' => $shipmentRows,
            'brokers' => Broker::where('is_active', true)->get(['broker_id', 'broker_name']),
            'activeFilters' => [
                'brokerId' => $brokerId,
            ],
        ]);
    }
}
