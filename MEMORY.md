# FGI-DTS PROJECT MEMORY

**Project:** Freight and Logistics Document Tracking System (FGI-DTS)  
**Last Updated:** 2026-07-03  
**Status:** 🟢 Active Development - Local Environment  

---

## 1. PROJECT OVERVIEW & CORE PURPOSE

### What is this project?
**FGI-DTS (Freight and Logistics Document Tracking System)** is a comprehensive freight and logistics management dashboard designed to track shipments, manage customs/shipping documentation, and oversee broker interactions. The system provides internal logistics personnel, freight forwarders, and customs brokers with a centralized platform to actively manage, verify, and track digital shipment documents and operational metrics in real-time.

### Core Tech Stack
- **Backend:** PHP 8.4, Laravel 13, Laravel Fortify (v1), Laravel Wayfinder (v0)
- **Frontend:** React 19, Inertia.js v3, TailwindCSS v4, Vite
- **Database:** MySQL (local dev: 127.0.0.1:3306), production-ready
- **Testing:** Pest v4 (PHP)
- **Code Quality:** Laravel Pint v1 (PHP formatting), ESLint v9 (JS linting), Prettier v3 (JS formatting), TypeScript (strict)
- **UI Components:** Radix UI (headless components), Recharts (charting), Lucide React (icons)

### Main Target Audience & Use Case
- **Internal logistics personnel** - Daily shipment operations and metrics management
- **Freight forwarders** - Shipment documentation and carrier coordination
- **Customs brokers** - Document verification and clearance workflows
- **Core use cases:** Real-time shipment tracking, document verification/approval, broker management, user/role admin, metrics reporting

---

## 2. CURRENT ARCHITECTURE & STATE

### High-Level Directory Structure
```
FGI-DTS/
├── app/Http/Controllers/          # 10 controllers total
│   ├── DashboardController
│   ├── ShipmentController
│   ├── BrokerController
│   ├── UserManagementController
│   ├── RoleManagementController
│   ├── ReportsController
│   ├── LogController
│   ├── DocumentManagementController
│   └── Settings/
│       ├── ProfileController
│       └── SecurityController
├── app/Models/                     # 14 Eloquent models
├── routes/
│   ├── web.php                     # Main routes
│   ├── settings.php                # Settings endpoints
│   └── console.php                 # Console commands
├── database/
│   ├── migrations/
│   ├── factories/
│   ├── seeders/
│   └── database.sqlite
├── resources/js/
│   ├── pages/                      # 30+ React page components
│   │   ├── auth/                   # Login, register, password reset
│   │   ├── brokers/
│   │   ├── shipments/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── settings/               # Profile, security, appearance
│   │   ├── reports/
│   │   └── logs/
│   ├── components/                 # 50+ reusable components
│   │   ├── ui/                     # Radix UI components
│   │   ├── dashboard/
│   │   ├── reports/
│   │   └── shipments/
│   ├── hooks/                      # Custom React hooks
│   ├── app.tsx                     # Inertia entry point
│   └── app-shell.tsx               # Main layout
├── config/                         # Laravel configuration
├── tests/
│   ├── Feature/                    # Feature tests (15+ test classes)
│   │   ├── Auth/
│   │   ├── Settings/
│   │   └── *.php
│   └── Unit/                       # Unit test framework
├── vite.config.ts                  # Bundler config
├── tsconfig.json                   # TypeScript config
├── composer.json                   # PHP dependencies
├── package.json                    # Node dependencies
└── phpunit.xml                     # Test configuration
```

### Controllers (10 Total)
1. **DashboardController** - Dashboard metrics and shipment overview
2. **ShipmentController** - Full CRUD operations for shipments
3. **BrokerController** - Broker management (add, edit, delete)
4. **UserManagementController** - User creation and administration
5. **RoleManagementController** - Role and permission management
6. **ReportsController** - System metrics and reporting
7. **LogController** - Activity logging and audit trails
8. **DocumentManagementController** - Document CRUD and status updates
9. **ProfileController** (Settings) - User profile updates
10. **SecurityController** (Settings) - Password, 2FA, recovery codes

### Models (14 Total)
**Core Models:**
- User (TwoFactorAuthenticatable trait)
- Shipment (central entity)
- ShipmentDocument
- Broker
- Role (RBAC)
- Permission (RBAC)
- UserRole (pivot)
- RolePermission (pivot)
- ActivityLog (audit trail)
- CustomDoc, DocumentStatus, DocumentStatusList
- ShipmentType, ShipmentStatusList

### Data Flow
1. Backend serves data as Inertia props to React frontend
2. React components render UI with server-side props
3. Forms submit to controllers via Inertia POST/PUT/DELETE
4. Wayfinder auto-generates typed route/action functions (`@/routes`, `@/actions`)
5. Frontend imports Wayfinder functions for type-safe backend calls

### Current Deployment State
- **Environment:** Local development only
- **Running:** `php artisan serve` + `npm run dev` (or `composer run dev` for concurrent)
- **Database:** MySQL 5.7+ (127.0.0.1:3306, database: fgi-dts, user: root, no password)
- **Sessions:** Stored in MySQL database (SESSION_DRIVER=database, lifetime: 120 minutes)
- **Entry:** http://localhost:8000 (backend), http://localhost:5173 (Vite proxy)

---

## 3. DATA MODELS & AUTHENTICATION

### User Model Structure
```php
// Attributes
- id, name, email, password (hashed)
- two_factor_secret, two_factor_recovery_codes, two_factor_confirmed_at
- email_verified_at, created_at, updated_at

// Traits
- TwoFactorAuthenticatable (Laravel Fortify - TOTP 2FA)

// Relationships
- hasMany(ActivityLog)
- belongsToMany(Role via UserRole)
- hasMany(DocumentStatus)
```

### Authentication System (Headless Laravel Fortify v1)
**Features Implemented:**
- ✅ User registration with email verification
- ✅ Login with email/password
- ✅ Password reset workflow
- ✅ TOTP-based two-factor authentication
  - QR code generation
  - Manual setup key (fallback)
  - Recovery codes (8 one-time backup codes)
  - Disable 2FA with password confirmation

**Frontend 2FA Components:**
- `TwoFactorSetupModal` - QR code, manual key, recovery codes
- `TwoFactorRecoveryCodes` - Display and copy recovery codes
- `use-two-factor-auth` hook - Setup state management

### Role-Based Access Control (RBAC)
```
Predefined Roles:
- admin        → Full system access
- manager      → Shipment management, user assignment
- operator     → Shipment data entry and status updates
- broker       → Broker document verification
- custom roles → Admin-definable with granular permissions

Permissions (Granular):
- shipments:view, create, update, delete
- documents:view, approve, reject
- users:view, create, update, delete
- brokers:view, create, update, delete
- roles:view, create, update, delete
- reports:view, logs:view, settings:manage
```

### Activity Logging
```php
// Tracks: user_id, action (created/updated/deleted/verified/approved/rejected)
// Model (Shipment, Document, User, Broker, etc.)
// Changes (before/after values)
// Timestamp (created_at)
// Used for: audit trails, compliance reporting
```

---

## 4. ACTIVE FEATURES & FUNCTIONALITIES

### ✅ Authentication (Complete via Fortify)
- User registration with email verification
- Login with email/password
- Password reset workflow
- TOTP 2FA (QR code, manual entry, recovery codes)
- Session management and logout

### ✅ Dashboard (Comprehensive Metrics)
- Total shipment count (active, archived, completed, pending, processing, failed)
- Document approval metrics (approved, rejected, pending)
- Accuracy/completion charts (Recharts)
- Recent shipments table with status icons
- Key performance indicators (KPIs)

### ✅ Shipment Management
- Full CRUD operations
- Lifecycle tracking (6 states: active, archived, completed, pending, processing, failed)
- Broker linking
- Document association
- Search & filter by ID, status, broker, date range
- Bulk actions (archive, complete, change status)

### ✅ Interactive Document Portal
- Modal-based interface
- PDF preview with embedded viewer
- Status updates (approve/reject/pending)
- Multi-format support (BL, IV, PL, CI, etc.)
- Printing functionality
- Document history with timestamps

### ✅ Broker Management
- Full CRUD operations
- Broker profiles (contact info, credentials, specialization)
- Shipment association
- Performance tracking
- Status management (active/inactive)

### ✅ User & Role Administration
- User management (create, list, edit, delete)
- Role assignment (predefined + custom)
- Permission matrix (granular control)
- Role management (create, edit, delete)
- Access control enforcement via middleware

### ✅ Reports & Metrics
- Shipment metrics (total, completed, pending, failed)
- Document metrics (approved, rejected, pending)
- Broker performance (success rates, quality metrics)
- User activity logs with attribution
- Date range filtering
- Export functionality (planned)

### 🔄 User Settings Portal [IN ACTIVE DEVELOPMENT]

**Profile Settings** (`profile.tsx`, `ProfileController`)
- ✅ Display current user info
- ✅ Update name
- ✅ Update email (with verification)
- 📋 Avatar/photo (planned)

**Security Settings** (`security.tsx`, `SecurityController`)
- ✅ Change password (with verification)
- ✅ 2FA setup (QR code, manual key, recovery codes)
- ✅ 2FA disable (with password confirmation)
- ✅ Recovery code management
- 📋 Session management (view active sessions, logout other devices)

**Appearance Settings** (`appearance.tsx`)
- ✅ Theme selection (light/dark mode)
- 📋 Language preferences
- 📋 UI preferences (font size, density)

---

## 5. FRONTEND COMPONENT ARCHITECTURE

### Layout Shell
- **app-shell.tsx** - Main wrapper, provides layout context
- **app-header.tsx** - Top navigation, user menu, search, notifications
- **app-sidebar.tsx** - Main navigation, links, user menu footer

### UI Components (Radix UI)
Located in `components/ui/`:
- Button, Input, Label, Dialog, DropdownMenu, Select
- Checkbox, Toggle, Tooltip, Popover, Separator
- Avatar, Collapsible, and more

### Core Components
- Heading, TextLink, InputError, PasswordInput
- AlertError, Breadcrumbs, UserInfo, UserMenu
- NavMain, NavFooter, FormField

### 2FA Components
- TwoFactorSetupModal (QR, manual key)
- TwoFactorRecoveryCodes (display, copy)
- use-two-factor-auth hook

### Domain-Specific Components
- **Dashboard:** AccuracyChart, CompletionChart, ShipmentsTable, MetricsCard
- **Shipments:** ShipmentForm, ShipmentTable, StatusIcon, DocumentLink
- **Brokers:** BrokerForm, BrokerTable, BrokerSelect
- **Users:** UserForm, UserTable, RoleSelect
- **Roles:** RoleForm, PermissionMatrix, RoleTable
- **Reports:** ReportFilters, ReportChart, MetricsTable

### Utility Components
- Form (Inertia component with CSRF, validation)
- Link (Inertia component for navigation)
- Loader, EmptyState, Pagination

---

## 6. FRONTEND ROUTING & DATA FETCHING

### Wayfinder Integration (Type-Safe Routing)
Wayfinder auto-generates TypeScript functions from Laravel routes and controllers:

```typescript
// Usage in components
import { edit } from '@/routes/security';
import { enable, disable } from '@/actions/two-factor';

const handleEdit = async () => {
  const response = await edit().post({ name: 'John' });
};

const enable2FA = async () => {
  const { qr_code } = await enable().get();
};
```

### Example Routes & Functions
- `@/routes/dashboard` → dashboard()
- `@/routes/security` → edit()
- `@/routes/two-factor` → enable(), disable(), confirmReset()
- `@/routes/shipments` → Full CRUD functions
- `@/routes/brokers`, `@/routes/users`, `@/routes/roles` - Similar CRUD

### Form Handling
```tsx
import { useForm } from '@inertiajs/react';
import Form from '@/components/Form';

export default function ProfileForm() {
  const { data, setData, post, errors, processing } = useForm({
    name: 'John',
    email: 'john@example.com',
  });

  return (
    <Form onSubmit={() => post(edit().url())}>
      <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
      {errors.name && <InputError>{errors.name}</InputError>}
      <Button type="submit" disabled={processing}>Save</Button>
    </Form>
  );
}
```

### Navigation
```tsx
import { Link } from '@inertiajs/react';

<Link href={shipments().url()}>View Shipments</Link>
<Link href={edit({ id: 123 }).url()}>Edit Shipment</Link>
```

### Data Fetching Patterns
- **Server-Side Props:** Data passed from controller via Inertia::render()
- **Client-Side Requests:** useHttp() hook for optional/deferred props
- **Polling:** Refresh data at intervals for real-time updates
- **Prefetching:** Pre-load data on link hover for faster navigation

---

## 7. TESTING INFRASTRUCTURE

### Framework: Pest v4
Pest is a modern PHP testing framework built on PHPUnit with elegant syntax.

### Test Structure
```
tests/Feature/
├── Auth/
│   ├── LoginTest.php
│   ├── RegistrationTest.php
│   ├── PasswordResetTest.php
│   ├── TwoFactorAuthenticationTest.php
│   └── EmailVerificationTest.php
├── Settings/
│   ├── ProfileTest.php
│   ├── SecurityTest.php
│   └── AppearanceTest.php
├── DashboardTest.php
├── ShipmentManagementTest.php
├── BrokerManagementTest.php
├── UserManagementTest.php
├── RoleManagementTest.php
├── DocumentManagementTest.php
└── ExampleTest.php

tests/Unit/
└── ExampleTest.php
```

### Configuration
- **Pest.php** - RefreshDatabase trait, Laravel plugins, test helpers
- **phpunit.xml** - PHP 8.4 strict mode, test suites, environment variables
- **Test Database:** :memory: SQLite (in-memory, no file I/O)

### Running Tests
```bash
php artisan test --compact                     # All tests
php artisan test --compact --filter=LoginTest  # Specific class
php artisan test --compact --filter=testUserCanLogin  # Specific method
composer run test                              # Full: lint + format + types + test
```

---

## 8. CODE QUALITY & DEVELOPMENT TOOLS

### PHP Formatting (Laravel Pint v1)
```bash
vendor/bin/pint --dirty --format agent  # Auto-fix with output
vendor/bin/pint --test                  # Check without fixing
vendor/bin/pint --parallel              # Parallel processing
```
**Config:** `pint.json` → Preset: `laravel` (PSR-12, modern PHP)

### JavaScript Linting (ESLint v9)
```bash
npm run lint        # Check and fix
npm run lint:check  # Check without fixing
```
**Features:** TypeScript support, React plugin, import ordering, Prettier integration

### JavaScript Formatting (Prettier v3)
```bash
npm run format        # Format all resources
npm run format:check  # Check without fixing
```
**Features:** Automatic formatting, TailwindCSS class sorting, ESLint integration

### Type Checking (TypeScript)
```bash
npm run types:check  # Validate TypeScript (no emit)
```
**Config:** Strict mode, ESNext target, JSX react-jsx, path aliases (`@/*`)

### Development Commands
```bash
composer run dev                # Concurrent: server, queue, logs, Vite
composer run test               # Lint check + format check + types check + test
composer run ci:check           # Full CI/CD pipeline
vendor/bin/pint --dirty         # PHP formatter
npm run lint                    # ESLint + Prettier fix
npm run types:check             # TypeScript validation
```

---

## 9. KNOWN CONSTRAINTS & SYSTEM RULES

### Architectural Rules (Non-Negotiable)
1. **Frontend:** React 19 + Inertia.js v3 + TailwindCSS v4 (strict enforcement)
2. **Type Safety:** All backend routes via Wayfinder (@/routes, @/actions)
3. **Testing:** Pest v4 PHP only (no JavaScript tests)
4. **PHP Syntax:** PHP 8.4+ with modern features
5. **Laravel Patterns:** Form Requests, Eloquent Resources, route model binding, middleware
6. **Authentication:** Headless Laravel Fortify only
7. **Database:** Eloquent ORM only (no raw SQL unless necessary)

### Limitations & Bottlenecks
1. **Database Credentials (Dev):** Local MySQL with no password (root user)
   - **Security:** For production, use strong password and dedicated database user
   - **Production:** Update .env with secure credentials

2. **Session Lifetime:** 120 minutes (2 hours)
   - **Configurable:** Adjust SESSION_LIFETIME in .env as needed

3. **Frontend Build:** Vite-dependent
   - **Solution:** `npm run dev` for hot module reloading

4. **Deployment:** Currently local-only
   - **Next Step:** Configure CI/CD (GitHub Actions, etc.)

### System Requirements
- **PHP:** ^8.3 (8.4 recommended)
- **Node.js:** 18+
- **MySQL:** 5.7+ (currently running on 127.0.0.1:3306)
- **Environment:** .env file required
- **Dependencies:** `composer install`, `npm install`

---

## 10. SETUP & DEVELOPMENT COMMANDS

### Initial Setup
```bash
composer run setup          # Complete setup in one command
# Or manually:
cp .env.example .env
php artisan key:generate
php artisan migrate --force
npm install
npm run build
```

### Local Development
```bash
composer run dev            # All services concurrent
# Or manually:
php artisan serve
php artisan queue:listen
php artisan pail
npm run dev
```

### Building
```bash
npm run build               # Production Vite build
npm run build:ssr           # With SSR (if enabled)
```

### Code Quality
```bash
vendor/bin/pint --dirty     # Fix PHP formatting
npm run lint                # Fix JS linting and formatting
npm run types:check         # TypeScript validation
composer run ci:check       # Full CI/CD pipeline
```

### Testing
```bash
php artisan test --compact                    # All tests
php artisan test --compact --filter=LoginTest # Specific test
composer run test                             # Full quality pipeline
```

### Database
```bash
php artisan migrate --force      # Create/update schema
php artisan migrate:fresh --seed # Fresh + seed data
php artisan migrate:rollback     # Revert migrations
php artisan make:migration name  # Create migration
```

### Artisan Utilities
```bash
php artisan route:list                  # View all routes
php artisan route:list --method=POST    # Filter by method
php artisan config:show app.name        # Show config values
php artisan cache:clear                 # Clear caches
```

---

## 11. IMMEDIATE NEXT STEPS & KNOWN ISSUES

### Currently In Progress
1. **User Settings Portal Finalization**
   - ✅ Profile settings (name, email updates)
   - ✅ Security settings (password, 2FA, recovery codes)
   - 🔄 Appearance settings (theme, language, density)
   - 📋 Email verification workflow
   - 📋 Session management (view/logout active sessions)

2. **Document Management Enhancement**
   - 📋 PDF upload flow (validation, virus scanning)
   - 📋 Preview edge cases (missing/corrupted PDFs)
   - 📋 Document history and audit trail
   - 📋 Status workflow automation

3. **Testing Coverage**
   - 📋 Increase feature test coverage to >80%
   - 📋 Unit tests for complex services
   - 📋 Browser testing (optional)

### Validation Required
- Document upload → preview → approval workflow
- PDF preview edge cases (missing/corrupted/unsupported formats)
- Shipment date UI handling (missing/future dates)
- Multi-broker workflows
- Permission enforcement verification

### Database Preparation (For Production)
```bash
# Create production database user with strong password
# Update .env credentials: DB_HOST, DB_USERNAME, DB_PASSWORD (secure credentials)
# Ensure MySQL is properly configured for backup/replication if needed
php artisan migrate --force
```

### Known Issues
- ✅ None critical in core features (dashboard, shipments, brokers, users, roles, reports)
- ⚠️ **UI Edge Case:** Missing shipment dates display as "Invalid Date" (needs fallback)
- ⚠️ **PDF Preview:** Some PDF formats may not render (needs download fallback)
- ℹ️ **Session Timeout:** Default 2-hour session (configurable in config/session.php)
- ℹ️ **Email Config:** .env MAIL_* required for password reset (logs in dev)

### Post-Launch Checklist
- [ ] Database credentials update (strong password, dedicated user, not root)
- [ ] Database backup strategy (automated, tested)
- [ ] Email configuration (SMTP setup)
- [ ] SSL/TLS certificate (HTTPS)
- [ ] Monitoring setup (error tracking, uptime, database performance)
- [ ] Database replication/HA setup (if required)
- [ ] User documentation and training
- [ ] Data sanitization policies (PII protection)
- [ ] Compliance audit (GDPR, SOC2, industry)

---

## 12. LARAVEL BOOST & INTEGRATED TOOLS

### Boost Status
✅ **Enabled and active** - MCP server running with specialized development tools

### Available Boost Tools
- **database-query** - Execute read-only SQL queries
- **database-schema** - Inspect table structure
- **get-absolute-url** - Resolve correct scheme/domain/port
- **browser-logs** - Read recent browser console logs
- **search-docs** - Query version-specific documentation

### Active Development Skills
1. **fortify-development** - Auth, 2FA, password reset, profile/security
2. **laravel-best-practices** - Controllers, models, queries, validation
3. **wayfinder-development** - Type-safe routing, frontend connections
4. **pest-testing** - Pest PHP tests, feature tests, TDD
5. **inertia-react-development** - React pages, forms, hooks
6. **tailwindcss-development** - Responsive layouts, dark mode, spacing

### Documentation Search Pattern
```bash
search-docs(['authentication', 'login', 'middleware'])
search-docs(['eloquent', 'relationships', 'eager loading'])
search-docs(['react', 'hooks', 'component lifecycle'])
```

---

## 13. REPOSITORY STRUCTURE SUMMARY

### Code Organization
```
Controllers:       10 total (8 main + 2 settings)
Models:           14 Eloquent models with scopes/relationships
Routes:           3 files (web, settings, console) with 50+ named routes
Frontend Pages:   30+ React page components
Components:       50+ reusable React components
Tests:            15+ feature test classes
Services:         Business logic layer
Requests:         Form validation classes
Resources:        Eloquent API Resources
Migrations:       Complete schema
Factories:        Model factories for testing
Seeders:          Database seeders
```

### Dependency Summary
**Composer (PHP):**
- laravel/framework v13
- inertiajs/inertia-laravel v3
- laravel/fortify v1
- laravel/wayfinder v0.1.14
- pestphp/pest v4 (testing)
- laravel/pint v1 (formatting)

**npm (JavaScript):**
- react v19, @inertiajs/react v3
- tailwindcss v4, @radix-ui/* components
- recharts v3.8.1 (charting)
- eslint v9, prettier v3, typescript v5.7
- vite v8, various utility packages

### Configuration Files
- **vite.config.ts** - Bundler with Inertia, Wayfinder, Tailwind, React
- **tsconfig.json** - TypeScript strict mode, path aliases
- **eslint.config.js** - Linting rules, TypeScript, React
- **pint.json** - Laravel Pint (PSR-12)
- **phpunit.xml** - Test configuration

---

## QUICK REFERENCE CHECKLISTS

### Starting Development
- [ ] `composer install`
- [ ] `npm install`
- [ ] `cp .env.example .env`
- [ ] `php artisan key:generate`
- [ ] `php artisan migrate --force`
- [ ] `composer run dev`

### Before Committing
- [ ] `vendor/bin/pint --dirty`
- [ ] `npm run lint`
- [ ] `npm run types:check`
- [ ] `php artisan test --compact`

### Adding a Feature
1. Create controller method, model relationship, migration, form request
2. Create React page component, Wayfinder route, form handling
3. Add feature test for happy path and error cases
4. Run lint, format, types:check, test
5. Commit with meaningful message

### Debugging Production Issues
- [ ] Check `storage/logs/laravel.log`
- [ ] Use `php artisan tinker` (interactive debugging)
- [ ] Run `php artisan route:list`
- [ ] Check `.env` configuration
- [ ] Use browser DevTools
- [ ] Use `php artisan pail`

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-03  
**Project Status:** 🟢 Active Development  
**Environment:** Local (SQLite), Production-Ready Architecture
