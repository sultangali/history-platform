#!/bin/bash

# =============================================================================
# 02-deploy-app.sh
# Deploy History Platform application
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
APP_DIR="/var/www/history-platform"
REPO_URL="git@github.com:sultangali/history-platform.git"
BRANCH="main"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Starting application deployment..."

# =============================================================================
# Setup SSH key for GitHub (if not exists)
# =============================================================================
print_status "Checking SSH key for GitHub..."

if [ ! -f /root/.ssh/id_rsa ]; then
    print_warning "SSH key not found. Generating new SSH key..."
    ssh-keygen -t rsa -b 4096 -C "deploy@$SERVER_IP" -f /root/.ssh/id_rsa -N ""
    print_status "Add this SSH public key to your GitHub repository:"
    echo ""
    cat /root/.ssh/id_rsa.pub
    echo ""
    print_warning "After adding the key to GitHub, run this script again."
    exit 0
fi

# Add GitHub to known hosts
ssh-keyscan -t rsa github.com >> /root/.ssh/known_hosts 2>/dev/null || true

# =============================================================================
# Clone or Update Repository
# =============================================================================
print_status "Deploying application from GitHub..."

cd /var/www

if [ -d "$APP_DIR" ]; then
    print_status "Updating existing repository..."
    cd "$APP_DIR"
    
    # Stash any local changes
    git stash || true
    
    # Pull latest changes
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
else
    print_status "Cloning repository..."
    git clone $REPO_URL history-platform
    cd "$APP_DIR"
    git checkout $BRANCH
fi

# =============================================================================
# Setup Environment Variables
# =============================================================================
print_status "Setting up environment variables..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create server .env file
cat > "$APP_DIR/server/.env" << EOF
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/repression-archive

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Server IP
SERVER_IP=$SERVER_IP

# CORS Configuration
CORS_ORIGIN=http://$SERVER_IP
EOF

print_success "Server .env file created"

# Create client environment file for production build
cat > "$APP_DIR/client/.env.production" << EOF
VITE_API_URL=http://$SERVER_IP/api
EOF

print_success "Client .env.production file created"

# =============================================================================
# Install Dependencies
# =============================================================================
print_status "Installing server dependencies..."
cd "$APP_DIR/server"
npm install --production

print_status "Installing client dependencies..."
cd "$APP_DIR/client"
npm install

# =============================================================================
# Build Client
# =============================================================================
print_status "Building client for production..."
npm run build

# Move build to nginx serving directory
if [ -d "/var/www/html/history-platform" ]; then
    rm -rf /var/www/html/history-platform
fi

mkdir -p /var/www/html/history-platform
cp -r "$APP_DIR/client/dist/"* /var/www/html/history-platform/

print_success "Client built and deployed to /var/www/html/history-platform"

# =============================================================================
# Update Server CORS Configuration
# =============================================================================
print_status "Updating server CORS configuration..."

# Update server.js to use environment-based CORS
cat > "$APP_DIR/server/server.js" << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import suggestionsRoutes from './routes/suggestions.js';
import feedbackRoutes from './routes/feedback.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/repression-archive'
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', ip: process.env.SERVER_IP });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
EOF

print_success "Server configuration updated"

# =============================================================================
# Setup PM2 Process Manager
# =============================================================================
print_status "Setting up PM2..."

# Create PM2 ecosystem file
cat > "$APP_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [
    {
      name: 'history-platform-api',
      cwd: '$APP_DIR/server',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
EOF

# Stop existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start application with PM2
cd "$APP_DIR"
pm2 start ecosystem.config.cjs

# Save PM2 process list
pm2 save

print_success "PM2 configured and application started"

# =============================================================================
# Seed Database (Optional)
# =============================================================================
print_status "Do you want to seed the database with sample data? (y/n)"
read -r SEED_DB

if [ "$SEED_DB" = "y" ] || [ "$SEED_DB" = "Y" ]; then
    print_status "Seeding database..."
    cd "$APP_DIR/server"
    npm run seed || print_warning "Seed script not available or failed"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo -e "${GREEN}Application Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Application Details:"
echo "  - App Directory: $APP_DIR"
echo "  - Server Port: 5000"
echo "  - Client Build: /var/www/html/history-platform"
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Test API:"
echo "  curl http://127.0.0.1:5000/api/health"
echo ""
print_status "Next step: Run 03-setup-nginx.sh"

