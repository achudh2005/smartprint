# SmartPrint Installation & Setup Guide

This guide walks you through setting up the complete **SmartPrint** platform in local development and production environments.

---

## 1. Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MySQL**: v8.0 or higher
- **Redis**: v7.0 or higher (for BullMQ background file expiry workers; optional in-process timer fallback is included)
- **Python**: v3.10 or higher (required on Windows client PCs running the Windows Print Agent)
- **Git**

---

## 2. Repository Cloning

```bash
git clone https://github.com/your-org/smartprint.git
cd smartprint
```

---

## 3. Backend Setup

### 3.1 Install Dependencies
```bash
cd backend
npm install
```

### 3.2 Environment Configuration
Create a `.env` file in `backend/` by copying `.env.example`:
```bash
cp .env.example .env
```

Ensure the following variables are configured:
```env
PORT=5000
NODE_ENV=development

# Database Connection (MySQL)
DATABASE_URL="mysql://root:password@localhost:3306/smartprint_db"

# JWT Secrets (Generate high-entropy strings)
JWT_ACCESS_SECRET="your_high_entropy_access_secret_32_chars_min"
JWT_REFRESH_SECRET="your_high_entropy_refresh_secret_32_chars_min"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Client Web URLs
CLIENT_URL="http://localhost:5173"

# Storage
UPLOAD_DIR="uploads"
MAX_FILE_SIZE_MB=50

# Redis & Queue
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379

# Razorpay (Optional: Use test keys for local payments)
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
```

### 3.3 Database Initialization
```bash
# Generate Prisma Client
npx prisma generate

# Push Schema to MySQL (Dev)
npx prisma db push

# (Alternatively) Run production migrations
npx prisma migrate dev --name init
```

### 3.4 Start Backend Server
```bash
# Development with hot-reload
npm run dev

# Production
npm start
```
The backend API and Socket.IO server will start on `http://localhost:5000`.

---

## 4. Frontend Setup

### 4.1 Install Dependencies
```bash
cd ../frontend
npm install
```

### 4.2 Environment Configuration
Create a `.env` file in `frontend/`:
```env
VITE_API_URL="http://localhost:5000/api/v1"
VITE_SOCKET_URL="http://localhost:5000"
```

### 4.3 Start Frontend Development Server
```bash
npm run dev
```
The React frontend will be accessible at `http://localhost:5173`.

### 4.4 Production Build
```bash
npm run build
```
Compiled static assets are generated in `frontend/dist/`.

---

## 5. Windows Print Agent Setup (On-Premises Shop PC)

The Windows Print Agent runs on the shop owner's Windows computer connected to physical printers.

### 5.1 Navigate to Agent Directory
```bash
cd ../print-agent
```

### 5.2 Create Virtual Environment & Install Dependencies
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 5.3 Configure Print Agent
Copy `agent_config.example.json` to `agent_config.json`:
```json
{
  "server_url": "http://localhost:5000",
  "shop_code": "YOUR_SHOP_CODE",
  "agent_token": "YOUR_SHOP_AGENT_TOKEN",
  "poll_interval_seconds": 3,
  "heartbeat_interval_seconds": 30,
  "mock_printing": false,
  "log_level": "INFO"
}
```
*(Obtain your `shop_code` and `agent_token` from your Shop Settings -> Printers page).*

### 5.4 Start Print Agent Daemon
```bash
python print_agent.py
```

---

## 6. Verification
1. Access the web application at `http://localhost:5173`.
2. Register an account as a Shop Owner.
3. Configure your shop profile, pricing rules, and download the QR code.
4. Scan the QR code or open `http://localhost:5173/s/{shopCode}` in an incognito window to simulate customer upload.
5. In your shop dashboard, review the live order, manage print statuses, and dispatch to your connected Windows printer.
