#!/bin/bash
# deploy-with-env.sh
# Script completo per deployment My Pet Care backend su Cloud Run con env variables

set -e  # Exit on error

PROJECT_ID="pet-care-9790d"
SERVICE_NAME="pet-care-api"
REGION="europe-west1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "========================================"
echo "🐾 My Pet Care Backend Deployment"
echo "========================================"
echo ""

# Verifica gcloud
echo "🔍 Verificando gcloud CLI..."
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI non trovato!"
    exit 1
fi
echo "✅ gcloud CLI trovato"
echo ""

# Configura progetto
echo "🔧 Configurando progetto..."
gcloud config set project $PROJECT_ID
echo "✅ Progetto configurato: $PROJECT_ID"
echo ""

# Abilita APIs necessarie
echo "🔌 Abilitando APIs necessarie..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com
echo "✅ APIs abilitate"
echo ""

# Build immagine
echo "🏗️  Building Docker image con Cloud Build..."
echo "   Immagine: $IMAGE_NAME"
echo "   Tempo stimato: 3-5 minuti"
echo ""
gcloud builds submit --tag $IMAGE_NAME
echo ""
echo "✅ Build completato!"
echo ""

# Leggi variabili d'ambiente da .env.cloudrun
echo "📦 Preparando variabili d'ambiente..."
ENV_VARS=""
if [ -f ".env.cloudrun" ]; then
    while IFS='=' read -r key value; do
        # Salta linee vuote e commenti
        if [[ ! -z "$key" && ! "$key" =~ ^# ]]; then
            # Rimuovi spazi e commenti inline
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | sed 's/#.*//' | xargs)
            if [[ ! -z "$value" ]]; then
                if [ -z "$ENV_VARS" ]; then
                    ENV_VARS="$key=$value"
                else
                    ENV_VARS="$ENV_VARS,$key=$value"
                fi
            fi
        fi
    done < .env.cloudrun
fi
echo "✅ Variabili d'ambiente preparate"
echo ""

# Deploy su Cloud Run
echo "🚀 Deploying su Cloud Run..."
echo "   Servizio: $SERVICE_NAME"
echo "   Region: $REGION"
echo ""

if [ -z "$ENV_VARS" ]; then
    # Deploy senza env vars
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 10 \
        --timeout 60
else
    # Deploy con env vars
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_NAME \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 10 \
        --timeout 60 \
        --set-env-vars="$ENV_VARS"
fi

echo ""
echo "✅ Deploy completato!"
echo ""

# Ottieni URL
echo "🔗 Ottenendo URL servizio..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format="value(status.url)")

echo ""
echo "========================================"
echo "✨ DEPLOYMENT COMPLETATO!"
echo "========================================"
echo ""
echo "📋 Informazioni servizio:"
echo "   Nome: $SERVICE_NAME"
echo "   Region: $REGION"
echo "   URL: $SERVICE_URL"
echo ""
echo "🧪 Test endpoints:"
echo "   Health: curl $SERVICE_URL/health"
echo "   API Docs: $SERVICE_URL/api/docs"
echo ""
echo "🔧 Prossimi passi:"
echo "   1. Verifica salute: curl $SERVICE_URL/health"
echo "   2. Aggiorna lib/config.dart con:"
echo "      backendBaseUrl = '$SERVICE_URL'"
echo "   3. Configura webhooks Stripe/PayPal con base URL:"
echo "      $SERVICE_URL"
echo ""
