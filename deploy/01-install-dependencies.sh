#!/bin/bash

# =============================================================================
# 01-install-dependencies.sh
# Install all required dependencies for History Platform
# Server IP: 34.51.218.216
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Starting dependencies installation..."

# Update system
print_status "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential tools
print_status "Installing essential tools..."
apt-get install -y curl wget git nano htop ufw software-properties-common gnupg ca-certificates lsb-release build-essential

# =============================================================================
# Install Node.js 20.x LTS
# =============================================================================
print_status "Installing Node.js 20.x LTS..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_warning "Node.js is already installed: $NODE_VERSION"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed: $(node -v)"
fi

# Verify npm
print_status "npm version: $(npm -v)"

# =============================================================================
# Install MongoDB 7.0
# =============================================================================
print_status "Installing MongoDB 7.0..."

if command -v mongod &> /dev/null; then
    print_warning "MongoDB is already installed"
else
    # Import MongoDB public GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    apt-get update -y
    apt-get install -y mongodb-org

    # Start and enable MongoDB
    systemctl start mongod
    systemctl enable mongod
    print_success "MongoDB installed and started"
fi

# =============================================================================
# Install PM2 globally
# =============================================================================
print_status "Installing PM2..."

if command -v pm2 &> /dev/null; then
    print_warning "PM2 is already installed"
else
    npm install -g pm2
    print_success "PM2 installed"
fi

# Setup PM2 startup
pm2 startup systemd -u root --hp /root
print_success "PM2 startup configured"

# =============================================================================
# Install Nginx
# =============================================================================
print_status "Installing Nginx..."

if command -v nginx &> /dev/null; then
    print_warning "Nginx is already installed"
else
    apt-get install -y nginx
    print_success "Nginx installed"
fi

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# =============================================================================
# Install Certbot for Let's Encrypt (for future domain setup)
# =============================================================================
print_status "Installing Certbot..."

if command -v certbot &> /dev/null; then
    print_warning "Certbot is already installed"
else
    apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
fi

# =============================================================================
# Configure Firewall (UFW)
# =============================================================================
print_status "Configuring firewall..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow MongoDB (only from localhost by default)
# ufw allow 27017/tcp  # Uncomment if you need external MongoDB access

# Enable firewall
ufw --force enable

print_success "Firewall configured"

# =============================================================================
# Create application directory
# =============================================================================
print_status "Creating application directory..."

APP_DIR="/var/www/history-platform"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    print_success "Created $APP_DIR"
else
    print_warning "$APP_DIR already exists"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo -e "${GREEN}Dependencies Installation Complete!${NC}"
echo "=============================================="
echo ""
echo "Installed components:"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo "  - MongoDB: $(mongod --version | head -n 1)"
echo "  - PM2: $(pm2 -v)"
echo "  - Nginx: $(nginx -v 2>&1)"
echo "  - Certbot: $(certbot --version)"
echo "  - Git: $(git --version)"
echo ""
echo "Firewall status:"
ufw status
echo ""
echo "MongoDB status:"
systemctl status mongod --no-pager | head -n 5
echo ""
echo "Nginx status:"
systemctl status nginx --no-pager | head -n 5
echo ""
print_status "Next step: Run 02-deploy-app.sh"

