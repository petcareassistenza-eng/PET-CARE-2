#!/bin/bash
#
# My Pet Care - Build & Deploy Script (Web)
# Usage: ./build_and_deploy.sh [environment]
#   environment: dev | staging | production (default: dev)
#
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment selection
ENV=${1:-dev}
echo -e "${BLUE}🚀 My Pet Care - Build & Deploy${NC}"
echo -e "${YELLOW}Environment: ${ENV}${NC}"
echo ""

# Load environment variables from .env file
if [ -f ".env.${ENV}" ]; then
  echo -e "${GREEN}✅ Loading .env.${ENV}${NC}"
  export $(grep -v '^#' ".env.${ENV}" | xargs)
elif [ -f ".env" ]; then
  echo -e "${GREEN}✅ Loading .env${NC}"
  export $(grep -v '^#' .env | xargs)
else
  echo -e "${YELLOW}⚠️  No .env file found, using defaults${NC}"
fi

# Set default values if not provided
API_BASE_URL=${API_BASE_URL:-"http://localhost:8080"}
MAPS_API_KEY=${MAPS_API_KEY:-""}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-""}
PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID:-""}

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  API_BASE_URL: ${API_BASE_URL}"
echo "  MAPS_API_KEY: ${MAPS_API_KEY:0:20}..."
echo "  STRIPE_KEY: ${STRIPE_PUBLISHABLE_KEY:0:20}..."
echo "  PAYPAL_ID: ${PAYPAL_CLIENT_ID:0:20}..."
echo ""

# Step 1: Clean
echo -e "${BLUE}🧹 Step 1/4: Cleaning project...${NC}"
flutter clean
echo -e "${GREEN}✅ Clean completed${NC}"
echo ""

# Step 2: Get dependencies
echo -e "${BLUE}📦 Step 2/4: Getting dependencies...${NC}"
flutter pub get
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Build for web
echo -e "${BLUE}🏗️  Step 3/4: Building for web (release)...${NC}"
flutter build web --release \
  --dart-define=API_BASE_URL="${API_BASE_URL}" \
  --dart-define=MAPS_API_KEY="${MAPS_API_KEY}" \
  --dart-define=STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" \
  --dart-define=PAYPAL_CLIENT_ID="${PAYPAL_CLIENT_ID}"

echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 4: Deploy to Firebase (if firebase is configured)
if command -v firebase &> /dev/null && [ -f "firebase.json" ]; then
  echo -e "${BLUE}🚀 Step 4/4: Deploying to Firebase Hosting...${NC}"
  
  # Check if user is logged in
  if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Firebase not authenticated. Run: firebase login${NC}"
    echo -e "${YELLOW}Skipping deploy...${NC}"
  else
    firebase deploy --only hosting
    echo -e "${GREEN}✅ Deploy completed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Firebase CLI not found or firebase.json missing${NC}"
  echo -e "${BLUE}📝 To setup Firebase:${NC}"
  echo "  1. npm install -g firebase-tools"
  echo "  2. firebase login"
  echo "  3. firebase init hosting"
  echo ""
  echo -e "${BLUE}🌐 Starting local preview server instead...${NC}"
  
  # Kill existing server on port 5060
  lsof -ti:5060 | xargs -r kill -9 2>/dev/null || true
  sleep 2
  
  # Start Python server
  cd build/web
  python3 -m http.server 5060 --bind 0.0.0.0 > /tmp/flutter_web.log 2>&1 &
  SERVER_PID=$!
  cd ../..
  
  sleep 2
  
  if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ Preview server started on http://localhost:5060${NC}"
    echo -e "${GREEN}   PID: $SERVER_PID${NC}"
  else
    echo -e "${RED}❌ Failed to start preview server${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}🎉 Build & Deploy completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Build Info:${NC}"
echo "  Environment: ${ENV}"
echo "  Build size: $(du -sh build/web | cut -f1)"
echo "  Build time: $(date)"
echo ""
