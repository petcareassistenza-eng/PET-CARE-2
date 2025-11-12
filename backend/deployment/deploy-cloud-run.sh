#!/bin/bash
# ============================================================================
# MyPetCare Backend - Cloud Run Deployment Script
# ============================================================================
# Deploy backend to Google Cloud Run with Service Account authentication
# (NO service account key files needed - uses Cloud Run's built-in IAM)
#
# Prerequisites:
# 1. gcloud CLI installed and authenticated
# 2. Firebase project created
# 3. Firestore Database created
# 4. Storage bucket created
# ============================================================================

set -e  # Exit on error

echo "======================================"
echo "🚀 MyPetCare - Cloud Run Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION - Modify these variables
# ============================================================================

PROJECT_ID="pet-care-9790d"              # Your Firebase/GCP project ID
REGION="europe-west1"                    # Cloud Run region (closest to users)
SERVICE_NAME="mypetcare-backend"         # Cloud Run service name
BUCKET="pet-care-9790d.appspot.com"      # Firebase Storage bucket
SA_NAME="backend-sa"                     # Service Account name
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if running in interactive mode
INTERACTIVE=true
if [ "$1" == "--non-interactive" ]; then
    INTERACTIVE=false
fi

# ============================================================================
# Helper Functions
# ============================================================================

prompt_continue() {
    if [ "$INTERACTIVE" = true ]; then
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled."
            exit 1
        fi
    fi
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        echo "   Please install $1 and try again"
        exit 1
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${BLUE}🔍 Step 0: Pre-flight checks...${NC}"
echo ""

# Check gcloud CLI
check_command gcloud

# Check Docker
check_command docker

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ Not authenticated with gcloud${NC}"
    echo "   Run: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# ============================================================================
# Step 1: Configure Project
# ============================================================================

echo -e "${BLUE}📋 Step 1: Configuring GCP project...${NC}"
echo "   Project ID: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo ""
prompt_continue

gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✅ Project configured${NC}"
echo ""

# ============================================================================
# Step 2: Enable Required APIs
# ============================================================================

echo -e "${BLUE}🔌 Step 2: Enabling required APIs...${NC}"
prompt_continue

gcloud services enable \
    run.googleapis.com \
    iam.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    cloudbuild.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# ============================================================================
# Step 3: Create Service Account
# ============================================================================

echo -e "${BLUE}👤 Step 3: Creating Service Account...${NC}"
echo "   Name: ${SA_NAME}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "   Email: ${SA_EMAIL}"
echo ""
prompt_continue

# Check if service account already exists
if gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Service Account already exists${NC}"
else
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="MyPetCare Backend Service Account" \
        --description="Service account for Cloud Run backend with Firestore and Storage access"
    echo -e "${GREEN}✅ Service Account created${NC}"
fi
echo ""

# ============================================================================
# Step 4: Grant IAM Roles
# ============================================================================

echo -e "${BLUE}🔐 Step 4: Granting IAM roles to Service Account...${NC}"
echo "   This follows the principle of least privilege"
echo ""
prompt_continue

# Firestore Database User (read/write access)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.user" \
    --condition=None

echo -e "${GREEN}✅ Granted Firestore access${NC}"

# Storage Object Admin (upload/download receipts)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.objectAdmin" \
    --condition=None

echo -e "${GREEN}✅ Granted Storage access${NC}"

# Logging (for Cloud Run logs)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/logging.logWriter" \
    --condition=None

echo -e "${GREEN}✅ Granted Logging access${NC}"
echo ""

# ============================================================================
# Step 5: Create Secrets (Optional but Recommended)
# ============================================================================

echo -e "${BLUE}🔒 Step 5: Creating secrets in Secret Manager...${NC}"
echo "   You can also use environment variables (less secure)"
echo ""

if [ "$INTERACTIVE" = true ]; then
    read -p "Use Secret Manager for API keys? (recommended) (y/n) " -n 1 -r
    echo ""
    USE_SECRETS=$REPLY
else
    USE_SECRETS="n"
fi

if [[ $USE_SECRETS =~ ^[Yy]$ ]]; then
    # Create secrets
    for secret in STRIPE_SECRET STRIPE_WEBHOOK_SECRET PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET; do
        if gcloud secrets describe "$secret" &>/dev/null; then
            echo -e "${YELLOW}⚠️  Secret ${secret} already exists${NC}"
        else
            gcloud secrets create "$secret" --replication-policy="automatic"
            echo -e "${GREEN}✅ Created secret: ${secret}${NC}"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}⚠️  Remember to add secret versions with actual values:${NC}"
    echo "   gcloud secrets versions add STRIPE_SECRET --data-file=- <<< 'sk_live_...'"
    echo "   gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=- <<< 'whsec_...'"
    echo "   gcloud secrets versions add PAYPAL_CLIENT_ID --data-file=- <<< 'YOUR_ID'"
    echo "   gcloud secrets versions add PAYPAL_CLIENT_SECRET --data-file=- <<< 'YOUR_SECRET'"
    echo ""
fi

# ============================================================================
# Step 6: Build Docker Image
# ============================================================================

echo -e "${BLUE}🐳 Step 6: Building Docker image...${NC}"
echo "   Image: ${IMAGE_NAME}:latest"
echo ""
prompt_continue

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found${NC}"
    echo "   Make sure you're in the backend directory"
    exit 1
fi

# Build and push image using Cloud Build
gcloud builds submit --tag "${IMAGE_NAME}:latest"

echo -e "${GREEN}✅ Docker image built and pushed${NC}"
echo ""

# ============================================================================
# Step 7: Deploy to Cloud Run
# ============================================================================

echo -e "${BLUE}🚀 Step 7: Deploying to Cloud Run...${NC}"
echo ""
prompt_continue

# Prepare environment variables
ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},FIREBASE_STORAGE_BUCKET=${BUCKET}"
ENV_VARS="${ENV_VARS},PAYPAL_BASE=https://api-m.paypal.com"  # Production PayPal
ENV_VARS="${ENV_VARS},FRONTEND_URL=https://mypetcare.web.app"
ENV_VARS="${ENV_VARS},MAINTENANCE_MODE=false"

# Deploy command
if [[ $USE_SECRETS =~ ^[Yy]$ ]]; then
    # Deploy with Secret Manager
    gcloud run deploy "$SERVICE_NAME" \
        --image "${IMAGE_NAME}:latest" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --service-account "$SA_EMAIL" \
        --set-env-vars "$ENV_VARS" \
        --set-secrets "STRIPE_SECRET=STRIPE_SECRET:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,PAYPAL_CLIENT_ID=PAYPAL_CLIENT_ID:latest,PAYPAL_CLIENT_SECRET=PAYPAL_CLIENT_SECRET:latest" \
        --memory 512Mi \
        --cpu 1 \
        --timeout 60s \
        --max-instances 10 \
        --min-instances 0
else
    # Deploy with environment variables (you'll need to add them manually or via --set-env-vars)
    echo -e "${YELLOW}⚠️  You'll need to add API keys as environment variables after deployment${NC}"
    gcloud run deploy "$SERVICE_NAME" \
        --image "${IMAGE_NAME}:latest" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --service-account "$SA_EMAIL" \
        --set-env-vars "$ENV_VARS" \
        --memory 512Mi \
        --cpu 1 \
        --timeout 60s \
        --max-instances 10 \
        --min-instances 0
fi

echo -e "${GREEN}✅ Deployment complete${NC}"
echo ""

# ============================================================================
# Step 8: Get Service URL and Test
# ============================================================================

echo -e "${BLUE}🌐 Step 8: Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')

echo ""
echo "======================================"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo "======================================"
echo ""
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "Test endpoints:"
echo "  ${SERVICE_URL}/health"
echo "  ${SERVICE_URL}/test/db"
echo "  ${SERVICE_URL}/test/storage"
echo "  ${SERVICE_URL}/test/all"
echo ""
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${SERVICE_URL}/health" || echo "failed")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi
echo ""

echo "Next steps:"
echo "1. Update Flutter app API_BASE to: ${SERVICE_URL}"
echo "2. Register webhook endpoints in Stripe/PayPal dashboards:"
echo "   - Stripe: ${SERVICE_URL}/webhooks/stripe"
echo "   - PayPal: ${SERVICE_URL}/webhooks/paypal"
echo "3. Test all endpoints with Postman collection"
echo "4. Update CORS origin if needed (currently: ${ENV_VARS})"
echo ""
echo "Monitoring:"
echo "  gcloud run services logs read ${SERVICE_NAME} --region ${REGION} --limit 50"
echo ""
echo "Update service:"
echo "  ./deployment/deploy-cloud-run.sh --non-interactive"
echo ""
