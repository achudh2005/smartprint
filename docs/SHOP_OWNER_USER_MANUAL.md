# SmartPrint Shop Owner User Manual

This manual provides complete operational instructions for printing shop owners, managers, and staff to run their daily store operations using **SmartPrint**.

---

## 1. Shop Setup & Initial Configuration

### 1.1 Creating Your Shop Profile
1. Log in to your SmartPrint account.
2. Click **Create New Shop** or navigate to **Shop Settings**.
3. Fill in your shop details:
   - **Shop Name**: Displayed to customers on the upload portal.
   - **Address, Phone, Email**: Included in order receipts.
   - **Upload Guidelines**: Specific notes (e.g., "Maximum 50MB per file").
   - **Logo Upload**: Personalize your customer page.

### 1.2 Displaying Your Shop QR Code
1. Navigate to **Shop QR Code** (`/shops/:shopId/qr`).
2. Download your shop QR code in **PNG** (for digital sharing or print flyers) or **SVG** (for high-resolution banners and counter displays).
3. Print and display the QR standee on your store billing counter.
4. If your QR code is ever compromised, click **Regenerate QR Code** to generate a fresh URL and code.

---

## 2. Pricing Rules & Additional Services

### 2.1 Configuring Base Print Pricing
Navigate to **Pricing & Services** (`/shops/:shopId/pricing`):
- Set base price per page for:
  - **A4 Black & White (Single Sided)**
  - **A4 Black & White (Duplex)**
  - **A4 Color (Single Sided)**
  - **A4 Color (Duplex)**
  - **A3, Letter, Legal Variations**
- Configure volume tier discounts (e.g., 100+ pages = ₹0.50 discount per page).

### 2.2 Adding Finishing Services
Define optional value-added services:
- **Spiral Binding** (e.g., ₹30)
- **Hard Binding** (e.g., ₹150)
- **Lamination** (e.g., ₹20 per sheet)
- Toggle services active or inactive at any time.

---

## 3. Real-Time Order Management

The **Live Order Dashboard** (`/shops/:shopId/orders`) updates instantly via WebSockets without needing manual page refreshes.

### 3.1 Audio & Visual Alerts
- When a customer submits an order, a banner pops up and an audible chime alerts counter staff.
- You can toggle sound alerts or grant browser notification permissions from the top bar.

### 3.2 Order Processing Lifecycle
Follow the standard workflow:
1. **PENDING**: New customer order submitted. Inspect file details and page counts.
2. **ACCEPTED**: Accept the order to notify customer that their job is in queue.
3. **PRINTING**:
   - **Direct Print**: Click **"Print via Agent"** to automatically send the file to your physical Windows printer.
   - **Manual Download**: Click **"Download File"** to open in Acrobat or image viewer.
4. **READY**: Mark ready when documents are packed and waiting on the pickup shelf.
5. **COLLECTED**: Hand over prints to customer and confirm completion.

---

## 4. Direct Printing with Windows Print Agent

### 4.1 Connecting Your Shop Computer
1. Navigate to **Printers** (`/shops/:shopId/printers`).
2. Click **"Generate Agent Token"** and copy the secret token.
3. On your billing PC, install the Python agent following the [Print Agent Manual](file:///c:/Users/achud/OneDrive/Desktop/print2print/docs/PRINT_AGENT_MANUAL.md).
4. Run the agent. Within 5 seconds, all installed Windows printers (HP, Canon, Epson, Brother) will automatically appear in your dashboard.
5. Choose your default printer by clicking **"Set Default"**.

### 4.2 One-Click Direct Printing
- On any order, click **"Direct Print"**.
- Select target printer, verify number of copies and duplex settings.
- Click **"Submit"**. The Windows Print Agent will securely stream the file, submit it to the Windows Spooler, and update the status from `QUEUED` -> `SUBMITTED_TO_OS` -> `DRIVER_COMPLETED`.

---

## 5. File Privacy & Expiry Management

### 5.1 Shop Expiry Policies
In **Shop Settings -> Privacy**:
- Choose allowed expiry times for your customers (15m, 1h, 3h, 8h).
- Set the shop default (e.g., 1 hour).

### 5.2 Extending File Lifetime
If a large print job takes longer or customer is delayed:
- In the Order Detail page, click **"Extend Expiry (+1 Hour)"**.
- The server will push the expiration deadline forward and notify the customer.

### 5.3 Immediate Deletion
If a customer printed a confidential file and requests immediate deletion:
- Click **"Purge Files Now"**.
- The server securely unlinks original files, preview PDFs, and converted copies instantly.

---

## 6. Payments & Financial Ledgers

### 6.1 Online vs Counter Payments
- **Online (Razorpay)**: Payments are credited directly to your merchant account with automatic reconciliation.
- **Pay at Counter**: Customer chooses to pay cash or shop UPI. When received, click **"Collect Payment"** on the order to mark dues cleared and update ledgers.

### 6.2 Payment Ledger & Cash Reconciliation
Navigate to **Payments** (`/shops/:shopId/payments`):
- Filter by date range (Today, Yesterday, Last 7 Days).
- View breakdown of **Online UPI/Card** vs **Counter Cash**.
- Reconcile physical cash drawer with registered counter receipts.

---

## 7. Business Reports & Analytics

Navigate to **Analytics** (`/shops/:shopId/analytics`):
- **Verified Revenue KPI**: Displays strictly collected revenue (excluding unpaid estimates).
- **Physical Volume KPI**: Total verified pages printed from completed printer spooler jobs.
- **B&W vs Color Ratio**: Analyze toner consumption trends.
- **Paper Type Distribution**: Monitor A4 vs A3 inventory usage.
- **CSV & PDF Export**: Click **"Export CSV"** for accounting records or **"Print Report"** to print a daily performance sheet.
