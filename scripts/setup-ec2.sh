#!/usr/bin/env bash
# ============================================================
# SmartPrint — AWS EC2 Ubuntu 24.04 LTS Server Provisioning
# Installs Node.js 20 LTS, Nginx, MySQL 8.0, PM2, UFW Firewall
# ============================================================
set -euo pipefail

echo "=========================================="
echo " Starting SmartPrint EC2 Server Bootstrap"
echo "=========================================="

export DEBIAN_FRONTEND=noninteractive

# 1. Update and upgrade Ubuntu system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw software-properties-common apt-transport-https ca-certificates build-essential libssl-dev

# 2. Configure UFW Firewall
echo "🛡️ Configuring UFW Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
echo "y" | sudo ufw enable

# 3. Install Node.js 20.x LTS
echo "🟢 Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# 4. Install PM2 globally
echo "⚙️ Installing PM2 process manager..."
sudo npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

# 5. Install Nginx
echo "🌐 Installing Nginx Web Server..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 6. Install MySQL Server 8.0
echo "🗄️ Installing MySQL Server..."
sudo apt-get install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

# Ensure MySQL is bound only to 127.0.0.1 (local loopback)
sudo sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf || true
sudo systemctl restart mysql

# 7. Configure Swap Space (1GB swap for t2.micro / t3.micro stability)
echo "💾 Configuring 1GB Swap Memory..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 8. Create application directories
echo "📁 Setting up SmartPrint directory structure..."
sudo mkdir -p /home/ubuntu/smartprint/logs
sudo mkdir -p /home/ubuntu/smartprint/uploads
sudo mkdir -p /home/ubuntu/backups/mysql
sudo chown -R ubuntu:ubuntu /home/ubuntu/smartprint
sudo chown -R ubuntu:ubuntu /home/ubuntu/backups

echo "=========================================="
echo "✅ EC2 Server Bootstrap Successfully Completed!"
echo "=========================================="
