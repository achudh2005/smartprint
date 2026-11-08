# SmartPrint — AWS Production Security Checklist & Audit

## 1. Cloud Network & Port Audit

| Port | Protocol | Scope | Intended Access | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| **22** | TCP (SSH) | Restrict to Admin IP | Remote management | Inbound rule restricted in Security Group ✅ |
| **80** | TCP (HTTP) | Public (`0.0.0.0/0`) | Nginx web traffic | Open for client & customer web traffic ✅ |
| **443** | TCP (HTTPS)| Public (`0.0.0.0/0`) | Encrypted SSL web traffic | Open for secure web traffic ✅ |
| **3306**| TCP (MySQL)| Loopback (`127.0.0.1` only)| Local database queries | Blocked from internet in Security Group & UFW ✅ |
| **5000**| TCP (Node) | Loopback (`127.0.0.1` only)| Backend API server | Blocked from internet; proxied via Nginx ✅ |

---

## 2. Server OS Hardening (Ubuntu 24.04 LTS)

- [x] **Unprivileged User Execution:** Application runs under `ubuntu` non-root service account.
- [x] **UFW Firewall Active:** Default deny on all inbound connections; only explicit ports 22, 80, 443 permitted.
- [x] **MySQL Loopback Binding:** MySQL configured with `bind-address = 127.0.0.1`.
- [x] **Dedicated Database User:** `smartprint_user` granted access only to the `smartprint` database; root login disabled remotely.
- [x] **SSH Key-Based Authentication:** Password authentication disabled; login requires RSA 2048/4096-bit private key.

---

## 3. Application Security & Privacy Audit

- [x] **Executable Malware Shield:** Executable and scripting formats (`.exe`, `.bat`, `.sh`, `.php`, `.js`, `.py`, `.html`, `.svg`) strictly banned.
- [x] **Double Extension Defense:** Filenames parsed and validated at the binary magic-byte level.
- [x] **UUID Isolation on Disk:** Uploaded files renamed to random UUIDv4 on disk (`crypto.randomUUID()`).
- [x] **Document Preview Sandboxing:** Inline previews served with `sandbox` CSP and `nosniff` headers.
- [x] **Brute-Force Rate Limiting:** Auth endpoints capped at 20 attempts per 15 minutes; uploads capped at 60 requests per 15 minutes.
- [x] **Input Sanitization:** Customer name, phone, and order notes sanitized against Stored XSS.
- [x] **Server Masking:** `X-Powered-By` header stripped; HSTS (31536000s) active.
