# Broker Filter — Dashboard

**Date:** 2026-06-22
**Status:** Approved

## Summary

Add a multi-select broker filter to the dashboard toolbar. Filters the shipments table to show only rows matching the selected brokers. Pure frontend — no backend changes required.

## Architecture

- Broker names derived client-side from `shipmentRows` prop (already provided by `DashboardController`)
- `selectedBrokers: string[]` state lives in `dashboard.tsx` alongside existing `searchQuery`, `activeTab`, `dateRange` state
- `selectedBrokers` resets to `[]` when `activeTab`, `dateRange`, or `searchQuery` changes (via existing `useEffect`)
- No new API endpoints or backend changes

## New Component

**File:** `resources/js/components/ui/broker-filter.tsx`

**Props:**
```ts
interface BrokerFilterProps {
    brokers: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}
```

**Behavior:**
- Renders an outlined button styled to match toolbar (`h-8 text-[10px] font-bold border-slate-200 dark:border-slate-800 rounded-lg`)
- Button label: `"Broker"` when none selected; `"Broker (N)"` when N brokers active (badge in blue)
- Clicking opens a Radix `Popover` (already in `@radix-ui/react-popover` deps)
- Dropdown contains:
  - "All" option at top — clicking clears all selections
  - One row per unique broker: checkbox + broker name
- Closing popover does not clear selection

## Changes to `dashboard.tsx`

1. **Fix `ShipmentRow` interface** — add missing `broker: string` field
2. **Derive broker list:** `const availableBrokers = [...new Set(shipmentRows.map(s => s.broker))]`
3. **Add state:** `const [selectedBrokers, setSelectedBrokers] = useState<string[]>([])`
4. **Extend `filteredShipments`:** add condition `selectedBrokers.length === 0 || selectedBrokers.includes(shipment.broker)`
5. **Reset on filter change:** add `selectedBrokers` reset to existing `useEffect` dependencies
6. **Render `BrokerFilter`** in toolbar after Export button

## Toolbar Layout

```
[Search ................] [Date Range ▾] [Export] [Broker ▾]
```

## Data Flow

```
shipmentRows (from Inertia props)
  → availableBrokers (derived, unique)
  → BrokerFilter renders options
  → user selects brokers → selectedBrokers state
  → filteredShipments filters by selectedBrokers
  → ShipmentsTable renders filtered rows
```

## Error Handling

- If `shipment.broker` is `'N/A'` (broker missing), it appears as a selectable option in the list — no special handling needed.
- Empty `selectedBrokers` means "show all" — no filtering applied.

## Scope

- No changes to `ShipmentsTable` component
- No changes to `DashboardController`
- No changes to any other page
