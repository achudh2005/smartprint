# SmartPrint — AWS Deployment Readiness & Architecture Inspection Report

**Date:** November 2026  
**Auditor:** Senior AWS Cloud Architect & DevOps Specialist  
**Target Platform:** Amazon Web Services (AWS)  
**Target Region:** `ap-south-1` (Mumbai, India)  
**Budget Policy:** ₹0 Hosting Target (AWS Free Tier Eligible Architecture)

---

## 1. Executive Summary

SmartPrint is an enterprise-grade, QR-based, multi-tenant cloud printing and document lifecycle management platform. The codebase has been fully audited and inspected. It is well-structured, production-hardened, and natively compatible with an AWS single-instance EC2 architecture running Ubuntu Linux with Nginx and PM2, keeping the deployment strictly within the AWS Free Tier (₹0 monthly cost).

---

## 2. Core Technology Stack Inspection

| Component | Technology | Version | Purpose / Deployment Detail |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React / Single Page App (SPA) | 18.x | Dynamic responsive customer upload portal & shop dashboard |
| **Frontend Build Tool** | Vite | 5.4.21 | Compiles static production bundle into `frontend/dist` |
| **Styling** | Tailwind CSS + Lucide Icons | Latest | Mobile-first responsive UI |
| **Backend Runtime** | Node.js | >= 18.0.0 (v20+ LTS recommended) | Asynchronous event-driven server runtime |
| **Backend Framework** | Express.js | 4.21.1 | REST API routing, rate limiting, and middleware pipeline |
| **Real-time Engine** | Socket.IO | 4.8.4 | Real-time bi-directional events for instant order alerts |
| **Database & Engine** | MySQL | 8.0 Compatible | Relational storage for users, shops, orders, pricing |
| **ORM & Migrations** | Prisma Client & CLI | 5.22.0 | Type-safe schema definition and migrations |
| **Persistence Fallback** | In-Memory / File Store | Custom | Zero-config fallback store guaranteeing zero downtime |
| **Password Hashing** | Argon2id | 0.41.1 | Winner of Password Hashing Competition; memory-hard defense |
| **Authentication** | JWT (JSON Web Tokens) | 9.0.2 | Stateless Bearer authentication with refresh token lifecycle |
| **Document Processing**| pdf-lib & Multer | 1.17.1 / 2.5.0 | PDF page counting, validation, and multi-file uploads |
| **Queue & Cache** | BullMQ & ioredis | 6.7.2 / 6.0.0 | Job queuing with internal timer fallback for document expiry |
| **Process Manager** | PM2 / systemd | Latest | Keeps Node.js backend alive 24/7 across server reboots |
| **Web Server / Proxy** | Nginx | 1.24+ | Reverse proxy, static asset delivery, SSL termination, WebSockets |

---

## 3. Security & Multi-Tenancy Architecture

1. **Multi-Tenant Shop Isolation:**
   - Every shop is identified by a unique `shopCode` (e.g., `SP-XXXX-XXXX`) and internal `id`.
   - All protected endpoints enforce `requireShopMembership` and role-based access control (`OWNER`, `MANAGER`, `OPERATOR`).
   - Socket.IO connection rooms (`shop_<shopId>`) enforce JWT token validation and membership checks before allowing join events.
2. **File Storage & Privacy:**
   - Documents are stored in segregated directories: `uploads/shop_<shopId>/session_<sessionToken>/<uuid>.<ext>`.
   - Filenames are randomized with UUIDv4 on disk, preventing directory traversal and execution of malicious filenames.
   - Banned-extension firewall explicitly rejects `.exe`, `.bat`, `.sh`, `.php`, `.js`, `.py`, `.svg`, `.html`.
   - Binary magic-byte signatures (`%PDF`, `\x89PNG`, `JPEG`, `ZIP`) are checked on every upload.
   - Previews are served with `Content-Security-Policy: default-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`.
3. **HTTP Security Headers:**
   - Helmet provides HSTS (31536000s), Clickjacking protection (`SAMEORIGIN`), and `X-Powered-By` masking.
   - Dual rate limiters protect auth routes (max 20 attempts / 15 mins) and customer uploads (max 60 requests / 15 mins).

---

## 4. Recommended AWS Free Tier Architecture

To maintain a **₹0 budget**, we select resources that fit entirely within the **AWS 12-Month Free Tier**:

```
Internet (Customers & Shop Owners)
       │
       ▼ (Port 80 HTTP / Port 443 HTTPS)
┌─────────────────────────────────────────────────────────────┐
│ AWS EC2 (t2.micro / t3.micro in ap-south-1 Mumbai)          │
│ OS: Ubuntu 24.04 LTS (Free Tier Eligible)                  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Nginx (Reverse Proxy & Web Server)                  │   │
│   │  ├─ /        ──> Serves compiled React (frontend/dist)│   │
│   │  ├─ /api/    ──> Proxy to Node.js backend (Port 5000)│   │
│   │  └─ /socket.io ─> WebSocket Upgrade (Port 5000)     │   │
│   └─────────────────────────┬───────────────────────────┘   │
│                             │                               │
│   ┌─────────────────────────▼───────────────────────────┐   │
│   │ PM2 Process Manager                                 │   │
│   │  └─ SmartPrint Backend (Node.js on 127.0.0.1:5000)  │   │
│   └─────────────────────────┬───────────────────────────┘   │
│                             │                               │
│   ┌─────────────────────────▼───────────────────────────┐   │
│   │ Local Database Engine                               │   │
│   │  └─ MySQL 8.0 on 127.0.0.1:3306                     │   │
│   │     (Zero network latency, $0 extra AWS cost)        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Storage: 30 GB gp3 EBS Volume (Free Tier Eligible)         │
│ Security Group: Inbound 80, 443, 22 (SSH). Internal ports  │
│                 3306 and 5000 completely blocked from web.  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Free Tier Eligibility & Cost Breakdown

| AWS Resource | Free Tier Allowance | SmartPrint Allocation | Estimated Monthly Cost |
| :--- | :--- | :--- | :--- |
| **EC2 Instance** | 750 hours/month of `t2.micro` or `t3.micro` | 1 instance running 24/7 (720–744 hrs) | **₹0.00** |
| **EBS Storage** | 30 GB of General Purpose (SSD) storage | 30 GB gp3 volume (OS + App + MySQL) | **₹0.00** |
| **Data Transfer Out** | 100 GB/month free out to the internet | ~5–10 GB estimated for PDF/previews | **₹0.00** |
| **IPv4 Address** | 750 hours/month free (under EC2 free tier) | 1 Public IPv4 address attached to EC2 | **₹0.00** |
| **Nginx & Let's Encrypt** | Open-source software & Free SSL | Built-in Certbot SSL termination | **₹0.00** |
| **Total Estimated Cost** | — | — | **₹0.00 / month** |

---

## 6. Deployment Prerequisites & Checklist

- [x] Application code production-ready & hardened.
- [x] Dynamic origin resolution implemented for QR codes & customer portal URLs.
- [x] Dual payment support (Pay at Counter & Razorpay) verified.
- [x] Customer name and phone identification active.
- [x] Security headers and rate limiting configured.
- [ ] AWS CLI installed and authenticated.
- [ ] EC2 Key Pair (`smartprint-key.pem`) generated.
- [ ] EC2 Security Group configured (Ports 22, 80, 443).
- [ ] Ubuntu EC2 instance provisioned in `ap-south-1`.
- [ ] Server automated provisioning script executed.
- [ ] Repository cloned and built on EC2.
- [ ] Nginx virtual host and PM2 service operational.
- [ ] Public IP / DNS verified.
