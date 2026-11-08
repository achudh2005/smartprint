# SmartPrint — AWS Production Environment Variables Reference

This document lists all configuration variables required for hosting SmartPrint in production on AWS EC2.

> [!CAUTION]
> **NEVER commit production `.env` files to GitHub or public repositories.** Always configure them directly on the EC2 server in `/home/ubuntu/smartprint/backend/.env`.

---

## 1. Database Configuration

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `"mysql://smartprint_user:<PASSWORD>@localhost:3306/smartprint"` | Prisma connection string to local MySQL 8.0 on EC2 |
| `DB_HOST` | `localhost` | Database host (127.0.0.1 loopback) |
| `DB_PORT` | `3306` | MySQL port (never open to the internet) |
| `DB_NAME` | `smartprint` | MySQL database name |
| `DB_USER` | `smartprint_user` | Dedicated unprivileged MySQL user |
| `DB_PASSWORD` | `<STRONG_GENERATED_PASSWORD>` | MySQL user password |

---

## 2. Server & Networking Configuration

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production error handling, security headers, and disables debug logging |
| `PORT` | `5000` | Internal backend port (proxied through Nginx port 80/443) |
| `FRONTEND_URL` | `"http://<EC2_PUBLIC_IP>"` or `"https://yourdomain.com"` | Public base URL used for links and redirects |
| `ALLOWED_ORIGINS` | `"http://<EC2_PUBLIC_IP>,https://yourdomain.com"` | Comma-separated CORS allowed domains |

---

## 3. Cryptography & Authentication (JWT & Argon2)

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | *64+ character random string* | Secret key for signing and verifying access tokens |
| `JWT_EXPIRES_IN` | `7d` | Access token lifespan |
| `JWT_REFRESH_SECRET` | *64+ character random string* | Secret key for issuing refresh tokens |
| `JWT_REFRESH_EXPIRES_IN`| `30d` | Refresh token lifespan stored in MySQL |
| `ARGON2_MEMORY_COST` | `65536` | 64 MB memory cost for Argon2id hashing |
| `ARGON2_TIME_COST` | `3` | Iteration count |
| `ARGON2_PARALLELISM` | `4` | Thread parallelism count |

---

## 4. Rate Limiting & DoS Protection

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 minutes) | Rate limiter evaluation window |
| `RATE_LIMIT_MAX_REQUESTS` | `10000` | Max total API requests per IP window |
| `AUTH_RATE_LIMIT_MAX` | `20` | Max login/register attempts per IP window (brute-force defense) |

---

## 5. Storage & Privacy Lifecycle

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `STORAGE_PROVIDER` | `local` | Uses local private filesystem directory |
| `STORAGE_LOCAL_PATH` | `./uploads` | Storage root path (segregated by shop & session) |
