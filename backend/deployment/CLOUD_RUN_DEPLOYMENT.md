# 🚀 Cloud Run Deployment Guide - MyPetCare Backend

Guida completa per il deployment del backend MyPetCare su Google Cloud Run con autenticazione Service Account (senza chiavi JSON).

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Prerequisiti](#prerequisiti)
3. [Quick Start (Automatico)](#quick-start-automatico)
4. [Deployment Manuale](#deployment-manuale)
5. [Configurazione Avanzata](#configurazione-avanzata)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Manutenzione](#manutenzione)

---

## Panoramica

### Cosa Viene Deployato

- **Backend API Node.js** con Express
- **Firebase Admin SDK** per Firestore + Storage + Auth
- **Webhook Stripe + PayPal** per pagamenti
- **Endpoint Admin** per dashboard analytics e rimborsi
- **Endpoint Diagnostica** per test Firestore/Storage

### Architettura Cloud Run

```
Internet
    ↓
Cloud Run Service (mypetcare-backend)
    ↓
Service Account (backend-sa@PROJECT_ID.iam.gserviceaccount.com)
    ↓
├─ Firestore Database (roles/datastore.user)
├─ Cloud Storage (roles/storage.objectAdmin)
└─ Cloud Logging (roles/logging.logWriter)
```

### Vantaggi Cloud Run

- ✅ **Serverless**: Scala automaticamente da 0 a N istanze
- ✅ **Pay-per-use**: Paghi solo per le richieste effettive
- ✅ **Autenticazione IAM**: Nessun file JSON da gestire
- ✅ **HTTPS automatico**: Certificati SSL gestiti da Google
- ✅ **Zero downtime**: Deploy con rollback automatico se fallisce
- ✅ **Monitoring integrato**: Cloud Logging + Cloud Trace

---

## Prerequisiti

### 1. Account Google Cloud

- Progetto Firebase/GCP attivo: **pet-care-9790d**
- Billing abilitato (Cloud Run ha free tier generoso)
- Permessi: **Owner** o **Editor**

### 2. Firestore Database

**CRITICO**: Crea Firestore Database PRIMA del deployment!

1. Vai a [Firebase Console](https://console.firebase.google.com/)
2. Seleziona progetto → **Firestore Database**
3. Click **"Create Database"**
4. Scegli modalità (production/test)
5. Seleziona location: **europe-west1** (consigliato per EU)

### 3. Cloud Storage Bucket

Verifica che il bucket Firebase Storage esista:
- Firebase Console → Storage → Files
- Bucket name: `pet-care-9790d.appspot.com`

### 4. Tools Locali

Installa strumenti necessari:

```bash
# gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Verifica installazione
gcloud --version

# Login
gcloud auth login

# Docker (opzionale per build locale)
# Vedi: https://docs.docker.com/get-docker/
```

---

## Quick Start (Automatico)

### Usa lo Script di Deployment

Lo script `deploy-cloud-run.sh` automatizza tutto il processo:

```bash
cd backend

# Deployment interattivo (consigliato prima volta)
./deployment/deploy-cloud-run.sh

# Deployment non-interattivo (per CI/CD)
./deployment/deploy-cloud-run.sh --non-interactive
```

### Cosa Fa lo Script

1. ✅ Verifica prerequisiti (gcloud, docker, authentication)
2. ✅ Configura progetto GCP
3. ✅ Abilita API necessarie
4. ✅ Crea Service Account dedicato
5. ✅ Assegna ruoli IAM (least privilege principle)
6. ✅ (Opzionale) Crea Secret Manager per API keys
7. ✅ Build Docker image con Cloud Build
8. ✅ Deploy su Cloud Run con configurazione ottimale
9. ✅ Test endpoint di diagnostica
10. ✅ Mostra URL servizio e next steps

### Output Atteso

```
======================================
✅ Deployment Successful!
======================================

Service URL: https://mypetcare-backend-xxxxx-ew.a.run.app

Test endpoints:
  https://mypetcare-backend-xxxxx-ew.a.run.app/health
  https://mypetcare-backend-xxxxx-ew.a.run.app/test/db
  https://mypetcare-backend-xxxxx-ew.a.run.app/test/storage

✅ Health check passed

Next steps:
1. Update Flutter app API_BASE to: https://mypetcare-backend-xxxxx-ew.a.run.app
2. Register webhook endpoints in Stripe/PayPal dashboards
3. Test all endpoints with Postman collection
```

---

## Deployment Manuale

Se preferisci controllo completo, segui questi step manuali:

### Step 1: Variabili Configurazione

```bash
PROJECT_ID="pet-care-9790d"
REGION="europe-west1"
SERVICE_NAME="mypetcare-backend"
BUCKET="pet-care-9790d.appspot.com"
SA_NAME="backend-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
```

### Step 2: Configura Progetto

```bash
# Seleziona progetto
gcloud config set project "$PROJECT_ID"

# Verifica progetto attivo
gcloud config get-value project
```

### Step 3: Abilita API

```bash
gcloud services enable \
    run.googleapis.com \
    iam.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    cloudbuild.googleapis.com
```

### Step 4: Crea Service Account

```bash
# Crea service account
gcloud iam service-accounts create "$SA_NAME" \
    --display-name="MyPetCare Backend Service Account" \
    --description="Service account for Cloud Run backend with Firestore and Storage access"

# Verifica creazione
gcloud iam service-accounts list --filter="email:${SA_EMAIL}"
```

### Step 5: Assegna Ruoli IAM

**Principle of Least Privilege**: Assegniamo solo i permessi necessari.

```bash
# Firestore Database User (read/write Firestore)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.user"

# Storage Object Admin (upload/download files)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.objectAdmin"

# Log Writer (write Cloud Logging logs)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/logging.logWriter"
```

**Verifica ruoli assegnati:**
```bash
gcloud projects get-iam-policy "$PROJECT_ID" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${SA_EMAIL}"
```

### Step 6: (Opzionale) Crea Secret Manager

**Raccomandato per production**: Usa Secret Manager invece di environment variables per API keys sensibili.

```bash
# Crea secrets vuoti
for secret in STRIPE_SECRET STRIPE_WEBHOOK_SECRET PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET; do
    gcloud secrets create "$secret" --replication-policy="automatic"
done

# Aggiungi versioni con valori reali (sostituisci con tuoi valori)
echo -n "sk_live_YOUR_STRIPE_SECRET" | gcloud secrets versions add STRIPE_SECRET --data-file=-
echo -n "whsec_YOUR_WEBHOOK_SECRET" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
echo -n "YOUR_PAYPAL_CLIENT_ID" | gcloud secrets versions add PAYPAL_CLIENT_ID --data-file=-
echo -n "YOUR_PAYPAL_CLIENT_SECRET" | gcloud secrets versions add PAYPAL_CLIENT_SECRET --data-file=-

# Verifica secrets
gcloud secrets list
```

**Permessi Secret Manager** (se usi secrets):
```bash
# Permetti al service account di leggere i secrets
for secret in STRIPE_SECRET STRIPE_WEBHOOK_SECRET PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET; do
    gcloud secrets add-iam-policy-binding "$secret" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="roles/secretmanager.secretAccessor"
done
```

### Step 7: Build Docker Image

**Opzione A - Cloud Build (Raccomandato):**
```bash
cd backend

# Build e push con Cloud Build
gcloud builds submit --tag "${IMAGE_NAME}:latest"
```

**Opzione B - Build Locale:**
```bash
cd backend

# Build localmente
npm run build

# Build Docker image
docker build -t "${IMAGE_NAME}:latest" .

# Push a Container Registry
docker push "${IMAGE_NAME}:latest"
```

### Step 8: Deploy Cloud Run

**Con Secret Manager:**
```bash
gcloud run deploy "$SERVICE_NAME" \
    --image "${IMAGE_NAME}:latest" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --service-account "$SA_EMAIL" \
    --set-env-vars "NODE_ENV=production,FIREBASE_STORAGE_BUCKET=${BUCKET},PAYPAL_BASE=https://api-m.paypal.com,FRONTEND_URL=https://mypetcare.web.app,MAINTENANCE_MODE=false" \
    --set-secrets "STRIPE_SECRET=STRIPE_SECRET:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,PAYPAL_CLIENT_ID=PAYPAL_CLIENT_ID:latest,PAYPAL_CLIENT_SECRET=PAYPAL_CLIENT_SECRET:latest" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60s \
    --max-instances 10 \
    --min-instances 0 \
    --concurrency 80
```

**Senza Secret Manager (env vars dirette):**
```bash
gcloud run deploy "$SERVICE_NAME" \
    --image "${IMAGE_NAME}:latest" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --service-account "$SA_EMAIL" \
    --set-env-vars "NODE_ENV=production,FIREBASE_STORAGE_BUCKET=${BUCKET},STRIPE_SECRET=sk_live_...,STRIPE_WEBHOOK_SECRET=whsec_...,PAYPAL_CLIENT_ID=...,PAYPAL_CLIENT_SECRET=...,PAYPAL_BASE=https://api-m.paypal.com,FRONTEND_URL=https://mypetcare.web.app,MAINTENANCE_MODE=false" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60s \
    --max-instances 10 \
    --min-instances 0
```

### Step 9: Ottieni URL Servizio

```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format 'value(status.url)')

echo "Service URL: $SERVICE_URL"
```

### Step 10: Test Endpoint

```bash
# Health check
curl -s "${SERVICE_URL}/health" | jq

# Firestore test
curl -s "${SERVICE_URL}/test/db" | jq

# Storage test
curl -s "${SERVICE_URL}/test/storage" | jq

# All tests
curl -s "${SERVICE_URL}/test/all" | jq
```

---

## Configurazione Avanzata

### Scaling Configuration

```bash
gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --min-instances 1 \      # Sempre 1 istanza attiva (evita cold start)
    --max-instances 20 \      # Max 20 istanze per spike traffic
    --concurrency 80 \        # Max 80 richieste simultanee per istanza
    --cpu-throttling          # Throttling CPU quando idle (risparmio costi)
```

### Resource Limits

```bash
gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --memory 1Gi \           # 1GB RAM (default 512Mi)
    --cpu 2 \                # 2 vCPU (default 1)
    --timeout 300s           # Timeout 5 minuti (default 60s)
```

### Traffic Management (Blue/Green Deployment)

```bash
# Deploy nuova revisione con traffic 0%
gcloud run deploy "$SERVICE_NAME" \
    --region "$REGION" \
    --image "${IMAGE_NAME}:v2" \
    --no-traffic

# Gradual traffic split (10% nuova revisione)
gcloud run services update-traffic "$SERVICE_NAME" \
    --region "$REGION" \
    --to-revisions LATEST=10

# Switch completo a nuova revisione
gcloud run services update-traffic "$SERVICE_NAME" \
    --region "$REGION" \
    --to-latest
```

### Custom Domain

```bash
# Mappa dominio custom
gcloud run domain-mappings create \
    --service "$SERVICE_NAME" \
    --domain api.mypetcare.it \
    --region "$REGION"

# Segui istruzioni per aggiungere DNS records
```

### CORS Configuration

Se hai problemi CORS, aggiorna la configurazione nel codice:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'https://mypetcare.web.app',
    'https://mypetcare.firebaseapp.com',
    'https://mypetcare.it',
    'https://www.mypetcare.it'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Post-Deployment

### 1. Aggiorna Flutter App

Configura API base URL nell'app Flutter:

```bash
# Build con API URL production
flutter build web --release --dart-define=API_BASE=https://mypetcare-backend-xxxxx-ew.a.run.app

# Build APK con API URL production
flutter build apk --release --dart-define=API_BASE=https://mypetcare-backend-xxxxx-ew.a.run.app
```

### 2. Registra Webhook Endpoints

**Stripe Dashboard:**
1. Vai a [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://mypetcare-backend-xxxxx-ew.a.run.app/webhooks/stripe`
4. Eventi da ascoltare:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia **Signing Secret** → Aggiorna `STRIPE_WEBHOOK_SECRET`

**PayPal Developer Dashboard:**
1. Vai a [PayPal Developer](https://developer.paypal.com/) → My Apps & Credentials
2. Seleziona app → Webhooks
3. URL: `https://mypetcare-backend-xxxxx-ew.a.run.app/webhooks/paypal`
4. Eventi da ascoltare:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`

### 3. Test Completo con Postman

Usa la collection Postman creata:

```bash
# Importa collection
tests/postman_admin_collection.json

# Configura environment
baseUrl = https://mypetcare-backend-xxxxx-ew.a.run.app
adminToken = <FIREBASE_ADMIN_ID_TOKEN>
paymentId = <FIRESTORE_PAYMENT_DOC_ID>

# Esegui tutti i test
```

### 4. Monitoring e Alerts

Configura Cloud Monitoring alerts:

```bash
# Error rate > 5%
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Error Rate" \
    --condition-display-name="Error rate > 5%" \
    --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'

# P99 latency > 1s
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Latency" \
    --condition-display-name="P99 latency > 1s"
```

---

## Troubleshooting

Vedi sezione completa in `FIREBASE_SETUP.md` per troubleshooting Firebase-specific.

### Cloud Run Specific Issues

#### ❌ Deployment Failed: "Image not found"

**Errore:**
```
ERROR: Image 'gcr.io/pet-care-9790d/mypetcare-backend:latest' not found
```

**Soluzione:**
```bash
# Verifica immagini disponibili
gcloud container images list --repository="gcr.io/${PROJECT_ID}"

# Rebuild immagine
gcloud builds submit --tag "${IMAGE_NAME}:latest"

# Rideploy
gcloud run deploy "$SERVICE_NAME" --image "${IMAGE_NAME}:latest" --region "$REGION"
```

---

#### ❌ Cold Start Lento

**Sintomo**: Prime richieste dopo idle period sono lente (>5s)

**Soluzioni:**
1. **Min instances**: Mantieni 1+ istanza sempre attiva
   ```bash
   gcloud run services update "$SERVICE_NAME" --min-instances 1 --region "$REGION"
   ```

2. **Startup CPU Boost**: Alloca più CPU durante startup
   ```bash
   gcloud run services update "$SERVICE_NAME" --cpu-boost --region "$REGION"
   ```

3. **Optimize Docker image**: Usa multi-stage build (già implementato)

---

#### ❌ Memory Exceeded

**Errore nei logs:**
```
Memory limit of 512Mi exceeded
```

**Soluzione:**
```bash
# Aumenta memoria a 1GB
gcloud run services update "$SERVICE_NAME" --memory 1Gi --region "$REGION"
```

---

#### ❌ Webhook Signature Verification Failed

**Errore Stripe:**
```
Error: No signatures found matching the expected signature for payload
```

**Causa**: Body della richiesta non è raw per webhook

**Verifica nel codice** (`src/index.ts`):
```typescript
// ✅ CORRETTO: Raw body parsing SOLO per webhook
app.use('/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));
app.post('/webhooks/stripe', handleStripeWebhook);

// ❌ SBAGLIATO: JSON parsing prima del webhook
app.use(bodyParser.json());  // Questo deve venire DOPO i webhook
app.use('/webhooks/stripe', ...);
```

---

## Manutenzione

### Update Application

```bash
# Step 1: Build nuova immagine con tag versione
gcloud builds submit --tag "${IMAGE_NAME}:v1.1.0"

# Step 2: Deploy nuova versione
gcloud run deploy "$SERVICE_NAME" \
    --image "${IMAGE_NAME}:v1.1.0" \
    --region "$REGION"

# Step 3: Verifica deployment
curl -s "${SERVICE_URL}/health"
```

### Rollback

```bash
# Lista revisioni
gcloud run revisions list --service="$SERVICE_NAME" --region="$REGION"

# Rollback a revisione precedente
gcloud run services update-traffic "$SERVICE_NAME" \
    --region "$REGION" \
    --to-revisions REVISION_NAME=100
```

### View Logs

```bash
# Real-time logs
gcloud run services logs tail "$SERVICE_NAME" --region "$REGION"

# Last 100 logs
gcloud run services logs read "$SERVICE_NAME" --region "$REGION" --limit 100

# Error logs only
gcloud run services logs read "$SERVICE_NAME" \
    --region "$REGION" \
    --filter="severity>=ERROR" \
    --limit 50
```

### Cost Monitoring

```bash
# View current costs
gcloud billing accounts list

# Enable budgets and alerts
# Vai a: Cloud Console → Billing → Budgets & alerts
```

---

## 📚 Risorse Utili

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Best Practices for Cloud Run](https://cloud.google.com/run/docs/tips)
- [Troubleshooting Cloud Run](https://cloud.google.com/run/docs/troubleshooting)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2025-01-15  
**Supporto**: Vedi `backend/deployment/FIREBASE_SETUP.md` per configurazione Firebase
