<?php

namespace App\Http\Controllers;

use App\Models\Broker;
use App\Models\CustomDoc;
use App\Models\DocumentStatus;
use App\Models\Shipment;
use App\Models\ShipmentDocument;
use App\Models\ShipmentType;
use App\Services\ActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ShipmentController extends Controller
{

    public function index(Request $request)
    {
        $archiveFilter = $request->query('archive', 'active');

        if (! in_array($archiveFilter, ['active', 'archived', 'all'], true)) {
            $archiveFilter = 'active';
        }

        $search = trim((string) $request->query('search', ''));
        $status = $request->query('status');
        $sort = $request->query('sort');
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';
        $brokerId = $request->query('broker_id');
        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $sortMap = [
            'shipment_reference' => 'shipments.shipment_reference',
            'brand' => 'shipments.brand',
            'incoterm' => 'shipments.incoterm',
            'actual_time_of_arrival' => 'shipments.actual_time_of_arrival',
            'created_at' => 'shipments.created_at',
            'archived_at' => 'shipments.archived_at',
            'brand_manager' => 'shipments.brand_manager',
            'broker' => 'brokers.broker_name',
            'status' => 'shipment_status_list.status_name',
            'shipment_type' => 'shipment_types.shipment_type_name',
        ];

        // Base query shared by the paginated list and the tab-count aggregate.
        // Deliberately excludes the `status` filter so counts reflect all tabs
        // under the current archive/search context.
        $baseQuery = fn () => Shipment::query()
            ->leftJoin('brokers', 'brokers.broker_id', '=', 'shipments.broker_id')
            ->leftJoin('shipment_status_list', 'shipment_status_list.status_id', '=', 'shipments.status_id')
            ->leftJoin('shipment_types', 'shipment_types.shipment_type_id', '=', 'shipments.shipment_type_id')
            ->when($archiveFilter === 'active', fn ($q) => $q->active())
            ->when($archiveFilter === 'archived', fn ($q) => $q->archived())
            ->when($brokerId, fn ($q) => $q->where('shipments.broker_id', $brokerId))
            ->searchTerm($search ?: null);

        // ── Paginated rows ──────────────────────────────────────────────────────
        $query = $baseQuery()
            ->select('shipments.*')
            ->with([
                'status',
                'shipmentType',
                'broker',
                'documents.customDoc',
                'documents.currentStatus.status',
                'emails',
            ])
            ->when($status, fn ($q) => $q->where('shipment_status_list.status_name', $status));

        $query->orderBy($sortMap[$sort] ?? 'shipments.created_at', $sort ? $direction : 'desc');

        $shipments = $query->paginate($perPage)->withQueryString();

        // ── Tab counts (respect archive + search, ignore the active tab itself) ──
        $statusCounts = $baseQuery()
            ->select('shipment_status_list.status_name', DB::raw('count(*) as aggregate'))
            ->groupBy('shipment_status_list.status_name')
            ->pluck('aggregate', 'status_name');

        $totalForTabs = $baseQuery()->count();

        return Inertia::render('shipments/index', [
            'shipments' => $shipments,
            'shipmentTypes' => ShipmentType::all(),
            'brokers' => Broker::where('is_active', true)->get(),
            'filters' => [
                'archive' => $archiveFilter,
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'broker_id' => $brokerId,
            ],
            'archiveCounts' => [
                'active' => Shipment::active()->count(),
                'archived' => Shipment::archived()->count(),
                'all' => Shipment::count(),
            ],
            'statusCounts' => [
                'all' => $totalForTabs,
                'Completed' => (int) ($statusCounts['Completed'] ?? 0),
                'Processing' => (int) ($statusCounts['Processing'] ?? 0),
                'Pending' => (int) ($statusCounts['Pending'] ?? 0),
                'Failed' => (int) ($statusCounts['Failed'] ?? 0),
            ],
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('add-shipments');

        $validated = $request->validate([
            'shipment_reference' => 'required|string|max:255',
            'brand' => 'required|string|max:255',
            'incoterm' => 'required|string|max:255',
            'actual_time_of_arrival' => 'sometimes|nullable|date',
            'broker_id' => 'nullable|exists:brokers,broker_id',
            'brand_manager' => 'nullable|string|max:255',
            'shipment_type_id' => 'required|exists:shipment_types,shipment_type_id',
        ]);

        $ata = ($validated['actual_time_of_arrival'] ?? null)
            ? Carbon::parse($validated['actual_time_of_arrival'])
            : now();

        $validated['actual_time_of_arrival'] = $ata->format('Y-m-d');
        $validated['year'] = $ata->year;
        $validated['month'] = $ata->month;
        $validated['status_id'] = 2; // Pending by default

        $shipment = Shipment::create($validated);

        $customDocIds = CustomDoc::pluck('custom_doc_id');
        foreach ($customDocIds as $docId) {
            ShipmentDocument::create([
                'shipment_id' => $shipment->shipment_id,
                'custom_doc_id' => $docId,
            ]);
        }

        ActivityLogger::log('created', "Created shipment \"{$shipment->shipment_reference}\".", $shipment);

        return redirect()->route('shipments.index');
    }

    public function updateDocumentStatus(Request $request, $shipment_doc_id)
    {
        $request->validate([
            'status_id' => 'required|exists:document_status_list,status_id',
        ]);

        if ((int) $request->status_id === 1) {
            Gate::authorize('approve-documents');
        } elseif ((int) $request->status_id === 3) {
            Gate::authorize('reject-documents');
        } else {
            Gate::authorize('edit-shipments');
        }

        $shipmentDoc = ShipmentDocument::with('customDoc')->findOrFail($shipment_doc_id);

        $oldStatus = DocumentStatus::where('shipment_doc_id', $shipment_doc_id)
            ->where('is_current', true)
            ->first();

        // Set all previous statuses for this doc to not current
        DocumentStatus::where('shipment_doc_id', $shipment_doc_id)
            ->update(['is_current' => false]);

        // Insert new current status
        $newDocStatus = DocumentStatus::create([
            'shipment_doc_id' => $shipment_doc_id,
            'status_id' => $request->status_id,
            'is_current' => true,
            'changed_at' => now(),
            'changed_by' => Auth::id(),
        ]);

        $shipment = Shipment::with('documents.currentStatus.status')
            ->find($shipmentDoc->shipment_id);

        // Log the document-level status change, attached to the parent Shipment
        $oldStatusName = $oldStatus?->status?->status_name;
        $newStatusName = $newDocStatus->status?->status_name;

        ActivityLogger::log(
            'document_status_updated',
            "Updated document status for shipment \"{$shipment->shipment_reference}\".",
            $shipment,
            [
                'shipment_doc_id' => $shipment_doc_id,
                'old_status_id' => $oldStatus?->status_id,
                'new_status_id' => $newDocStatus->status_id,
                'old_status_name' => $oldStatusName,
                'new_status_name' => $newStatusName,
                'from' => $oldStatusName,
                'to' => $newStatusName,
            ],
        );

        $totalDocs = $shipment->documents->count();
        $approvedDocs = $shipment->documents->filter(function ($doc) {
            return $doc->currentStatus?->status?->status_name === 'Approved';
        })->count();

        $newStatusId = ($totalDocs > 0 && $approvedDocs === $totalDocs) ? 4 : 2;

        if ($shipment->status_id !== $newStatusId) {
            $shipment->update(['status_id' => $newStatusId]);

            ActivityLogger::log(
                'shipment_status_recalculated',
                "Recalculated status for shipment \"{$shipment->shipment_reference}\" following a document status change.",
                $shipment,
                ['shipment_doc_id' => $shipment_doc_id, 'new_shipment_status_id' => $newStatusId],
            );
        }

        return redirect()->route('shipments.index');
    }

    public function uploadDocument(Request $request, int $shipment_doc_id)
    {
        Gate::authorize('upload-documents');

        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        $doc = ShipmentDocument::findOrFail($shipment_doc_id);
        $disk = config('filesystems.default');

        // Delete old file if exists
        if ($doc->file_path && Storage::disk($disk)->exists($doc->file_path)) {
            Storage::disk($disk)->delete($doc->file_path);
        }

        $file = $request->file('file');
        $path = $file->store("shipment-docs/{$doc->shipment_id}", $disk);

        $doc->update([
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
        ]);

        $shipment = Shipment::find($doc->shipment_id);
        ActivityLogger::log(
            'document_uploaded',
            "Uploaded document \"{$file->getClientOriginalName()}\" for shipment \"{$shipment?->shipment_reference}\" (doc #{$shipment_doc_id}).",
            $doc,
        );

        return back();
    }

    public function viewDocument(int $shipment_doc_id)
    {
        $doc = ShipmentDocument::findOrFail($shipment_doc_id);
        $disk = config('filesystems.default');

        if (! $doc->file_path || ! Storage::disk($disk)->exists($doc->file_path)) {
            abort(404);
        }

        return response()->stream(function () use ($disk, $doc) {
            echo Storage::disk($disk)->get($doc->file_path);
        }, 200, ['Content-Type' => 'application/pdf']);
    }

    public function update(Request $request, Shipment $shipment)
    {
        Gate::authorize('edit-shipments');

        $validated = $request->validate([
            'year' => 'sometimes|integer',
            'month' => 'sometimes|integer',
            'shipment_reference' => 'sometimes|string|max:255',
            'brand' => 'sometimes|string|max:255',
            'incoterm' => 'sometimes|string|max:255',
            'actual_time_of_arrival' => 'nullable|date',
            'broker_id' => 'nullable|exists:brokers,broker_id',
            'brand_manager' => 'nullable|string|max:255',
            'shipment_type_id' => 'sometimes|exists:shipment_types,shipment_type_id',
            'version' => 'required|integer',
        ]);

        $version = $validated['version'];
        unset($validated['version']);
        $shipment->syncOriginalAttribute('version', $version);

        $old = $shipment->only(array_keys($validated));
        $shipment->update($validated);

        ActivityLogger::log(
            'updated',
            "Updated shipment \"{$shipment->shipment_reference}\".",
            $shipment,
            ['old' => $old, 'new' => $validated],
        );

        return redirect()->route('shipments.index');
    }

    public function archive(Shipment $shipment)
    {
        Gate::authorize('archive-shipments');

        $shipment->update(['archived_at' => now()]);

        ActivityLogger::log('archived', "Archived shipment \"{$shipment->shipment_reference}\".", $shipment);

        return back();
    }

    public function restore(Shipment $shipment)
    {
        Gate::authorize('delete-shipments');

        $shipment->update(['archived_at' => null]);

        return back();
    }
}
