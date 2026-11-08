# SmartPrint Production Deployment Guide

This guide describes how to deploy **SmartPrint** in a production environment using Linux (Ubuntu 22.04 LTS / 24.04 LTS), Docker, Nginx, PM2, and managed MySQL and Redis services.

---

## 1. Production Architecture Overview

```
                      [ Internet / Cloudflare DNS / DDoS Protection ]
                                           │
                                           ▼ (HTTPS / 443)
                         [ Nginx Reverse Proxy & SSL ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                        ▼ (Static Assets)                     ▼ (Proxy Pass / 5000)
             [ Frontend: dist/ HTML/JS ]             [ Node.js Express API & Sockets ]
                                                              │ (PM2 Cluster Mode)
                                            ┌─────────────────┴─────────────────┐
                                            ▼                                   ▼
                               [ MySQL 8.0 Primary Database ]        [ Redis 7.0 (BullMQ) ]
```

---

## 2. Server Provisioning & OS Setup

### 2.1 Update System & Install Core Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential
```

### 2.2 Install Node.js (LTS v20)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2.3 Install MySQL 8.0 & Redis
```bash
sudo apt install -y mysql-server redis-server
sudo systemctl enable mysql redis-server
sudo systemctl start mysql redis-server
```

Secure MySQL:
```bash
sudo mysql_secure_installation
```

Create production database and user:
```sql
CREATE DATABASE smartprint_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smartprint_user'@'localhost' IDENTIFIED BY 'StrongProductionPasswordHere!';
GRANT ALL PRIVILEGES ON smartprint_prod.* TO 'smartprint_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Application Deployment

### 3.1 Clone Codebase
```bash
sudo mkdir -p /var/www/smartprint
sudo chown -R $USER:$USER /var/www/smartprint
git clone https://github.com/your-org/smartprint.git /var/www/smartprint
cd /var/www/smartprint
```

### 3.2 Backend Setup & Migration
```bash
cd /var/www/smartprint/backend
npm ci --production=false
```

Create `/var/www/smartprint/backend/.env`:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="mysql://smartprint_user:StrongProductionPasswordHere!@localhost:3306/smartprint_prod"
JWT_ACCESS_SECRET="generate_64_character_random_hex_string"
JWT_REFRESH_SECRET="generate_64_character_random_hex_string"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CLIENT_URL="https://smartprint.example.com"
UPLOAD_DIR="/var/www/smartprint/backend/uploads"
MAX_FILE_SIZE_MB=50
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
RAZORPAY_KEY_ID="rzp_live_your_key"
RAZORPAY_KEY_SECRET="your_live_secret"
RAZORPAY_WEBHOOK_SECRET="your_live_webhook_secret"
```

Run database migrations:
```bash
npx prisma generate
npx prisma migrate deploy
```

Create secure uploads directory:
```bash
mkdir -p /var/www/smartprint/backend/uploads
chmod 750 /var/www/smartprint/backend/uploads
```

### 3.3 Frontend Production Build
```bash
cd /var/www/smartprint/frontend
npm ci
```

Create `/var/www/smartprint/frontend/.env`:
```env
VITE_API_URL="https://smartprint.example.com/api/v1"
VITE_SOCKET_URL="https://smartprint.example.com"
```

Build static files:
```bash
npm run build
```
Assets are generated in `/var/www/smartprint/frontend/dist`.

---

## 4. Process Management with PM2

Create PM2 ecosystem file at `/var/www/smartprint/backend/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'smartprint-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/smartprint/api-error.log',
      out_file: '/var/log/smartprint/api-out.log',
      merge_logs: true,
      max_memory_restart: '1G',
    },
    {
      name: 'smartprint-expiry-worker',
      script: 'src/workers/expiry.worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Create log directory and launch:
```bash
sudo mkdir -p /var/log/smartprint
sudo chown -R $USER:$USER /var/log/smartprint
cd /var/www/smartprint/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 5. Nginx Configuration & SSL/TLS

Create `/etc/nginx/sites-available/smartprint`:
```nginx
server {
    listen 80;
    server_name smartprint.example.com;

    # Maximum file upload size for documents
    client_max_body_size 60M;

    # Frontend Single Page App
    root /var/www/smartprint/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/smartprint /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Obtain free SSL certificate via Let's Encrypt:
```bash
sudo certbot --nginx -d smartprint.example.com
```

---

## 6. Maintenance & Backups

### Automated Database Backup (Daily Cron Job)
Create `/etc/cron.daily/smartprint-backup`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/smartprint"
mkdir -p $BACKUP_DIR
mysqldump -u smartprint_user -pStrongProductionPasswordHere! smartprint_prod | gzip > $BACKUP_DIR/db_backup_$(date +\%F).sql.gz
find $BACKUP_DIR -type f -mtime +14 -delete
```
Make executable:
```bash
sudo chmod +x /etc/cron.daily/smartprint-backup
```
