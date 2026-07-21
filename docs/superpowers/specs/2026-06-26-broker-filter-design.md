# Broker Filter — Shipments & Dashboard

**Date:** 2026-06-26  
**Scope:** Add broker filtering to the shipments table and dashboard table/metrics.

---

## Summary

Replace the shipments page archive tabs with a single grouped dropdown that covers both visibility (Archived, All) and broker selection. Add a standalone broker dropdown to the dashboard that filters the metrics cards and shipment rows server-side.

---

## Goals

- Filter shipments table by broker on the shipments page
- Filter dashboard shipment rows AND metric cards by broker
- Rework shipments archive tabs into a cleaner grouped dropdown UI
- All filtering is server-side (Inertia `router.get()`)

---

## Out of Scope

- Reports page (broker filter already exists there)
- Combined archive + broker filter (mutually exclusive by design)
- Partial/optimistic reloads (Approach C deferred)

---

## Data Flow

### Shipments Page

One grouped `<select>` dropdown replaces the current archive tab buttons.

```
Group "Visibility"  →  options: Archived, All
Group "Brokers"     →  options: [dynamic from DB, active brokers only]
```

Selection logic:

| Dropdown value | Query params sent |
|---|---|
| `""` (default) | none → shows active shipments |
| `"archived"` | `?archive=archived` |
| `"all"` | `?archive=all` |
| `"broker:3"` | `?broker_id=3` |

Selecting a Visibility option clears `broker_id`.  
Selecting a Broker option clears `archive` (backend defaults to `active`).  
A reset button clears everything.

Backend (`ShipmentController::index`):
- Already handles `archive` param (active/archived/all)
- Add: `broker_id` param → `->when($brokerId, fn($q) => $q->where('broker_id', $brokerId))`
- Already passes `brokers` list to the view

### Dashboard Page

Standalone broker `<select>` dropdown added to the top controls bar (beside search + date picker).

```
On change → router.get('/dashboard', { broker_id: value || undefined }, { preserveState: true })
```

Backend (`DashboardController::index`):
- Accept `broker_id` query param
- Apply `->when($brokerId, fn($q) => $q->where('broker_id', $brokerId))` to the main `$shipments` query
- All downstream metrics (totals, doc counts, completion rate, shipment rows) derive from that filtered collection — no additional changes needed
- Pass `brokers` (active only) and `activeFilters.brokerId` to the view

---

## Component Changes

| File | Change |
|---|---|
| `app/Http/Controllers/ShipmentController.php` | Add `broker_id` query param + `when` filter |
| `app/Http/Controllers/DashboardController.php` | Add `broker_id` param, filter `$shipments`, pass `brokers` + `activeFilters` |
| `resources/js/components/shipments/shipments-table.tsx` | Replace archive tabs with grouped `<select>` dropdown; accept `brokers` + `brokerId` props |
| `resources/js/pages/shipments/index.tsx` | Replace `handleArchiveFilterChange` with unified `handleFilterChange(value: string)`; pass broker props |
| `resources/js/pages/shipments/types.ts` | Add `brokers: Broker[]` and `filters.broker_id` to `Props` |
| `resources/js/pages/dashboard.tsx` | Add broker `<select>` to top controls; wire `router.get` on change; extend `Props` with `brokers` + `activeFilters` |

---

## Dropdown UI Detail (Shipments)

```html
<select onChange={handleFilterChange}>
  <option value="">Active (Default)</option>
  <optgroup label="Visibility">
    <option value="archived">Archived</option>
    <option value="all">All</option>
  </optgroup>
  <optgroup label="Brokers">
    <option value="broker:1">Grab Philippines</option>
    <option value="broker:2">LBC</option>
    <!-- ... dynamic -->
  </optgroup>
</select>
```

Current selected value is derived from `filters.archive` and `filters.broker_id` props on mount.

---

## Dropdown UI Detail (Dashboard)

```html
<select onChange={handleBrokerChange}>
  <option value="">All Brokers</option>
  <option value="1">Grab Philippines</option>
  <option value="2">LBC</option>
  <!-- ... dynamic -->
</select>
```

Styled to match existing controls (same class pattern as shipments table controls).

---

## Key Constraints

- Brokers list: `Broker::where('is_active', true)->get()` — active only
- Visibility and broker are mutually exclusive in the dropdown (single `<select>` enforces this)
- Dashboard metrics (totals, doc counts, completion rate) all update on broker filter because they derive from the filtered `$shipments` collection
- No new routes needed — both use existing GET endpoints with additional query params
