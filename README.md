# SmartPrint

> Professional multi-tenant QR-based cloud printing management system.

## Project Structure

```
print2print/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express + Prisma
├── database/          # Schema, migrations, ER diagram
│   ├── schema.prisma
│   ├── schema.sql
│   └── migrations/
├── docs/              # API, DB, and ER documentation
├── print-agent/       # (Phase 2) Local print agent
├── .env.example
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios |
| Backend | Node.js 20+, Express 4, JWT, Argon2id |
| Database | MySQL 8+, Prisma ORM |
| Auth | JWT access tokens + refresh tokens |

---

## Prerequisites

- **Node.js** v18+ (v24 recommended)
- **npm** v9+
- **MySQL** 8.0+ running locally
- **Git**

---

## Setup Instructions

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd print2print

# Copy and fill in environment variables
cp .env.example backend/.env
```

Edit `backend/.env`:
```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/smartprint"
JWT_SECRET=your_long_random_secret_here
# ... see .env.example for all variables
```

### 2. Create the MySQL database

```sql
-- In MySQL shell:
CREATE DATABASE smartprint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or apply the full schema:
```bash
mysql -u root -p < database/schema.sql
```

### 3. Set up the backend

```bash
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Push schema to DB (dev) OR run migrations (prod)
npx prisma db push          # development
npx prisma migrate dev      # production-ready workflow

# (Optional) Seed demo data
node src/database/seed.js
```

### 4. Set up the frontend

```bash
cd ../frontend
npm install
```

### 5. Run the application

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## Demo Credentials (after seeding)

| Field | Value |
|-------|-------|
| Email | demo@smartprint.com |
| Password | Password123 |
| Shop Code | SP-DEMO-0001 |

---

## API Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/register | No | Register new owner |
| POST | /api/v1/auth/login | No | Login |
| POST | /api/v1/auth/logout | No | Logout |
| GET | /api/v1/auth/me | ✓ | Current user |
| POST | /api/v1/shops | ✓ | Create shop |
| GET | /api/v1/shops | ✓ | List my shops |
| GET | /api/v1/shops/:id | ✓ Member | Get shop |
| PUT | /api/v1/shops/:id | ✓ Owner | Update shop |
| PATCH | /api/v1/shops/:id/settings | ✓ Owner | Update settings |
| GET | /api/v1/profile | ✓ | Get profile |
| PUT | /api/v1/profile | ✓ | Update profile |
| POST | /api/v1/profile/change-password | ✓ | Change password |

See [docs/API.md](docs/API.md) for full documentation.

---

## Database

See [docs/DATABASE.md](docs/DATABASE.md) for table reference.
See [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md) for the entity-relationship diagram.

**Tables:** 18 tables covering users, shops, orders, files, pricing, payments, printers, jobs, audit and notifications.

---

## Phase 1 Completion Status

### ✅ Completed
- [x] Project structure (frontend / backend / database / docs)
- [x] Complete MySQL schema (18 tables, all foreign keys and indexes)
- [x] Prisma ORM schema with all relationships
- [x] ER diagram (Mermaid)
- [x] Database documentation
- [x] User registration with Argon2id password hashing
- [x] JWT authentication (access + refresh tokens)
- [x] Login / logout / refresh / logout-all
- [x] Authentication middleware
- [x] Role-based access control (UserRole + ShopUserRole)
- [x] Multi-tenant authorization (shop membership verification)
- [x] Shop creation (with auto-generated unique shop code)
- [x] Shop settings management
- [x] Profile management + password change
- [x] Rate limiting (global + auth-specific)
- [x] Input validation (express-validator)
- [x] Error handling middleware
- [x] Structured logging (Winston)
- [x] CORS + Helmet security headers
- [x] React frontend with Vite
- [x] Tailwind CSS design system (components, utilities)
- [x] React Router protected routes
- [x] AuthContext + JWT token management with auto-refresh
- [x] Login page
- [x] Registration page (with password strength indicator)
- [x] Dashboard page (shops overview, stats)
- [x] Shop creation page
- [x] Shop setup wizard page
- [x] Shop settings page (toggles, file limits)
- [x] Profile page (edit + change password)
- [x] Responsive sidebar + header layout
- [x] Toast notifications
- [x] 404 page
- [x] Database seed script
- [x] .env.example
- [x] .gitignore
- [x] README with full setup instructions

### Completed in Phase 2
- [x] Unique QR code generation for every shop (PNG, SVG, and direct URL)
- [x] Anonymous, cryptographically secure customer sessions (no registration, phone or email)
- [x] Multi-file document upload with drag-and-drop, progress, and cancel/replace/delete
- [x] Private file storage with MIME, file extension, and magic-byte signature validation
- [x] Document page-count calculation via `pdf-lib` (pure JS, robust, no native dependencies)
- [x] Corrupt and invalid file detection preventing checkout
- [x] In-browser document preview (PDF and images)
- [x] Independent print configuration per file (copies, B&W vs color, paper size, duplex, page ranges)
- [x] Additional finishing services (binding, lamination, stapling)
- [x] Dynamic server-authoritative price calculation engine
- [x] Mobile-first Customer Portal (`/s/:shopCode`)
- [x] Order Confirmation and live status progression tracker (`/orders/:orderNumber`)
- [x] Shop Owner QR management & printable counter display flyer (`/shops/:shopId/qr`)
- [x] Shop Owner pricing rules matrix (`/shops/:shopId/pricing`)
- [x] Shop Owner incoming orders dashboard (`/shops/:shopId/orders`)

### Completed in Phase 3
- [x] Real-time Shop Owner Dashboard overview cards (Today's orders, Total pages, Today's revenue, Pending orders, Completed orders, Cancelled orders)
- [x] Dynamic 7-day trend visualizer for volume and revenue
- [x] Real-time order synchronization with Socket.IO (instant display without page reload)
- [x] In-app synthesized audio alerts (Web Audio API dual-tone chime) & native desktop browser notifications
- [x] Filterable & searchable order management table with order number search and date-range filters
- [x] Status filter tabs (PENDING, PAYMENT_PENDING, ACCEPTED, PRINTING, PRINTED, READY, COLLECTED, REJECTED, CANCELLED, EXPIRED)
- [x] Dedicated Order Details page (`/shops/:shopId/orders/:orderId`) with individual file settings & pricing breakdowns
- [x] Enforced status transitions matrix with full audit logs (`order_status_logs`)
- [x] Separation of physical printing (`PRINTED`) and counter pickup (`COLLECTED`)
- [x] Manual printing pipeline: secure authenticated download (`Content-Disposition: attachment`), preview modal, print attempt logging in `print_jobs`, and reprint collision warnings
- [x] Shop settings: custom logo upload with preview, storefront profile editing, operational toggles (manual/online/direct printing)
- [x] In-app notification center with dropdown history and unread badge count
- [x] Phase 3 automated audit suite (36/36 tests passing)

### Completed in Phase 4
- [x] Document lifetime expiry options (`15m`, `1h`, `3h`, `8h`) with shop owner configuration (enable/disable, default selection, maximum expiry cap)
- [x] Customer expiry duration selector dropdown on shop portal upload screen
- [x] Automatic background deletion queue using BullMQ and Redis with resilient in-process timer fallback
- [x] Physical unlinking (`fs.unlink`) of expired customer documents, generated PDF previews, and temporary conversion copies
- [x] Strict HTTP 410 Gone gatekeeper: blocking download, preview, and physical printing once expired or purged
- [x] Owner expiry controls: live expiry countdown timer, extend (+1h, +3h), shorten, and immediate manual purge ("Purge Files Now") with confirmation dialog
- [x] Complete expiry audit trail (`expiry_logs`) recording previous expiry, new expiry, action, bytes freed, and user
- [x] Optional online payments with Razorpay: toggleable by shop owner in settings
- [x] Backend Razorpay order generation with amount in paise (`amount * 100`)
- [x] Client-side checkout modal launcher (`razorpay.js`) and payment completion handling
- [x] Cryptographic HMAC-SHA256 signature verification for client payments and webhooks
- [x] Webhook replay protection (idempotency guard on transaction ID)
- [x] Counter payment workflow: `COUNTER_PAYMENT_DUE` order badge and counter collection recording modal (`COUNTER_PAYMENT_COLLECTED`)
- [x] Shop Payments dashboard (`/shops/:shopId/payments`): total collected, online Razorpay, counter cash/UPI, failed attempts, and filterable ledger
- [x] Automated Phase 4 audit suite (40/40 tests passing)

### Completed in Phase 5 (Final Phase)
- [x] Python Windows Print Agent daemon (`print-agent/`) connecting to native Windows Spooler (`win32print`, `win32api`)
- [x] Cryptographic machine authentication via `shopCode` and high-entropy 64-character `agentToken`
- [x] Automatic discovery and synchronization of installed local/network Windows printers with capabilities (color, duplex, paper sizes)
- [x] Direct print job dispatch with custom job tickets (copies, duplexMode, paperSize, colorMode, pageRange)
- [x] Full spooler lifecycle tracking (`QUEUED` -> `DOWNLOADED` -> `SUBMITTED_TO_OS` -> `DRIVER_COMPLETED` -> `MANUALLY_CONFIRMED`)
- [x] Zero-trust document handling in print agent: streaming files via temporary download URL and unlinking buffer immediately upon spooling
- [x] Idempotency protection preventing duplicate print submissions across network retries
- [x] Printer management dashboard (`/shops/:shopId/printers`) with default printer selection, active/inactive toggles, live spooler queue, and retry actions
- [x] Verified daily business reports & analytics (`/shops/:shopId/analytics`) strictly accounting for verified revenue (`SUCCESS` + `COUNTER_PAYMENT_COLLECTED`) and completed print job page volumes
- [x] Timeframe filtering (`today`, `7d`, `30d`, `90d`, custom range), B&W vs Color ratios, paper type usage, CSV export, and PDF printable report
- [x] Super Admin dashboard (`/admin`) with role-based access control (`SUPER_ADMIN`), platform overview KPIs, system health status, shop moderation (Approve, Suspend, Activate, Tier Upgrade), user management, and security audit log viewer
- [x] Comprehensive documentation suite (Architecture, Installation, Customer Manual, Shop Owner Manual, Super Admin Manual, Print Agent Manual, Testing Report, Deployment Guide, Known Limitations)
- [x] Automated Phase 5 test suite (42/42 tests passing) + regression verification across all 164+ tests

---

## Documentation Suite

| Document | Purpose |
|---|---|
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | High-level system architecture, subsystem interactions, and security zones |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Step-by-step setup guide for Backend, Frontend, and Print Agent |
| [docs/CUSTOMER_USER_MANUAL.md](docs/CUSTOMER_USER_MANUAL.md) | Customer walk-through: QR scanning, upload, options, privacy, and tracking |
| [docs/SHOP_OWNER_USER_MANUAL.md](docs/SHOP_OWNER_USER_MANUAL.md) | Shop owner guide: Orders, pricing, direct printing, expiry, and payments |
| [docs/SUPER_ADMIN_USER_MANUAL.md](docs/SUPER_ADMIN_USER_MANUAL.md) | Platform administrator guide: Shop moderation, tiers, users, and audit logs |
| [docs/PRINT_AGENT_MANUAL.md](docs/PRINT_AGENT_MANUAL.md) | Windows Print Agent setup, Win32 spooler integration, and troubleshooting |
| [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md) | Automated testing report covering 164+ test cases across Phases 1–5 |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Production deployment on Ubuntu with Nginx, SSL, PM2, MySQL, and Redis |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | Architectural boundaries, constraints, and future product roadmap |
| [docs/API.md](docs/API.md) | Complete REST API and Socket.IO specification |
| [docs/DATABASE.md](docs/DATABASE.md) | MySQL schema documentation and multi-tenancy rules |
| [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md) | Entity-Relationship diagram in Mermaid |
| [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) | Zero-trust data retention, physical file unlinking, and privacy protocols |

---

## Security Notes

- Passwords hashed with **Argon2id** (memory-hard, resistant to GPU cracking)
- JWT access tokens expire in **7 days** (configurable)
- Refresh tokens stored in DB, revocable on logout
- **Multi-tenant isolation**: every shop-scoped query verified server-side
- **Zero-trust document privacy**: files auto-purged on expiration, HTTP 410 on access, no public asset routes
- **PCI-DSS compliant payment flow**: zero raw card numbers stored, HMAC signature verification, idempotent webhooks
- Rate limiting on auth endpoints (10 requests / 15 min)
- Input validation on all endpoints
- Helmet.js security headers
- CORS restricted to configured origins

---

## Development Commands

```bash
# Backend
npm run dev          # Start with nodemon
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed demo data

# Frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
```
