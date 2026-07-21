---
title: FGI-DTS UI Design Overhaul
date: 2026-06-27
status: approved
---

# FGI-DTS UI Design Overhaul

## Overview

Full UI overhaul of the Focus Global Inc. Document Tracking System. Direction: Modern SaaS — bold typography, strong blue accent, generous whitespace, Stripe/Clerk-like stacking layouts. No layout paradigm shift (sidebar stays), but every visual layer is replaced.

**Stack:** Laravel + React/Inertia + Tailwind v4 + shadcn/ui (unchanged)

---

## 1. Color System

### Background
| Token | Value | Usage |
|---|---|---|
| Page bg | `slate-50` (`#F8FAFC`) | Outer page wrapper |
| Card bg | `white` | All cards, sidebar, modals |
| Border | `slate-200` | Cards, inputs, dividers |

### Blue Accent
| Token | Value | Usage |
|---|---|---|
| `blue-600` | `#2563EB` | Primary buttons, active nav, focus rings, links |
| `blue-700` | `#1D4ED8` | Button hover/pressed state |
| `blue-50` | `#EFF6FF` | Badge bg, input focus bg, active nav bg |
| `blue-100` | `#DBEAFE` | Icon container bg |

### Status Colors
| Status | Background | Text |
|---|---|---|
| Approved / ok | `green-50` | `green-700` |
| Pending / warning | `amber-50` | `amber-700` |
| Rejected / error | `red-50` | `red-700` |
| Missing | `slate-100` | `slate-500` |
| Archived | `slate-100` | `slate-400` |

Replace all raw oklch status values in `app.css` with Tailwind semantic tokens above.

### Dark Mode
Maintain existing dark mode CSS variables in `app.css`. Update `--primary` to map to `blue-600` equivalent in oklch. Dark mode is secondary — light mode is the design target.

---

## 2. Typography

### Fonts
Replace `Instrument Sans` with:
- **Geist** — all UI text, labels, headings
- **Geist Mono** — shipment references, document codes (SH, SSDT, FAN, etc.), numeric IDs, any monospaced data

Load via `@font-face` or Google Fonts import in `app.css`. Update `--font-sans` in the `@theme` block.

### Scale
| Role | Class |
|---|---|
| Page title | `text-2xl font-bold text-slate-900` |
| Section header | `text-sm font-semibold text-slate-800` |
| Label / meta | `text-sm font-medium text-slate-500` |
| Small label | `text-xs font-medium text-slate-400` |
| KPI number | `text-3xl font-bold text-slate-900` |
| Mono data | `font-mono text-sm text-slate-800` |

**Drop:** `uppercase tracking-widest` on stat labels — replace with `font-semibold text-slate-500 text-sm`.

---

## 3. Sidebar & Navigation

**File:** `resources/js/components/app-sidebar.tsx`

### Visual Treatment
- Background: `white`, `border-r border-slate-200`
- Active item: `border-l-2 border-blue-600 bg-blue-50 text-blue-700 font-semibold`
- Inactive item: `text-slate-600 hover:bg-slate-100 rounded-lg`
- Group label ("Management"): `text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1`

### Structure
```
Logo / Brand
─────────────
Dashboard
Shipments
Reports
Logs
FAQs
─────────────
Management (group label)
  Users
  Roles
  Brokers
─────────────
[User avatar + name]
```

### Changes
- Remove footer nav links (Repository, Documentation) — internal tool, not user-facing. Delete `footerNavItems` array and `<NavFooter>` usage in `app-sidebar.tsx`.
- Collapsed icon mode: active icon = `text-blue-600`, inactive = `text-slate-500`
- Keep `collapsible="icon"` variant, no layout change

---

## 4. Dashboard Layout

**File:** `resources/js/pages/dashboard.tsx`

### Layout Structure (4 Rows)

#### Row 1 — Page Header
```
Dashboard                    [Search] [Date Range] [Broker ▾] [Export]
```
- Title: `text-2xl font-bold text-slate-900`
- Controls: right-aligned flex row, `gap-2`
- Broker filter: replace native `<select>` with shadcn `Select` component

#### Row 2 — KPI Cards (5 equal columns)
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [icon]   │ │ [icon]   │ │ [icon]   │ │ [icon]   │ │ [icon]   │
│  Total   │ │  Active  │ │ Uploaded │ │ Invalid  │ │ Missing  │
│  Docs    │ │  Ships   │ │  Docs    │ │  Docs    │ │  Docs    │
│  [num]   │ │  [num]   │ │  [num]   │ │  [num]   │ │  [num]   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```
- Card: `bg-white rounded-xl border border-slate-200 shadow-sm p-5`
- Icon: `size-9 rounded-lg bg-blue-100 text-blue-600` — unique icon per card
- Number: `text-3xl font-bold text-slate-900 mt-2`
- Label: `text-sm font-medium text-slate-500`
- No "out of X" subtext

#### Row 3 — Charts (two equal columns)
```
┌──────────────────────────┐ ┌──────────────────────────┐
│  Doc Completion Rate     │ │  Document Accuracy        │
│  [CompletionChart]       │ │  [AccuracyChart + legend] │
└──────────────────────────┘ └──────────────────────────┘
```
- Same card style as KPIs
- Title: `text-sm font-semibold text-slate-800`
- Subtitle: `text-xs text-slate-400`
- Remove current "Totals" section heading

#### Row 4 — Shipments Table (full width)
```
┌──────────────────────────────────────────────────────────┐
│ [All] [Completed] [In Progress] [Pending] [Incomplete]   │  ← Tabs underline style
├──────────────────────────────────────────────────────────┤
│ Ref       Date    Broker   Inco  SH  SSDT  FAN  ...      │
│ FGI-001   ...     ...      ...   ✓   ✓     ✗   ...      │
│ FGI-002   ...                                            │
├──────────────────────────────────────────────────────────┤
│ ← Prev   Page 1 of N   Next →                            │
└──────────────────────────────────────────────────────────┘
```
- Tab style: `border-b border-slate-200`, active tab `border-b-2 border-blue-600 text-blue-600 font-semibold`
- Shipment `ref` column: `font-mono text-sm` (Geist Mono)
- Status column: pill badge using status color system
- Doc status cells: `StatusIcon` sized `size-4`
- Row striping: `even:bg-slate-50`
- Table header: `text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200`

---

## 5. Component System

### Buttons
| Variant | Classes |
|---|---|
| Primary | `bg-blue-600 text-white hover:bg-blue-700 rounded-lg h-9 px-4 text-sm font-medium` |
| Outline | `border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-9 px-4 text-sm font-medium` |
| Destructive | `bg-red-600 text-white hover:bg-red-700 rounded-lg h-9 px-4 text-sm font-medium` |
| Ghost | `text-slate-600 hover:bg-slate-100 rounded-lg` |

Height: `h-9` default (up from `h-8`).

### Inputs
```
h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm
focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
placeholder:text-slate-400
```

### Status Badges
```tsx
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-700">
  Approved
</span>
```
Apply per-status bg/text from Section 1 color table.

### Cards
```
bg-white rounded-xl border border-slate-200 shadow-sm
```
All cards get `shadow-sm`. Remove inconsistency where some cards have it and some don't.

### Document Dialog (Modal)
- Keep 2-panel layout: doc list left (w-64), PDF preview right
- Doc list active item: `bg-blue-50 border-l-2 border-blue-600`
- Doc list hover: `hover:bg-slate-50`
- Remove `backdrop-blur-xl` (GPU cost, imperceptible benefit)
- Close button label: "Close" (was "Close Portal")
- Corner radius: `rounded-xl` (was `rounded-2xl`)
- Header padding: `px-5 py-3` (tighter)

### Select (Broker Filter)
Replace native `<select>` with shadcn `Select` component everywhere (dashboard broker filter, shipments filter bar). Consistent height `h-9`, same border/radius as inputs.

---

## 6. Shipments Page

**File:** `resources/js/pages/shipments/index.tsx`

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Shipments                    [Search] [Filter ▾] [+ Add] [Export] │
├─────────────────────────────────────────────────────────────┤
│ [All] [Active] [Archived]    (tab strip, underline style)   │
├─────────────────────────────────────────────────────────────┤
│  SR#    Brand   Type   Incoterm  ATA   Broker   Status  Docs │
│  [mono] ...     ...    ...       ...   ...      [badge] n/N  │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  ← Prev   Page N of N   Next →                              │
└─────────────────────────────────────────────────────────────┘
```

### Changes
- Page header: `text-2xl font-bold text-slate-900` (drop `font-black tracking-tighter`)
- "Add Shipment" button: primary blue (`bg-blue-600 hover:bg-blue-700`)
- Export button: outline variant
- `SR#` (shipment reference) column: `font-mono text-sm` (Geist Mono)
- Status column: pill badge from status color system (Section 1)
- Docs column: `n/N` fraction — approved count / total, `font-mono text-xs`
- Filter bar: replace native `<select>` elements with shadcn `Select` components, `h-9`
- Table header: `text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50`
- Row hover: `hover:bg-slate-50`
- Row striping: `even:bg-slate-50/50`

### Modals (Add / Edit / Archive / Restore / Document Dialog)
- `ModalShell`: update to `rounded-xl` (already `rounded-2xl`), header `border-b border-slate-100`
- Submit button: `bg-blue-600 hover:bg-blue-700`
- Destructive actions (archive, delete): `bg-red-600 hover:bg-red-700`
- Form inputs: `h-9 rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500/20`
- Document Dialog: same updates as Section 5

---

## 7. Reports Page

**File:** `resources/js/pages/reports/index.tsx`

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Reports                                                     │
├─────────────────────────────────────────────────────────────┤
│ [FilterBar: Date range | Broker | Incoterm | Apply]         │
├───────────────┬───────────────┬─────────────────────────────┤
│ Completeness  │ Complete vs   │  Document Status            │
│ Over Time     │ Incomplete    │  Distribution               │
│ [line chart]  │ [bar chart]   │  [donut chart]              │
├───────────────┴───────────────┴─────────────────────────────┤
│ Shipment Metrics                                            │
│ [RadialChart] | Completed [n] [bar] | Pending [n] [bar]...  │
├─────────────────────────────────────────────────────────────┤
│ Document Metrics                                            │
│ [RadialChart] | Required [n] | Approved [n] | Pending [n].. │
└─────────────────────────────────────────────────────────────┘
```

### Changes
- Remove `<FileBarChart2>` icon from heading — heading alone is sufficient
- Page title: `text-2xl font-bold text-slate-900` (drop `font-black tracking-tighter`)
- Section headings ("Shipment Metrics", "Document Metrics"): `text-sm font-semibold text-slate-800 mb-3`
- FilterBar: replace any native selects with shadcn `Select`, `h-9` inputs, Apply button = primary blue
- Chart cards: `bg-white rounded-xl border border-slate-200 shadow-sm p-5` (consistent with system)
- Chart titles: `text-sm font-semibold text-slate-800` + `text-xs text-slate-400` subtitle
- Metric cards (`MetricCard`): update to match KPI card style from Section 4 (icon + number + label)
- RadialChart cards: remove `rounded-2xl` → `rounded-xl`, remove hardcoded `bg-white dark:bg-slate-900/40` → use card class
- Chart colors: align with status system — approved = `#16a34a` (green-600), pending = `#d97706` (amber-600), rejected = `#dc2626` (red-600), completed = `#2563eb` (blue-600)

---

## 8. Users Page

**File:** `resources/js/pages/users/index.tsx`

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ User Management                          [+ Add New User]   │
├─────────────────────────────────────────────────────────────┤
│  Name       Email              Roles            Actions     │
│  John Doe   john@example.com   [Admin] [Broker] [Edit Roles]│
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Changes
- Remove `<UsersIcon>` from heading — heading alone sufficient
- Page title: `text-2xl font-bold text-slate-900`
- "Add New User" button: primary blue, `h-9`
- Table header: `text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200`
- Role badge: keep `bg-blue-50 text-blue-700` pattern — already aligned
- "No Roles" badge: `bg-slate-100 text-slate-500` — already aligned
- "Edit Roles" button: outline variant, `h-9`, update `hover:text-blue-600` → keep as-is (already good)
- Add User modal: same `ModalShell` updates (rounded-xl, blue submit)

---

## 9. Roles Page

**File:** `resources/js/pages/roles/index.tsx`

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Role Management                                             │
├─────────────────────────────────────────────────────────────┤
│  Role            Permissions                     Actions    │
│  Admin           [view_all] [manage_users] +3    [Edit]     │
│  Broker          [view_own]                      [Edit]     │
└─────────────────────────────────────────────────────────────┘
```

### Changes
- Remove `<Shield>` icon from heading
- Page title: `text-2xl font-bold text-slate-900`
- Permission badges: `bg-slate-100 text-slate-600 text-xs font-medium rounded-md px-2 py-0.5`
- "Edit" button: outline variant, `h-9`
- Edit Permissions modal (`ModalShell`): permissions grouped by resource with `text-xs font-semibold text-slate-400 uppercase tracking-wider` group label
- Checkboxes: use shadcn `Checkbox` with `accent-blue-600`

---

## 10. Brokers Page

**File:** `resources/js/pages/brokers/index.tsx`

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Broker Management                           [+ Add Broker]  │
├─────────────────────────────────────────────────────────────┤
│  Name         Contact       Email       Phone    Status  Act│
│  Fast Cargo   Jane Doe      j@fc.com    +63...   [Active][⋯]│
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Changes
- Remove `<Truck>` icon from heading
- Page title: `text-2xl font-bold text-slate-900`
- "Add Broker" button: primary blue, `h-9`
- Active status: `bg-green-50 text-green-700` badge (was `CheckCircle` icon alone)
- Inactive status: `bg-slate-100 text-slate-500` badge (was `XCircle` icon alone)
- Action buttons (Edit, Delete): icon-only ghost buttons, `size-8`, `hover:bg-slate-100`
- Delete confirm: destructive modal with red submit button
- Form inputs: `h-9 rounded-lg`, consistent with system

---

## 11. Settings Pages

**Files:** `resources/js/pages/settings/profile.tsx`, `security.tsx`, `appearance.tsx`
**Layout file:** `resources/js/layouts/settings/layout.tsx`

### Settings Shell
```
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                    │
├───────────────┬─────────────────────────────────────────────┤
│ Profile       │  [Content area]                             │
│ Security  ←   │                                             │
│ Appearance    │                                             │
└───────────────┴─────────────────────────────────────────────┘
```
- Settings sub-nav: vertical pill nav, active = `bg-blue-50 text-blue-700 font-semibold`
- Section headings: `text-base font-semibold text-slate-900` + `text-sm text-slate-500` description
- Save button: primary blue, `h-9`
- Inputs: consistent `h-9 rounded-lg border-slate-200` system

### Appearance Page
- Theme toggle cards: update active state border to `border-blue-600 ring-2 ring-blue-500/20`
- Keep light/dark/system options

---

## 12. Auth Pages

**Files:** `resources/js/pages/auth/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`
**Layout file:** `resources/js/layouts/auth/auth-split-layout.tsx`

### Auth Split Layout
- Left panel (`bg-zinc-900`): update to `bg-slate-900` for consistency with blue accent system
- Add subtle diagonal pattern or keep solid — do not add imagery (out of scope)
- Logo + app name on left panel: `text-white font-bold` (unchanged)

### Login / Register Cards
- Form card: `w-[350px] mx-auto` (unchanged)
- Title: `text-xl font-semibold text-slate-900` (was `font-medium` — slightly bolder)
- Input labels: `text-sm font-medium text-slate-700`
- Inputs: `h-9 rounded-lg border-slate-200 focus:ring-2 focus:ring-blue-500/20`
- Submit button: `bg-blue-600 hover:bg-blue-700 h-9 w-full font-medium`
- "Forgot password?" link: `text-blue-600 hover:text-blue-700 text-sm`
- Error messages: `text-red-600 text-xs`
- "Don't have an account?" text: `text-slate-500 text-sm`

---

## 13. Scope Boundaries (Updated)

**In scope — all pages:**
- `resources/css/app.css` — font load (Geist + Geist Mono), color token updates, `--primary` → blue
- `resources/js/components/app-sidebar.tsx` — active states, group labels, remove footer links
- `resources/js/pages/dashboard.tsx` — full layout recompose
- `resources/js/components/dashboard/shipments-table.tsx` — tabs, striping, mono ref, badge status
- `resources/js/pages/shipments/index.tsx` — heading, filter selects, table, modal buttons
- `resources/js/pages/reports/index.tsx` — heading, chart cards, filter bar, chart colors
- `resources/js/pages/users/index.tsx` — heading, table, modal
- `resources/js/pages/roles/index.tsx` — heading, table, permission modal
- `resources/js/pages/brokers/index.tsx` — heading, status badges, action buttons, modal
- `resources/js/pages/settings/*.tsx` — input/button consistency
- `resources/js/layouts/settings/layout.tsx` — sub-nav active state
- `resources/js/layouts/auth/auth-split-layout.tsx` — left panel bg
- `resources/js/pages/auth/login.tsx` + `register.tsx` + `forgot-password.tsx` + `reset-password.tsx` — input/button updates
- `resources/js/components/ui/button.tsx` — variant classes
- `resources/js/components/ui/input.tsx` — height, focus ring
- `resources/js/components/ui/badge.tsx` — status badge variants
- `resources/js/components/reports/metric-card.tsx` — align to KPI card style
- `resources/js/components/shipments/modal-shell.tsx` — radius, header border

**Out of scope:**
- Backend / API changes — none required
- New features / new pages — none
- Logs and FAQs pages — currently stub (`href: '#'`)
- Two-factor auth pages — functional only, no design changes

---

## 14. Success Criteria

1. All pages render without visual regressions in light mode at 1280px+ viewport
2. Dark mode still functional (pixel-perfect parity not required)
3. Geist + Geist Mono load correctly, no FOUT on initial load
4. Dashboard: KPI row, chart row, table row stack cleanly
5. Active sidebar nav state visually distinct from hover state at both full and collapsed widths
6. Status badges consistent across all pages using Section 1 color table
7. All interactive elements (buttons, inputs, selects) meet `h-9` height
8. `font-mono` applied to shipment refs and doc codes on all pages
9. All native `<select>` elements replaced with shadcn `Select` on all pages
10. Auth pages: login and register use blue primary button, `h-9` inputs
