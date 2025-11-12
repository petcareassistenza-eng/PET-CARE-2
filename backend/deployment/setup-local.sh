#!/bin/bash
# ============================================================================
# MyPetCare Backend - Local Development Setup Script
# ============================================================================
# Questo script configura l'ambiente di sviluppo locale per il backend
# con Firebase Admin SDK usando service account key file.
#
# Prerequisiti:
# 1. Scarica il file service account JSON da Firebase Console
# 2. Rinominalo in 'firebase-key.json'
# 3. Posizionalo nella directory backend/keys/
# ============================================================================

set -e  # Exit on error

echo "======================================"
echo "🐾 MyPetCare Backend - Local Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "   Run this script from the backend directory:"
    echo "   cd backend && bash deployment/setup-local.sh"
    exit 1
fi

# Step 1: Create keys directory
echo -e "${YELLOW}📁 Step 1: Creating keys directory...${NC}"
mkdir -p keys
echo -e "${GREEN}✅ Keys directory created${NC}"
echo ""

# Step 2: Check for Firebase service account key
echo -e "${YELLOW}🔑 Step 2: Checking for Firebase service account key...${NC}"
if [ ! -f "keys/firebase-key.json" ]; then
    echo -e "${RED}❌ Firebase service account key not found!${NC}"
    echo ""
    echo "Please follow these steps:"
    echo ""
    echo "1. Go to Firebase Console: https://console.firebase.google.com/"
    echo "2. Select your project: pet-care-9790d"
    echo "3. Go to: Project Settings > Service Accounts"
    echo "4. Click: 'Generate new private key'"
    echo "5. Save the downloaded JSON file as: backend/keys/firebase-key.json"
    echo ""
    echo "Then run this script again."
    exit 1
else
    echo -e "${GREEN}✅ Firebase service account key found${NC}"
    
    # Verify JSON is valid
    if jq empty keys/firebase-key.json 2>/dev/null; then
        PROJECT_ID=$(jq -r '.project_id' keys/firebase-key.json)
        echo -e "${GREEN}   Project ID: ${PROJECT_ID}${NC}"
    else
        echo -e "${RED}❌ Invalid JSON file. Please re-download the service account key.${NC}"
        exit 1
    fi
fi
echo ""

# Step 3: Set environment variable
echo -e "${YELLOW}🔧 Step 3: Setting environment variable...${NC}"
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/keys/firebase-key.json"
echo -e "${GREEN}✅ GOOGLE_APPLICATION_CREDENTIALS set${NC}"
echo "   Path: $GOOGLE_APPLICATION_CREDENTIALS"
echo ""

# Step 4: Create/Update .env file
echo -e "${YELLOW}📝 Step 4: Creating .env file...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=./keys/firebase-key.json
FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com

# Server Configuration
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:5060

# Stripe Configuration (Development)
STRIPE_SECRET=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# PayPal Configuration (Sandbox)
PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_PAYPAL_CLIENT_SECRET
PAYPAL_BASE=https://api-m.sandbox.paypal.com

# Feature Flags
MAINTENANCE_MODE=false
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}   ⚠️  Please update Stripe and PayPal credentials in .env${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Step 5: Install dependencies
echo -e "${YELLOW}📦 Step 5: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 6: Build TypeScript
echo -e "${YELLOW}🔨 Step 6: Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 7: Verify Firebase connection
echo -e "${YELLOW}🔥 Step 7: Verifying Firebase connection...${NC}"
echo "   Starting server to test connection..."
echo ""

# Start server in background and test
npm run dev &
SERVER_PID=$!
sleep 5  # Wait for server to start

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health || echo "failed")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Server is running and healthy${NC}"
    
    # Test Firestore
    DB_RESPONSE=$(curl -s http://localhost:8080/test/db || echo "failed")
    if [[ $DB_RESPONSE == *"success"* ]]; then
        echo -e "${GREEN}✅ Firestore connection successful${NC}"
    else
        echo -e "${RED}❌ Firestore connection failed${NC}"
        echo "   Response: $DB_RESPONSE"
    fi
    
    # Test Storage
    STORAGE_RESPONSE=$(curl -s http://localhost:8080/test/storage || echo "failed")
    if [[ $STORAGE_RESPONSE == *"success"* ]]; then
        echo -e "${GREEN}✅ Storage connection successful${NC}"
    else
        echo -e "${RED}❌ Storage connection failed${NC}"
        echo "   Response: $STORAGE_RESPONSE"
    fi
else
    echo -e "${RED}❌ Server failed to start${NC}"
    echo "   Check logs for errors"
fi

# Stop test server
kill $SERVER_PID 2>/dev/null || true
echo ""

# Final instructions
echo "======================================"
echo -e "${GREEN}✅ Local Setup Complete!${NC}"
echo "======================================"
echo ""
echo "To start the development server:"
echo -e "${YELLOW}  npm run dev${NC}"
echo ""
echo "Test endpoints:"
echo "  http://localhost:8080/health"
echo "  http://localhost:8080/test/db"
echo "  http://localhost:8080/test/storage"
echo "  http://localhost:8080/test/all"
echo ""
echo "Documentation:"
echo "  backend/deployment/FIREBASE_SETUP.md"
echo "  backend/deployment/CLOUD_RUN_DEPLOYMENT.md"
echo ""
