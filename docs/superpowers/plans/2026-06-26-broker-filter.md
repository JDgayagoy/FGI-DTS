# Broker Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add broker filtering to the shipments page (via grouped dropdown replacing archive tabs) and dashboard page (via standalone dropdown updating metrics + table rows), all server-side via Inertia `router.get()`.

**Architecture:** Each page calls its existing GET route with additional query params (`broker_id`, `archive`). The backend filters the main shipments query before computing all derived data. The shipments dropdown encodes both archive visibility and broker selection as a single `<select>` value, decoded client-side before dispatching the correct params.

**Tech Stack:** Laravel 11, Inertia.js, React 18, TypeScript, Tailwind CSS

## Global Constraints

- Brokers list: `Broker::where('is_active', true)` only
- `broker_id` and `archive` are mutually exclusive in the shipments dropdown — selecting one clears the other
- No new routes — use existing `GET /shipments` and `GET /dashboard`
- Style new dropdowns to match existing controls (border-slate-200, rounded-lg, text-[10px] font-bold)
- `preserveState: true` on all `router.get()` calls

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/Http/Controllers/ShipmentController.php` | Modify | Accept + apply `broker_id` param; include in returned `filters` |
| `app/Http/Controllers/DashboardController.php` | Modify | Accept `broker_id`, filter `$shipments`, pass `brokers` + `activeFilters` |
| `resources/js/pages/shipments/types.ts` | Modify | Add `broker_id` to `filters`; add `Broker` already exists |
| `resources/js/components/shipments/shipments-table.tsx` | Modify | Replace ARCHIVE_FILTERS button group with grouped `<select>`; update props |
| `resources/js/pages/shipments/index.tsx` | Modify | Replace `handleArchiveFilterChange` with `handleFilterChange`; pass broker props |
| `resources/js/pages/dashboard.tsx` | Modify | Add broker dropdown to top controls; extend `Props`; wire router call |

---

### Task 1: ShipmentController — broker_id filter

**Files:**
- Modify: `app/Http/Controllers/ShipmentController.php:20-53`

**Interfaces:**
- Produces: `filters.broker_id` (string|null) available in Inertia props

- [ ] **Step 1: Add broker_id param and filter to `index()`**

In `ShipmentController::index()`, after the existing `$archiveFilter` line, add the broker filter and include it in the returned props:

```php
public function index(Request $request)
{
    $archiveFilter = $request->query('archive', 'active');

    if (! in_array($archiveFilter, ['active', 'archived', 'all'], true)) {
        $archiveFilter = 'active';
    }

    $brokerId = $request->query('broker_id');

    $shipments = Shipment::with([
        'status',
        'shipmentType',
        'broker',
        'documents.customDoc',
        'documents.currentStatus.status',
    ])
        ->when($archiveFilter === 'active', fn ($query) => $query->active())
        ->when($archiveFilter === 'archived', fn ($query) => $query->archived())
        ->when($brokerId, fn ($query) => $query->where('broker_id', $brokerId))
        ->latest()
        ->get();

    return Inertia::render('shipments/index', [
        'shipments' => $shipments,
        'shipmentTypes' => ShipmentType::all(),
        'brokers' => Broker::where('is_active', true)->get(),
        'filters' => [
            'archive' => $archiveFilter,
            'broker_id' => $brokerId,
        ],
        'archiveCounts' => [
            'active' => Shipment::active()->count(),
            'archived' => Shipment::archived()->count(),
            'all' => Shipment::count(),
        ],
    ]);
}
```

- [ ] **Step 2: Manual smoke test**

Visit `/shipments?broker_id=1` — confirm only shipments for that broker appear. Visit `/shipments?archive=archived` — confirm archived shipments appear regardless of broker. Visit `/shipments` — confirm active shipments, no broker filter.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/ShipmentController.php
git commit -m "feat: add broker_id filter to ShipmentController"
```

---

### Task 2: DashboardController — broker_id filter + brokers list

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php`

**Interfaces:**
- Produces: `brokers` array (broker_id, broker_name), `activeFilters.brokerId` (string|null) in Inertia props
- All metrics (totalShipments, activeShipments, completedShipments, totalDocs, approvedDocs, etc.) now reflect broker filter

- [ ] **Step 1: Add broker_id param and filter `$shipments` query**

Replace the entire `index()` method body — the only change is adding `$brokerId`, the `->when()` on the Shipment query, and the new props. All downstream metric calculations are unchanged because they derive from `$shipments`.

```php
public function index(Request $request)
{
    $brokerId = $request->query('broker_id');

    $shipments = Shipment::with([
        'status',
        'shipmentType',
        'documents.customDoc',
        'documents.currentStatus.status',
    ])
        ->when($brokerId, fn ($query) => $query->where('broker_id', $brokerId))
        ->get();

    // --- All existing metric calculations remain unchanged from here ---
    $totalShipments = $shipments->count();
    $archivedShipments = $shipments->filter(fn($s) => $s->archived_at !== null)->count();
    $activeShipments = $totalShipments - $archivedShipments;

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
        'brokers' => Broker::where('is_active', true)->get(['broker_id', 'broker_name']),
        'activeFilters' => [
            'brokerId' => $brokerId,
        ],
    ]);
}
```

Also add `use App\Models\Broker;` to the imports at the top if not already present.

- [ ] **Step 2: Manual smoke test**

Visit `/dashboard?broker_id=1` — confirm metric cards update (totalShipments drops to only that broker's count) and shipment rows show only that broker.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/DashboardController.php
git commit -m "feat: add broker_id filter to DashboardController, pass brokers list"
```

---

### Task 3: Shipments types — add broker_id to filters

**Files:**
- Modify: `resources/js/pages/shipments/types.ts:76-84`

**Interfaces:**
- Produces: `Props.filters.broker_id: string | null`

- [ ] **Step 1: Update `Props` interface**

```typescript
export interface Props {
    shipments: Shipment[];
    shipmentTypes: ShipmentType[];
    brokers: Broker[];
    filters: {
        archive: 'active' | 'archived' | 'all';
        broker_id: string | null;
    };
    archiveCounts: {
        active: number;
        archived: number;
        all: number;
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/pages/shipments/types.ts
git commit -m "feat: add broker_id to shipments Props filters type"
```

---

### Task 4: ShipmentsTable — replace archive buttons with grouped dropdown

**Files:**
- Modify: `resources/js/components/shipments/shipments-table.tsx`

**Interfaces:**
- Consumes: `brokers: Broker[]` (from `resources/js/pages/shipments/types.ts`), `currentFilter: string` (derived value — see below), `onFilterChange: (value: string) => void`
- Drops: `archiveFilter`, `archiveCounts`, `setArchiveFilter` props
- Adds: `brokers: Broker[]`, `currentFilter: string`, `onFilterChange: (value: string) => void`

The `currentFilter` value is computed in the parent (`index.tsx`) as:
- `broker_id` is set → `"broker:{broker_id}"`
- `archive` is `'archived'` or `'all'` → that string directly
- default → `""` (active, no broker)

- [ ] **Step 1: Update `ShipmentsTableProps` interface**

Replace the archive-related props:

```typescript
import type { Broker, Shipment } from '@/pages/shipments/types';

interface ShipmentsTableProps {
    shipments: Shipment[];
    filteredShipments: Shipment[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    sortConfig: SortConfig | null;
    handleSort: (key: string) => void;
    openEditModal: (shipment: Shipment) => void;
    setArchivingShipment: (shipment: Shipment) => void;
    setActiveDocPanel: (index: number) => void;
    setSelectedDocId: (id: null) => void;
    brokers: Broker[];
    currentFilter: string;
    onFilterChange: (value: string) => void;
}
```

- [ ] **Step 2: Update destructured params in `ShipmentsTable` component**

Replace:
```typescript
export const ShipmentsTable = ({
    shipments,
    filteredShipments,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    openEditModal,
    setArchivingShipment,
    setActiveDocPanel,
    setSelectedDocId,
    archiveFilter,
    archiveCounts,
    setArchiveFilter,
}: ShipmentsTableProps) => {
```

With:
```typescript
export const ShipmentsTable = ({
    shipments,
    filteredShipments,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    openEditModal,
    setArchivingShipment,
    setActiveDocPanel,
    setSelectedDocId,
    brokers,
    currentFilter,
    onFilterChange,
}: ShipmentsTableProps) => {
```

- [ ] **Step 3: Delete `ARCHIVE_FILTERS` constant and replace the button group with a grouped `<select>`**

Delete:
```typescript
const ARCHIVE_FILTERS = [
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
    { label: 'All', value: 'all' },
] as const;
```

In the JSX, replace the entire `<div className="flex rounded-lg border ...">` button group block (lines 138–169) with:

```tsx
<select
    value={currentFilter}
    onChange={(e) => onFilterChange(e.target.value)}
    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
>
    <option value="">Active (Default)</option>
    <optgroup label="Visibility">
        <option value="archived">Archived</option>
        <option value="all">All</option>
    </optgroup>
    {brokers.length > 0 && (
        <optgroup label="Brokers">
            {brokers.map((b) => (
                <option key={b.broker_id} value={`broker:${b.broker_id}`}>
                    {b.broker_name}
                </option>
            ))}
        </optgroup>
    )}
</select>
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/components/shipments/shipments-table.tsx
git commit -m "feat: replace archive tab buttons with grouped broker/visibility dropdown"
```

---

### Task 5: Shipments index page — wire unified filter handler

**Files:**
- Modify: `resources/js/pages/shipments/index.tsx`

**Interfaces:**
- Consumes: `Props.filters.broker_id` (string | null), `Props.brokers` (Broker[]) — both now present from Task 1 + 3
- Produces: correct props to `ShipmentsTable` (`brokers`, `currentFilter`, `onFilterChange`)

- [ ] **Step 1: Replace `handleArchiveFilterChange` with `handleFilterChange`**

Remove:
```typescript
const handleArchiveFilterChange = (
    archive: Props['filters']['archive'],
) => {
    setActiveDocPanel(null);
    setSelectedDocId(null);
    router.get('/shipments', archive === 'active' ? {} : { archive }, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
};
```

Add:
```typescript
const handleFilterChange = (value: string) => {
    setActiveDocPanel(null);
    setSelectedDocId(null);

    if (value === '') {
        router.get('/shipments', {}, { preserveState: true, preserveScroll: true, replace: true });
    } else if (value === 'archived' || value === 'all') {
        router.get('/shipments', { archive: value }, { preserveState: true, preserveScroll: true, replace: true });
    } else if (value.startsWith('broker:')) {
        const brokerId = value.replace('broker:', '');
        router.get('/shipments', { broker_id: brokerId }, { preserveState: true, preserveScroll: true, replace: true });
    }
};
```

- [ ] **Step 2: Compute `currentFilter` from props**

Add this derived value after the existing `useMemo` block:

```typescript
const currentFilter = filters.broker_id
    ? `broker:${filters.broker_id}`
    : filters.archive === 'active'
    ? ''
    : filters.archive;
```

- [ ] **Step 3: Update `<ShipmentsTable>` JSX props**

Replace:
```tsx
<ShipmentsTable
    shipments={shipments}
    filteredShipments={filteredShipments}
    searchQuery={searchQuery}
    setSearchQuery={setSearchQuery}
    sortConfig={sortConfig}
    handleSort={handleSort}
    openEditModal={openEditModal}
    setArchivingShipment={setArchivingShipment}
    setActiveDocPanel={setActiveDocPanel}
    setSelectedDocId={setSelectedDocId}
    archiveFilter={filters.archive}
    archiveCounts={archiveCounts}
    setArchiveFilter={handleArchiveFilterChange}
/>
```

With:
```tsx
<ShipmentsTable
    shipments={shipments}
    filteredShipments={filteredShipments}
    searchQuery={searchQuery}
    setSearchQuery={setSearchQuery}
    sortConfig={sortConfig}
    handleSort={handleSort}
    openEditModal={openEditModal}
    setArchivingShipment={setArchivingShipment}
    setActiveDocPanel={setActiveDocPanel}
    setSelectedDocId={setSelectedDocId}
    brokers={brokers}
    currentFilter={currentFilter}
    onFilterChange={handleFilterChange}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/shipments/index.tsx
git commit -m "feat: wire unified broker/visibility filter handler on shipments page"
```

---

### Task 6: Dashboard — broker dropdown + updated Props

**Files:**
- Modify: `resources/js/pages/dashboard.tsx`

**Interfaces:**
- Consumes: `brokers: { broker_id: number; broker_name: string }[]`, `activeFilters: { brokerId: string | null }` — both now in Inertia props from Task 2

- [ ] **Step 1: Extend `Props` interface**

Add after the existing `Props` interface:

```typescript
interface BrokerOption {
    broker_id: number;
    broker_name: string;
}

interface Props {
    metrics: Metrics;
    shipmentRows: ShipmentRow[];
    brokers: BrokerOption[];
    activeFilters: {
        brokerId: string | null;
    };
}
```

- [ ] **Step 2: Destructure new props**

Change:
```typescript
export default function Dashboard({ metrics, shipmentRows }: Props) {
```

To:
```typescript
export default function Dashboard({ metrics, shipmentRows, brokers, activeFilters }: Props) {
```

- [ ] **Step 3: Add broker filter handler**

Add after the existing `useEffect` hooks (around line 88):

```typescript
const handleBrokerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    router.get(
        '/dashboard',
        value ? { broker_id: value } : {},
        { preserveState: true, preserveScroll: true, replace: true },
    );
};
```

Also add `router` to the import at the top:
```typescript
import { Head, router } from '@inertiajs/react';
```

- [ ] **Step 4: Add broker dropdown to the controls bar**

In the JSX, find the controls row (the `<div className="flex items-center gap-2">` containing the Search input, DatePickerWithRange, and Export button) and add the broker `<select>` before the Export button:

```tsx
<div className="flex items-center gap-2">
    <div className="relative w-64 mr-2">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
            className="bg-white dark:bg-slate-900/40 pl-9 h-8 border-slate-200 dark:border-slate-800 rounded-lg text-[10px]"
            placeholder="Search Reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
    </div>
    <DatePickerWithRange onRangeChange={setDateRange} />
    <select
        value={activeFilters.brokerId ?? ''}
        onChange={handleBrokerChange}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
    >
        <option value="">All Brokers</option>
        {brokers.map((b) => (
            <option key={b.broker_id} value={String(b.broker_id)}>
                {b.broker_name}
            </option>
        ))}
    </select>
    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-slate-200 dark:border-slate-800 rounded-lg gap-2 px-3 bg-white dark:bg-slate-900/50">
        <Download className="size-3.5" /> Export
    </Button>
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

1. Visit `/dashboard` — all metrics show, no broker filter active, dropdown shows "All Brokers"
2. Select a broker — page reloads, metrics update to reflect only that broker's shipments, dropdown stays on selected broker
3. Select "All Brokers" — reloads, all metrics restored

- [ ] **Step 7: Commit**

```bash
git add resources/js/pages/dashboard.tsx
git commit -m "feat: add broker filter dropdown to dashboard, updates metrics on selection"
```
