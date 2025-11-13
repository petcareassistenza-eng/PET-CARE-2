# 🚀 Production Documentation - My Pet Care

Questa directory contiene tutta la documentazione per il deployment production di MyPetCare, inclusi webhook handlers, security rules, test scripts e checklist go-live.

---

## 📁 Struttura Directory

```
docs/production/
├── README.md                                    # Questo file
├── GO_LIVE_CHECKLIST.md                        # Checklist completa per go-live
├── webhooks/
│   ├── stripe_webhook_handler.ts              # Stripe webhook implementation
│   └── paypal_webhook_handler.ts              # PayPal webhook implementation
├── firestore/
│   └── firestore.rules                        # Firestore Security Rules production
├── testing/
│   ├── api_smoke_test.sh                      # Script smoke test API (executable)
│   └── concurrency_lock_test.md               # Test concorrenza lock A/B
├── deployment/
│   └── [Cloud Run configs - coming soon]
└── monitoring/
    └── [Alert configs - coming soon]
```

---

## 🎯 Quick Start

### 1. Pre-Production Setup

```bash
# 1. Deploy Firestore Security Rules
cd /home/user/flutter_app
firebase deploy --only firestore:rules --config docs/production/firestore/firestore.rules

# 2. Configure Stripe Webhooks
# Go to: https://dashboard.stripe.com/webhooks
# Add endpoint: https://api.mypetcareapp.org/api/payments/webhook
# Events: checkout.session.completed, customer.subscription.*

# 3. Configure PayPal Webhooks  
# Go to: https://developer.paypal.com/dashboard/webhooks
# Add endpoint: https://api.mypetcareapp.org/api/payments/paypal/webhook
# Events: BILLING.SUBSCRIPTION.*

# 4. Run Smoke Test
cd docs/production/testing
./api_smoke_test.sh https://api.mypetcareapp.org
```

### 2. Go-Live Process

Segui la checklist completa in: **`GO_LIVE_CHECKLIST.md`**

---

## 📚 Documentazione Componenti

### 🔐 Webhooks

#### Stripe Webhook Handler
**File:** `webhooks/stripe_webhook_handler.ts`

**Eventi gestiti:**
- `checkout.session.completed` → Set PRO status to 'active'
- `customer.subscription.updated` → Update subscription details
- `customer.subscription.deleted` → Set PRO status to 'blocked'
- `invoice.payment_succeeded` → Log payment
- `invoice.payment_failed` → Notify PRO

**Setup:**
```bash
# Test locale con Stripe CLI
stripe listen --events checkout.session.completed,customer.subscription.updated \
  --forward-to http://localhost:3000/api/payments/webhook

stripe trigger checkout.session.completed
```

**Environment Variables:**
- `STRIPE_SECRET_KEY` - Stripe API key (live)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_...)

---

#### PayPal Webhook Handler
**File:** `webhooks/paypal_webhook_handler.ts`

**Eventi gestiti:**
- `BILLING.SUBSCRIPTION.ACTIVATED` → Set PRO status to 'active'
- `BILLING.SUBSCRIPTION.SUSPENDED` → Set PRO status to 'blocked'
- `BILLING.SUBSCRIPTION.CANCELLED` → Set PRO status to 'blocked'
- `PAYMENT.SALE.COMPLETED` → Log payment

**Setup:**
- Dashboard: https://developer.paypal.com/dashboard/webhooks
- URL: `https://api.mypetcareapp.org/api/payments/paypal/webhook`
- Events: `BILLING.SUBSCRIPTION.*`

**Security:**
- Webhook signature verification con headers:
  - `PayPal-Transmission-Id`
  - `PayPal-Transmission-Time`
  - `PayPal-Transmission-Sig`

**Environment Variables:**
- `PAYPAL_CLIENT_ID` - PayPal app client ID
- `PAYPAL_CLIENT_SECRET` - PayPal app secret
- `PAYPAL_WEBHOOK_ID` - Webhook ID from dashboard

---

### 🔒 Firestore Security Rules

**File:** `firestore/firestore.rules`

**Principi chiave:**
- **Privacy by design:** Utenti accedono solo ai propri dati
- **Write-only backend:** Scritture critiche solo via Admin SDK
- **Public read quando necessario:** PRO profiles, availability

**Collections protette:**
- **users/{uid}** - Read/write solo owner
- **pros/{proId}** - Read public, write backend only
- **bookings/{id}** - Read owner/PRO, write backend only
- **calendars/{proId}** - Read public, write backend only
- **subscriptions/{id}** - Read owner, write backend only

**Deploy:**
```bash
firebase deploy --only firestore:rules
```

**Test:**
```bash
firebase emulators:start --only firestore
# Test client operations (should fail for protected writes)
```

---

### 🧪 Testing

#### API Smoke Test
**File:** `testing/api_smoke_test.sh`

**Cosa testa:**
- Health check endpoints (`/healthz`, `/version`)
- Availability API (`GET /api/pros/{id}/availability`)
- Lock creation (`POST /api/pros/{id}/locks`)
- Booking creation (`POST /api/bookings`)
- Coupon validation (`GET /api/coupons/{code}`)

**Esecuzione:**
```bash
# Staging
./api_smoke_test.sh https://staging-api.mypetcareapp.org

# Production
./api_smoke_test.sh https://api.mypetcareapp.org
```

**Output:**
- ✅ Green: Test passed
- ❌ Red: Test failed
- Pass rate report finale

---

#### Concurrency Lock Test
**File:** `testing/concurrency_lock_test.md`

**Scenario:**
- 2 utenti (Browser A e B) tentano di prenotare stesso slot
- Verifica che solo 1 ottiene il lock
- Lock TTL 5 minuti funziona correttamente
- Lock si converte in booking correttamente

**Test manuali:**
- Basic lock creation
- Lock expiration (TTL)
- Lock to booking conversion
- Concurrent lock attempts (race condition)
- Multiple slots lock

---

## ✅ Go-Live Checklist

### Mini-Checklist Veloce

- [ ] Stripe webhook live → status active/blocked aggiornano davvero
- [ ] PayPal sandbox → ACT/CANCEL → status aggiornato
- [ ] Firestore rules deploy in prod
- [ ] Smoke test API prod (healthz/version/availability/booking/coupons)
- [ ] Test concorrenza lock A/B
- [ ] Build Android release testata su 2 device reali
- [ ] iOS push ricevute su 1 iPhone reale
- [ ] Cloud Run min-instances=1 + readiness OK
- [ ] Alert errori 5/10' attivo
- [ ] Privacy/Terms pubblicati + URL nello store
- [ ] Closed testing avviato

**Checklist completa:** Vedi `GO_LIVE_CHECKLIST.md`

---

## 🔧 Cloud Run Configuration

### Deployment Command

```bash
# Deploy con configurazione production
gcloud run deploy mypetcare-api \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 30 \
  --set-env-vars STAGE=production,NODE_ENV=production
```

### Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# PayPal
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_WEBHOOK_ID=xxxxx

# Firebase
FIREBASE_PROJECT_ID=mypetcare-xxxxx
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# App Config
STAGE=production
NODE_ENV=production
```

### Health Probes

**Liveness Probe:**
```yaml
path: /healthz
initialDelaySeconds: 10
periodSeconds: 10
timeoutSeconds: 5
failureThreshold: 3
```

**Readiness Probe:**
```yaml
path: /readiness
initialDelaySeconds: 5
periodSeconds: 5
timeoutSeconds: 3
failureThreshold: 2
```

---

## 📊 Monitoring & Alerts

### Log-Based Alert (Error Rate)

**Query:**
```
resource.type="cloud_run_revision"
severity>=ERROR
```

**Condition:** 5 errori in 10 minuti  
**Notification:** Email + Slack

### Performance SLO

- **p95 HTTP request duration:** < 800ms
- **Error rate:** < 1%
- **Availability:** > 99.5%

**Dashboard:** Cloud Monitoring → Custom Dashboard

---

## 🚀 Roll-Out Plan

### Phase 1: Closed Testing (7 giorni)
- 10 tester Google Play
- 10 tester TestFlight iOS
- Monitoraggio 48-72 ore
- Success: Zero crash critici, error rate < 1%

### Phase 2: Canary Deployment (3 giorni)
- Cloud Run 10% → 50% → 100% traffic
- Monitoraggio metriche canary vs baseline
- Success: Error rate <= baseline + 0.5%

### Phase 3: Full Production
- Cloud Run 100% traffic
- Google Play Public Release
- App Store Submit → Approved → Public

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Webhook non ricevuto**
- Verifica URL webhook in Stripe/PayPal dashboard
- Controlla Cloud Run logs: `gcloud logging tail`
- Test con Stripe CLI: `stripe trigger ...`

**2. Firestore permission denied**
- Verifica security rules deployate: `firebase deploy --only firestore:rules`
- Test con Firebase Emulator
- Controlla Auth token valido

**3. Lock concorrenza fallito**
- Verifica Firestore TTL attivo
- Controlla backend usa transaction atomica
- Test con 2 browser side-by-side

**4. Payment webhook fallito**
- Verifica signature verification attiva
- Controlla environment variables configurate
- Logs Cloud Run per dettagli errore

---

## 📝 Pre-Production Checklist Summary

**CRITICAL (Must-have):**
- ✅ Stripe/PayPal webhooks configurati e testati
- ✅ Firestore Security Rules deployate
- ✅ API smoke test pass rate >= 95%
- ✅ Mobile builds testati su device reali
- ✅ Cloud Run min-instances=1
- ✅ Privacy/Terms pubblicati

**RECOMMENDED (Should-have):**
- ✅ Monitoring alerts attivi
- ✅ Concurrency lock test passed
- ✅ GDPR export/delete implementati

**OPTIONAL (Nice-to-have):**
- ✅ PWA installabile
- ✅ Dashboard metriche personalizzata

---

## 🔗 Related Documentation

- **Legal:** `/docs/legal/` - Privacy Policy, Terms of Service
- **Store:** `/docs/store/` - Google Play, App Store listings
- **GDPR:** `/docs/GDPR_COMPLIANCE_CHECKLIST.md`
- **Backend:** Backend repository documentation

---

## 📅 Timeline

**Pre-Production:** 3-5 giorni
- Setup webhooks, security rules, testing

**Closed Testing:** 7 giorni
- Real user feedback, bug fixes

**Canary Deployment:** 3 giorni  
- Gradual rollout, monitoring

**Full Production:** Day 0
- 100% traffic, public release

**Total:** ~2 settimane da prep a full production

---

## ✅ Final Sign-Off

Prima di procedere con go-live, assicurati di:

1. ✅ Tutti i test nella checklist passano
2. ✅ Webhooks Stripe/PayPal funzionano in live
3. ✅ Security rules verificate
4. ✅ Mobile builds testati su device reali
5. ✅ Privacy/Terms accessibili
6. ✅ Monitoring attivo
7. ✅ Rollback plan documentato
8. ✅ Emergency contacts definiti

**Go-Live Authorization:** Vedi `GO_LIVE_CHECKLIST.md` per sign-off finale

---

© 2025 My Pet Care. Tutti i diritti riservati.
