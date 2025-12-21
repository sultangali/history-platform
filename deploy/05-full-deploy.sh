#!/bin/bash

# =============================================================================
# 05-full-deploy.sh
# Full deployment script - runs all deployment steps in sequence
# Server IP: 34.51.218.216
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_header() {
    echo ""
    echo -e "${CYAN}=============================================="
    echo "$1"
    echo -e "==============================================${NC}"
    echo ""
}

# Configuration
SERVER_IP="34.51.218.216"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# =============================================================================
# Welcome Banner
# =============================================================================
clear
echo ""
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║                                                           ║"
echo "  ║        HISTORY PLATFORM - FULL DEPLOYMENT                 ║"
echo "  ║                                                           ║"
echo "  ║        Server IP: $SERVER_IP                       ║"
echo "  ║                                                           ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# =============================================================================
# Pre-deployment checks
# =============================================================================
print_header "Pre-deployment Checks"

print_status "Checking system requirements..."

# Check if scripts exist
for script in "01-install-dependencies.sh" "02-deploy-app.sh" "03-setup-nginx.sh" "04-setup-ssl.sh"; do
    if [ ! -f "$SCRIPT_DIR/$script" ]; then
        print_error "Missing script: $script"
        exit 1
    fi
done

print_success "All deployment scripts found"

# Check internet connection
if ping -c 1 google.com &> /dev/null; then
    print_success "Internet connection OK"
else
    print_error "No internet connection"
    exit 1
fi

# =============================================================================
# Deployment Options
# =============================================================================
echo ""
echo "Deployment Options:"
echo "  1) Full deployment (all steps)"
echo "  2) Dependencies only (step 1)"
echo "  3) Application only (step 2)"
echo "  4) Nginx only (step 3)"
echo "  5) SSL only (step 4)"
echo "  6) Skip SSL (HTTP only)"
echo ""
read -p "Select option [1-6] (default: 1): " DEPLOY_OPTION
DEPLOY_OPTION=${DEPLOY_OPTION:-1}

# =============================================================================
# Execute deployment steps
# =============================================================================

run_step() {
    local step_num=$1
    local step_name=$2
    local script=$3
    
    print_header "Step $step_num: $step_name"
    
    chmod +x "$SCRIPT_DIR/$script"
    
    if bash "$SCRIPT_DIR/$script"; then
        print_success "Step $step_num completed successfully"
        return 0
    else
        print_error "Step $step_num failed"
        return 1
    fi
}

case $DEPLOY_OPTION in
    1)
        # Full deployment
        run_step 1 "Installing Dependencies" "01-install-dependencies.sh"
        run_step 2 "Deploying Application" "02-deploy-app.sh"
        run_step 3 "Configuring Nginx" "03-setup-nginx.sh"
        run_step 4 "Setting up SSL" "04-setup-ssl.sh"
        ;;
    2)
        run_step 1 "Installing Dependencies" "01-install-dependencies.sh"
        ;;
    3)
        run_step 2 "Deploying Application" "02-deploy-app.sh"
        ;;
    4)
        run_step 3 "Configuring Nginx" "03-setup-nginx.sh"
        ;;
    5)
        run_step 4 "Setting up SSL" "04-setup-ssl.sh"
        ;;
    6)
        # Full deployment without SSL
        run_step 1 "Installing Dependencies" "01-install-dependencies.sh"
        run_step 2 "Deploying Application" "02-deploy-app.sh"
        run_step 3 "Configuring Nginx" "03-setup-nginx.sh"
        print_warning "SSL setup skipped - site will be HTTP only"
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

# =============================================================================
# Post-deployment verification
# =============================================================================
print_header "Post-deployment Verification"

# Check MongoDB
if systemctl is-active --quiet mongod; then
    print_success "MongoDB is running"
else
    print_warning "MongoDB is not running"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_warning "Nginx is not running"
fi

# Check PM2
if pm2 list | grep -q "history-platform-api"; then
    print_success "Application is running in PM2"
else
    print_warning "Application is not running in PM2"
fi

# Test API endpoint
print_status "Testing API endpoint..."
sleep 2

if [ "$DEPLOY_OPTION" = "6" ] || [ "$DEPLOY_OPTION" = "3" ]; then
    API_URL="http://$SERVER_IP/api/health"
else
    API_URL="https://$SERVER_IP/api/health"
fi

if curl -k -s "$API_URL" | grep -q "OK"; then
    print_success "API is responding"
else
    print_warning "API test failed - may need manual verification"
fi

# =============================================================================
# Final Summary
# =============================================================================
print_header "Deployment Complete!"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUMMARY                         ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  Server IP:     $SERVER_IP                             ║"
echo "║                                                               ║"

if [ "$DEPLOY_OPTION" = "6" ] || [ "$DEPLOY_OPTION" = "3" ]; then
    echo "║  Website:       http://$SERVER_IP                      ║"
    echo "║  API:           http://$SERVER_IP/api                  ║"
else
    echo "║  Website:       https://$SERVER_IP                     ║"
    echo "║  API:           https://$SERVER_IP/api                 ║"
fi

echo "║                                                               ║"
echo "║  App Directory: /var/www/history-platform                     ║"
echo "║  Static Files:  /var/www/html/history-platform                ║"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                    USEFUL COMMANDS                            ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  PM2 Status:      pm2 status                                  ║"
echo "║  PM2 Logs:        pm2 logs history-platform-api               ║"
echo "║  PM2 Restart:     pm2 restart all                             ║"
echo "║                                                               ║"
echo "║  Nginx Status:    systemctl status nginx                      ║"
echo "║  Nginx Reload:    systemctl reload nginx                      ║"
echo "║  Nginx Logs:      tail -f /var/log/nginx/history-platform.*   ║"
echo "║                                                               ║"
echo "║  MongoDB Status:  systemctl status mongod                     ║"
echo "║  MongoDB Shell:   mongosh                                     ║"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                    NEXT STEPS                                 ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  1. Add SSH key to GitHub (if not done):                      ║"
echo "║     cat /root/.ssh/id_rsa.pub                                 ║"
echo "║                                                               ║"
echo "║  2. When you have a domain name, run:                         ║"
echo "║     ./06-update-domain.sh                                     ║"
echo "║                                                               ║"
echo "║  3. Seed database with sample data:                           ║"
echo "║     cd /var/www/history-platform/server && npm run seed       ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

print_success "Deployment completed successfully!"

