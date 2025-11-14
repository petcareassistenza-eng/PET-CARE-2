#!/bin/bash

# 🚀 MyPetCare - Script Deploy Automatico
# Esegue deploy completo di Frontend (Firebase Hosting) e Backend (Cloud Run)

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
PROJECT_ID="${GCP_PROJECT_ID:-pet-care-9790d}"
REGION="europe-west1"
SERVICE_NAME="mypetcare-backend"

echo -e "${BLUE}🚀 MyPetCare Deploy Script${NC}"
echo -e "${BLUE}=============================${NC}\n"

# Funzione per stampare messaggi
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica comandi necessari
check_dependencies() {
    log_info "Verifica dipendenze..."
    
    if ! command -v flutter &> /dev/null; then
        log_error "Flutter non trovato. Installalo da https://flutter.dev"
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI non trovato. Installa con: npm install -g firebase-tools"
        exit 1
    fi
    
    if ! command -v gcloud &> /dev/null; then
        log_error "Google Cloud SDK non trovato. Installalo da https://cloud.google.com/sdk"
        exit 1
    fi
    
    log_success "Tutte le dipendenze sono installate"
}

# Deploy Frontend (Flutter + Firebase Hosting)
deploy_frontend() {
    log_info "=== Deploy Frontend (Firebase Hosting) ==="
    
    log_info "Flutter clean..."
    flutter clean
    
    log_info "Flutter pub get..."
    flutter pub get
    
    log_info "Flutter build web --release..."
    flutter build web --release
    
    log_success "Build Flutter completata"
    
    log_info "Deploy Firebase Hosting..."
    firebase deploy --only hosting --project "$PROJECT_ID"
    
    log_success "Frontend deployato su Firebase Hosting"
    log_info "URL: https://app.mypetcareapp.org"
}

# Deploy Backend (Node.js + Cloud Run)
deploy_backend() {
    log_info "=== Deploy Backend (Cloud Run) ==="
    
    cd backend
    
    log_info "npm install..."
    npm install
    
    log_info "npm run build..."
    npm run build
    
    log_success "Build backend completata"
    
    log_info "Build Docker image..."
    gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" --project "$PROJECT_ID"
    
    log_info "Deploy Cloud Run..."
    gcloud run deploy "$SERVICE_NAME" \
        --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
        --platform managed \
        --region "$REGION" \
        --allow-unauthenticated \
        --memory 512Mi \
        --timeout 300 \
        --max-instances 10 \
        --project "$PROJECT_ID"
    
    cd ..
    
    log_success "Backend deployato su Cloud Run"
    log_info "URL: https://api.mypetcareapp.org"
}

# Verifica post-deploy
verify_deploy() {
    log_info "=== Verifica Deploy ==="
    
    log_info "Test frontend..."
    if curl -sI "https://app.mypetcareapp.org" | grep -q "200 OK"; then
        log_success "Frontend online"
    else
        log_warning "Frontend non raggiungibile (potrebbe richiedere qualche minuto)"
    fi
    
    log_info "Test backend health..."
    if curl -s "https://api.mypetcareapp.org/health" | grep -q '"ok"'; then
        log_success "Backend health OK"
    else
        log_warning "Backend health non risponde"
    fi
}

# Main
main() {
    # Parse arguments
    DEPLOY_FRONTEND=false
    DEPLOY_BACKEND=false
    
    if [ $# -eq 0 ]; then
        # Nessun argomento = deploy completo
        DEPLOY_FRONTEND=true
        DEPLOY_BACKEND=true
    else
        while [ $# -gt 0 ]; do
            case "$1" in
                --frontend|-f)
                    DEPLOY_FRONTEND=true
                    ;;
                --backend|-b)
                    DEPLOY_BACKEND=true
                    ;;
                --help|-h)
                    echo "Usage: ./deploy.sh [options]"
                    echo ""
                    echo "Options:"
                    echo "  --frontend, -f    Deploy solo frontend (Firebase Hosting)"
                    echo "  --backend, -b     Deploy solo backend (Cloud Run)"
                    echo "  --help, -h        Mostra questo help"
                    echo ""
                    echo "Senza opzioni: deploy completo (frontend + backend)"
                    exit 0
                    ;;
                *)
                    log_error "Opzione sconosciuta: $1"
                    echo "Usa --help per vedere le opzioni disponibili"
                    exit 1
                    ;;
            esac
            shift
        done
    fi
    
    check_dependencies
    
    if [ "$DEPLOY_FRONTEND" = true ]; then
        deploy_frontend
    fi
    
    if [ "$DEPLOY_BACKEND" = true ]; then
        deploy_backend
    fi
    
    verify_deploy
    
    echo ""
    log_success "🎉 Deploy completato con successo!"
    echo ""
    echo "Frontend: https://app.mypetcareapp.org"
    echo "Backend:  https://api.mypetcareapp.org"
    echo ""
}

# Run main function
main "$@"
