---
title: View Shipment Modal — Component Spec
date: 2026-06-27
status: current
---

# View Shipment Modal (`DocumentDialog`)

**File:** `resources/js/components/shipments/document-dialog.tsx`

---

## Overview

Full-screen overlay modal for reviewing and managing documents attached to a shipment. Two-panel layout: document list (left) + PDF preview with status controls (right).

Triggered by clicking **"View"** in the Documents column of the shipments table (`shipments-table.tsx:343-354`).

---

## Data

### Props

| Prop | Type | Description |
|---|---|---|
| `activeShipment` | `Shipment` | Full shipment object including `documents[]` array |
| `selectedDocId` | `number \| null` | Currently selected document's `shipment_doc_id` |
| `setSelectedDocId` | `(id: number \| null) => void` | Callback to change selection |
| `closePanel` | `() => void` | Closes modal, resets `activeDocPanel` + `selectedDocId` |
| `handleStatusUpdate` | `(shipmentDocId, statusId) => void` | POSTs to `/shipments/documents/{id}/status` |

### Key Types

**`Shipment`** (from `pages/shipments/types.ts:56`)
- `shipment_id`, `shipment_reference`, `brand`, `incoterm`
- `actual_time_of_arrival: string | null`
- `broker: Broker | null`
- `brand_manager`, `created_at`, `archived_at`
- `status: ShipmentStatus`
- `shipment_type: ShipmentType`
- `documents: ShipmentDocument[]`

**`ShipmentDocument`** (from `pages/shipments/types.ts:18`)
- `shipment_doc_id: number`
- `shipment_id: number`
- `custom_doc_id: number`
- `file_path: string | null` — null = no PDF uploaded
- `file_name: string | null` — original filename
- `custom_doc: { custom_doc_id, doc_name, doc_full_name }` — document type definition
- `current_status: { status: { status_id, status_name } } | null`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Backdrop: slate-950/20, blur                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 850×600px modal, rounded-2xl, white/90                      │ │
│  │ ┌──────────────┬──────────────────────────────────────────┐ │ │
│  │ │  LEFT PANEL  │           RIGHT PANEL                    │ │ │
│  │ │   w-64       │           flex-1                         │ │ │
│  │ │              │                                          │ │ │
│  │ │  [Header]    │  [Header: doc name + Upload button]      │ │ │
│  │ │  ─────────   │  ──────────────────────────────────────  │ │ │
│  │ │  [Doc list]  │  [PDF iframe OR empty state]             │ │ │
│  │ │  (scrollable)│                                          │ │ │
│  │ │  ─────────   │  ──────────────────────────────────────  │ │ │
│  │ │  [Close btn] │  [Status + Approve/Reject buttons]       │ │ │
│  │ └──────────────┴──────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Clicking the backdrop closes the modal. Clicking inside the modal stops propagation.

---

## Left Panel (Document List)

### Header
- Label: `"DOCUMENTS"` — `text-xs font-black tracking-tighter`
- Subtext: `activeShipment.brand` — `text-[9px] font-bold text-slate-400 uppercase truncate`
- **X button** (top-right): closes modal

### Document List
Scrollable `<ul>` of all `activeShipment.documents`.

Each list item shows:
- **`DocStatusIndicator`** — icon reflecting current status (green check, red X, grey circle)
- **`doc.custom_doc.doc_full_name`** — full document type name, `text-[10px] font-bold truncate`
- **`doc.file_name`** — original filename if uploaded, `text-[9px] text-slate-400 truncate` (hidden if null)

**Selection state:**
- Selected: `bg-white shadow-sm border border-slate-200/60`
- Unselected hover: `hover:bg-white/50`

Clicking any item calls `setSelectedDocId(doc.shipment_doc_id)`.

### Footer
- **"Close" button** — full-width, `bg-slate-900 text-white`, calls `closePanel`

---

## Right Panel (Preview)

### States

#### No document selected
- Shows `FileText` icon + `"SELECT A DOCUMENT"` placeholder text (centered, `text-slate-300`)

#### Document selected, no PDF uploaded
- Header: doc full name + **"Upload PDF"** button
- Content: `FileText` icon + `"NO PDF UPLOADED YET"` + blue **"Upload PDF"** button
- Footer: status label + Approve/Reject buttons

#### Document selected, PDF uploaded
- Header: doc full name + **"Replace PDF"** button
- Content: `<iframe src="/shipments/documents/{id}/file">` — inline PDF viewer, full width/height
- Footer: status label + Approve/Reject buttons

---

## Right Panel — Sections

### Header (always shown when doc selected)
- **Doc name:** `text-sm font-black`
- **Upload/Replace PDF button:** `border border-blue-500 text-blue-600 hover:bg-blue-50`, shows `<Upload>` icon
  - Label: `"Upload PDF"` if `file_path` is null, `"Replace PDF"` if file exists
  - Triggers hidden `<input type="file" accept="application/pdf">`, uploads via Inertia `router.post` to `/shipments/documents/{id}/upload`

### Content Area
- PDF iframe: `src="/shipments/documents/{shipment_doc_id}/file"`
- Empty states: centered icon + text, optional upload CTA

### Footer (shown when doc selected)
- **Current status label:** `text-[10px] font-bold text-slate-400`
  - Status name colored: green-600 (Approved), red-500 (Rejected), blue-500 (other/pending)
  - "No status" if `current_status` is null
- **Approve button:** `border border-green-500 text-green-600`, disabled + 40% opacity when already Approved → calls `handleStatusUpdate(id, 1)`
- **Reject button:** `border border-red-500 text-red-600`, disabled + 40% opacity when already Rejected → calls `handleStatusUpdate(id, 3)`

---

## Status Logic

| Condition | `status_id` | Display |
|---|---|---|
| Approved | `1` | `text-green-600`, Approve button disabled |
| Rejected | `3` | `text-red-500`, Reject button disabled |
| Pending / other | any other | `text-blue-500`, both buttons enabled |

Helpers: `isApproved(doc)` and `isRejected(doc)` from `pages/shipments/helpers.ts`.

---

## File Upload Flow

1. User clicks "Upload PDF" or "Replace PDF"
2. Hidden `<input ref={fileInputRef}>` is `.click()`-ed
3. User picks a `.pdf` file
4. `handleUpload` fires: wraps in `FormData`, POSTs to `/shipments/documents/{shipment_doc_id}/upload`
5. Inertia `preserveScroll: true` — page refreshes in-place, modal stays open if `activeDocPanel` persists

---

## Design Notes (Current State)

- Modal: `h-[600px] w-[850px] rounded-2xl`
- Backdrop: `backdrop-blur-xl` on modal itself, `backdrop-blur-sm` on overlay
- Left panel bg: `bg-slate-50/30`
- Right panel content bg: `bg-slate-50/50`
- Footer bg: `bg-slate-50`

### Design Overhaul Changes (per `2026-06-27-design-overhaul-design.md` §5)
- `rounded-2xl` → `rounded-xl`
- Remove `backdrop-blur-xl` (GPU cost)
- Doc list active: `bg-blue-50 border-l-2 border-blue-600`
- Doc list hover: `hover:bg-slate-50`
- Close button label: "Close" (already correct)
- Header padding: `px-5 py-3` (tighter)

---

## Related Files

| File | Role |
|---|---|
| [document-dialog.tsx](resources/js/components/shipments/document-dialog.tsx) | Modal component |
| [doc-status-indicator.tsx](resources/js/components/shipments/doc-status-indicator.tsx) | Status icon (check/X/circle) |
| [shipments-table.tsx](resources/js/components/shipments/shipments-table.tsx) | Trigger: "View" button (line 343) |
| [shipments/index.tsx](resources/js/pages/shipments/index.tsx) | State owner: `activeDocPanel`, `selectedDocId`, handlers |
| [shipments/types.ts](resources/js/pages/shipments/types.ts) | `Shipment`, `ShipmentDocument` types |
| [shipments/helpers.ts](resources/js/pages/shipments/helpers.ts) | `isApproved`, `isRejected` |
