# ✅ Go-Live Checklist - My Pet Care Production

**Release Version:** 1.0.0  
**Target Date:** [Inserire data go-live]  
**Environment:** Production

---

## 📋 Pre-Production Checklist

### 1️⃣  Webhook Configuration

#### Stripe Webhooks

- [ ] **Stripe Dashboard configurato** (live mode)
  - URL: `https://api.mypetcareapp.org/api/payments/webhook`
  - Events selezionati:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`

- [ ] **STRIPE_WEBHOOK_SECRET configurato** in environment variables
  - Ottenuto da: Stripe Dashboard → Webhooks → Endpoint details

- [ ] **Test webhook Stripe completato**
  ```bash
  stripe listen --events checkout.session.completed \
    --forward-to https://api.mypetcareapp.org/api/payments/webhook
  stripe trigger checkout.session.completed
  ```

- [ ] **Verifica Firestore dopo test:**
  - `pros/{uid}.status` = `'active'` dopo `checkout.session.completed`
  - `pros/{uid}.status` = `'blocked'` dopo `customer.subscription.deleted`

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

#### PayPal Webhooks

- [ ] **PayPal Dashboard configurato** (live mode)
  - URL: `https://api.mypetcareapp.org/api/payments/paypal/webhook`
  - Events selezionati:
    - `BILLING.SUBSCRIPTION.ACTIVATED`
    - `BILLING.SUBSCRIPTION.UPDATED`
    - `BILLING.SUBSCRIPTION.SUSPENDED`
    - `BILLING.SUBSCRIPTION.CANCELLED`
    - `PAYMENT.SALE.COMPLETED`

- [ ] **PAYPAL_WEBHOOK_ID configurato** in environment variables
  - Ottenuto da: PayPal Dashboard → Webhooks → Webhook details

- [ ] **PayPal signature verification implementata**
  - Headers verificati: `PayPal-Transmission-Id`, `-Time`, `-Sig`

- [ ] **Test webhook PayPal completato (sandbox)**
  - Completato abbonamento sandbox
  - Verificato `BILLING.SUBSCRIPTION.ACTIVATED` → `status='active'`
  - Verificato `BILLING.SUBSCRIPTION.CANCELLED` → `status='blocked'`

- [ ] **Return URL e Cancel URL configurati**
  - Return: `https://mypetcareapp.org/payment/success`
  - Cancel: `https://mypetcareapp.org/payment/cancel`

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 2️⃣  Firestore Security Rules

- [ ] **Security Rules production create**
  - File: `firestore.rules`
  - Posizione: `/docs/production/firestore/firestore.rules`

- [ ] **Deploy rules a production:**
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Verifica rules applicate:**
  - Utenti: lettura/scrittura solo propri dati
  - PRO: lettura pubblica, scrittura solo backend
  - Bookings: lettura owner/PRO, scrittura solo backend
  - Calendars/Locks: lettura pubblica, scrittura solo backend

- [ ] **Test rules con Firebase Emulator:**
  ```bash
  firebase emulators:start --only firestore
  # Test client-side operations (should fail)
  # Test Admin SDK operations (should succeed)
  ```

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 3️⃣  API Smoke Test

- [ ] **Script smoke test preparato:**
  - File: `/docs/production/testing/api_smoke_test.sh`
  - Permessi eseguibili: `chmod +x`

- [ ] **Test eseguito su staging:**
  ```bash
  ./api_smoke_test.sh https://staging-api.mypetcareapp.org
  ```

- [ ] **Test eseguito su production:**
  ```bash
  ./api_smoke_test.sh https://api.mypetcareapp.org
  ```

- [ ] **Tutti i test passati:**
  - ✅ `GET /healthz` → 200 OK
  - ✅ `GET /version` → 200 OK
  - ✅ `GET /api/pros/{proId}/availability` → 200 OK, slots disponibili
  - ✅ `POST /api/pros/{proId}/locks` → 201 Created, lock ID restituito
  - ✅ `POST /api/bookings` → 201 Created, booking ID restituito
  - ✅ `GET /api/coupons/{code}` → 200 OK, coupon valido

- [ ] **Pass rate >= 95%**

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 4️⃣  Concurrency Lock Test (A/B)

- [ ] **Test manuale completato:**
  - 2 browser (A e B) sulla stessa scheda PRO
  - Browser A blocca slot → banner "Slot bloccato... scade in mm:ss"
  - Browser B vede slot come "locked" (non cliccabile)
  - Dopo 5 minuti, slot torna "free" se A non conferma

- [ ] **Test race condition:**
  - A e B cliccano contemporaneamente → solo 1 ottiene il lock
  - Altro browser riceve errore: "Slot già bloccato"

- [ ] **Verifica Firestore:**
  - Locks collection: 1 solo lock per slot
  - Lock scade dopo 5 minuti (TTL)

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 5️⃣  Mobile Build Release

#### Android (APK/AAB)

- [ ] **Build release creato:**
  ```bash
  flutter clean
  flutter pub get
  flutter build apk --release
  # Oppure:
  flutter build appbundle --release
  ```

- [ ] **APK testato su 2+ dispositivi reali:**
  - Android 10 (minSdkVersion 21)
  - Android 14 (latest)

- [ ] **Funzionalità verificate su device:**
  - ✅ Login Firebase Auth
  - ✅ Booking flow completo (slot selection → confirm)
  - ✅ Notifiche push FCM ricevute
  - ✅ Paywall Stripe/PayPal funzionante
  - ✅ "Le mie prenotazioni" visualizza correttamente
  - ✅ Cancellazione prenotazioni

- [ ] **Google Play Console configurato:**
  - APK/AAB caricato
  - Screenshot (6) caricati
  - Privacy Policy URL: `https://mypetcareapp.org/privacy`
  - Terms URL: `https://mypetcareapp.org/terms`

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

#### iOS (TestFlight)

- [ ] **Build release creato (da macOS):**
  ```bash
  flutter build ios --release
  # Xcode → Archive → Distribute
  ```

- [ ] **TestFlight setup completato:**
  - Build caricato su App Store Connect
  - Beta testers invitati (10+)

- [ ] **APNs push notifications testate:**
  - Push ricevute su iPhone reale
  - Notifiche mostrate correttamente

- [ ] **App Store Connect configurato:**
  - Screenshot iPhone 6.5" caricati
  - Privacy Policy URL: `https://mypetcareapp.org/privacy`
  - EULA URL: `https://mypetcareapp.org/terms`

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 6️⃣  Cloud Run Configuration

- [ ] **Environment variables production configurate:**
  ```bash
  gcloud run services update mypetcare-api \
    --region=europe-west1 \
    --set-env-vars=STAGE=production,\
    NODE_ENV=production,\
    STRIPE_SECRET_KEY=...,\
    STRIPE_WEBHOOK_SECRET=...,\
    PAYPAL_CLIENT_ID=...,\
    PAYPAL_CLIENT_SECRET=...,\
    PAYPAL_WEBHOOK_ID=...
  ```

- [ ] **Min instances configurato:**
  ```bash
  gcloud run services update mypetcare-api \
    --min-instances=1 \
    --max-instances=10 \
    --cpu=1 \
    --memory=512Mi \
    --timeout=30
  ```

- [ ] **Health probes configurati:**
  - **Liveness probe:** `GET /healthz` (ogni 10s)
  - **Readiness probe:** `GET /readiness` (ogni 5s)

- [ ] **Startup probe:** `GET /healthz` (max 3 minuti)

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 7️⃣  Cloud Monitoring & Alerts

- [ ] **Error rate alert configurato:**
  - Query: `resource.type="cloud_run_revision" severity>=ERROR`
  - Condizione: 5 errori in 10 minuti
  - Notifica: Email + Slack/Telegram

- [ ] **Performance SLO definito:**
  - p95 HTTP request duration < 800ms
  - Error rate < 1%

- [ ] **Dashboard Cloud Monitoring creata:**
  - HTTP request count
  - HTTP response time (p50, p95, p99)
  - Error rate %
  - Active connections
  - CPU/Memory utilization

- [ ] **Log-based metrics configurati:**
  - Booking creation rate
  - Lock creation rate
  - Payment success/failure rate

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 8️⃣  Frontend Web (PWA)

- [ ] **Flutter web build creato:**
  ```bash
  flutter build web --release
  ```

- [ ] **PWA manifest verificato:**
  - File: `web/manifest.json`
  - Icons: 192×192, 512×512
  - Theme color: `#1C8275`
  - Background color: `#1C8275`

- [ ] **Favicon configurato:**
  - File: `web/favicon.png`

- [ ] **Firebase Hosting deploy:**
  ```bash
  firebase deploy --only hosting
  ```

- [ ] **Test PWA installazione:**
  - Apri da mobile: `https://mypetcareapp.org`
  - Prompt "Aggiungi a Home Screen" appare
  - Installazione completata
  - App funziona offline (service worker)

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 9️⃣  Documenti Legali & Store

- [ ] **Privacy Policy pubblicata:**
  - URL: `https://mypetcareapp.org/privacy`
  - Contenuto: `/docs/legal/privacy_policy_it.md`

- [ ] **Terms of Service pubblicati:**
  - URL: `https://mypetcareapp.org/terms`
  - Contenuto: `/docs/legal/terms_it.md`

- [ ] **URLs verificati da app:**
  - LoginScreen: link Privacy/Terms funzionanti
  - Link aprono browser esterno

- [ ] **Store listing completati:**
  - Google Play Console: scheda completa
  - App Store Connect: scheda completa
  - Screenshot (6) caricati per entrambi

- [ ] **Placeholder sostituiti:**
  - `[inserisci data]` → Data effettiva
  - `[email]` → Email supporto
  - `[tua società/studio]` → Ragione sociale
  - `[pec se presente]` → PEC aziendale

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

### 🔟 GDPR Compliance

- [ ] **Consenso notifiche push implementato:**
  - Dialog spiegazione prima di `requestPermission()`
  - Testo chiaro: "Riceverai notifiche per conferme prenotazioni"

- [ ] **Funzionalità "Esporta Dati" implementata:**
  - Schermata Impostazioni → "Esporta i miei dati"
  - Export JSON/PDF con dati utente

- [ ] **Funzionalità "Cancella Account" implementata:**
  - Conferma con password
  - Anonimizzazione prenotazioni esistenti
  - Eliminazione account Firebase Auth

- [ ] **Firestore Security Rules verificate:**
  - Privacy by design
  - Accesso limitato ai propri dati

- [ ] **Audit logging attivo:**
  - Log operazioni sensibili (export dati, cancellazione account)

**Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete

---

## 📊 Go-Live Decision Matrix

### Criteria per Go-Live Approval

| Criterio | Peso | Status | Obbligatorio |
|----------|------|--------|--------------|
| Webhooks Stripe/PayPal funzionanti | 🔴 High | ⬜ | ✅ Sì |
| Firestore Security Rules deployed | 🔴 High | ⬜ | ✅ Sì |
| API Smoke Test pass rate >= 95% | 🔴 High | ⬜ | ✅ Sì |
| Mobile builds testati su device reali | 🔴 High | ⬜ | ✅ Sì |
| Cloud Run min-instances=1 | 🔴 High | ⬜ | ✅ Sì |
| Monitoring & Alerts configurati | 🟡 Medium | ⬜ | ✅ Sì |
| Privacy/Terms pubblicati | 🔴 High | ⬜ | ✅ Sì |
| Concurrency lock test passed | 🟡 Medium | ⬜ | ⚠️ Raccomandato |
| PWA installabile | 🟢 Low | ⬜ | ❌ Opzionale |
| GDPR export/delete funzionanti | 🟡 Medium | ⬜ | ⚠️ Raccomandato |

**Go-Live Approval:** ✅ Tutti i criteri HIGH completati

---

## 🚀 Roll-Out Plan

### Phase 1: Closed Testing (7 giorni)

- [ ] **10 tester reali invitati** (Google Play Closed Testing)
- [ ] **TestFlight beta iOS** (10 tester)
- [ ] **Monitoraggio attivo 48-72 ore**
- [ ] **Nessun crash critico**
- [ ] **Error rate < 1%**

**Success Criteria:**
- Zero crash bloccanti
- Feedback positivo da >= 70% tester
- Error rate < 1%

---

### Phase 2: Canary Deployment (3 giorni)

- [ ] **Cloud Run canary a 10% traffic:**
  ```bash
  gcloud run services update-traffic mypetcare-api \
    --to-revisions=LATEST=10,PREVIOUS=90
  ```

- [ ] **Monitoraggio metriche:**
  - Error rate canary vs baseline
  - Response time p95
  - No regressioni

- [ ] **Incremento graduale: 10% → 50% → 100%**

**Success Criteria:**
- Error rate canary <= baseline + 0.5%
- p95 response time <= 800ms

---

### Phase 3: Full Production (ongoing)

- [ ] **Cloud Run 100% traffic su LATEST**
- [ ] **Google Play Store: Public release**
- [ ] **App Store: Submit for review → Approved → Public**

- [ ] **Post-launch monitoring (prima settimana):**
  - Daily error rate review
  - Daily performance review
  - User feedback monitoring

**Success Criteria:**
- Error rate < 1%
- Average rating >= 4.0 stars
- No critical bugs reported

---

## 📞 Emergency Contacts

**On-Call Engineer:** [Nome] - [Telefono] - [Email]  
**DevOps Lead:** [Nome] - [Telefono] - [Email]  
**Product Owner:** [Nome] - [Telefono] - [Email]

**Escalation Path:**
1. On-Call Engineer (immediate)
2. DevOps Lead (< 30 min)
3. Product Owner (< 1 hour)

---

## 🔄 Rollback Plan

### Rollback Triggers

- Error rate > 5% per > 10 minuti
- Crash rate > 2%
- Critical security vulnerability
- Payment processing failures > 10%

### Rollback Procedure

```bash
# 1. Rollback Cloud Run to previous revision
gcloud run services update-traffic mypetcare-api \
  --to-revisions=PREVIOUS=100,LATEST=0

# 2. Rollback Firestore Security Rules
firebase deploy --only firestore:rules --config firebase.rollback.json

# 3. Notify team via Slack/Email
# 4. Post-mortem within 24 hours
```

---

## ✅ Final Sign-Off

**Completed By:** _______________  **Date:** _______________

**Approved By:** _______________  **Date:** _______________

**Go-Live Authorized:** ✅ YES / ❌ NO

**Notes:**
```
[Aggiungi note finali o condizioni speciali]
```

---

© 2025 My Pet Care. Tutti i diritti riservati.
