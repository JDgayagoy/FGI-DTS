# FGI-DTS UI Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current near-monochrome UI with a Modern SaaS design — blue accent, Geist + Geist Mono fonts, consistent component system, and a fully recomposed dashboard.

**Architecture:** Token-first approach — update `--primary` in `app.css` to blue-600 oklch so all shadcn components (button, badge, input focus ring) inherit the new accent automatically. Then update component variants, page layouts, and content in task order.

**Tech Stack:** React, TypeScript, Tailwind v4, shadcn/ui (CVA), Inertia.js, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`

## Global Constraints

- Tailwind v4 — all color tokens live in `app.css` `@theme` block, NOT in `tailwind.config.js`
- shadcn/ui components use CVA (`cva`) from `class-variance-authority`
- TypeScript check command: `npm run types:check`
- Build command: `npm run build`
- Dev server: `npm run dev` (Vite) + `php artisan serve` (separate terminal)
- Target viewport: 1280px+ (desktop-first, responsive not in scope)
- No backend changes in this plan
- Dark mode: keep functional, pixel-perfect parity not required

---

### Task 1: Foundation — Fonts + Color Tokens

**Files:**
- Modify: `resources/css/app.css`

**Interfaces:**
- Produces: `--primary` = blue-600 oklch, `--ring` = blue-500 oklch, `--font-sans` = Geist Variable, `--font-mono` = Geist Mono Variable — consumed by all subsequent tasks

- [ ] **Step 1: Install font packages**

```bash
npm install @fontsource-variable/geist @fontsource-variable/geist-mono
```

Expected output: packages added to `node_modules/`, `package.json` updated.

- [ ] **Step 2: Add font imports and update `@theme` block in `app.css`**

Replace the top of `resources/css/app.css` with:

```css
@import '@fontsource-variable/geist';
@import '@fontsource-variable/geist-mono';

@import 'tailwindcss';
@import 'tw-animate-css';

@source '../views';
@source '../../vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php';

@custom-variant dark (&:is(.dark *));

@theme {
    --font-sans:
        'Geist Variable', ui-sans-serif, system-ui, sans-serif,
        'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
        'Noto Color Emoji';

    --font-mono:
        'Geist Mono Variable', ui-monospace, 'Cascadia Code', 'Source Code Pro',
        Menlo, Consolas, 'DejaVu Sans Mono', monospace;

    --radius-lg: var(--radius);
    --radius-md: calc(var(--radius) - 2px);
    --radius-sm: calc(var(--radius) - 4px);

    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --color-sidebar: var(--sidebar);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-ring: var(--sidebar-ring);

    @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    --animate-spin-slow: spin-slow 3s linear infinite;
}
```

- [ ] **Step 3: Update `:root` color tokens — set primary to blue-600**

Replace the `:root` block in `resources/css/app.css`:

```css
:root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.546 0.245 264.052);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.623 0.214 259.815);
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.704);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
    --radius: 0.625rem;
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.546 0.245 264.052);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.623 0.214 259.815);
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run types:check
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify font loads**

```bash
npm run dev
```

Open browser → any page → DevTools → Computed styles on `<body>` → `font-family` should show `Geist Variable`. Primary buttons should now be blue.

- [ ] **Step 6: Commit**

```bash
git add resources/css/app.css package.json package-lock.json
git commit -m "feat: switch to Geist fonts and blue-600 primary token"
```

---

### Task 2: Core UI Primitives — Button, Input, Badge

**Files:**
- Modify: `resources/js/components/ui/button.tsx`
- Modify: `resources/js/components/ui/input.tsx`
- Modify: `resources/js/components/ui/badge.tsx`

**Interfaces:**
- Consumes: `--primary` = blue-600 (Task 1)
- Produces: `Button` with `rounded-lg` base, `Input` with `rounded-lg` + blue focus ring, `Badge` with `success/warning/danger/muted` variants

- [ ] **Step 1: Update `button.tsx` — change base radius to `rounded-lg`**

Replace the entire file `resources/js/components/ui/button.tsx`:

```tsx
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 2: Update `input.tsx` — change to `rounded-lg` and blue focus ring**

Replace the entire file `resources/js/components/ui/input.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

- [ ] **Step 3: Update `badge.tsx` — add status variants**

Replace the entire file `resources/js/components/ui/badge.tsx`:

```tsx
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border-0 px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90",
        outline:
          "border border-input text-foreground [a&]:hover:bg-accent",
        success:
          "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        warning:
          "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        danger:
          "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        muted:
          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run types:check
```

Expected: no errors. If any component passes an old variant string (e.g. `variant="destructive"` on a Badge where it was removed) — fix those call sites.

- [ ] **Step 5: Commit**

```bash
git add resources/js/components/ui/button.tsx resources/js/components/ui/input.tsx resources/js/components/ui/badge.tsx
git commit -m "feat: update button/input/badge primitives for design system"
```

---

### Task 3: Sidebar Navigation

**Files:**
- Modify: `resources/js/components/app-sidebar.tsx`
- Modify: `resources/js/components/nav-main.tsx`

**Interfaces:**
- Consumes: blue-600 primary token (Task 1)
- Produces: sidebar with `border-l-2 border-blue-600 bg-blue-50` active state, Management group label, no footer links

- [ ] **Step 1: Read `nav-main.tsx` to understand current active state rendering**

```bash
cat resources/js/components/nav-main.tsx
```

Note the class applied when item is active (look for `isActive`, `data-active`, or similar).

- [ ] **Step 2: Update `app-sidebar.tsx` — remove footer links, add group label styling**

Replace the entire file `resources/js/components/app-sidebar.tsx`:

```tsx
import { Link } from '@inertiajs/react';
import {
    BarChart3,
    HelpCircle,
    LayoutGrid,
    List,
    Package,
    Shield,
    Truck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';
import { usePage } from '@inertiajs/react';

const mainNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Shipments', href: '/shipments', icon: Package },
    { title: 'Reports', href: '/reports', icon: BarChart3 },
    { title: 'Logs', href: '#', icon: List },
    { title: 'FAQs', href: '#', icon: HelpCircle },
];

export function AppSidebar() {
    const { userPermissions } = usePage().props;
    const hasPermissionName = (name: string) =>
        userPermissions?.includes(name) ?? false;

    const filteredMainItems = mainNavItems.filter((item) => {
        if (item.title === 'Shipments') return hasPermissionName('view_all_shipments');
        if (item.title === 'Reports') return hasPermissionName('view_all_shipments');
        return true;
    });

    const managementItems: NavItem[] = [
        ...(hasPermissionName('manage_users')
            ? [{ title: 'User Management', href: '/users', icon: Users }]
            : []),
        ...(hasPermissionName('manage_roles')
            ? [{ title: 'Role Management', href: '/roles', icon: Shield }]
            : []),
        ...(hasPermissionName('add_brokers') ||
        hasPermissionName('edit_brokers') ||
        hasPermissionName('delete_brokers')
            ? [{ title: 'Broker Management', href: '/brokers', icon: Truck }]
            : []),
    ];

    const navItems = [
        ...filteredMainItems,
        ...(managementItems.length > 0
            ? [{ title: 'Management', icon: BarChart3, items: managementItems }]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
```

- [ ] **Step 3: Update active state styling in `nav-main.tsx`**

Open `resources/js/components/nav-main.tsx`. Find where `isActive` state is applied to nav items. Replace the active class (typically something like `bg-sidebar-accent` or `data-[active=true]:bg-sidebar-accent`) with:

```
data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-blue-600
```

And inactive hover:
```
hover:bg-slate-100 text-slate-600
```

For collapsed/icon mode, active icon color: `data-[active=true]:text-blue-600`.

- [ ] **Step 4: Run TypeScript check**

```bash
npm run types:check
```

Expected: no errors.

- [ ] **Step 5: Verify in browser**

Navigate to Dashboard — sidebar Dashboard item should show blue left border + blue-50 background. Shipments item when active should match. Management section label should appear above the group.

- [ ] **Step 6: Commit**

```bash
git add resources/js/components/app-sidebar.tsx resources/js/components/nav-main.tsx
git commit -m "feat: update sidebar active states and remove footer nav links"
```

---

### Task 4: Dashboard Layout Recompose

**Files:**
- Modify: `resources/js/pages/dashboard.tsx`
- Modify: `resources/js/components/dashboard/shipments-table.tsx`

**Interfaces:**
- Consumes: `Badge` variants `success/warning/danger/muted` (Task 2), `Button` rounded-lg (Task 2)
- Produces: 4-row dashboard layout (header → KPI strip → charts → table), tabs underline style, mono refs

- [ ] **Step 1: Rewrite `dashboard.tsx` layout — rows 1 and 2 (header + KPI cards)**

Replace the `return (...)` JSX in `resources/js/pages/dashboard.tsx` with the new layout. Keep all existing state/logic above the return unchanged. The KPI cards use icons from lucide already imported (`Ship`, `FileText`); add `CheckCircle`, `AlertCircle`, `XCircle` to the import.

Update the import line:
```tsx
import {
    Search, Download, Ship, FileText, X, Printer,
    CheckCircle, AlertCircle, XCircle, FolderOpen,
} from 'lucide-react';
```

Replace the entire `return (` block with:

```tsx
return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#030712] p-6 gap-6 font-sans text-slate-900 dark:text-slate-100">
        <Head title="Dashboard" />

        {/* Row 1 — Page Header */}
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <div className="flex items-center gap-2">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                        className="pl-9 h-9"
                        placeholder="Search Reference..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <DatePickerWithRange onRangeChange={setDateRange} />
                <select
                    value={activeFilters.brokerId ?? ''}
                    onChange={handleBrokerChange}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                >
                    <option value="">All Brokers</option>
                    {brokers.map((b) => (
                        <option key={b.broker_id} value={String(b.broker_id)}>
                            {b.broker_name}
                        </option>
                    ))}
                </select>
                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => exportDashboardCSV(filteredForTable)}>
                    <Download className="size-3.5" /> Export
                </Button>
            </div>
        </div>

        {/* Row 2 — KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
            {[
                { label: 'Total Documents', value: metrics.totalDocs, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
                { label: 'Active Shipments', value: metrics.activeShipments, icon: Ship, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                { label: 'Uploaded Docs', value: metrics.uploadedDocs, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
                { label: 'Invalid Docs', value: metrics.rejectedDocs, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
                { label: 'Missing Docs', value: metrics.missingDocs, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <div className={cn('size-9 rounded-lg flex items-center justify-center mb-3', bg)}>
                        <Icon className={cn('size-5', color)} />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none mb-1">{value}</p>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                </div>
            ))}
        </div>

        {/* Row 3 — Charts */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Doc Completion Rate</p>
                <p className="text-xs text-slate-400 mb-4">Percentage of shipments with all documents submitted</p>
                <CompletionChart />
            </div>
            <div className="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Document Accuracy</p>
                <p className="text-xs text-slate-400 mb-4">Breakdown of document statuses across all shipments</p>
                <AccuracyChart data={stats} />
            </div>
        </div>

        {/* Row 4 — Shipments Table */}
        <ShipmentsTable
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            paginatedShipments={paginatedForTable}
            filteredShipments={filteredForTable}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            columns={columns}
            setActiveShipmentIndex={setActiveShipmentIndex}
            setSelectedDocKey={setSelectedDocKey}
        />

        {/* Document Dialog */}
        {activeShipmentIndex !== null && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20"
                onClick={() => setActiveShipmentIndex(null)}
            >
                <div
                    className="flex h-[600px] w-[850px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex w-64 flex-shrink-0 flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3">
                            <div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">Documents</p>
                                <p className="text-[9px] font-medium text-slate-400 truncate max-w-[140px]">
                                    {filteredShipments[activeShipmentIndex]?.ref}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="size-7 text-slate-400" onClick={() => setActiveShipmentIndex(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <ul className="flex flex-col gap-1 overflow-y-auto p-3 flex-1">
                            {Object.entries(filteredShipments[activeShipmentIndex]?.docs || {}).map(([key, docInfo]) => {
                                const isSelected = selectedDocKey === key;
                                const info = docInfo as DocInfo;
                                return (
                                    <li
                                        key={key}
                                        onClick={() => setSelectedDocKey(key)}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-slate-800 border-l-2 border-blue-600'
                                                : 'hover:bg-slate-50'
                                        )}
                                    >
                                        <StatusIcon type={info.status} />
                                        <div className="flex flex-col min-w-0">
                                            <span className={cn('text-[10px] font-medium truncate', isSelected ? 'text-blue-700 dark:text-white' : 'text-slate-500')}>
                                                {info.doc_full_name}
                                            </span>
                                            {info.file_name && (
                                                <span className="text-[9px] text-slate-400 truncate">{info.file_name}</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3">
                            <Button onClick={() => setActiveShipmentIndex(null)} className="w-full h-9 text-sm font-medium">
                                Close
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col bg-white dark:bg-slate-950">
                        <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {selectedDocKey
                                        ? (filteredShipments[activeShipmentIndex]?.docs[selectedDocKey] as DocInfo)?.doc_full_name
                                        : 'Preview Portal'}
                                </h3>
                                <p className="text-xs text-slate-400">Digital Document Verification</p>
                            </div>
                            {selectedDocKey && (filteredShipments[activeShipmentIndex]?.docs[selectedDocKey] as DocInfo)?.file_path && (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                                    <Printer className="size-3" /> Print
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
                            {selectedDocKey ? (() => {
                                const docInfo = filteredShipments[activeShipmentIndex]?.docs[selectedDocKey] as DocInfo;
                                if (docInfo?.file_path && docInfo?.shipment_doc_id) {
                                    return (
                                        <iframe
                                            src={`/shipments/documents/${docInfo.shipment_doc_id}/file`}
                                            className="w-full h-full"
                                            title={docInfo.doc_full_name}
                                        />
                                    );
                                }
                                return (
                                    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                                        <FileText className="size-10" />
                                        <p className="text-xs font-medium text-slate-400">No PDF uploaded yet</p>
                                    </div>
                                );
                            })() : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                                    <FileText className="size-10" />
                                    <p className="text-xs font-medium text-slate-400">Select a document to preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
);
```

- [ ] **Step 2: Update `shipments-table.tsx` in dashboard — tabs + mono ref + striping**

Open `resources/js/components/dashboard/shipments-table.tsx`. Make these targeted changes:

1. **Tab buttons** — find the tab strip (buttons for All/Completed/In Progress/Pending/Incomplete). Replace active tab class with:
   - Active: `border-b-2 border-blue-600 text-blue-600 font-semibold`
   - Inactive: `text-slate-500 hover:text-slate-700 border-b-2 border-transparent`
   - Wrapper: `flex border-b border-slate-200 gap-1 mb-0`

2. **Table header** — replace header `<th>` class with:
   `px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200`

3. **Table rows** — replace row `<tr>` class with:
   `border-b border-slate-100 hover:bg-slate-50 even:bg-slate-50/50 transition-colors`

4. **Ref column** (`ref` field) — wrap ref text in:
   `<span className="font-mono text-sm text-slate-800">{shipment.ref}</span>`

- [ ] **Step 3: Run TypeScript check**

```bash
npm run types:check
```

Expected: no errors.

- [ ] **Step 4: Verify dashboard in browser**

- KPI strip: 5 equal cards with colored icons
- Charts: 2 equal-width white cards side by side
- Table: underline-style tabs, mono refs, zebra striping

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/dashboard.tsx resources/js/components/dashboard/shipments-table.tsx
git commit -m "feat: recompose dashboard layout — KPI strip, chart row, table row"
```

---

### Task 5: Shipments Page + Modal Shell

**Files:**
- Modify: `resources/js/components/shipments/modal-shell.tsx`
- Modify: `resources/js/pages/shipments/index.tsx`
- Modify: `resources/js/components/shipments/shipments-table.tsx`

**Interfaces:**
- Consumes: `Badge` status variants (Task 2), `Button/Input` primitives (Task 2)
- Produces: updated headings, table styles, modal shell, mono refs

- [ ] **Step 1: Update `modal-shell.tsx` — typography cleanup**

Replace the entire file `resources/js/components/shipments/modal-shell.tsx`:

```tsx
import { X } from 'lucide-react';
import { type ReactNode } from 'react';

interface ModalShellProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    onSubmit: () => void;
    submitLabel: string;
    children: ReactNode;
    loading?: boolean;
    destructive?: boolean;
}

export const ModalShell = ({
    title,
    subtitle,
    onClose,
    onSubmit,
    submitLabel,
    children,
    loading = false,
    destructive = false,
}: ModalShellProps) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20"
        onClick={onClose}
    >
        <div
            className="w-[520px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                    {subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                    )}
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {children}

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50 dark:bg-slate-900/40">
                <button
                    onClick={onClose}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 h-9 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSubmit}
                    disabled={loading}
                    className={`rounded-lg px-4 h-9 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        destructive
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {loading ? 'Processing...' : submitLabel}
                </button>
            </div>
        </div>
    </div>
);
```

- [ ] **Step 2: Update shipments page heading + Add Shipment button**

In `resources/js/pages/shipments/index.tsx`, find the page heading section and update:

```tsx
// Find this pattern (the page header div):
<div className="mb-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-slate-400" />
        <h1 ...>Shipments</h1>
    </div>
```

Replace with:
```tsx
<div className="mb-6 flex items-center justify-between">
    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Shipments</h1>
    <div className="flex items-center gap-2">
```

Remove the `<Package>` icon import if it becomes unused after this change.

- [ ] **Step 3: Update shipments table — heading, mono ref, status badge, striping**

In `resources/js/components/shipments/shipments-table.tsx`:

1. **Table header `<th>`**:
   `className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200"`

2. **Table row `<tr>`**:
   `className="border-b border-slate-100 hover:bg-slate-50 even:bg-slate-50/50 transition-colors"`

3. **Shipment reference cell** — wrap in mono span:
   `<span className="font-mono text-sm text-slate-800 dark:text-slate-200">{shipment.shipment_reference}</span>`

4. **Status badge** — replace any raw status text/icon with `<Badge>` from `@/components/ui/badge`:
   ```tsx
   import { Badge } from '@/components/ui/badge';

   // Map status to variant:
   const statusVariant = {
       'completed': 'success',
       'warning': 'warning',
       'pending': 'warning',
       'error': 'danger',
       'archived': 'muted',
   } as const;

   // In JSX:
   <Badge variant={statusVariant[shipment.status] ?? 'muted'}>
       {shipment.status}
   </Badge>
   ```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run types:check
```

Fix any type errors (especially if `destructive` prop is new on `ModalShell` — find all `<ModalShell>` usages and add `destructive` where needed for archive/delete flows).

- [ ] **Step 5: Commit**

```bash
git add resources/js/components/shipments/modal-shell.tsx resources/js/pages/shipments/index.tsx resources/js/components/shipments/shipments-table.tsx
git commit -m "feat: update shipments page, modal shell, and table styles"
```

---

### Task 6: Reports Page

**Files:**
- Modify: `resources/js/pages/reports/index.tsx`
- Modify: `resources/js/components/reports/metric-card.tsx`
- Modify: `resources/js/components/reports/filter-bar.tsx`

**Interfaces:**
- Consumes: card class pattern `bg-white rounded-xl border border-slate-200 shadow-sm`
- Produces: consistent chart cards, updated metric cards, blue filter apply button

- [ ] **Step 1: Update `reports/index.tsx` — heading + chart card classes**

In `resources/js/pages/reports/index.tsx`:

1. Replace the heading section:
```tsx
// Remove:
<div className="flex items-center gap-3">
    <FileBarChart2 className="h-6 w-6 text-slate-400" />
    <h1 className="text-2xl font-black tracking-tighter text-slate-800 ...">Reports</h1>
</div>

// Replace with:
<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
```

2. Chart grid wrapper: keep `grid grid-cols-3 gap-4`.

3. Section headings (Shipment Metrics, Document Metrics):
```tsx
// Find: className="text-base font-black tracking-tight ..."
// Replace with:
className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3"
```

4. RadialChart card container — replace `rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-sm`:
```tsx
className="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm px-6 py-4"
```

5. Update chart color constants to align with status system:
```tsx
const shipmentChartConfig = {
    completed: { label: "Completed", color: "#2563eb" },  // blue-600
    pending: { label: "Pending", color: "#d97706" },       // amber-600
    processing: { label: "Processing", color: "#a855f7" },
};

const documentChartConfig = {
    approved: { label: "Approved", color: "#16a34a" },    // green-600
    pending: { label: "Pending", color: "#d97706" },       // amber-600
    rejected: { label: "Rejected", color: "#dc2626" },    // red-600
};
```

- [ ] **Step 2: Update `metric-card.tsx` — align to KPI card style**

Read the current `resources/js/components/reports/metric-card.tsx`, then update its card wrapper class to:
```
bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5
```

Value: `text-2xl font-bold text-slate-900 dark:text-white`
Label: `text-sm font-medium text-slate-500`

- [ ] **Step 3: Update `filter-bar.tsx` — Apply button to primary blue**

In `resources/js/components/reports/filter-bar.tsx`, find the Apply/Filter submit button and ensure it uses `<Button>` (primary variant, no extra classes needed since primary is now blue).

- [ ] **Step 4: Run TypeScript check**

```bash
npm run types:check
```

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/reports/index.tsx resources/js/components/reports/metric-card.tsx resources/js/components/reports/filter-bar.tsx
git commit -m "feat: update reports page — headings, chart cards, chart colors"
```

---

### Task 7: Management Pages — Users, Roles, Brokers

**Files:**
- Modify: `resources/js/pages/users/index.tsx`
- Modify: `resources/js/pages/roles/index.tsx`
- Modify: `resources/js/pages/brokers/index.tsx`

**Interfaces:**
- Consumes: `Badge` status variants (Task 2), `Button` primary blue (Task 2), `ModalShell` (Task 5)
- Produces: consistent heading, table, badge, and modal styles across management pages

- [ ] **Step 1: Update `users/index.tsx`**

1. Replace heading:
```tsx
// Remove UsersIcon from import and the icon from JSX
<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h1>
```

2. Table header `<th>`:
```tsx
className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200"
```

3. Table row `<tr>`:
```tsx
className="border-b border-slate-100 hover:bg-slate-50 even:bg-slate-50/50 transition-colors last:border-0"
```

4. "Add New User" button — already uses `bg-blue-600` inline; switch to just `<Button>` (primary variant):
```tsx
<Button onClick={() => setIsCreating(true)} className="gap-2">
    <UserPlus className="size-4" /> Add New User
</Button>
```

5. "Edit Roles" button — update height to `h-9`:
```tsx
<Button variant="outline" size="default" onClick={() => openEditModal(user)} className="gap-1.5 text-xs">
    <Edit2 className="size-3" /> Edit Roles
</Button>
```

- [ ] **Step 2: Update `roles/index.tsx`**

1. Replace heading — remove `<Shield>` icon:
```tsx
<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Role Management</h1>
```

2. Table header/row — same pattern as Users (Step 1 above).

3. Permission badges — update to use `<Badge variant="muted">`:
```tsx
import { Badge } from '@/components/ui/badge';

// Replace existing badge spans with:
<Badge variant="muted">{permission.name}</Badge>
```

4. "Edit" button:
```tsx
<Button variant="outline" size="default" onClick={() => openEditModal(role)} className="gap-1.5 text-xs">
    <Edit2 className="size-3" /> Edit
</Button>
```

- [ ] **Step 3: Update `brokers/index.tsx`**

1. Replace heading — remove `<Truck>` icon:
```tsx
<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Broker Management</h1>
```

2. "Add Broker" button — use primary `<Button>`:
```tsx
<Button onClick={openCreateModal} className="gap-2">
    <Plus className="size-4" /> Add Broker
</Button>
```

3. Status column — replace `<CheckCircle>`/`<XCircle>` icons with `<Badge>`:
```tsx
import { Badge } from '@/components/ui/badge';

// Active:
<Badge variant="success">Active</Badge>

// Inactive:
<Badge variant="muted">Inactive</Badge>
```

4. Action buttons (Edit, Delete) — replace with icon-only ghost buttons:
```tsx
<div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-slate-700" onClick={() => openEditModal(broker)}>
        <Edit2 className="size-4" />
    </Button>
    <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-red-600" onClick={() => setDeletingBroker(broker)}>
        <Trash2 className="size-4" />
    </Button>
</div>
```

5. Delete confirm modal — pass `destructive` prop to `ModalShell`:
```tsx
<ModalShell
    title="Delete Broker"
    subtitle="This action cannot be undone."
    onClose={() => setDeletingBroker(null)}
    onSubmit={handleDelete}
    submitLabel="Delete"
    destructive
    loading={processing}
>
```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run types:check
```

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/users/index.tsx resources/js/pages/roles/index.tsx resources/js/pages/brokers/index.tsx
git commit -m "feat: update management pages — headings, tables, badges, buttons"
```

---

### Task 8: Settings + Auth Pages

**Files:**
- Modify: `resources/js/layouts/settings/layout.tsx`
- Modify: `resources/js/layouts/auth/auth-split-layout.tsx`
- Modify: `resources/js/pages/auth/login.tsx`
- Modify: `resources/js/pages/auth/register.tsx`
- Modify: `resources/js/pages/auth/forgot-password.tsx`
- Modify: `resources/js/pages/auth/reset-password.tsx`
- Modify: `resources/js/components/appearance-tabs.tsx`

**Interfaces:**
- Consumes: `Button` primary blue (Task 2), `Input` rounded-lg (Task 2)
- Produces: blue active state in settings nav, blue auth submit buttons, consistent form inputs

- [ ] **Step 1: Update `settings/layout.tsx` — active nav state to blue**

Replace the active class on the nav button from `'bg-muted'` to blue:

```tsx
className={cn('w-full justify-start', {
    'bg-blue-50 text-blue-700 font-semibold': isCurrentOrParentUrl(item.href),
    'text-slate-600 hover:bg-slate-100': !isCurrentOrParentUrl(item.href),
})}
```

- [ ] **Step 2: Update `auth-split-layout.tsx` — left panel bg**

Replace `bg-zinc-900` with `bg-slate-900`:

```tsx
// Find:
<div className="absolute inset-0 bg-zinc-900" />
// Replace with:
<div className="absolute inset-0 bg-slate-900" />
```

- [ ] **Step 3: Update auth pages — title font weight + input/button consistency**

In each of `login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`:

The login layout title/description is set via `Login.layout = { title: '...', description: '...' }` — these render in the auth layout. The inputs and buttons already use the shadcn components, which now get the updated styles automatically from Tasks 1–2. Verify visually.

For `login.tsx` specifically, ensure the submit `<Button>` has no conflicting inline classes:
```tsx
<Button type="submit" className="w-full" tabIndex={4} disabled={processing}>
    {processing && <Spinner />}
    Log in
</Button>
```

- [ ] **Step 4: Update `appearance-tabs.tsx` — active card border to blue**

In `resources/js/components/appearance-tabs.tsx`, find the active theme option's border/ring class and replace with:
```
border-blue-600 ring-2 ring-blue-500/20
```

- [ ] **Step 5: Final build check**

```bash
npm run types:check && npm run build
```

Expected: no TypeScript errors, clean Vite build output.

- [ ] **Step 6: Visual regression check**

Visit each page and confirm:
- [ ] Dashboard: KPI strip, 2-col charts, table with tabs
- [ ] Shipments: heading no icon, mono refs, blue Add button
- [ ] Reports: heading no icon, consistent chart cards
- [ ] Users/Roles/Brokers: heading no icon, status badges, ghost action icons
- [ ] Settings: active nav item is blue-50 bg + blue-700 text
- [ ] Login page: blue submit button, inputs have blue focus ring

- [ ] **Step 7: Commit**

```bash
git add resources/js/layouts/settings/layout.tsx resources/js/layouts/auth/auth-split-layout.tsx resources/js/pages/auth/ resources/js/components/appearance-tabs.tsx
git commit -m "feat: update settings and auth pages for design system"
```
