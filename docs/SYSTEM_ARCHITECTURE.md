# SmartPrint System Architecture & Technical Design

## 1. Executive Summary
**SmartPrint** is a high-performance, multi-tenant cloud print management platform designed for commercial printing shops, university copy centers, and document kiosks. It eliminates customer friction through zero-registration QR code uploads while providing shop operators with real-time order dispatch, physical Windows direct printing automation, verifiable financial analytics, and multi-tenant security isolation.

---

## 2. Platform Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer (Untrusted Edge)"]
        Customer["Anonymous Customer (Mobile/Desktop Browser)\n• Scans QR Code (/s/:shopCode)\n• Uploads docs (PDF/Images)\n• Configures options & pays"]
        ShopOperator["Shop Owner / Staff (React Dashboard)\n• Real-time WebSocket order stream\n• Spooler dispatch & retry\n• Analytics & financial ledgers"]
        SuperAdmin["Platform Super Admin\n• Platform overview & KPIs\n• Shop moderation & subscriptions\n• Immutable audit logs"]
    end

    subgraph IngressLayer["Edge Ingress & Reverse Proxy"]
        Nginx["Nginx Reverse Proxy / Cloudflare\n• SSL/TLS Termination\n• Request rate limiting\n• Static asset caching"]
    end

    subgraph ApplicationLayer["Application Core (Node.js / Express)"]
        APIServer["SmartPrint REST API & WebSocket Server\n• JWT & HMAC Auth Gatekeepers\n• Multi-tenant tenantId resolution\n• Dynamic file validation & magic-byte check\n• Price estimation engine"]
        SocketServer["Socket.IO Gateway\n• Shop-isolated rooms (shop:shopId)\n• Order lifecycle events\n• Direct print dispatch triggers"]
    end

    subgraph DataLayer["Persistence & Storage Layer"]
        MySQL[("MySQL 8.0 Primary Database\n• Prisma ORM\n• Orders, Files, Printers, PrintJobs\n• Payments, Ledgers, AuditLogs")]
        LocalStorage[("Encrypted Local Disk / Object Store\n• Chrooted uploads directory\n• Ephemeral previews & originals\n• Wiped upon expiry (Zero-Trust)")]
        RedisQueue[("Redis 7.0 & BullMQ / In-Process Timers\n• Asynchronous lifetime expiry jobs\n• Idempotent payment webhooks")]
    end

    subgraph PrintAgentLayer["On-Premises Hardware Layer"]
        WinAgent["SmartPrint Windows Print Agent (Python)\n• Authenticates via shopCode & agentToken\n• Win32 Spooler Integration (win32print)\n• Automated polling & status reporting\n• Zero-retention disk wiping"]
        WinPrinters["Physical Shop Printers\n• HP / Canon / Epson / Xerox\n• B&W / Color Laser / Multi-function"]
    end

    %% Flow connections
    Customer -->|HTTPS / Multipart Upload| Nginx
    ShopOperator -->|WSS / HTTPS| Nginx
    SuperAdmin -->|HTTPS Role: SUPER_ADMIN| Nginx
    Nginx --> APIServer
    Nginx --> SocketServer

    APIServer --> MySQL
    APIServer --> LocalStorage
    APIServer --> RedisQueue
    SocketServer --> APIServer

    WinAgent -->|HTTPS Polling & Status| APIServer
    WinAgent -->|Win32 Spooler API| WinPrinters
```

---

## 3. Core Architectural Subsystems

### 3.1 Anonymous Customer Portal Subsystem
- **Zero-Registration Ingress:** Customers scan physical QR code (`/s/:shopCode`), creating a high-entropy ephemeral `CustomerSession` cookie without revealing phone, email, or personal identity.
- **Client-Side File Preprocessing:** Evaluates page counts using `pdf-lib`, calculates pricing via server-side rules, and enables client previewing.
- **Payment Abstraction:** Supports Razorpay online payments with HMAC-SHA256 signature verification or Cash/UPI counter collection.

### 3.2 Real-Time Order Management Subsystem
- **Bi-Directional WebSockets:** Powered by Socket.IO with multi-tenant room isolation (`shop:<shopId>`).
- **State Machine Enforcement:** Governs order statuses (`PENDING` -> `ACCEPTED` -> `PROCESSING` -> `PRINTING` -> `PRINTED` -> `READY` -> `COLLECTED`) preventing invalid workflow transitions.
- **Audio & Visual Alerts:** Audible chimes and browser push notifications on order arrival.

### 3.3 Zero-Trust Privacy & Lifetime Expiry Subsystem
- **Time-To-Live (TTL) Enforcement:** Documents automatically expire based on shop/customer settings (15m, 1h, 3h, 8h).
- **Physical Unlinking:** The background worker unlinks original files, converted PDFs, and temporary previews, recording SHA-256 signatures and freed byte tallies in `ExpiryLog`.
- **In-Flight Print Safety:** Purges are automatically deferred if an order is in active `PRINTING` status until output completion.

### 3.4 Windows Direct Printing Subsystem
- **Shop-Agent Security Token:** Dedicated 64-character cryptographic tokens register the on-premises print agent.
- **Spooler Lifecycle Tracking:**
  $$\text{QUEUED} \longrightarrow \text{DOWNLOADED} \longrightarrow \text{SUBMITTED\_TO\_OS} \longrightarrow \text{DRIVER\_COMPLETED} \longrightarrow \text{MANUALLY\_CONFIRMED}$$
- **Zero-Retention Print Spooler:** Downloaded documents are streamed directly to the Windows Spooler and wiped from local temporary storage immediately.

### 3.5 Business Intelligence & Super Admin Moderation Subsystem
- **Strict Financial Verification:** Revenue tallies exclusively online `SUCCESS` payments and verified `COUNTER_PAYMENT_COLLECTED` cash entries. Pending estimates are strictly omitted.
- **Verified Print Counting:** Page metrics are derived exclusively from completed `PrintJob` spooler records.
- **Platform Governance:** Super Admin role-based controls for tenant lifecycle (Approve, Suspend, Activate, Tier Upgrades) with immutable system event auditing.
