# 📦 MyPetCare Backend - Deployment Guide

Guida centralizzata per setup locale e deployment production del backend MyPetCare su Google Cloud Run.

---

## 📂 Struttura Directory

```
deployment/
├── README.md                       ← Questo file (indice documentazione)
├── FIREBASE_SETUP.md               ← Setup Firebase Admin SDK (locale + Cloud Run)
├── CLOUD_RUN_DEPLOYMENT.md         ← Deployment completo Cloud Run
├── setup-local.sh                  ← Script automatico setup locale
└── deploy-cloud-run.sh             ← Script automatico deployment Cloud Run
```

---

## 🚀 Quick Start

### Sviluppo Locale

```bash
cd backend

# Setup automatico (consigliato)
./deployment/setup-local.sh

# Setup manuale
# 1. Scarica service account key da Firebase Console
# 2. Salva come backend/keys/firebase-key.json
# 3. Esegui:
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/keys/firebase-key.json"
npm install
npm run dev

# Test endpoint
curl http://localhost:8080/health
curl http://localhost:8080/test/db
curl http://localhost:8080/test/storage
```

### Deployment Production (Cloud Run)

```bash
cd backend

# Deployment automatico (consigliato)
./deployment/deploy-cloud-run.sh

# Deployment manuale
# Vedi: CLOUD_RUN_DEPLOYMENT.md per step-by-step completo
```

---

## 📖 Documentazione Completa

### 1. [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

**Setup Firebase Admin SDK per sviluppo locale e production**

**Copre:**
- ✅ Panoramica architettura Firebase Admin SDK
- ✅ Setup locale con service account key file
- ✅ Setup Cloud Run con Service Account IAM (no JSON files)
- ✅ Verifica configurazione Firestore + Storage
- ✅ Troubleshooting permission issues
- ✅ Debug logs locale e Cloud Run

**Quando usare:**
- Prima volta che configuri ambiente di sviluppo
- Problemi di autenticazione Firebase
- Errori "Permission Denied" su Firestore/Storage

**Keywords**: Firebase, Firestore, Storage, Service Account, GOOGLE_APPLICATION_CREDENTIALS

---

### 2. [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md)

**Deployment completo backend su Google Cloud Run**

**Copre:**
- ✅ Prerequisiti e setup iniziale
- ✅ Creazione Service Account con ruoli IAM minimi
- ✅ Secret Manager per API keys (Stripe, PayPal)
- ✅ Build Docker image con Cloud Build
- ✅ Deploy Cloud Run con configurazione ottimale
- ✅ Post-deployment (webhook registration, monitoring)
- ✅ Configurazione avanzata (scaling, traffic management, custom domain)
- ✅ Manutenzione (update, rollback, logs)

**Quando usare:**
- Primo deployment su Cloud Run
- Aggiornamento configurazione production
- Problemi deployment o runtime
- Setup monitoring e alerts

**Keywords**: Cloud Run, GCP, Docker, Deployment, Production, Scaling

---

## 🛠️ Scripts Automatici

### setup-local.sh

**Scopo**: Automatizza setup ambiente di sviluppo locale

**Cosa fa:**
1. ✅ Crea directory `keys/`
2. ✅ Verifica presenza service account key
3. ✅ Imposta variabile ambiente `GOOGLE_APPLICATION_CREDENTIALS`
4. ✅ Crea file `.env` con configurazione default
5. ✅ Installa dipendenze Node.js
6. ✅ Build TypeScript
7. ✅ Test connessione Firebase (Firestore + Storage)

**Uso:**
```bash
cd backend
./deployment/setup-local.sh
```

**Prerequisiti:**
- Service account key scaricato da Firebase Console
- File salvato come `backend/keys/firebase-key.json`

---

### deploy-cloud-run.sh

**Scopo**: Automatizza deployment completo su Cloud Run

**Cosa fa:**
1. ✅ Verifica prerequisiti (gcloud, docker, auth)
2. ✅ Configura progetto GCP
3. ✅ Abilita API necessarie
4. ✅ Crea Service Account
5. ✅ Assegna ruoli IAM
6. ✅ (Opzionale) Crea Secret Manager secrets
7. ✅ Build Docker image con Cloud Build
8. ✅ Deploy Cloud Run
9. ✅ Test endpoint diagnostica
10. ✅ Mostra URL servizio e next steps

**Uso:**
```bash
cd backend

# Interattivo (prompt per ogni step)
./deployment/deploy-cloud-run.sh

# Non-interattivo (per CI/CD)
./deployment/deploy-cloud-run.sh --non-interactive
```

**Prerequisiti:**
- gcloud CLI installato e autenticato
- Firebase project creato
- Firestore Database creato
- Billing abilitato

---

## 🔧 Configurazione

### Variabili Ambiente

**Locale (`.env` file):**
```bash
# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./keys/firebase-key.json
FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com
FIREBASE_PROJECT_ID=pet-care-9790d

# Server
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:5060

# Stripe (Development)
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_BASE=https://api-m.sandbox.paypal.com

# Feature Flags
MAINTENANCE_MODE=false
```

**Cloud Run (Environment Variables):**
```bash
NODE_ENV=production
FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com
PAYPAL_BASE=https://api-m.paypal.com  # Production PayPal
FRONTEND_URL=https://mypetcare.web.app
MAINTENANCE_MODE=false

# API Keys (via Secret Manager - consigliato)
STRIPE_SECRET=secret:STRIPE_SECRET:latest
STRIPE_WEBHOOK_SECRET=secret:STRIPE_WEBHOOK_SECRET:latest
PAYPAL_CLIENT_ID=secret:PAYPAL_CLIENT_ID:latest
PAYPAL_CLIENT_SECRET=secret:PAYPAL_CLIENT_SECRET:latest
```

---

## 🧪 Test Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "development",
  "maintenanceMode": false
}
```

### Firestore Test
```bash
curl http://localhost:8080/test/db
```

**Response:**
```json
{
  "success": true,
  "firestore": {
    "write": true,
    "read": true,
    "documentId": "abc123"
  },
  "message": "✅ Firestore working correctly"
}
```

### Storage Test
```bash
curl http://localhost:8080/test/storage
```

**Response:**
```json
{
  "success": true,
  "storage": {
    "write": true,
    "bucket": "pet-care-9790d.appspot.com",
    "publicUrl": "https://storage.googleapis.com/..."
  },
  "message": "✅ Storage working correctly"
}
```

### All Tests
```bash
curl http://localhost:8080/test/all
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production",
  "cloudRun": true,
  "tests": {
    "firestore": { "status": "success", "documentId": "abc123" },
    "storage": { "status": "success", "bucket": "pet-care-9790d.appspot.com" }
  },
  "message": "✅ All tests passed"
}
```

---

## 🔍 Troubleshooting

### Quick Checklist

**Locale:**
- [ ] Service account key file esiste in `backend/keys/firebase-key.json`
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` variabile impostata
- [ ] File `.env` creato con tutte le variabili
- [ ] `npm install` eseguito
- [ ] Firestore Database creato in Firebase Console
- [ ] Storage bucket esiste

**Cloud Run:**
- [ ] gcloud CLI installato e autenticato
- [ ] Progetto GCP selezionato correttamente
- [ ] API abilitate (Cloud Run, Firestore, Storage, IAM)
- [ ] Service Account creato con ruoli corretti
- [ ] Docker image buildato e pushato
- [ ] Variabili ambiente configurate nel servizio Cloud Run

### Errori Comuni

**❌ "Failed to initialize Firebase Admin SDK"**
- Vedi: [FIREBASE_SETUP.md - Troubleshooting](FIREBASE_SETUP.md#troubleshooting)

**❌ "PERMISSION_DENIED: Missing or insufficient permissions"**
- Vedi: [FIREBASE_SETUP.md - Permission Denied](FIREBASE_SETUP.md#errore-permission_denied-missing-or-insufficient-permissions)

**❌ "Image not found" durante deploy**
- Vedi: [CLOUD_RUN_DEPLOYMENT.md - Image not found](CLOUD_RUN_DEPLOYMENT.md#deployment-failed-image-not-found)

**❌ "Webhook signature verification failed"**
- Vedi: [CLOUD_RUN_DEPLOYMENT.md - Webhook Issues](CLOUD_RUN_DEPLOYMENT.md#webhook-signature-verification-failed)

---

## 📚 Risorse Correlate

### Documentazione Backend
- `backend/BACKEND_README.md` - Overview backend architecture
- `backend/tests/README.md` - API testing con REST Client
- `backend/tests/POSTMAN_SETUP.md` - API testing con Postman

### Documentazione Firestore
- `backend/deployment/FIREBASE_SETUP.md` - Setup Firebase Admin SDK
- Firebase Console: https://console.firebase.google.com/

### Documentazione Cloud Run
- `backend/deployment/CLOUD_RUN_DEPLOYMENT.md` - Deployment guide completa
- Cloud Run Console: https://console.cloud.google.com/run

### External Resources
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)

---

## 🎯 Workflow Raccomandato

### Prima Volta (Setup Completo)

1. **Setup Locale**
   ```bash
   # Scarica service account key da Firebase Console
   # Salva come backend/keys/firebase-key.json
   ./deployment/setup-local.sh
   npm run dev
   ```

2. **Test Locale**
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:8080/test/all
   ```

3. **Deployment Cloud Run**
   ```bash
   ./deployment/deploy-cloud-run.sh
   ```

4. **Post-Deployment**
   - Aggiorna Flutter app con nuovo `API_BASE`
   - Registra webhook Stripe/PayPal
   - Test con Postman collection

### Updates Successivi

1. **Modifiche Codice**
   ```bash
   # Test locale
   npm run dev
   
   # Deploy se OK
   ./deployment/deploy-cloud-run.sh --non-interactive
   ```

2. **Rollback se Necessario**
   ```bash
   gcloud run revisions list --service=mypetcare-backend --region=europe-west1
   gcloud run services update-traffic mypetcare-backend --to-revisions=REVISION_NAME=100 --region=europe-west1
   ```

---

## ✅ Checklist Deployment Completo

### Pre-Deployment
- [ ] Firestore Database creato
- [ ] Storage bucket configurato
- [ ] Service account key scaricato (solo per locale)
- [ ] Stripe API keys (test/live)
- [ ] PayPal API credentials (sandbox/production)
- [ ] gcloud CLI installato e autenticato

### Deployment
- [ ] Build Docker image riuscito
- [ ] Deploy Cloud Run riuscito
- [ ] Service Account creato con ruoli corretti
- [ ] Environment variables configurate
- [ ] Secret Manager configurato (opzionale)

### Post-Deployment
- [ ] Health check passa
- [ ] Test Firestore passa
- [ ] Test Storage passa
- [ ] Webhook Stripe registrato
- [ ] Webhook PayPal registrato
- [ ] Flutter app aggiornata con nuovo `API_BASE`
- [ ] Postman collection testata con successo

### Monitoring
- [ ] Cloud Logging attivo
- [ ] Alert configurati (errori, latency)
- [ ] Budget GCP impostato

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2025-01-15  
**Supporto**: Vedi documentazione specifica per dettagli troubleshooting
