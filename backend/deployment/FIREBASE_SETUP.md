# 🔥 Firebase Admin SDK Setup Guide

Guida completa per configurare Firebase Admin SDK nel backend MyPetCare per sviluppo locale e deployment Cloud Run.

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Setup Locale](#setup-locale)
3. [Setup Cloud Run](#setup-cloud-run)
4. [Verifica Configurazione](#verifica-configurazione)
5. [Troubleshooting](#troubleshooting)

---

## Panoramica

Il backend MyPetCare usa **Firebase Admin SDK** per:
- **Firestore**: Database NoSQL per dati utenti, PRO, prenotazioni, pagamenti
- **Storage**: Archiviazione ricevute PDF e altri file
- **Auth**: Verifica token utenti e controllo RBAC (admin/user/pro)

### Modalità di Autenticazione

Il backend supporta **due modalità** di autenticazione Firebase:

| Ambiente | Metodo Autenticazione | File Richiesto |
|----------|----------------------|----------------|
| **Locale** | Service Account Key File | `backend/keys/firebase-key.json` |
| **Cloud Run** | Service Account IAM | Nessuno (automatico) |

---

## Setup Locale

### Prerequisiti

- Node.js 18+ installato
- Accesso al progetto Firebase Console
- Permessi per generare Service Account keys

### Passo 1: Scarica Service Account Key

1. Vai a [Firebase Console](https://console.firebase.google.com/)
2. Seleziona progetto: **pet-care-9790d**
3. Vai a: **Project Settings** (⚙️) → **Service Accounts**
4. Clicca: **"Generate new private key"**
5. Salva il file JSON scaricato

**Importante**: Questo file contiene credenziali sensibili. NON committarlo mai su Git!

### Passo 2: Posiziona il File

Rinomina e sposta il file nella directory keys:

```bash
# Esempio Windows (PowerShell)
mv "C:\Users\<TUO_NOME>\Downloads\pet-care-9790d-firebase-adminsdk-xxxxx-xxxxxxxxxxxx.json" backend/keys/firebase-key.json

# Esempio macOS/Linux
mv ~/Downloads/pet-care-9790d-firebase-adminsdk-*.json backend/keys/firebase-key.json
```

### Passo 3: Imposta Variabile d'Ambiente

**Windows PowerShell:**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$(Get-Location)\keys\firebase-key.json"
```

**macOS/Linux/Git Bash:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/keys/firebase-key.json"
```

**Permanente (aggiungi a .bashrc / .zshrc / PowerShell profile):**
```bash
# Linux/macOS
echo 'export GOOGLE_APPLICATION_CREDENTIALS="/path/to/backend/keys/firebase-key.json"' >> ~/.bashrc

# Windows (System Environment Variables)
# Imposta variabile di sistema in: Control Panel → System → Advanced → Environment Variables
```

### Passo 4: Configura .env

Crea/aggiorna il file `.env` nella root del backend:

```bash
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=./keys/firebase-key.json
FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com
FIREBASE_PROJECT_ID=pet-care-9790d

# Server Configuration
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:5060

# Stripe (Development Keys)
STRIPE_SECRET=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_BASE=https://api-m.sandbox.paypal.com

# Feature Flags
MAINTENANCE_MODE=false
```

### Passo 5: Installa Dipendenze

```bash
cd backend
npm install
```

### Passo 6: Avvia Server

```bash
npm run dev
```

**Output atteso:**
```
==========================================
🐾 MyPetCare Backend Server
==========================================
🔥 Firebase Admin: Initializing with key file: ./keys/firebase-key.json
✅ Firebase Admin SDK initialized successfully
   Storage Bucket: pet-care-9790d.appspot.com
🚀 Server running on port 8080
🌍 Environment: development
==========================================
```

### Passo 7: Verifica Connessione

Testa gli endpoint di diagnostica:

```bash
# Health check
curl http://localhost:8080/health

# Firestore test
curl http://localhost:8080/test/db

# Storage test
curl http://localhost:8080/test/storage

# All tests
curl http://localhost:8080/test/all
```

**Risposte attese**: Tutte dovrebbero ritornare `"success": true`

---

## Setup Cloud Run

Per Cloud Run, **NON servono file JSON**. L'autenticazione avviene tramite Service Account IAM.

### Architettura

```
Cloud Run Service
    ↓
Service Account (backend-sa@PROJECT_ID.iam.gserviceaccount.com)
    ↓
IAM Roles:
    - roles/datastore.user        → Firestore read/write
    - roles/storage.objectAdmin   → Storage upload/download
    - roles/logging.logWriter     → Cloud Logging
```

### Script Automatico

Usa lo script di deployment automatico:

```bash
cd backend
./deployment/deploy-cloud-run.sh
```

Lo script eseguirà automaticamente:
1. ✅ Abilita API necessarie (Cloud Run, Firestore, Storage, IAM)
2. ✅ Crea Service Account dedicato
3. ✅ Assegna ruoli IAM minimi (principle of least privilege)
4. ✅ (Opzionale) Crea Secret Manager per API keys
5. ✅ Build Docker image con Cloud Build
6. ✅ Deploy su Cloud Run con configurazione ottimale
7. ✅ Test endpoint di diagnostica

### Deployment Manuale (Step-by-Step)

Se preferisci eseguire manualmente i comandi:

#### 1. Configura Progetto

```bash
PROJECT_ID="pet-care-9790d"
REGION="europe-west1"
SERVICE_NAME="mypetcare-backend"
SA_NAME="backend-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID"
```

#### 2. Abilita API

```bash
gcloud services enable \
    run.googleapis.com \
    iam.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    cloudbuild.googleapis.com
```

#### 3. Crea Service Account

```bash
gcloud iam service-accounts create "$SA_NAME" \
    --display-name="MyPetCare Backend Service Account"
```

#### 4. Assegna Ruoli IAM

```bash
# Firestore access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.user"

# Storage access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.objectAdmin"

# Logging access
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/logging.logWriter"
```

#### 5. Build Docker Image

```bash
# Build localmente
npm run build

# Build con Cloud Build
gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
```

#### 6. Deploy Cloud Run

```bash
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --service-account "$SA_EMAIL" \
    --set-env-vars "NODE_ENV=production,FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com,PAYPAL_BASE=https://api-m.paypal.com,FRONTEND_URL=https://mypetcare.web.app" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60s \
    --max-instances 10
```

#### 7. Ottieni URL Servizio

```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format 'value(status.url)')

echo "Service URL: $SERVICE_URL"
```

---

## Verifica Configurazione

### Test Endpoint Locali

```bash
BASE_URL="http://localhost:8080"

# Health check
curl -s "$BASE_URL/health" | jq

# Firestore test
curl -s "$BASE_URL/test/db" | jq

# Storage test
curl -s "$BASE_URL/test/storage" | jq

# All tests
curl -s "$BASE_URL/test/all" | jq
```

### Test Endpoint Cloud Run

```bash
SERVICE_URL="https://mypetcare-backend-xxxxx-ew.a.run.app"

# Health check
curl -s "$SERVICE_URL/health" | jq

# Firestore test
curl -s "$SERVICE_URL/test/db" | jq

# Storage test
curl -s "$SERVICE_URL/test/storage" | jq

# All tests
curl -s "$SERVICE_URL/test/all" | jq
```

### Risposte Attese

**Health Check:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production"
}
```

**Firestore Test:**
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

**Storage Test:**
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

---

## Troubleshooting

### ❌ Errore: "Failed to initialize Firebase Admin SDK"

**Locale:**
```
Error: Could not load the default credentials
```

**Causa**: Service account key file non trovato o invalido

**Soluzione**:
1. Verifica che il file `keys/firebase-key.json` esista
2. Controlla che `GOOGLE_APPLICATION_CREDENTIALS` sia impostato correttamente
3. Valida il JSON: `jq empty keys/firebase-key.json`
4. Re-scarica il file da Firebase Console se corrotto

**Cloud Run:**
```
Error: Insufficient permissions
```

**Causa**: Service Account non ha i ruoli necessari

**Soluzione**:
```bash
# Verifica ruoli assegnati
gcloud projects get-iam-policy "$PROJECT_ID" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${SA_EMAIL}"

# Ri-assegna ruoli
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.user"
```

---

### ❌ Errore: "PERMISSION_DENIED: Missing or insufficient permissions"

**Firestore:**
```json
{
  "error": "9 PERMISSION_DENIED: Missing or insufficient permissions"
}
```

**Causa**: Service Account non ha accesso Firestore

**Soluzione Locale**:
1. Verifica project_id nel service account key corrisponda al progetto Firebase
2. Re-genera service account key da Firebase Console

**Soluzione Cloud Run**:
```bash
# Verifica ruolo Firestore
gcloud projects get-iam-policy "$PROJECT_ID" \
    --flatten="bindings[].members" \
    --filter="bindings.role:roles/datastore.user"

# Aggiungi ruolo se mancante
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.user"

# Rideploy servizio
gcloud run deploy "$SERVICE_NAME" --region "$REGION"
```

---

### ❌ Errore: "Storage bucket not found"

**Errore:**
```
Error: No such object: pet-care-9790d.appspot.com/...
```

**Causa**: Bucket Storage non esiste o nome errato

**Soluzione**:
1. Verifica bucket Firebase Storage esista:
   - Firebase Console → Storage → Files
2. Controlla nome bucket (dovrebbe essere `PROJECT_ID.appspot.com`)
3. Aggiorna variabile ambiente:
   ```bash
   # Locale (.env)
   FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com
   
   # Cloud Run
   gcloud run services update "$SERVICE_NAME" \
       --region "$REGION" \
       --set-env-vars "FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com"
   ```

---

### ❌ Errore: "Cloud Run service account not found"

**Errore durante deploy:**
```
ERROR: (gcloud.run.deploy) Service account [backend-sa@PROJECT_ID.iam.gserviceaccount.com] not found
```

**Causa**: Service Account non creato

**Soluzione**:
```bash
# Crea service account
gcloud iam service-accounts create "$SA_NAME" \
    --display-name="MyPetCare Backend SA"

# Assegna ruoli (vedi Step 4 sopra)
```

---

### ❌ Errore: "Image not found"

**Errore durante deploy:**
```
ERROR: Image 'gcr.io/pet-care-9790d/mypetcare-backend:latest' not found
```

**Causa**: Docker image non buildato o pushato

**Soluzione**:
```bash
# Build con Cloud Build
gcloud builds submit --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# Verifica immagine creata
gcloud container images list --repository="gcr.io/${PROJECT_ID}"

# Rideploy con immagine corretta
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
    --region "$REGION"
```

---

### 🔍 Debug Logs

**Locale:**
```bash
# Server logs
npm run dev

# Con debug Firebase
DEBUG=firebase:* npm run dev
```

**Cloud Run:**
```bash
# Real-time logs
gcloud run services logs tail "$SERVICE_NAME" --region "$REGION"

# Last 50 logs
gcloud run services logs read "$SERVICE_NAME" --region "$REGION" --limit 50

# Error logs only
gcloud run services logs read "$SERVICE_NAME" \
    --region "$REGION" \
    --filter="severity>=ERROR" \
    --limit 20
```

---

## 📚 Risorse Utili

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-using-service-accounts)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2025-01-15  
**Supporto**: Vedi `backend/deployment/CLOUD_RUN_DEPLOYMENT.md` per deploy completo
