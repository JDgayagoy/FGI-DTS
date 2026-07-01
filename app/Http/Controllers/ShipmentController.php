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

        $shipments = Shipment::with([
            'status',
            'shipmentType',
            'broker',
            'documents.customDoc',
            'documents.currentStatus.status',
        ])
            ->when($archiveFilter === 'active', fn ($query) => $query->active())
            ->when($archiveFilter === 'archived', fn ($query) => $query->archived())
            ->latest()
            ->get();

        return Inertia::render('shipments/index', [
            'shipments' => $shipments,
            'shipmentTypes' => ShipmentType::all(),
            'brokers' => Broker::where('is_active', true)->get(),
            'filters' => [
                'archive' => $archiveFilter,
            ],
            'archiveCounts' => [
                'active' => Shipment::active()->count(),
                'archived' => Shipment::archived()->count(),
                'all' => Shipment::count(),
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
            'actual_time_of_arrival' => 'nullable|date',
            'broker_id' => 'nullable|exists:brokers,broker_id',
            'brand_manager' => 'nullable|string|max:255',
            'shipment_type_id' => 'required|exists:shipment_types,shipment_type_id',
        ]);

        $ata = $validated['actual_time_of_arrival']
            ? Carbon::parse($validated['actual_time_of_arrival'])
            : now();

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
        Gate::authorize('edit-shipments');

        $request->validate([
            'status_id' => 'required|exists:document_status_list,status_id',
        ]);

        // Set all previous statuses for this doc to not current
        DocumentStatus::where('shipment_doc_id', $shipment_doc_id)
            ->update(['is_current' => false]);

        // Insert new current status
        DocumentStatus::create([
            'shipment_doc_id' => $shipment_doc_id,
            'status_id' => $request->status_id,
            'is_current' => true,
            'changed_at' => now(),
            'changed_by' => Auth::id(),
        ]);

        $shipmentDoc = ShipmentDocument::find($shipment_doc_id);

        $shipment = Shipment::with('documents.currentStatus.status')
            ->find($shipmentDoc->shipment_id);

        $totalDocs = $shipment->documents->count();
        $approvedDocs = $shipment->documents->filter(function ($doc) {
            return $doc->currentStatus?->status?->status_name === 'Approved';
        })->count();

        $newStatusId = ($totalDocs > 0 && $approvedDocs === $totalDocs) ? 4 : 2;
        $shipment->update(['status_id' => $newStatusId]);

        ActivityLogger::log(
            'document_status_updated',
            "Updated document status for shipment \"{$shipment->shipment_reference}\" (doc #{$shipment_doc_id}).",
            $shipment,
            ['shipment_doc_id' => $shipment_doc_id, 'new_status_id' => $request->status_id],
        );

        return redirect()->route('shipments.index');
    }

    public function uploadDocument(Request $request, int $shipment_doc_id)
    {
        Gate::authorize('edit-shipments');

        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        $doc = ShipmentDocument::findOrFail($shipment_doc_id);

        // Delete old file if exists
        if ($doc->file_path && Storage::disk('public')->exists($doc->file_path)) {
            Storage::disk('public')->delete($doc->file_path);
        }

        $file = $request->file('file');
        $path = $file->store("shipment-docs/{$doc->shipment_id}", 'public');

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

        if (! $doc->file_path || ! Storage::disk('public')->exists($doc->file_path)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($doc->file_path), [
            'Content-Type' => 'application/pdf',
        ]);
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
        ]);

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
}
