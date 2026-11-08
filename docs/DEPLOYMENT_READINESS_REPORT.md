# SmartPrint – Deployment Readiness Report

**Generated:** 2026-11-08  
**Author:** Achudh Shaji  
**Project:** SmartPrint – Cloud-Enabled Multi-Tenant QR Printing System  
**System Status:** Ready for GitHub Repository & Cloud Hosting

---

## 1. Executive Summary

SmartPrint is an end-to-end, multi-tenant cloud printing and document management platform. It eliminates the traditional WhatsApp/email workflow for print shops by allowing customers to walk up to any physical shop, scan a shop-specific QR code, upload documents directly from their mobile browser without creating an account or providing sensitive personal information, configure print settings (pages, copies, color, duplex, binding), view calculated pricing, and track the real-time fulfillment status of their print order.

Shop owners access a centralized web dashboard to monitor incoming orders in real time, preview documents securely, configure custom pricing rules and additional services, trigger prints, and manage physical printers via a lightweight Windows Print Agent.

---

## 2. Technology Stack & Component Audit

| Layer | Component | Version | Role in Architecture |
|---|---|---|---|
| **Frontend** | React SPA | 18.3.1 | Single-Page Application (Customer Portal, Shop Dashboard, Super Admin) |
| **Tooling** | Vite | 5.4.10 | High-performance bundling, development server & production builds |
| **Routing** | React Router DOM | 6.27.0 | Client-side routing with public QR paths and role-based protected routes |
| **Styling** | Tailwind CSS | 3.4.14 | Responsive utility-first design with light/dark theme support |
| **Icons** | Lucide React | 0.456.0 | Semantic UI icons |
| **Backend** | Node.js + Express | Express 4.21.1 | REST API, static asset streaming, webhooks & session management |
| **Real-Time** | Socket.IO | 4.8.4 | Bi-directional WebSocket events for order creation, status & notifications |
| **Database ORM** | Prisma | 5.22.0 | Type-safe queries, migration tooling (MySQL 8.0 & fallback engine) |
| **Security** | Argon2id + JWT | 0.41.1 / 9.0.2 | Enterprise password hashing & stateless access/refresh tokens |
| **File Processing** | PDF-Lib + Multer | 1.17.1 / 2.5.0 | Secure upload stream parsing, page count calculation & verification |
| **Payments** | Razorpay SDK | 2.9.8 | Optional UPI, Card & NetBanking online checkout with HMAC SHA256 verification |
| **Print Agent** | Python Spooler | Python 3.10+ | Local Windows spooler integration using Win32Print & REST API polling |

---

## 3. Production Readiness Verification

### 3.1 API & Environment Isolation
- Frontend API base URL configured dynamically via `import.meta.env.VITE_API_URL` with fallback to local proxy.
- CORS configured via `ALLOWED_ORIGINS` environment variable.
- Rate limiting configured with proxy trust (`trust proxy`) to allow high-concurrency client polling while preventing brute-force attacks.

### 3.2 Document Storage & Privacy
- Uploaded customer documents stored in isolated shop paths (`uploads/shop_<shopId>/session_<sessionToken>/`).
- Documents are protected by authorization checks (only the customer session or authenticated shop members can view/stream).
- Automatic document lifetime expiry purges physical files from disk according to configured retention policies (15m, 1h, 3h, 8h).

### 3.3 Database Flexibility
- Designed for MySQL 8.0 / Amazon RDS / Google Cloud SQL.
- Zero-config persistent store fallback ensures local demonstrations, viva evaluations, and staging environments run seamlessly without external database servers.

---

## 4. Recommended Cloud Hosting Architectures

### Option A: Small Linux Cloud VPS (Recommended for MCA Viva & Production Rollout)
* **Providers:** Hetzner Cloud (CX22 ~€4/month), DigitalOcean Droplet ($6–$12/month), AWS Lightsail ($5–$10/month).
* **Architecture:** Docker Compose with Node.js backend container, Nginx reverse proxy serving built React assets with SSL (Let's Encrypt), and local/managed MySQL.
* **Benefits:** Complete control, persistent local storage volumes for customer uploads, fixed low monthly cost, zero cold starts.

### Option B: Cloud PaaS (Render / Railway / Vercel)
* **Frontend:** Vercel or Render Static Site (Free tier, global CDN, auto-deploy from GitHub).
* **Backend:** Render Web Service ($7/mo) with Persistent Disk attached at `/uploads`.
* **Database:** Aiven Free MySQL or Render Managed MySQL.

---

## 5. Security & Compliance Checklist
- [x] Zero plain-text credentials in repository.
- [x] `.env` excluded from version control via `.gitignore`.
- [x] Customer uploaded documents excluded from version control.
- [x] Passwords hashed with Argon2id (memory: 64MB, iterations: 3, parallelism: 4).
- [x] JWT access tokens (7-day validity) and refresh tokens with DB revocation.
- [x] HMAC SHA256 signature verification on Razorpay payment webhooks.
- [x] Path traversal protections on all file streaming and download endpoints.
