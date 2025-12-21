#!/bin/bash

# =============================================================================
# 06-update-domain.sh
# Update server configuration with domain name and setup Let's Encrypt SSL
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
APP_DIR="/var/www/history-platform"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# =============================================================================
# Get Domain Name
# =============================================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       DOMAIN CONFIGURATION & LET'S ENCRYPT SSL            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name cannot be empty"
    exit 1
fi

# Remove any protocol prefix if user entered it
DOMAIN_NAME=$(echo "$DOMAIN_NAME" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

print_status "Domain: $DOMAIN_NAME"

read -p "Enter your email for Let's Encrypt notifications: " EMAIL

if [ -z "$EMAIL" ]; then
    print_error "Email cannot be empty"
    exit 1
fi

print_status "Email: $EMAIL"

echo ""
read -p "Include www.$DOMAIN_NAME? (y/n): " INCLUDE_WWW
INCLUDE_WWW=${INCLUDE_WWW:-y}

# =============================================================================
# DNS Check
# =============================================================================
print_status "Checking DNS configuration..."

DOMAIN_IP=$(dig +short $DOMAIN_NAME | head -n 1)

if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
    print_success "DNS is correctly pointing to $SERVER_IP"
else
    print_warning "DNS check: $DOMAIN_NAME resolves to $DOMAIN_IP"
    print_warning "Expected: $SERVER_IP"
    echo ""
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        print_error "Please configure DNS first"
        echo ""
        echo "Add these DNS records:"
        echo "  A    @    $SERVER_IP"
        if [ "$INCLUDE_WWW" = "y" ] || [ "$INCLUDE_WWW" = "Y" ]; then
            echo "  A    www  $SERVER_IP"
        fi
        exit 1
    fi
fi

# =============================================================================
# Update Nginx Configuration
# =============================================================================
print_status "Updating Nginx configuration..."

# Build server_name directive
if [ "$INCLUDE_WWW" = "y" ] || [ "$INCLUDE_WWW" = "Y" ]; then
    SERVER_NAMES="$DOMAIN_NAME www.$DOMAIN_NAME"
else
    SERVER_NAMES="$DOMAIN_NAME"
fi

# Create new Nginx configuration
cat > /etc/nginx/sites-available/history-platform << EOF
# History Platform - Nginx Configuration
# Domain: $DOMAIN_NAME
# Server IP: $SERVER_IP

# Rate limiting zone
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream for API server
upstream history_api {
    server 127.0.0.1:5000;
    keepalive 64;
}

# Redirect IP to domain
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;
    return 301 http://$DOMAIN_NAME\$request_uri;
}

# HTTP Server (will be updated by Certbot)
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAMES;

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

print_success "Nginx configuration updated"

# =============================================================================
# Test and reload Nginx
# =============================================================================
print_status "Testing Nginx configuration..."

nginx -t

if [ $? -eq 0 ]; then
    print_success "Nginx configuration is valid"
    systemctl reload nginx
    print_success "Nginx reloaded"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# =============================================================================
# Setup Let's Encrypt SSL
# =============================================================================
print_status "Setting up Let's Encrypt SSL certificate..."

# Build certbot command
if [ "$INCLUDE_WWW" = "y" ] || [ "$INCLUDE_WWW" = "Y" ]; then
    CERTBOT_DOMAINS="-d $DOMAIN_NAME -d www.$DOMAIN_NAME"
else
    CERTBOT_DOMAINS="-d $DOMAIN_NAME"
fi

# Run certbot
certbot --nginx \
    $CERTBOT_DOMAINS \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect

if [ $? -eq 0 ]; then
    print_success "Let's Encrypt SSL certificate installed"
else
    print_error "Certbot failed"
    exit 1
fi

# =============================================================================
# Update Application Configuration
# =============================================================================
print_status "Updating application configuration..."

# Update server .env
if [ -f "$APP_DIR/server/.env" ]; then
    # Update CORS_ORIGIN
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN_NAME|g" "$APP_DIR/server/.env"
    
    # Add domain to env
    if grep -q "DOMAIN=" "$APP_DIR/server/.env"; then
        sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN_NAME|g" "$APP_DIR/server/.env"
    else
        echo "DOMAIN=$DOMAIN_NAME" >> "$APP_DIR/server/.env"
    fi
    
    print_success "Server .env updated"
fi

# Update client .env.production
if [ -f "$APP_DIR/client/.env.production" ]; then
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN_NAME/api|g" "$APP_DIR/client/.env.production"
    print_success "Client .env.production updated"
fi

# =============================================================================
# Rebuild Client
# =============================================================================
print_status "Rebuilding client with new configuration..."

cd "$APP_DIR/client"
npm run build
cp -r dist/* /var/www/html/history-platform/

print_success "Client rebuilt"

# =============================================================================
# Restart Application
# =============================================================================
print_status "Restarting application..."

pm2 restart all
print_success "Application restarted"

# =============================================================================
# Setup Auto-renewal
# =============================================================================
print_status "Setting up SSL certificate auto-renewal..."

# Test renewal
certbot renew --dry-run

# Add cron job for renewal (certbot usually adds this automatically)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    print_success "Auto-renewal cron job added"
else
    print_warning "Auto-renewal cron job already exists"
fi

# =============================================================================
# Remove old self-signed certificate config
# =============================================================================
if [ -d "/etc/ssl/history-platform" ]; then
    print_status "Cleaning up old self-signed certificates..."
    rm -rf /etc/ssl/history-platform
    print_success "Old certificates removed"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           DOMAIN CONFIGURATION COMPLETE!                      ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  Domain:        $DOMAIN_NAME"
echo "║  SSL:           Let's Encrypt (auto-renewal enabled)          ║"
echo "║                                                               ║"
echo "║  Website:       https://$DOMAIN_NAME"
echo "║  API:           https://$DOMAIN_NAME/api"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                    SSL CERTIFICATE INFO                       ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo ""
certbot certificates
echo ""
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                    USEFUL COMMANDS                            ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  Check SSL:      certbot certificates                         ║"
echo "║  Renew SSL:      certbot renew                                ║"
echo "║  Test Renewal:   certbot renew --dry-run                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

print_success "Domain configuration completed successfully!"

