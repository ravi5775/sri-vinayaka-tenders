# 🚀 AWS Linux Deployment Guide — Sri Vinayaka Tenders

Complete step-by-step guide to deploy on an AWS EC2 Linux instance with **Nginx** (reverse proxy) + **PM2** (process manager).

---

## 📋 Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- SSH access to the instance
- A domain name (optional, but recommended)

---

## 1️⃣ AWS Security Group — Open These Ports

In your EC2 **Security Group → Inbound Rules**, add:

| Port | Protocol | Source        | Purpose               |
|------|----------|---------------|------------------------|
| 22   | TCP      | Your IP       | SSH access             |
| 80   | TCP      | 0.0.0.0/0     | HTTP (Nginx)           |
| 443  | TCP      | 0.0.0.0/0     | HTTPS (SSL, optional)  |

> ⚠️ **Do NOT** open ports 3001 or 8080 to the public. Nginx handles everything on port 80/443.

---

## 2️⃣ Which IP to Use?

| IP Type        | When to Use                                                  |
|----------------|--------------------------------------------------------------|
| **Public IP**  | Use this in your browser, `.env`, and email reset links      |
| **Private IP** | Only used internally (e.g., within a VPC). Do NOT use this.  |
| **Elastic IP** | Best option — a static public IP that survives instance restarts. **Allocate one!** |

### Allocate an Elastic IP (Recommended)
1. Go to **EC2 → Elastic IPs → Allocate Elastic IP**
2. **Associate** it with your EC2 instance
3. Use this IP everywhere below as `YOUR_SERVER_IP`

---

## 3️⃣ Connect to Your Instance

```bash
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP
```

---

## 4️⃣ Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify installations
node -v && npm -v && nginx -v && pm2 -v && psql --version
```

---

## 5️⃣ Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside psql:
CREATE DATABASE sri_vinayaka;
CREATE USER svtuser WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE sri_vinayaka TO svtuser;
ALTER DATABASE sri_vinayaka OWNER TO svtuser;

# Grant schema permissions
\c sri_vinayaka
GRANT ALL ON SCHEMA public TO svtuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO svtuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO svtuser;

\q
```

---

## 6️⃣ Clone & Setup Project

```bash
# Clone your repo
cd /home/ubuntu
git clone YOUR_REPO_URL sri-vinayaka
cd sri-vinayaka

# Install frontend dependencies
npm install

# Build frontend for production
npm run build

# Install backend dependencies
cd backend
npm install
```

---

## 7️⃣ Configure Backend `.env`

```bash
cd /home/ubuntu/sri-vinayaka/backend
cp .env.example .env
nano .env
```

**Update these values** (replace `YOUR_SERVER_IP` with your Elastic IP or Public IP):

```env
# =============================================================================
# Server Configuration
# =============================================================================
PORT=3001
NODE_ENV=production

# =============================================================================
# APPLICATION URLs — USE YOUR PUBLIC/ELASTIC IP
# =============================================================================
BASE_URL=http://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP
APP_IP=http://YOUR_SERVER_IP

# =============================================================================
# PostgreSQL Database Configuration
# =============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sri_vinayaka
DB_USER=svtuser
DB_PASSWORD=your_strong_password_here
DB_POOL_SIZE=20

# =============================================================================
# JWT Configuration — CHANGE THESE IN PRODUCTION!
# =============================================================================
JWT_SECRET=generate_a_random_64_char_string_here
JWT_REFRESH_SECRET=generate_another_random_64_char_string_here
JWT_EXPIRES_IN=24h

# =============================================================================
# CORS Configuration — USE YOUR PUBLIC/ELASTIC IP
# =============================================================================
CORS_ORIGIN=http://YOUR_SERVER_IP

# =============================================================================
# CSRF
# =============================================================================
CSRF_SECRET=generate_a_random_32_char_string_here

# =============================================================================
# EMAIL (keep your existing SMTP settings)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_AUTH_REQUIRED=true
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Sri Vinayaka Tenders
EMAIL_REPLY_TO=your_email@gmail.com
EMAIL_ENABLED=true
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_SECONDS=5

# =============================================================================
# MongoDB Atlas (for backup)
# =============================================================================
MONGO_URI=your_mongo_uri_here
MONGO_DB_NAME=sri_vinayaka_backup
```

> 💡 **Generate random secrets:**
> ```bash
> openssl rand -hex 32
> ```

---

## 8️⃣ Configure Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/sri-vinayaka
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;
    # If you have a domain: server_name yourdomain.com www.yourdomain.com;

    # Frontend — serve built static files
    root /home/ubuntu/sri-vinayaka/dist;
    index index.html;

    # API requests → proxy to backend on port 3001
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Frontend SPA — all other routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Max upload size (for backup restore)
    client_max_body_size 10M;
}
```

Enable the site and restart Nginx:

```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/sri-vinayaka /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 9️⃣ Start Backend with PM2

```bash
cd /home/ubuntu/sri-vinayaka/backend

# Start the backend
pm2 start src/server.js --name "svt-backend" --env production

# Save PM2 process list (survives reboot)
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs (copy-paste it)

# Verify it's running
pm2 status
pm2 logs svt-backend
```

### Useful PM2 Commands

```bash
pm2 status              # Check running processes
pm2 logs svt-backend    # View live logs
pm2 restart svt-backend # Restart backend
pm2 stop svt-backend    # Stop backend
pm2 delete svt-backend  # Remove from PM2
pm2 monit               # Real-time monitoring dashboard
```

---

## 🔟 Verify Deployment

```bash
# 1. Check backend is running
curl http://localhost:3001/api/health

# 2. Check Nginx is serving
curl http://YOUR_SERVER_IP

# 3. Check API through Nginx
curl http://YOUR_SERVER_IP/api/health
```

Then open `http://YOUR_SERVER_IP` in your browser — you should see the login page!

---

## 🔑 Password Reset Links

The reset password link **automatically uses your server's IP** because:
- The backend reads the `Origin` header from the request
- When you access the app via `http://YOUR_SERVER_IP`, the reset email link will automatically be `http://YOUR_SERVER_IP/reset-password?token=...`
- **No manual configuration needed** — it just works!

If the auto-detection fails for any reason, the backend falls back to the `FRONTEND_URL` from your `.env` file.

---

## 🔄 Updating the Application

When you push new code:

```bash
cd /home/ubuntu/sri-vinayaka

# Pull latest code
git pull origin main

# Rebuild frontend
npm install
npm run build

# Update backend
cd backend
npm install

# Restart backend (auto-migration runs on startup)
pm2 restart svt-backend

# No need to restart Nginx — it serves static files directly
```

---

## 🔒 Optional: Add SSL with Let's Encrypt (Requires Domain)

If you have a domain name pointed to your server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run
```

After SSL, update your `.env`:
```env
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| **502 Bad Gateway** | Backend not running → `pm2 restart svt-backend && pm2 logs` |
| **Connection refused** | Check Security Group ports (80, 443 open?) |
| **Database errors** | Check DB credentials in `.env`, run `pm2 logs svt-backend` |
| **CORS errors** | Ensure `CORS_ORIGIN` in `.env` matches your access URL |
| **Reset link shows localhost** | Check `FRONTEND_URL` in `.env` is set to your public IP |
| **Permission denied** | `sudo chown -R ubuntu:ubuntu /home/ubuntu/sri-vinayaka` |
| **Nginx config error** | `sudo nginx -t` to find syntax errors |
| **PM2 not starting on reboot** | Run `pm2 startup` and execute the printed command |

### View Logs

```bash
# Backend logs
pm2 logs svt-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

---

## 📊 Architecture Summary

```
Browser → http://YOUR_SERVER_IP
           ↓
    [Port 80] Nginx
           ↓
    ┌──────┴──────┐
    │             │
  /api/*      /* (other)
    │             │
    ↓             ↓
  Backend      Frontend
  (PM2)        (static)
  Port 3001    /dist/
```

- **Nginx** listens on port 80, serves frontend static files, and proxies `/api/*` to the backend
- **PM2** keeps the backend running 24/7, auto-restarts on crash, survives reboots
- **Auto-migration** ensures the database schema is always up-to-date on backend restart
- **Password reset links** auto-detect your server IP from the request origin
