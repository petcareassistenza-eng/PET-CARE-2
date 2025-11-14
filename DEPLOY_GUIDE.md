# 🚀 MyPetCare - Guida Deploy Completa

## 📋 Indice

1. [Deploy Flutter Web (Firebase Hosting)](#1-deploy-flutter-web-firebase-hosting)
2. [Deploy Backend Node.js (Google Cloud Run)](#2-deploy-backend-nodejs-google-cloud-run)
3. [Configurazione Environment Variables](#3-configurazione-environment-variables)
4. [Setup Webhook (Stripe & PayPal)](#4-setup-webhook-stripe--paypal)
5. [Verifica Post-Deploy](#5-verifica-post-deploy)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Deploy Flutter Web (Firebase Hosting)

### 📦 Build Flutter Web

```bash
# Dalla root del progetto Flutter
cd /path/to/flutter_app

# Pulizia cache
flutter clean

# Reinstalla dipendenze
flutter pub get

# Build release ottimizzata
flutter build web --release
```

### 🔥 Deploy Firebase Hosting

**Metodo A: Firebase CLI (Locale)**

```bash
# Autenticazione (solo la prima volta)
firebase login

# Deploy hosting
firebase deploy --only hosting
```

**Metodo B: Firebase Console (Manuale)**

1. Vai a: https://console.firebase.google.com/project/pet-care-9790d/hosting
2. Clicca "Deploy manually"
3. Trascina la cartella `build/web` nell'interfaccia
4. Conferma deploy

### ✅ Verifica Deploy

Dopo il deploy, visita:
- **Default URL**: https://pet-care-9790d.web.app
- **Custom Domain**: https://app.mypetcareapp.org

**⏱️ Nota**: Il certificato SSL per il dominio custom può richiedere 5-30 minuti per attivarsi.

---

## 2. Deploy Backend Node.js (Google Cloud Run)

### 📦 Preparazione Backend

```bash
# Vai nella cartella backend
cd backend

# Installa dipendenze
npm install

# Build TypeScript
npm run build

# Test locale (opzionale)
npm run dev
```

### 🏗️ Build Docker Image

Sostituisci `PROJECT_ID` con l'ID del tuo progetto GCP (visibile nella console in alto):

```bash
# Build e push immagine su Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/mypetcare-backend

# Esempio: gcloud builds submit --tag gcr.io/pet-care-9790d/mypetcare-backend
```

### 🚀 Deploy su Cloud Run

```bash
gcloud run deploy mypetcare-backend \
  --image gcr.io/PROJECT_ID/mypetcare-backend \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 300 \
  --max-instances 10
```

**Parametri Deploy:**
- `--platform managed`: Cloud Run completamente gestito
- `--region europe-west1`: Milano/Europa Occidentale
- `--allow-unauthenticated`: API pubbliche (protette da Firebase Auth)
- `--memory 512Mi`: Memoria allocata (aumenta se necessario)
- `--timeout 300`: Timeout 5 minuti (per webhook lunghi)
- `--max-instances 10`: Limite istanze per controllo costi

### 🔗 Custom Domain Mapping

Dopo il primo deploy, mappa il dominio custom:

```bash
# Mappa dominio a Cloud Run service
gcloud run domain-mappings create \
  --service mypetcare-backend \
  --domain api.mypetcareapp.org \
  --region europe-west1
```

Poi configura il DNS:
1. Vai al tuo provider DNS (es. Namecheap, Cloudflare)
2. Aggiungi record CNAME: `api` → `ghs.googlehosted.com`
3. Attendi propagazione DNS (5-30 minuti)

---

## 3. Configurazione Environment Variables

### 🔧 Cloud Run Console

1. Vai a: https://console.cloud.google.com/run
2. Seleziona il servizio `mypetcare-backend`
3. Clicca **"EDIT & DEPLOY NEW REVISION"**
4. Vai su **"Variables & Secrets"** → **"Environment variables"**
5. Aggiungi tutte le variabili:

```env
NODE_ENV=production
PORT=8080

BACKEND_BASE_URL=https://api.mypetcareapp.org
WEB_BASE_URL=https://app.mypetcareapp.org

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_API=https://api-m.paypal.com
```

6. Clicca **"DEPLOY"**

### 🔐 Alternativa: Secret Manager (Consigliato)

Per maggiore sicurezza, usa Google Secret Manager:

```bash
# Crea secret
echo -n "sk_live_..." | gcloud secrets create stripe-secret-key --data-file=-

# Associa al Cloud Run service
gcloud run services update mypetcare-backend \
  --update-secrets=STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --region europe-west1
```

### 📝 File .env Locali

Per sviluppo locale, copia e personalizza:

```bash
cd backend
cp .env.development.example .env

# Modifica .env con le tue chiavi TEST
nano .env
```

⚠️ **NON committare mai file .env con chiavi reali!**

---

## 4. Setup Webhook (Stripe & PayPal)

### 🔵 Stripe Webhook

1. Vai a: https://dashboard.stripe.com/webhooks
2. Clicca **"Add endpoint"**
3. **Endpoint URL**: `https://api.mypetcareapp.org/api/payments/stripe/webhook`
4. **Events to send**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copia il **Signing secret** (`whsec_...`)
6. Aggiungi come `STRIPE_WEBHOOK_SECRET` nelle environment variables Cloud Run

### 💙 PayPal Webhook

1. Vai a: https://developer.paypal.com/dashboard/webhooks
2. Crea nuovo webhook
3. **Webhook URL**: `https://api.mypetcareapp.org/api/payments/paypal/webhook`
4. **Event types**:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `PAYMENT.SALE.COMPLETED`
5. Copia il **Webhook ID**
6. Aggiungi come `PAYPAL_WEBHOOK_ID` nelle environment variables Cloud Run

---

## 5. Verifica Post-Deploy

### ✅ Checklist Deploy

**Frontend (Firebase Hosting):**
- [ ] https://app.mypetcareapp.org carica correttamente
- [ ] Certificato SSL attivo (lucchetto verde)
- [ ] Autenticazione Firebase funziona
- [ ] Navigazione tra pagine funziona (SPA routing)

**Backend (Cloud Run):**
- [ ] https://api.mypetcareapp.org/health risponde `{"ok": true}`
- [ ] Logs Cloud Run non mostrano errori critici
- [ ] Environment variables configurate correttamente
- [ ] Memoria e timeout adeguati

**Webhook:**
- [ ] Stripe webhook endpoint attivo (check in Stripe Dashboard)
- [ ] PayPal webhook endpoint attivo (check in PayPal Dashboard)
- [ ] Webhook signature verification funzionante

### 🧪 Test End-to-End

1. **Test Registrazione Utente:**
   - Crea account Owner
   - Verifica email
   - Login

2. **Test Abbonamento PRO:**
   - Registra account PRO
   - Vai su pagina Subscribe
   - Prova checkout Stripe (usa carta test: `4242 4242 4242 4242`)
   - Verifica aggiornamento subscriptionStatus in Firestore

3. **Test Prenotazione:**
   - Come Owner, cerca PRO attivo
   - Prenota servizio
   - Verifica notifica push/email

### 📊 Monitoring

**Firebase Console:**
- https://console.firebase.google.com/project/pet-care-9790d/hosting
- Monitoring → Performance
- Analytics → Events

**Cloud Run Console:**
- https://console.cloud.google.com/run/detail/europe-west1/mypetcare-backend
- Logs → View logs
- Metrics → Request count, Error rate, Latency

---

## 6. Troubleshooting

### ❌ Frontend non carica

**Problema**: Pagina bianca o errore 404

**Soluzioni:**
```bash
# Rebuild Flutter
flutter clean
flutter pub get
flutter build web --release

# Redeploy
firebase deploy --only hosting
```

**Problema**: Errore CORS

**Soluzione**: Verifica `firebase.json` contenga:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {"key": "Access-Control-Allow-Origin", "value": "*"}
        ]
      }
    ]
  }
}
```

### ❌ Backend non risponde

**Problema**: Timeout o 503 Service Unavailable

**Soluzioni:**
```bash
# Verifica logs
gcloud run services logs read mypetcare-backend --region europe-west1 --limit 50

# Aumenta memoria/timeout
gcloud run services update mypetcare-backend \
  --memory 1Gi \
  --timeout 600 \
  --region europe-west1
```

**Problema**: Environment variables mancanti

**Soluzione**: Verifica tutte le variabili in Cloud Run Console

### ❌ Webhook non funzionano

**Problema**: Stripe/PayPal webhook error

**Soluzioni:**
1. Verifica URL webhook terminano con `/webhook` (senza `/` finale)
2. Controlla `STRIPE_WEBHOOK_SECRET` e `PAYPAL_WEBHOOK_ID` configurati
3. Verifica logs Cloud Run per errori di signature verification
4. Test webhook da Stripe/PayPal Dashboard

### ❌ Certificato SSL non attivo

**Problema**: "Your connection is not private"

**Soluzione**: 
- Attendi 5-30 minuti dopo primo deploy
- Verifica DNS propagato: `dig api.mypetcareapp.org`
- Verifica domain mapping: `gcloud run domain-mappings list --region europe-west1`

---

## 📚 Risorse Utili

### Documentation
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Cloud Run](https://cloud.google.com/run/docs)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/webhooks/)

### Dashboards
- [Firebase Console](https://console.firebase.google.com/project/pet-care-9790d)
- [Google Cloud Console](https://console.cloud.google.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)

### Support
- GitHub Issues: [link-to-repo]
- Email: support@mypetcareapp.org

---

**🎉 Congratulazioni! Deploy completato con successo!**

Per domande o supporto, consulta la documentazione o apri una issue su GitHub.
