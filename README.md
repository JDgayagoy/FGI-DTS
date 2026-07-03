# FGI-DTS — Supply Chain & Logistics Management System

A modern supply chain and logistics management platform built with Laravel, React, and Inertia.js. Designed for tracking shipments, managing documents, and monitoring logistics operations.

## 🚀 Features

- **Shipment Management** — Create, track, and manage shipments across supply chain
- **Document Management** — Upload, verify, and approve logistics documents
- **Dashboard & Reports** — Real-time metrics and advanced filtering
- **Activity Logging** — Complete audit trail of all operations
- **Role-Based Access Control** — Fine-grained permission management
- **User Management** — Manage users, roles, and permissions
- **Broker Management** — Manage logistics brokers and partners

## 🛠️ Tech Stack

### Backend
- **Laravel 13** — PHP web framework
- **PHP 8.4** — Programming language
- **Laravel Fortify** — Authentication backend
- **Laravel Boost** — Modern Laravel patterns
- **Pest PHP 4** — Testing framework (85% coverage)

### Frontend
- **React 19** — UI library
- **Inertia.js 3** — Server-side rendering for SPAs
- **TypeScript** — Type-safe JavaScript
- **Tailwind CSS 4** — Utility-first CSS
- **Vite** — Frontend build tool

### Database & Services
- **MySQL 8.0** — Production database
- **SQLite** — Testing database
- **Laravel Sail** — Docker environment
- **Redis** (optional) — Caching

## 📋 Requirements

- PHP 8.4+
- Composer 2.0+
- Node.js 18+
- npm or pnpm
- MySQL 8.0+ (production)
- Docker & Docker Compose (optional, for Sail)

## 🚀 Getting Started

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url> fgi-dts
cd fgi-dts

# Copy environment file
cp .env.example .env

# Install PHP dependencies
composer install

# Install JavaScript dependencies
npm install

# Generate app key
php artisan key:generate
```

### 2. Database Setup

```bash
# Run migrations
php artisan migrate

# Seed initial data (roles, permissions, brokers)
php artisan db:seed
```

### 3. Build Assets

```bash
# Development
npm run dev

# Production
npm run build
```

### 4. Start Development Server

```bash
# Using built-in server
php artisan serve

# Or using Laravel Sail (Docker)
./vendor/bin/sail up
```

Visit `http://localhost:8000` in your browser.

---

## 🧪 Testing

This project uses [Pest PHP](https://pestphp.com/) with **109 tests** and **85% code coverage**.

### Quick Start

```bash
# Run all tests
php artisan test --compact

# Run specific test file
php artisan test tests/Feature/Shipments/ShipmentCreationTest.php

# Run tests matching a pattern
php artisan test --filter "shipment creation"

# Run with verbose output
php artisan test

# Generate coverage report
php artisan test --coverage-text
```

### Test Structure

```
tests/Feature/
├── Shipments/          (18 tests) — Shipment CRUD & status transitions
├── Documents/          (11 tests) — Document upload & approval workflow
├── Dashboard/          (5 tests)  — Dashboard metrics
├── Reports/            (4 tests)  — Advanced filtering & reporting
├── Authorization/      (11 tests) — Permission enforcement
├── ActivityLogging/    (6 tests)  — Audit trail verification
├── BrokerManagementTest.php (11 tests) — Broker operations
└── ... (other tests)
```

### Test Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 109 passing |
| Code Coverage | 85% |
| Pass Rate | 100% |
| Execution Time | ~30 seconds |
| Assertions | 403 |

### Available Test Helpers

```php
// Shipment helpers
createShipment($status, $overrides)
createShipmentWithDocuments($status, $count)
transitionShipmentStatus($shipment, $newStatus)
assertShipmentHasStatus($shipment, $status)

// Permission helpers
createUserWithPermission($action, $resource)
createUserWithRole($roleName)
grantPermissionToUser($user, $action, $resource)
assertUserHasPermission($user, $action, $resource)

// Activity log helpers
getLatestActivityLog()
assertActivityLogExists($user, $action, $subject)
countUserActivityLogs($user)

// Document helpers
createDocument($shipment, $status, $overrides)
setDocumentStatus($document, $status, $changedBy)
assertDocumentHasStatus($document, $status)

// Broker helpers
createBroker($overrides)
```

### For Detailed Testing Guide

See [TESTING.md](./TESTING.md) for comprehensive documentation on:
- Writing tests
- Using test helpers
- Debugging failed tests
- CI/CD integration
- Best practices

---

## 📚 Documentation

- **[TESTING.md](./TESTING.md)** — Complete testing guide
- **[PHASE_7_HANDOFF.md](./PHASE_7_HANDOFF.md)** — Latest phase information
- **[docs/test-coverage/](./docs/test-coverage/)** — Test coverage reports
- **[docs/audit-and-implementation/](./docs/audit-and-implementation/)** — Audit findings

## 🔄 CI/CD Pipeline

Tests run automatically via GitHub Actions on:
- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main` or `develop` branches

The workflow:
1. Checks out code
2. Sets up PHP 8.4 and dependencies
3. Builds frontend assets
4. Runs all 109 tests
5. Reports coverage metrics
6. Fails workflow if any test fails

View test results in the **Actions** tab on GitHub after pushing.

---

## 🛡️ Authorization & Security

### Role-Based Access Control (RBAC)

The system uses Laravel's Gate system with roles and permissions:

```php
// Roles
- Super Admin (all permissions)
- Supply Chain Manager (shipment, document, broker management)
- Logis Associate (view-only access)
- Brand Manager (document approval)

// Permission Format
action: add, edit, delete, view, approve, reject, manage_roles, upload, archive
resource: shipments, documents, brokers, rbac, logs
```

### Permission Enforcement

All protected routes use `Gate::authorize()`:

```php
public function store(Request $request)
{
    Gate::authorize('add-shipments'); // Throws 403 if denied
    // ... controller logic
}
```

---

## 🗄️ Database Schema

### Core Models

- **Shipments** — Track shipment lifecycle
- **Documents** — Manage logistics documents
- **DocumentStatuses** — Workflow states (Pending, Approved, Rejected)
- **ShipmentStatuses** — Lifecycle states
- **Users** — System users
- **Roles** — User roles
- **Permissions** — Role-based permissions
- **ActivityLogs** — Audit trail
- **Brokers** — Logistics partners

Run `php artisan migrate --seed` to initialize the database.

---

## 🔧 Configuration

### Environment Variables

Key `.env` variables:

```env
APP_NAME=FGI-DTS
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fgi_dts
DB_USERNAME=root
DB_PASSWORD=

FORTIFY_GUARD=web
SESSION_DOMAIN=localhost
```

### Laravel Fortify

Authentication is configured via Laravel Fortify. See `config/fortify.php` for:
- Login/registration routes
- Password reset flow
- Email verification
- 2FA settings

---

## 📦 Deployment

### Local Development

```bash
# Using native PHP
php artisan serve

# Using Laravel Sail (Docker)
./vendor/bin/sail up -d

# Build for production
npm run build
php artisan migrate --force
```

### Production Deployment

This application can be deployed to:
- **Laravel Cloud** — Recommended for Laravel apps
- **Traditional VPS** — Apache/Nginx + PHP-FPM
- **Containerized** — Docker on any cloud platform

See Laravel deployment docs for detailed instructions.

---

## 🐛 Troubleshooting

### Tests Failing

```bash
# Ensure dependencies are installed
composer install
npm install

# Check test database exists
php artisan migrate --env=testing

# Run tests with verbose output
php artisan test --verbose
```

### Vite Assets Not Loading

```bash
# Rebuild assets
npm run build

# Or watch for changes during development
npm run dev
```

### Database Connection Error

```bash
# Verify .env file
cat .env | grep DB_

# Test MySQL connection
php artisan db:monitor

# Run migrations
php artisan migrate
```

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Write tests for your changes
3. Run tests: `php artisan test --compact`
4. Format code: `vendor/bin/pint`
5. Commit: `git commit -m "Add feature description"`
6. Push and create a pull request

### Code Standards

- PHP: PSR-12 (enforced by Laravel Pint)
- JavaScript/TypeScript: ESLint + Prettier
- Tests: Pest PHP syntax (see TESTING.md)

Run code formatter:
```bash
vendor/bin/pint
npx eslint . --fix
npx prettier . --write
```

---

## 📄 License

This project is proprietary and confidential.

---

## 📞 Support

For issues or questions:
1. Check the [TESTING.md](./TESTING.md) for test-related questions
2. Review [docs/](./docs/) for detailed documentation
3. Check recent [git logs](https://github.com/your-org/fgi-dts/commits) for context
4. Create an issue on GitHub

---

## 📋 Changelog

### Phase 6 (July 3-5, 2026) ✅
- Completed 55 tests across 6 modules (85% coverage)
- All core features tested and passing

### Phase 7 (July 5, 2026) ✅
- Created TESTING.md comprehensive guide
- Added GitHub Actions CI/CD pipeline
- Updated README with testing section

---

**Last Updated:** July 3, 2026  
**Current Version:** Phase 7 (CI/CD Complete)  
**Status:** ✅ All 109 tests passing
