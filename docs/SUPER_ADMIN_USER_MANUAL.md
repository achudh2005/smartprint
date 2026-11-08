# SmartPrint Super Admin User Manual

This manual details the features and administrative procedures available to platform operators with the **SUPER_ADMIN** role.

---

## 1. Accessing the Platform Control Center
1. Log in to SmartPrint using an account with `role: SUPER_ADMIN`.
2. Navigate to `/admin` or click **Super Admin Control Center** in the navigation bar.
3. Access is restricted exclusively to authorized platform administrators; non-admin users attempting to open `/admin` will receive an HTTP 403 Forbidden screen.

---

## 2. Platform Overview & System Health
The **Overview Dashboard** (`/admin`) provides executive visibility into overall platform operations:
- **Total Print Shops**: Total registered print stores and shops active today.
- **Platform User Accounts**: Breakdown of shop owners, managers, and staff accounts.
- **Global Orders & Verified Revenue**: Real-time aggregated order volumes and cumulative verified revenue across all tenants.
- **Storage Metrics**: Total active gigabytes currently held in document storage vs. purged gigabytes freed by the lifetime expiry worker.
- **Database & System Health**: Live health status check of primary MySQL database and background services.

---

## 3. Shop Moderation & Subscription Tier Management
Navigate to **Shop Moderation** (`/admin/shops`):

### 3.1 Reviewing Registered Shops
- Filter shops by status: `ALL`, `ACTIVE`, `PENDING`, `SUSPENDED`.
- Search by shop name, shop code (e.g., `CPHUB1`), owner email, or contact phone.
- View total orders and registered printer counts per shop.

### 3.2 Moderating Shop Status
- **Approve New Shop**: Activates newly registered print shops for public customer upload.
- **Suspend Shop**: Instantly blocks customer uploads and orders for non-compliant or delinquent stores. Customers attempting to open the QR link will see a suspended store notice.
- **Reactivate Shop**: Restores full platform functionality.

### 3.3 Managing Subscription Tiers
Update monetization tiers per shop:
- **FREE**: 1 printer, standard upload sizes, community support.
- **STARTER**: Up to 3 printers, direct printing enabled.
- **PRO**: Unlimited printers, advanced business analytics, custom branding.
- **ENTERPRISE**: Multi-branch management, dedicated priority queue, SLA support.

---

## 4. User Account Governance
Navigate to **User Management** (`/admin/users`):
- Search user accounts by name or email address.
- Filter by user role: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `STAFF`.
- **Role Elevation / Demotion**: Modify user permission levels.
- **Account Suspension**: Temporarily or permanently suspend abusive accounts without deleting order records.

> [!CAUTION]
> The platform prevents a Super Admin from accidentally suspending their own account to prevent administrative lockouts.

---

## 5. Security & System Audit Logs
Navigate to **Audit Logs** (`/admin/audit-logs`):
- All administrative and security actions are written to an immutable `audit_logs` database table.
- Filter by action type:
  - `SHOP_SUSPENDED` / `SHOP_ACTIVE`
  - `USER_UPDATED` / `USER_SUSPENDED`
  - `DOCUMENT_PURGED` / `EXPIRY_JOB`
- Inspect actor identity, target shop, actor IP address, and payload parameters.
- Audit records provide compliance and dispute resolution for billing and data privacy inquiries.
