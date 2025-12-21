#!/bin/bash

# =============================================================================
# 04-setup-ssl.sh
# Setup Self-Signed SSL Certificate for IP-based access
# Server IP: 34.51.218.216
# Note: For domain with Let's Encrypt, use 06-update-domain.sh
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
SSL_DIR="/etc/ssl/history-platform"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Setting up Self-Signed SSL Certificate..."
print_warning "Note: Self-signed certificates will show browser warnings."
print_warning "For production with domain, use Let's Encrypt (06-update-domain.sh)"

# =============================================================================
# Create SSL directory
# =============================================================================
print_status "Creating SSL directory..."

mkdir -p $SSL_DIR
chmod 700 $SSL_DIR

# =============================================================================
# Generate Self-Signed SSL Certificate
# =============================================================================
print_status "Generating self-signed SSL certificate..."

# Create OpenSSL configuration
cat > $SSL_DIR/openssl.cnf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = KZ
ST = Almaty
L = Almaty
O = History Platform
OU = IT Department
CN = $SERVER_IP

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $SERVER_IP
DNS.1 = localhost
EOF

# Generate private key and certificate
openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout $SSL_DIR/server.key \
    -out $SSL_DIR/server.crt \
    -config $SSL_DIR/openssl.cnf

# Set proper permissions
chmod 600 $SSL_DIR/server.key
chmod 644 $SSL_DIR/server.crt

print_success "SSL certificate generated"

# =============================================================================
# Generate Diffie-Hellman parameters (for better security)
# =============================================================================
print_status "Generating DH parameters (this may take a while)..."

if [ ! -f $SSL_DIR/dhparam.pem ]; then
    openssl dhparam -out $SSL_DIR/dhparam.pem 2048
    print_success "DH parameters generated"
else
    print_warning "DH parameters already exist"
fi

# =============================================================================
# Update Nginx configuration for HTTPS
# =============================================================================
print_status "Updating Nginx configuration for HTTPS..."

cat > /etc/nginx/sites-available/history-platform << EOF
# History Platform - Nginx Configuration with SSL
# Server IP: $SERVER_IP

# Rate limiting zone
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream for API server
upstream history_api {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;

    # Redirect all HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_IP;

    # SSL Configuration
    ssl_certificate $SSL_DIR/server.crt;
    ssl_certificate_key $SSL_DIR/server.key;
    ssl_dhparam $SSL_DIR/dhparam.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # HSTS disabled for self-signed cert (enable for production with valid cert)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

print_success "Nginx HTTPS configuration created"

# =============================================================================
# Update application environment for HTTPS
# =============================================================================
print_status "Updating application environment..."

APP_DIR="/var/www/history-platform"

if [ -f "$APP_DIR/server/.env" ]; then
    sed -i "s|CORS_ORIGIN=http://$SERVER_IP|CORS_ORIGIN=https://$SERVER_IP|g" "$APP_DIR/server/.env"
    print_success "Server .env updated for HTTPS"
fi

if [ -f "$APP_DIR/client/.env.production" ]; then
    sed -i "s|VITE_API_URL=http://$SERVER_IP|VITE_API_URL=https://$SERVER_IP|g" "$APP_DIR/client/.env.production"
    print_success "Client .env.production updated for HTTPS"
    
    # Rebuild client
    print_status "Rebuilding client with HTTPS configuration..."
    cd "$APP_DIR/client"
    npm run build
    cp -r dist/* /var/www/html/history-platform/
    print_success "Client rebuilt"
fi

# Restart PM2 to apply env changes
if command -v pm2 &> /dev/null; then
    pm2 restart all
    print_success "PM2 processes restarted"
fi

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
echo -e "${GREEN}SSL Configuration Complete!${NC}"
echo "=============================================="
echo ""
echo "Configuration Details:"
echo "  - Server IP: $SERVER_IP"
echo "  - SSL Certificate: $SSL_DIR/server.crt"
echo "  - SSL Key: $SSL_DIR/server.key"
echo "  - Certificate Valid: 365 days"
echo ""
print_warning "IMPORTANT: This is a self-signed certificate!"
print_warning "Browsers will show a security warning."
print_warning "For production, use Let's Encrypt with a domain name."
echo ""
echo "Access your site at:"
echo "  https://$SERVER_IP"
echo ""
echo "Test API:"
echo "  curl -k https://$SERVER_IP/api/health"
echo ""
echo "Certificate Info:"
openssl x509 -in $SSL_DIR/server.crt -noout -dates
echo ""
print_status "When you have a domain, run 06-update-domain.sh"

