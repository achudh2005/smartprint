# SmartPrint – Database Documentation

## Overview

SmartPrint uses a MySQL 8.0+ database managed via **Prisma ORM**.

- **18 tables** covering the full application domain
- **Multi-tenant** architecture: every shop-scoped table has a `shop_id` column
- **Decimal** fields for all monetary values (never float)
- **UUID** public identifiers for all externally-exposed entities
- **Enum** types for all statuses, modes and categories
- **Indexes** on all foreign keys and common query columns

---

## Table Reference

| Table | Purpose |
|-------|---------|
| `users` | Platform user accounts |
| `refresh_tokens` | JWT refresh token store |
| `shops` | Print shop entities |
| `shop_users` | Many-to-many: users ↔ shops with roles |
| `shop_settings` | Per-shop configuration |
| `customer_sessions` | QR session for walk-in customers |
| `orders` | Customer print orders |
| `order_files` | Uploaded documents per order |
| `print_configurations` | Print settings per file |
| `pricing_rules` | Shop-defined pricing matrix |
| `additional_services` | Binding, lamination, etc. |
| `order_file_services` | Services applied per file |
| `payments` | Payment attempts per order |
| `printers` | Physical printers per shop |
| `print_jobs` | Print job attempts per file |
| `order_status_logs` | Status change history |
| `expiry_logs` | Session expiry audit |
| `notifications` | In-app notifications |
| `audit_logs` | Full audit trail |

---

## Multi-Tenancy Rules

- Every order, file, pricing rule, service, and printer is owned by a **specific shop** via `shop_id`.
- Backend authorization **always** verifies `shop_id` against the authenticated user's `shop_users` membership.
- Frontend-supplied `shop_id` values are **never trusted** without server-side verification.

---

## Key Relationships

```
User ──(many)── ShopUser ──(many)── Shop
                                     │
                              ┌──────┴──────────────────┐
                              │                          │
                         ShopSettings             PricingRule[]
                         CustomerSession[]        AdditionalService[]
                         Order[]                  Printer[]
                              │
                         OrderFile[]
                              │
                    ┌─────────┴─────────┐
                    │                   │
             PrintConfiguration   PrintJob[]
             OrderFileService[]
```

---

## Phase 5 Schema Enhancements

### 1. `shops`
- `agent_token`: Unique 64-character token used by the Windows Print Agent daemon for high-entropy machine authentication.
- `subscription_tier`: Enum (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`) for SaaS monetization and feature gating.

### 2. `printers`
- `is_active`: Boolean flag enabling shop owners to toggle printers without deleting them.
- `last_seen_at`: Timestamp updated by the Windows Print Agent during printer sync and heartbeat polls.
- `connection_type`: Type of printer connection (`WINDOWS_SPOOLER`, `NETWORK`, `USB`).

### 3. `print_jobs`
- `idempotency_key`: Unique string preventing duplicate print job creation across retries and client resubmissions.
- `job_ticket`: JSON document containing exact driver settings (`copies`, `colorMode`, `paperSize`, `pageRange`, `duplexMode`).
- `agent_notes`: Text field logging driver error strings or spooler diagnostics without storing customer document contents.
- `PrintJobStatus` expanded: `QUEUED`, `DOWNLOADED`, `SUBMITTED_TO_OS`, `DRIVER_COMPLETED`, `MANUALLY_CONFIRMED`, `SENDING`, `PRINTING`, `COMPLETED`, `FAILED`, `CANCELLED`.

### 4. `audit_logs`
- `user_id`: Reference to the Super Admin or shop user performing the action.
- `shop_id`: Scoped shop (optional for platform-wide actions).
- `action`: Canonical event identifier (`SHOP_SUSPENDED`, `SHOP_ACTIVE`, `USER_UPDATED`, etc.).
- `details`: JSON payload capturing old and new status, reasons, and contextual metadata.

---

## Conventions

| Convention | Detail |
|-----------|--------|
| IDs | Auto-increment integer (internal) |
| Public IDs | UUID v4 (external/API) |
| Monetary | `DECIMAL(10,2)` |
| Timestamps | `DATETIME` with DEFAULT CURRENT_TIMESTAMP |
| Soft delete | Not used in Phase 1 (uses status enums) |
| Charset | `utf8mb4` / `utf8mb4_unicode_ci` |

---

## Setup

```bash
# 1. Create database
mysql -u root -p < database/schema.sql

# 2. Generate Prisma client
cd backend && npx prisma generate

# 3. Push schema (dev) or migrate (prod)
npx prisma db push          # dev
npx prisma migrate dev      # production-ready
```
