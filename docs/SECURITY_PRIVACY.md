# SmartPrint – Security, Privacy & Data Retention Architecture

## 1. Customer Document Privacy Principles

SmartPrint enforces a zero-trust, privacy-first architecture for all customer uploads:

1. **Anonymous Submission Without PII:**
   - Customers never provide email addresses, phone numbers, names, or account credentials.
   - Sessions are identified exclusively via cryptographically secure, high-entropy tokens (`crypto.randomBytes(32).toString('hex')`).
   - Tokens are tied strictly to the originating shop and expire automatically. Sequential database IDs are never exposed to customers.

2. **Private Storage & Protected Access:**
   - Uploaded documents and generated preview files are stored in private, unguessable storage directories (`uploads/{shopId}/{orderId}/{uuid}.ext`).
   - Direct public access to the storage directory is strictly disabled in Express middleware (`express.static` is never mounted over uploaded customer files).
   - Document previews and downloads are routed through authenticated backend streaming controllers (`/api/v1/customer/files/:fileId/download`, `/api/v1/customer/files/:fileId/preview`, and shop owner equivalents) that verify active session ownership or multi-tenant shop ownership prior to streaming bytes.

3. **Strict Lifetime Expiry & Automatic Purging:**
   - Supported expiry options: `15m` (15 minutes), `1h` (1 hour), `3h` (3 hours), `8h` (8 hours).
   - Shop owners configure enabled options, default option, and maximum expiry in Shop Settings.
   - File lifetime countdown starts the moment customer upload completes and is committed with an absolute UTC `expiresAt` timestamp.
   - Background deletion jobs are scheduled via BullMQ and Redis (with a resilient in-process timer queue fallback).
   - When a document expires:
     1. Database records are marked `EXPIRED` and `isPurged = true`.
     2. Original documents, generated PDF previews, and temporary conversion copies are permanently unlinked (`fs.unlink`) from the disk/storage.
     3. An entry is recorded in `expiry_logs` documenting previous expiry, new expiry, action (`AUTO_EXPIRED` or `IMMEDIATE_DELETION`), bytes freed, and acting user.
     4. Real-time WebSocket notifications notify the shop owner.

4. **HTTP 410 Gone Gatekeeper:**
   - Any subsequent request to download, preview, or physically print (`recordPrintJob`) an expired or purged document is intercepted by `assertDocumentNotExpired()`, returning `HTTP 410 Gone` with message `"Document has expired and was permanently purged for customer privacy."`
   - Expired documents can never be reprinted or recovered.

5. **Honest Data & Backup Retention Disclosure:**
   - SmartPrint does not maintain hidden archival replicas or shadow copies of customer documents.
   - Once the deletion job triggers or an owner clicks "Purge Files Now", all active copies on the operational storage layer are unlinked immediately.
   - Operational backups (if configured at the database level) store metadata only (order totals, timestamps, and expiry audit logs). Document binary blobs are not stored in database backups.

---

## 2. Payment Security & Integrity (Razorpay)

1. **Zero Cardholder Data Storage:**
   - SmartPrint servers never receive, process, or store credit card numbers, CVVs, expiry dates, or bank account credentials.
   - All card entry and authentication occurs within Razorpay's PCI-DSS Level 1 certified checkout iframe.

2. **Backend Order Creation & Server-Side Pricing Verification:**
   - Frontend amounts are never trusted. The order amount is calculated server-side from page count, color mode, paper specifications, and shop rate cards.
   - The Razorpay order is created via the backend API with the verified amount in paise (`amount * 100`).

3. **Cryptographic HMAC-SHA256 Signature Verification:**
   - Upon completion of client-side payment, the frontend submits `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
   - The backend validates the signature using HMAC-SHA256:
     ```javascript
     const expectedSignature = crypto
       .createHmac('sha256', razorpayKeySecret)
       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
       .digest('hex');
     ```
   - If the signature does not match, the request is rejected with `HTTP 400 Bad Request` and logged as a security alert.

4. **Webhook Security & Replay Attack Mitigation (Idempotency):**
   - Webhooks sent from Razorpay are verified against `RAZORPAY_WEBHOOK_SECRET` using `crypto.createHmac('sha256', secret)`.
   - Every webhook payload transaction ID is checked against existing `Payment` records in the database.
   - If a payment with that transaction ID is already marked `SUCCESS`, the webhook returns an idempotent `HTTP 200 OK` response without duplicating state transitions, print triggers, or accounting ledger records.

5. **Offline Counter Payments:**
   - When a shop owner disables online payments (`paymentEnabled: false`), Razorpay online order creation is blocked.
   - Orders are assigned `COUNTER_PAYMENT_DUE`.
   - The shop owner confirms physical cash or offline UPI collection via the dashboard modal (`POST /api/v1/shops/:shopId/orders/:orderId/counter-payment`), updating the status to `COUNTER_PAYMENT_COLLECTED` and recording the collecting user ID in the audit trail.

---

## 3. Application & Infrastructure Security

1. **Authentication & Password Hashing:**
   - Shop owner and staff passwords are encrypted using **Argon2id** (`argon2.hash`) with hardened memory cost (65536 KB), time cost (3 iterations), and parallelism (4 threads).
   - Authentication tokens use stateless JWTs with short expiry (`JWT_EXPIRES_IN=7d`) and cryptographic signature verification.

2. **Multi-Tenant Isolation:**
   - Every shop dashboard API route enforces multi-tenant authorization (`req.user.id` matches `Shop.ownerId` or an authorized `ShopUser` association).
   - Attempts to view or mutate another shop's orders, payments, files, or settings return `HTTP 403 Forbidden`.

3. **Rate Limiting & Abuse Prevention:**
   - Global rate limiter: `100` requests per 15-minute window per IP.
   - Strict auth rate limiter: `10` login/register attempts per 15-minute window per IP to thwart brute-force password cracking.
   - File upload size and MIME type verification validates magic numbers / file signatures in addition to file extensions.

4. **Information Disclosure Prevention:**
   - Error messages returned to clients never leak stack traces, database connection strings, or system paths in production.
   - Structured JSON logging via Winston records security events (failed signatures, invalid access attempts) while redacting sensitive fields.
