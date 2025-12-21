#!/bin/bash

# =============================================================================
# 03-setup-nginx.sh
# Configure Nginx for History Platform
# Server IP: 34.51.218.216
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SERVER_IP="34.51.218.216"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Configuring Nginx..."

# =============================================================================
# Backup existing configuration
# =============================================================================
if [ -f /etc/nginx/sites-available/history-platform ]; then
    cp /etc/nginx/sites-available/history-platform /etc/nginx/sites-available/history-platform.backup
    print_warning "Existing configuration backed up"
fi

# =============================================================================
# Create Nginx configuration for IP-based access (HTTP)
# =============================================================================
print_status "Creating Nginx configuration..."

cat > /etc/nginx/sites-available/history-platform << EOF
# History Platform - Nginx Configuration
# Server IP: $SERVER_IP

# Rate limiting zone
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream for API server
upstream history_api {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP Server
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_comp_level 6;

    # Root directory for static files
    root /var/www/html/history-platform;
    index index.html;

    # API proxy
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://history_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files with caching
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # SPA fallback - all routes go to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logging
    access_log /var/log/nginx/history-platform.access.log;
    error_log /var/log/nginx/history-platform.error.log;
}
EOF

print_success "Nginx configuration created"

# =============================================================================
# Enable site and disable default
# =============================================================================
print_status "Enabling site configuration..."

# Remove default site if exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    print_status "Default site disabled"
fi

# Create symlink for our site
if [ -L /etc/nginx/sites-enabled/history-platform ]; then
    rm /etc/nginx/sites-enabled/history-platform
fi
ln -s /etc/nginx/sites-available/history-platform /etc/nginx/sites-enabled/history-platform

print_success "Site enabled"

# =============================================================================
# Test and reload Nginx
# =============================================================================
print_status "Testing Nginx configuration..."

nginx -t

if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
    
    print_status "Reloading Nginx..."
    systemctl reload nginx
    print_success "Nginx reloaded"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo -e "${GREEN}Nginx Configuration Complete!${NC}"
echo "=============================================="
echo ""
echo "Configuration Details:"
echo "  - Server IP: $SERVER_IP"
echo "  - HTTP Port: 80"
echo "  - Static Files: /var/www/html/history-platform"
echo "  - API Proxy: /api -> http://127.0.0.1:5000"
echo ""
echo "Access your site at:"
echo "  http://$SERVER_IP"
echo ""
echo "Test API:"
echo "  curl http://$SERVER_IP/api/health"
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager | head -n 5
echo ""
print_status "Next step: Run 04-setup-ssl.sh (for self-signed SSL)"
print_status "Or wait for domain and run 06-update-domain.sh"

