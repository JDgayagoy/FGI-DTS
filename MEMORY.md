### 1. Project Overview & Core Purpose
- **What is this project?** FGI-DTS (Document Tracking System) is a comprehensive freight and logistics management dashboard designed to track shipments, manage customs/shipping documentation, and oversee broker interactions.
- **Core tech stack:** PHP 8.4, Laravel 13, React 19, Inertia.js v3, TailwindCSS v4, Vite, SQLite, Laravel Fortify (Authentication), and Laravel Wayfinder.
- **Main target audience or use case:** Internal logistics personnel, freight forwarders, and customs brokers who need to actively manage, verify, and track digital shipment documents and metrics.

### 2. Current Architecture & State
- **High-level directory structure:** Standard modern Laravel monolithic structure integrating an SPA. `app/`, `routes/`, and `database/` handle the backend logic, while `resources/js/pages/` and `resources/js/components/` contain the React frontend.
- **Data flow:** The backend serves data directly to the React frontend as Inertia props, utilizing Laravel Wayfinder to auto-generate typed functions for secure, type-safe API/route calls from the frontend to the backend controllers.
- **Current deployment state:** Local development environment active. Currently running via `php artisan serve` and `npm run dev`. The database is currently utilizing local SQLite.

### 3. Active Features & Functionalities
- **Authentication:** Login and registration functionality powered by headless Laravel Fortify.
- **Dashboard Overview:** Comprehensive metrics dashboard displaying shipment accuracy, completion charts, and active/missing document statistics.
- **Shipment Management:** Full CRUD operations for managing tracking data and lifecycle of freight shipments.
- **Interactive Document Portal:** An integrated UI modal for previewing PDFs, verifying digital documents (BL, IV, PL, CI, etc.), updating status, and printing.
- **Broker Management:** Full CRUD operations for adding and managing customs/freight brokers.
- **User & Role Administration:** Administrative controls to create users, assign specific roles, and update granular permissions.
- **Reports:** System-wide data aggregation and reporting views.
- **User Settings [IN PROGRESS]:** Profile and security configuration pages (active development on `profile.tsx` and `security.tsx`).

### 4. Known Constraints & System Rules
- **Key architectural rules:** 
  - Frontend code must strictly use React with Inertia.js and TailwindCSS v4 for styling. 
  - Frontend components requiring backend route generation must use Laravel Wayfinder (`@/routes`) instead of hardcoded strings.
  - Automated testing must be written exclusively using Pest PHP.
  - Adhere to modern PHP 8.4 syntax and Laravel 13 best practices.
- **Current limitations or scaling bottlenecks:** The application is currently utilizing SQLite as the default database, which will become a concurrency bottleneck and requires migration to PostgreSQL or MySQL before a production release.
- **Environmental variables or configurations:** Standard Laravel `.env` configuration is required. A `database.sqlite` file must exist in the `database/` directory to function locally. Both composer dependencies and node modules must be installed with Vite running (`npm run dev`).

### 5. Immediate Next Steps
- Finalize the User Settings portal (`settings/profile.tsx` and `settings/security.tsx` are actively being edited).
- Validate document upload flows and verify edge cases for missing PDF previews in the interactive document portal.
- Transition the `.env` database configuration from SQLite to a production-ready RDBMS (PostgreSQL/MySQL) if staging deployment is imminent.
- **TODOs/Bugs:** None detected directly in the core dashboard components, though UI edge-case handling for missing shipment dates requires ongoing validation.
