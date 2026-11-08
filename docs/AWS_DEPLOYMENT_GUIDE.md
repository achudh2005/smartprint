# SmartPrint — AWS EC2 Step-by-Step Deployment Master Guide

**Target Environment:** AWS EC2 Ubuntu 24.04 LTS  
**Region:** `ap-south-1` (Mumbai)  
**Budget:** ₹0.00 / month (AWS Free Tier Eligible)

---

## Phase 1: AWS Authentication & Key Pair Setup

### Option A: Using AWS CLI (Recommended)
If you already have your AWS Access Key ID and Secret Access Key:
1. Open PowerShell on your computer and run:
   ```powershell
   & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" configure
   ```
2. Enter your details:
   * **AWS Access Key ID:** `<YOUR_ACCESS_KEY_ID>`
   * **AWS Secret Access Key:** `<YOUR_SECRET_ACCESS_KEY>`
   * **Default region name:** `ap-south-1`
   * **Default output format:** `json`
3. Verify your connection:
   ```powershell
   & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" sts get-caller-identity
   ```

### Option B: Using the AWS Management Console
1. Log in to [https://aws.amazon.com/console/](https://aws.amazon.com/console/).
2. In the top right corner, verify your region is set to **Asia Pacific (Mumbai) ap-south-1**.
3. Go to **EC2 Dashboard** -> **Key Pairs** -> **Create key pair**:
   * Name: `smartprint-key`
   * Key pair type: `RSA`
   * Private key file format: `.pem` (for OpenSSH)
   * Click **Create key pair** and save `smartprint-key.pem` on your PC.

---

## Phase 2: Launch Free-Tier EC2 Instance

### In the AWS Management Console:
1. Navigate to **EC2** -> **Instances** -> **Launch Instances**.
2. **Name:** `SmartPrint-Production-Server`
3. **Application and OS Images:** **Ubuntu Server 24.04 LTS (HVM)** (Confirm "Free tier eligible" badge).
4. **Instance Type:** `t2.micro` (or `t3.micro` if marked Free Tier in your account).
5. **Key Pair:** Select `smartprint-key`.
6. **Network Settings:**
   * Select **Create security group**.
   * Check **Allow SSH traffic from** -> Select **My IP**.
   * Check **Allow HTTP traffic from the internet** (Port 80).
   * Check **Allow HTTPS traffic from the internet** (Port 443).
7. **Configure Storage:**
   * Change from 8 GiB to **30 GiB** gp3 (The AWS Free Tier includes up to 30 GB of EBS storage).
8. Click **Launch Instance**.
9. In 1 minute, your instance will be running with an assigned **Public IPv4 Address** (e.g., `13.233.xxx.xxx`).

---

## Phase 3: Connect to EC2 Server

From your terminal or PowerShell on your computer:
```powershell
# Set strict permissions on your private key (Linux/Mac: chmod 400 smartprint-key.pem)
ssh -i "path/to/smartprint-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

---

## Phase 4: Run the Server Bootstrap Script

Once connected to your EC2 terminal:
```bash
# 1. Clone the SmartPrint repository from GitHub
git clone https://github.com/achudh2005/smartprint.git
cd smartprint

# 2. Make scripts executable
chmod +x scripts/*.sh

# 3. Run the automated server bootstrap script
./scripts/setup-ec2.sh
```
The bootstrap script will automatically install:
* Ubuntu updates & security patches
* Node.js 20.x LTS & npm
* Nginx Web Server & reverse proxy
* MySQL 8.0 Server
* PM2 Process Manager
* 1 GB Swap Space (for memory stability)
* UFW Firewall (allowing 22, 80, 443; blocking all database and internal ports)

---

## Phase 5: Initialize Production MySQL Database

In your EC2 terminal:
```bash
# Open MySQL prompt
sudo mysql

# Run the following SQL commands (replace 'YourSecurePassword123!' with a strong password)
CREATE DATABASE smartprint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smartprint_user'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON smartprint.* TO 'smartprint_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Phase 6: Configure Production Environment Variables

In your EC2 terminal, create the production configuration:
```bash
cp .env.example backend/.env
nano backend/.env
```
Fill in your configuration:
```ini
DATABASE_URL="mysql://smartprint_user:YourSecurePassword123!@localhost:3306/smartprint"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smartprint
DB_USER=smartprint_user
DB_PASSWORD="YourSecurePassword123!"

NODE_ENV=production
PORT=5000
FRONTEND_URL="http://<EC2_PUBLIC_IP>"

JWT_SECRET="generate_a_random_64_character_hex_secret_here"
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET="generate_another_random_64_character_hex_secret"

ALLOWED_ORIGINS="http://<EC2_PUBLIC_IP>"
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
```
*(Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit).*

---

## Phase 7: Deploy and Start SmartPrint

Execute the automated deploy script:
```bash
./scripts/deploy.sh
```
This script will automatically:
1. Install all backend and frontend dependencies.
2. Push Prisma database schema to MySQL.
3. Build the React frontend into `frontend/dist`.
4. Start the backend with PM2 (`smartprint-api`) and register it as a system service.
5. Reload Nginx.
6. Verify local health check.

---

## Phase 8: Configure Nginx Virtual Host

In your EC2 terminal:
```bash
# Copy the pre-built Nginx configuration
sudo cp nginx/smartprint.conf /etc/nginx/sites-available/smartprint

# Enable the site and remove the default Nginx welcome page
sudo ln -sf /etc/nginx/sites-available/smartprint /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 9: Verification & Live Access

Open your web browser and navigate to:
👉 **`http://<EC2_PUBLIC_IP>`**

* **Customer Portal & Upload:** Works immediately!
* **Shop Registration & Login:** Backed by persistent MySQL 8.0 database.
* **Auto-Reboot Resilience:** If EC2 reboots, PM2 and Nginx automatically restart the full application with zero human intervention.

---

## Phase 10: (Optional) Adding a Custom Domain & Free SSL (HTTPS)

If you have a domain name (e.g. `smartprint.yourdomain.com`):
1. In your domain registrar (GoDaddy, Namecheap, Cloudflare), add an **A Record**:
   * **Host:** `@` (or `print`)
   * **Value:** `<YOUR_EC2_PUBLIC_IP>`
2. Update `/etc/nginx/sites-available/smartprint`:
   * Change `server_name _;` to `server_name smartprint.yourdomain.com;`
3. Install free SSL with Certbot:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d smartprint.yourdomain.com
   ```
4. Certbot will automatically issue and renew free Let's Encrypt SSL certificates!
