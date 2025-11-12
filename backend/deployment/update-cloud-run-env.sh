#!/bin/bash
# ============================================================================
# Quick Cloud Run Environment Variables Update
# ============================================================================
# Updates Cloud Run service environment variables without rebuilding image
# Use this for quick configuration changes
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "🔧 Cloud Run Environment Update"
echo "============================================"
echo ""

# Configuration
PROJECT_ID="pet-care-9790d"
REGION="europe-west1"
SERVICE_NAME="mypetcare-backend"
BUCKET="pet-care-9790d.appspot.com"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Project: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo "   Service: ${SERVICE_NAME}"
echo ""

# Set project
gcloud config set project "$PROJECT_ID" --quiet

# ==============================
# UPDATE ENVIRONMENT VARIABLES
# ==============================
echo -e "${YELLOW}▶️  Updating environment variables...${NC}"

# Determine PayPal base (sandbox or production)
read -p "Use production PayPal API? (y/n) [n]: " USE_PROD_PAYPAL
if [[ $USE_PROD_PAYPAL =~ ^[Yy]$ ]]; then
    PAYPAL_BASE="https://api-m.paypal.com"
    echo "   Using production PayPal: ${PAYPAL_BASE}"
else
    PAYPAL_BASE="https://api-m.sandbox.paypal.com"
    echo "   Using sandbox PayPal: ${PAYPAL_BASE}"
fi

# Frontend URL
read -p "Frontend URL [https://mypetcare.web.app]: " FRONT_URL_INPUT
FRONT_URL="${FRONT_URL_INPUT:-https://mypetcare.web.app}"

# Maintenance mode
read -p "Enable maintenance mode? (y/n) [n]: " MAINTENANCE
if [[ $MAINTENANCE =~ ^[Yy]$ ]]; then
    MAINTENANCE_MODE="true"
else
    MAINTENANCE_MODE="false"
fi

# Update environment variables
gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --set-env-vars "NODE_ENV=production,FIREBASE_STORAGE_BUCKET=${BUCKET},PAYPAL_BASE=${PAYPAL_BASE},FRONT_URL=${FRONT_URL},MAINTENANCE_MODE=${MAINTENANCE_MODE}" \
    --quiet

echo -e "${GREEN}✅ Environment variables updated${NC}"
echo ""

# ==============================
# UPDATE SECRETS (Optional)
# ==============================
read -p "Update API keys from Secret Manager? (y/n) [n]: " UPDATE_SECRETS
if [[ $UPDATE_SECRETS =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}▶️  Linking secrets from Secret Manager...${NC}"
    
    gcloud run services update "$SERVICE_NAME" \
        --region "$REGION" \
        --set-secrets "STRIPE_SECRET=STRIPE_SECRET:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,PAYPAL_CLIENT_ID=PAYPAL_CLIENT_ID:latest,PAYPAL_CLIENT_SECRET=PAYPAL_CLIENT_SECRET:latest" \
        --quiet
    
    echo -e "${GREEN}✅ Secrets linked${NC}"
fi

echo ""

# ==============================
# VERIFICATION
# ==============================
echo -e "${YELLOW}▶️  Verifying service...${NC}"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format 'value(status.url)')

echo "   Service URL: ${SERVICE_URL}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s "${SERVICE_URL}/health" 2>/dev/null || echo "failed")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}   ✓ Health check passed${NC}"
else
    echo -e "${YELLOW}   ⚠️  Health check failed or service restarting${NC}"
    echo "   Wait a few seconds and try: curl ${SERVICE_URL}/health"
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Update Complete${NC}"
echo "============================================"
echo ""
echo "Current configuration:"
echo "   PAYPAL_BASE: ${PAYPAL_BASE}"
echo "   FRONT_URL: ${FRONT_URL}"
echo "   MAINTENANCE_MODE: ${MAINTENANCE_MODE}"
echo ""
echo "View logs:"
echo "   gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo ""
