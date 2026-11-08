# SmartPrint – API Documentation

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

---

## Auth Endpoints

### POST /auth/register
Register a new shop owner account.

**Body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "publicId": "...", "name": "John Smith", "email": "...", "role": "OWNER" },
    "accessToken": "eyJ...",
    "refreshToken": "abc123..."
  }
}
```

---

### POST /auth/login
Login with email and password.

**Body:** `{ "email": "...", "password": "..." }`

**Response 200:** Same structure as register.

---

### POST /auth/logout
Revoke a refresh token.

**Body:** `{ "refreshToken": "..." }`

---

### POST /auth/refresh
Get a new access token.

**Body:** `{ "refreshToken": "..." }`

---

### GET /auth/me *(protected)*
Get the current user's profile.

---

## Shop Endpoints

### POST /shops *(protected)*
Create a new shop. The authenticated user becomes the OWNER.

**Body:**
```json
{
  "name": "Quick Print",
  "address": "123 Main St",
  "phone": "+91 98765 43210",
  "email": "shop@example.com"
}
```

---

### GET /shops *(protected)*
List all shops the user belongs to.

---

### GET /shops/:shopId *(protected, member)*
Get shop details. Only accessible to shop members.

---

### PUT /shops/:shopId *(protected, owner/manager)*
Update shop details.

---

### PATCH /shops/:shopId/settings *(protected, owner/manager)*
Update shop settings (toggles, limits, formats).

---

## Profile Endpoints

### GET /profile *(protected)*
### PUT /profile *(protected)*
### POST /profile/change-password *(protected)*

---

## Customer & QR Portal Endpoints (Phase 2)

Public-facing endpoints for anonymous document uploading and order submission via shop QR codes. No authentication, customer registration, phone number, or email required.

### GET /customer/shops/:shopCode
Retrieve public profile, logo, accepted formats, max upload size, and available services for a shop.

### POST /customer/sessions
Create or resume an anonymous customer session.
- **Body:** `{ "shopCode": "SP-XXXX-YYYY", "existingToken": "cs_..." (optional) }`
- **Response:** `{ sessionToken, expiresAt, draftOrder, shop }`

### GET /customer/sessions/:sessionToken
Get active session status and currently draft order with files and live pricing.

### POST /customer/sessions/:sessionToken/files
Upload one or multiple documents (`multipart/form-data`, field: `files`).
- Validates file extensions, size limits, and magic byte signatures.
- Automatically calculates page counts (PDF, images, plain text).
- Creates initial `PrintConfiguration` and computes dynamic pricing.

### DELETE /customer/sessions/:sessionToken/files/:filePublicId
Remove an uploaded document and delete physical file from private storage.

### PUT /customer/sessions/:sessionToken/files/:filePublicId/config
Update print configuration for a document.
- **Body:**
```json
{
  "copies": 2,
  "colorMode": "COLOR",
  "paperSize": "A4",
  "duplexMode": "DUPLEX_LONG_EDGE",
  "orientation": "PORTRAIT",
  "pageRange": "1-5, 8"
}
```

### POST /customer/sessions/:sessionToken/files/:filePublicId/services
Attach an additional finishing service (lamination, binding, stapling) to a file.
- **Body:** `{ "serviceId": 1, "quantity": 1 }`

### DELETE /customer/sessions/:sessionToken/files/:filePublicId/services/:serviceId
Remove an attached service from a file.

### POST /customer/sessions/:sessionToken/confirm
Finalize and submit the customer print order.
- Calculates authoritative final order total on the server.
- Sets order status to `CONFIRMED`.
- Marks session as `COMPLETED`.
- **Body:** `{ "notes": "Please staple on the top-left corner" }`
- **Response:** Returns finalized order with public `orderNumber` (e.g. `ORD-20261107-7K2X`).

### GET /customer/orders/:orderNumber
Public order status lookup and tracker for customers.

### GET /customer/files/:filePublicId/preview
Secure document stream for in-browser preview (PDFs, images).

---

## Shop Owner QR, Pricing & Order Endpoints (Phase 2)

### GET /shops/:shopId/qr *(protected)*
Retrieve shop QR code URL, PNG data URL, and SVG vector markup.

### POST /shops/:shopId/qr/regenerate *(protected, OWNER only)*
Regenerate a new unique `shopCode` and QR code.

### GET /shops/:shopId/pricing-rules *(protected)*
List shop's active pricing rules matrix.

### PUT /shops/:shopId/pricing-rules *(protected, OWNER/MANAGER)*
Batch update shop's pricing rules.

### GET /shops/:shopId/services *(protected)*
List additional finishing services configured for the shop.

### POST /shops/:shopId/services *(protected, OWNER/MANAGER)*
Create a new finishing service (name, price, description).

### DELETE /shops/:shopId/services/:serviceId *(protected, OWNER/MANAGER)*
Delete an additional service.

### GET /shops/:shopId/orders *(protected)*
List orders received by the shop with status filters and customer notes.

### PATCH /shops/:shopId/orders/:orderId/status *(protected)*
Progress an order through the workflow (`PENDING` → `ACCEPTED` → `PRINTING` → `PRINTED` → `READY` → `COLLECTED` / `REJECTED` / `CANCELLED`).
- **Body:** `{ "status": "PRINTED", "reason": "Printed on HP LaserJet" }`
- Records transition into `order_status_logs` with staff `changedBy` and timestamp.
- Broadcasts `order:status_changed` via Socket.IO to room `shop_{shopId}`.

---

## Shop Owner Dashboard & Production Endpoints (Phase 3)

### GET /shops/:shopId/dashboard/stats *(protected)*
Returns real-time dashboard calculations and 7-day trends:
- Today's orders count
- Total pages printed today
- Today's revenue
- Pending orders count
- Completed orders count
- Cancelled orders count
- Daily 7-day volume and revenue trend array

### GET /shops/:shopId/orders/:orderId *(protected)*
Detailed single order inspection:
- Complete order metadata, customer session reference, and notes
- Uploaded files with individual print configurations (color, duplex, copies, paper type/size)
- Detected page count, file size, attached services, and pricing breakdown
- Status audit trail history (`order_status_logs`) with previous status, new status, timestamp, and changing user
- Print jobs history (`print_jobs`) and reprint indicator (`hasPrintedBefore`)

### POST /shops/:shopId/orders/:orderId/files/:fileId/print-job *(protected)*
Record a manual print attempt:
- Logs execution record in `print_jobs` with `attemptNumber` and timestamp
- Updates file status to `PRINTED`
- Automatically updates order status to `PRINTED` if all files have been printed

### GET /shops/:shopId/files/:filePublicId/download *(protected)*
Secure authenticated document download stream with `Content-Disposition: attachment; filename="..."`.

### GET /shops/:shopId/notifications *(protected)*
Retrieve in-app notifications with unread count.

### POST /shops/:shopId/notifications/read *(protected)*
Mark notifications as read (`notificationId` optional to mark specific or all).

### POST /shops/:shopId/logo *(protected, OWNER/MANAGER)*
Upload custom shop branding logo (`multipart/form-data`, field: `logo`).

---

## Phase 4: Expiry, Privacy & Payments Endpoints

### POST /payments/razorpay/order
Creates a Razorpay payment order for customer checkout.
**Body:** `{ "sessionToken": "...", "orderId": 1 }`
**Response 200:**
```json
{
  "success": true,
  "data": {
    "orderId": 1,
    "razorpayOrderId": "order_Hk8...",
    "amount": 12000,
    "currency": "INR",
    "keyId": "rzp_test_..."
  }
}
```

### POST /payments/razorpay/verify
Verifies Razorpay HMAC-SHA256 signature and confirms order payment.
**Body:**
```json
{
  "sessionToken": "...",
  "orderId": 1,
  "razorpayOrderId": "order_Hk8...",
  "razorpayPaymentId": "pay_98a...",
  "razorpaySignature": "d98f..."
}
```
**Response 200:** Returns updated order and payment confirmation.

### POST /payments/razorpay/webhook
Receives Razorpay server webhook notifications with HMAC verification and idempotency protection against duplicate replays.
**Header:** `x-razorpay-signature: <hmac>`
**Body:** Razorpay event payload (`payment.captured`, `payment.failed`, etc.)

### POST /shops/:shopId/orders/:orderId/expiry/extend *(protected)*
Extends the document lifetime before automatic purging.
**Body:** `{ "additionalMinutes": 60 }`
**Response 200:** `{ "success": true, "data": { "newExpiresAt": "2026-11-07T..." } }`

### POST /shops/:shopId/orders/:orderId/expiry/shorten *(protected)*
Shortens the document lifetime.
**Body:** `{ "targetMinutes": 15 }`
**Response 200:** `{ "success": true, "data": { "newExpiresAt": "2026-11-07T..." } }`

### DELETE /shops/:shopId/orders/:orderId/files/purge *(protected)*
Manually and immediately purges all customer documents and previews for an order, unlinking physical files and recording an audit log.
**Response 200:**
```json
{
  "success": true,
  "data": {
    "filesPurged": 2,
    "bytesFreed": 1048576,
    "purgedAt": "2026-11-07T..."
  }
}
```

### GET /shops/:shopId/orders/:orderId/expiry-logs *(protected)*
Returns audit trail of all extensions, shortenings, auto-expirations, and manual purges for the order.

### POST /shops/:shopId/orders/:orderId/counter-payment *(protected)*
Records manual collection of counter cash or offline UPI for an order.
**Body:** `{ "paymentMethod": "CASH", "notes": "Received at billing desk" }`

### GET /shops/:shopId/payments *(protected)*
Returns shop payment ledger with summary metrics (`totalRevenue`, `onlineRevenue`, `counterRevenue`, `failedAttempts`) and filterable transaction list.

---

## Phase 5 Endpoints

### 1. Printer Management Endpoints

#### GET /shops/:shopId/printers *(protected)*
Returns all configured printers for the shop, default status, connectivity type, and agent token status.

#### POST /shops/:shopId/printers *(protected)*
Manually registers a new printer.
**Body:** `{ "name": "HP LaserJet M404", "model": "M404dn", "connectionType": "NETWORK", "isDefault": true }`

#### PUT /shops/:shopId/printers/:printerId *(protected)*
Updates printer properties (toggle `isActive`, toggle `isDefault`, change model).

#### POST /shops/:shopId/printers/agent-token *(protected)*
Generates or regenerates a cryptographically secure 64-character token for the Windows Print Agent.

#### POST /shops/:shopId/printers/dispatch-direct *(protected)*
Dispatches an order or specific file for direct printing via the Windows Print Agent.
**Body:** `{ "orderId": 12, "fileId": 45, "printerId": 2, "idempotencyKey": "custom_uuid" }`

#### GET /shops/:shopId/printers/jobs *(protected)*
Returns paginated print job execution history with attempt numbers, status, and agent notes.

#### POST /shops/:shopId/printers/jobs/:jobId/retry *(protected)*
Safely retries a failed print job, generating a new attempt with incremented attempt number.

---

### 2. Windows Print Agent Endpoints

#### POST /agent/auth *(public machine auth)*
Authenticates the on-premises Windows Print Agent daemon.
**Body:** `{ "shopCode": "CPHUB1", "agentToken": "sec_token_..." }`
**Response:** `{ "shopId": 3, "shopCode": "CPHUB1", "authenticated": true }`

#### POST /agent/printers/sync *(agent authenticated)*
Synchronizes local Windows printers detected by the spooler (`win32print`).
**Headers:** `x-shop-code: CPHUB1`, `x-agent-token: sec_token_...`
**Body:** `{ "printers": [ { "name": "Canon C3530i", "model": "Canon", "isColor": true, "isDuplex": true } ] }`

#### GET /agent/jobs/pending *(agent authenticated)*
Polls pending `QUEUED` direct print jobs for the authenticated shop.
**Response:** List of pending jobs with download URLs and driver job tickets.

#### POST /agent/jobs/:jobId/status *(agent authenticated)*
Reports spooler lifecycle transitions:
`QUEUED` -> `DOWNLOADED` -> `SUBMITTED_TO_OS` -> `DRIVER_COMPLETED` -> `MANUALLY_CONFIRMED` or `FAILED`.
**Body:** `{ "status": "SUBMITTED_TO_OS", "spoolJobId": 1042, "errorMessage": null }`

#### GET /agent/jobs/:jobId/download *(agent authenticated)*
Securely streams document binary directly to the print spooler. Returns HTTP 410 if expired.

---

### 3. Business Analytics Endpoints

#### GET /shops/:shopId/analytics *(protected)*
Computes verified business intelligence across a timeframe (`today`, `7d`, `30d`, `90d` or custom range).
- **KPIs**: Orders count, verified revenue (online `SUCCESS` + recorded `COUNTER_PAYMENT_COLLECTED`), total pages printed (from completed `PrintJob` records).
- **Breakdowns**: B&W vs Color page distribution, paper type usage (A4, A3, Legal), additional service volume.
- **Trends**: Daily aggregated orders, pages, and verified revenue.

#### GET /shops/:shopId/analytics/export/csv *(protected)*
Exports a formatted CSV business report containing summary KPIs and daily breakdown lines.

---

### 4. Super Admin Endpoints

#### GET /admin/overview *(Super Admin only)*
Platform-wide executive overview: total shops, active/suspended counts, platform users, total verified revenue, system health, and recent audit events.

#### GET /admin/shops *(Super Admin only)*
Lists all shops across the platform with pagination, status filters (`PENDING`, `ACTIVE`, `SUSPENDED`), and order counts.

#### PUT /admin/shops/:shopId/status *(Super Admin only)*
Moderates shop status (`ACTIVE`, `SUSPENDED`) and changes subscription tier (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`). Automatically records an immutable audit log.

#### GET /admin/users *(Super Admin only)*
Lists all user accounts across the platform with roles and statuses.

#### PUT /admin/users/:userId *(Super Admin only)*
Updates user role (`SUPER_ADMIN`, `OWNER`, `MANAGER`, `STAFF`) or toggles user status.

#### GET /admin/audit-logs *(Super Admin only)*
Queries platform security events, administrative actions, and actor IPs.

---

## Real-Time WebSocket Events (Socket.IO)

- **Authentication**: JWT token in handshake `auth: { token }` or query `?token=...`
- **Room Isolation**: Scoped to `shop_{shopId}`, restricted by `shop_users` membership.
- **Client to Server**:
  - `shop:join`: `{ "shopId": 1 }`
  - `shop:leave`: `{ "shopId": 1 }`
- **Server to Client Broadcasts**:
  - `order:new`: Emitted when a customer submits an order.
  - `order:status_changed`: Emitted when order status transitions.
  - `printers:synced`: Emitted when the Windows Print Agent discovers or updates printers.
  - `print_jobs:new`: Emitted when direct print job is dispatched to a spooler.
  - `print_jobs:status`: Emitted as print job progresses through driver states.

---

## Error Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [
    { "field": "email", "message": "Please enter a valid email address." }
  ]
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 410 | Gone (Document expired & permanently purged) |
| 422 | Validation error |
| 429 | Rate limited |
| 500 | Server error |
