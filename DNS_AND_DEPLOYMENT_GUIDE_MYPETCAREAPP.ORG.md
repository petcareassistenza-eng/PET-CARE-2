# 🌐 DNS & Deployment Guide - mypetcareapp.org

**Dominio**: mypetcareapp.org  
**Data**: 2025-11-12  
**Stack**: Cloudflare DNS + Firebase Hosting + Cloud Run + Zoho Mail EU  
**Version**: 2.1 - Production Ready (Updated)

---

## 1️⃣ DNS su Cloudflare

### **Setup Iniziale**

1. **Registra dominio su Cloudflare**
   ```
   https://dash.cloudflare.com/ → Add Site → mypetcareapp.org
   Piano: Free ($0/mese)
   ```

2. **Cambia Nameserver del Registrar**
   ```
   Usa i nameserver forniti da Cloudflare (es.):
   - ns1.cloudflare.com
   - ns2.cloudflare.com
   
   Attendi propagazione: 1-48 ore (solitamente 1-2h)
   ```

### **Impostazioni Base Cloudflare**

**SSL/TLS Settings**:
```
Dashboard → SSL/TLS → Overview:
✅ Mode: Full (strict)  ← IMPORTANTE: Full strict per massima sicurezza
✅ Always Use HTTPS: On
✅ Automatic HTTPS Rewrites: On
✅ Minimum TLS Version: TLS 1.2
✅ TLS 1.3: On
✅ HSTS: On
   - Max-Age: 31536000 (1 anno - raccomandato)
   - Include Subdomains: On
   - Preload: On
   - No-Sniff Header: On
```

**⚠️ IMPORTANTE**: HSTS con preload non è reversibile facilmente. Attiva solo quando sei sicuro che tutto il sito supporta HTTPS.

**Proxy Settings**:
```
☁️ Proxied (nuvola arancione) 🧡:
  - mypetcareapp.org (record A)
  - www.mypetcareapp.org (record CNAME)
  - api.mypetcareapp.org (record CNAME) → SOLO DOPO verifica SSL Google

🌐 DNS Only (nuvola grigia):
  - MX records (email)
  - TXT records (SPF, DKIM, DMARC, verifica domini)
  - api.mypetcareapp.org → DNS Only DURANTE verifica, poi Proxied
```

---

## 2️⃣ Record DNS da Creare

### **🌐 Web (Firebase Hosting)**

**Step 1: Aggiungi dominio in Firebase Console**
```
Firebase Console → Hosting → Add custom domain → mypetcareapp.org
```

Firebase ti mostrerà i record DNS esatti. **IMPORTANTE**: Usa ESATTAMENTE quelli forniti da Firebase!

**Esempio tipico Record Cloudflare**:

| Type | Name | Content | Proxy | TTL | Note |
|------|------|---------|-------|-----|------|
| A | @ | 151.101.1.195 | ☁️ On | Auto | Firebase Hosting IP #1 |
| A | @ | 151.101.65.195 | ☁️ On | Auto | Firebase Hosting IP #2 |
| CNAME | www | mypetcareapp.org | ☁️ On | Auto | Redirect www → apex |

**⚠️ CRITICAL**: 
- Usa gli IP ESATTI che Firebase ti mostra nel pannello "Add custom domain"
- Gli IP potrebbero essere diversi da questi esempi
- Abilita Cloudflare Proxy (🧡 arancione) DOPO che Firebase ha verificato il dominio

---

### **🚀 API (Cloud Run) - api.mypetcareapp.org**

**Step 1: Map custom domain in Cloud Run**
```
Google Cloud Console → Cloud Run → [Seleziona servizio backend]
→ Custom Domains → Map a custom domain
→ Inserisci: api.mypetcareapp.org
```

Google ti mostrerà:
- **TXT record** di verifica dominio
- **CNAME record** per api subdomain

**Record Cloudflare da Creare**:

| Type | Name | Content | Proxy | TTL | Note |
|------|------|---------|-------|-----|------|
| TXT | @ | google-site-verification=xxxxxx | ☁️ Off | Auto | Verifica dominio Google |
| CNAME | api | ghs.googlehosted.com | ☁️ Off | Auto | Cloud Run custom domain |

**⚠️ WORKFLOW CRITICO**:
```
1. Crea record con Proxy OFF (☁️ DNS Only)
2. Attendi verifica dominio Google (5-30 min)
3. Attendi provisioning certificato SSL Google (15-60 min)
4. Verifica status "Active" con certificato in Cloud Run Console
5. SOLO DOPO certificato attivo: Abilita Proxy ON (🧡 Proxied) in Cloudflare
```

**Test Verifica**:
```bash
# Verifica che DNS risponda
dig api.mypetcareapp.org +short

# Test HTTPS (dopo certificato attivo)
curl -I https://api.mypetcareapp.org/healthz
# Expected: HTTP/2 200 OK
```

---

### **📧 Email (Zoho Mail - EU Data Center)**

**⚠️ IMPORTANTE**: Zoho Mail EU (server in Europa) per conformità GDPR.

#### **MX Records** (Email Routing)

| Type | Name | Content | Priority | Proxy | TTL |
|------|------|---------|----------|-------|-----|
| MX | @ | mx.zoho.eu | 10 | ☁️ Off | Auto |
| MX | @ | mx2.zoho.eu | 20 | ☁️ Off | Auto |
| MX | @ | mx3.zoho.eu | 50 | ☁️ Off | Auto |

#### **SPF Record** (Sender Policy Framework)

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| TXT | @ | v=spf1 include:zoho.eu ~all | ☁️ Off | Auto |

**Spiegazione SPF**:
- `v=spf1`: Versione SPF
- `include:zoho.eu`: Autorizza server Zoho EU
- `~all`: Soft fail (raccomandato per produzione)

#### **DKIM Record** (DomainKeys Identified Mail)

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| TXT | zmail._domainkey | [Valore fornito da Zoho] | ☁️ Off | Auto |

**Come Ottenere DKIM da Zoho**:
```
1. Zoho Mail Admin Console → Email Configuration
2. DKIM → Generate DKIM Key
3. Copia il valore TXT fornito
4. Aggiungi record in Cloudflare
5. Torna su Zoho e click "Verify"
```

**Esempio valore DKIM**:
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

#### **DMARC Record** (Domain-based Message Authentication)

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:postmaster@mypetcareapp.org; fo=1; sp=quarantine; adkim=s; aspf=s | ☁️ Off | Auto |

**Spiegazione DMARC**:
- `p=quarantine`: Metti in quarantena email sospette (più sicuro di `none`)
- `rua=mailto:postmaster@mypetcareapp.org`: Ricevi report aggregati giornalieri
- `fo=1`: Report per tutti i fallimenti (più completo)
- `sp=quarantine`: Policy per subdomain
- `adkim=s`: Strict alignment DKIM
- `aspf=s`: Strict alignment SPF

**⚠️ Nota**: Dopo 30+ giorni di monitoraggio con `p=quarantine`, considera `p=reject` per massima sicurezza.

#### **Zoho Verification Record**

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| TXT | @ | zoho-verification=zmverify.[codice-zoho] | ☁️ Off | Auto |

**Test Completo Email**:
```bash
# Test MX records
dig MX mypetcareapp.org +short
# Expected: 10 mx.zoho.eu, 20 mx2.zoho.eu, 50 mx3.zoho.eu

# Test SPF
dig TXT mypetcareapp.org +short | grep spf
# Expected: "v=spf1 include:zoho.eu ~all"

# Test DKIM
dig TXT zmail._domainkey.mypetcareapp.org +short
# Expected: v=DKIM1; k=rsa; p=...

# Test DMARC
dig TXT _dmarc.mypetcareapp.org +short
# Expected: v=DMARC1; p=quarantine...
```

---

## 3️⃣ Deploy Pagine Web (Firebase Hosting)

### **Struttura File Pronta**

```
/home/user/flutter_app/web_pages/
├── index.html       # Homepage (3.8KB)
├── privacy.html     # Privacy Policy GDPR compliant (14.1KB)
├── terms.html       # Terms of Service (18.0KB)
└── support.html     # Support Page with FAQ (14.8KB)
```

### **firebase.json Configuration**

✅ **File già creato**: `/home/user/flutter_app/firebase.json`

Contenuto:
```json
{
  "hosting": {
    "public": "web_pages",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "cleanUrls": true,
    "redirects": [
      {
        "source": "/privacy",
        "destination": "/privacy.html",
        "type": 301
      },
      {
        "source": "/terms",
        "destination": "/terms.html",
        "type": 301
      },
      {
        "source": "/support",
        "destination": "/support.html",
        "type": 301
      }
    ],
    "headers": [
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      },
      {
        "source": "**/*",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ]
  }
}
```

### **Deploy Commands**

```bash
cd /home/user/flutter_app

# 1. Login Firebase (se non fatto già)
firebase login

# 2. Initialize Hosting (prima volta)
firebase init hosting
# Rispondi:
# - What do you want to use as your public directory? web_pages
# - Configure as a single-page app? No
# - Set up automatic builds with GitHub? No
# - File web_pages/index.html already exists. Overwrite? No

# 3. Deploy
firebase deploy --only hosting

# Output atteso:
# ✔ Deploy complete!
# Project Console: https://console.firebase.google.com/project/pet-care-9790d/overview
# Hosting URL: https://pet-care-9790d.web.app
```

### **Add Custom Domain in Firebase**

```
1. Firebase Console → Hosting → Add custom domain
2. Inserisci: mypetcareapp.org
3. Firebase ti mostra record DNS (A records con IP Firebase)
4. Copia ESATTAMENTE questi record in Cloudflare (vedi sezione DNS sopra)
5. Click "Verify" in Firebase
6. Attendi provisioning SSL (15-60 min)
7. Status "Connected" → Dominio attivo!
```

### **Test Deployment**

```bash
# Test homepage
curl -I https://mypetcareapp.org
# Expected: HTTP/2 200 OK

# Test clean URLs (redirect)
curl -I https://mypetcareapp.org/privacy
# Expected: HTTP/2 200 OK (o 301 → /privacy.html)

# Test tutti gli URL
for page in "" "privacy" "terms" "support"; do
  echo "Testing: https://mypetcareapp.org/$page"
  curl -s -o /dev/null -w "%{http_code}\n" "https://mypetcareapp.org/$page"
done
# Expected: Tutti 200
```

---

## 4️⃣ API in Produzione (Cloud Run)

### **Map Custom Domain**

```
Google Cloud Console → Cloud Run
→ Seleziona il tuo servizio (es. mypetcare-api)
→ Custom Domains → "Map a custom domain"
→ Inserisci: api.mypetcareapp.org
→ Copia record TXT e CNAME in Cloudflare (vedi sezione DNS)
→ Attendi verifica + certificato SSL (20-60 min totali)
```

### **CORS Configuration (Backend)**

**File**: `backend/src/index.ts` (o dove configuri Express app)

```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://mypetcareapp.org',
  'https://www.mypetcareapp.org'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());
```

### **Environment Variables - Cloud Run**

**Variables critiche da configurare**:

```bash
gcloud run services update mypetcare-api \
  --region=europe-west1 \
  --set-env-vars="
    NODE_ENV=production,
    FIREBASE_PROJECT_ID=pet-care-9790d,
    FRONT_URL=https://mypetcareapp.org,
    ALLOWED_ORIGINS=https://mypetcareapp.org;https://www.mypetcareapp.org,
    API_URL=https://api.mypetcareapp.org,
    STRIPE_SECRET_KEY=[your-stripe-secret-key],
    STRIPE_WEBHOOK_SECRET=[your-stripe-webhook-secret],
    PAYPAL_CLIENT_ID=[your-paypal-client-id],
    PAYPAL_CLIENT_SECRET=[your-paypal-client-secret],
    JWT_SECRET=[your-jwt-secret-key]
  "
```

**⚠️ SICUREZZA**: Non inserire mai secret keys in questo file. Usa Google Secret Manager:

```bash
# Crea secret in Secret Manager
echo -n "your-stripe-secret-key" | gcloud secrets create stripe-secret-key --data-file=-

# Update Cloud Run per usare secret
gcloud run services update mypetcare-api \
  --region=europe-west1 \
  --set-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest"
```

### **Test API Produzione**

```bash
# Health check
curl -I https://api.mypetcareapp.org/healthz
# Expected: HTTP/2 200 OK

# Test CORS (da browser console o con curl)
curl -H "Origin: https://mypetcareapp.org" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.mypetcareapp.org/api/bookings -v
# Expected headers:
# Access-Control-Allow-Origin: https://mypetcareapp.org
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH

# Test availability endpoint (sostituisci PRO_ID reale)
curl -s "https://api.mypetcareapp.org/api/pros/PRO_ID_TEST/availability?date=2025-11-20&stepMin=30" | jq '.data[0]'
# Expected: JSON con slot disponibili
```

---

## 5️⃣ Aggiorna App Flutter

### **Base URL API**

**File**: `lib/services/providers.dart` (o dove hai ApiClient)

✅ **Già aggiornato**:
```dart
final baseUrl = 'https://api.mypetcareapp.org';

@riverpod
ApiClient apiClient(ApiClientRef ref) {
  return ApiClient(baseUrl: baseUrl);
}
```

### **Privacy/Terms Links**

**File**: `lib/screens/login_screen.dart`

✅ **Già aggiornato**:
```dart
TextButton(
  onPressed: () => _launchUrl('https://mypetcareapp.org/privacy'),
  child: const Text('Privacy Policy', style: TextStyle(fontSize: 12)),
),
TextButton(
  onPressed: () => _launchUrl('https://mypetcareapp.org/terms'),
  child: const Text('Termini di Servizio', style: TextStyle(fontSize: 12)),
),
```

### **PayPal Return/Cancel URLs**

**File**: `backend/src/routes/payments.ts`

✅ **Già aggiornato**:
```typescript
const FRONT_URL = "https://mypetcareapp.org";

const returnUrl = `${FRONT_URL}/subscription/return`;
const cancelUrl = `${FRONT_URL}/subscription/cancel`;
```

### **Rebuild App (se necessario)**

```bash
cd /home/user/flutter_app

# Clean + rebuild
flutter clean
flutter pub get

# Web (se deploy web app Flutter)
flutter build web --release

# Android AAB (Google Play Store)
flutter build appbundle --release

# Android APK (testing/distribuzione diretta)
flutter build apk --release
```

**⚠️ NOTA**: Build già completati con nuovo dominio:
- ✅ AAB: 57MB - `/home/user/flutter_app/build/app/outputs/bundle/release/app-release.aab`
- ✅ APK: 58MB - `/home/user/flutter_app/build/app/outputs/apk/release/app-release.apk`

---

## 6️⃣ Webhook URLs (Stripe + PayPal)

### **Stripe Dashboard Configuration**

```
1. Vai su: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://api.mypetcareapp.org/api/payments/webhook
4. Description: MyPetCare Production Webhook
5. Listen to: Events on your account
6. Select events:
   ✅ checkout.session.completed
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ✅ invoice.paid
   ✅ invoice.payment_failed
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed
7. Click "Add endpoint"
8. Copia "Signing secret" (whsec_...)
9. Aggiorna Cloud Run env var: STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Test Stripe Webhook**:
```bash
# Usa Stripe CLI
stripe listen --forward-to https://api.mypetcareapp.org/api/payments/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### **PayPal Dashboard Configuration**

```
1. Vai su: https://developer.paypal.com/dashboard/webhooks
2. Click "Add webhook"
3. Webhook URL: https://api.mypetcareapp.org/api/payments/paypal/webhook
4. Event types:
   ✅ BILLING.SUBSCRIPTION.ACTIVATED
   ✅ BILLING.SUBSCRIPTION.SUSPENDED
   ✅ BILLING.SUBSCRIPTION.CANCELLED
   ✅ BILLING.SUBSCRIPTION.UPDATED
   ✅ PAYMENT.SALE.COMPLETED
   ✅ PAYMENT.SALE.REFUNDED
5. Click "Save"
6. Webhook ID memorizzato automaticamente dal sistema
```

**Test PayPal Webhook**:
```bash
# Usa PayPal Webhook Simulator in Developer Dashboard
# Oppure crea subscription di test e verifica ricezione eventi
```

---

## 7️⃣ Test End-to-End

### **Test Sito Web (HTTPS + Redirects)**

```bash
# Homepage
curl -I https://mypetcareapp.org
# Expected: HTTP/2 200 OK

# WWW redirect (se configurato)
curl -I https://www.mypetcareapp.org
# Expected: HTTP/2 200 OK

# Privacy Policy
curl -I https://mypetcareapp.org/privacy
# Expected: HTTP/2 200 OK (redirect 301 a privacy.html)

# Terms
curl -I https://mypetcareapp.org/terms
# Expected: HTTP/2 200 OK

# Support
curl -I https://mypetcareapp.org/support
# Expected: HTTP/2 200 OK

# Test SSL Grade
# Vai su: https://www.ssllabs.com/ssltest/analyze.html?d=mypetcareapp.org
# Target: Grade A o A+
```

### **Test API Health**

```bash
# Health check
curl -I https://api.mypetcareapp.org/healthz
# Expected: HTTP/2 200 OK

# Test response time
time curl -s https://api.mypetcareapp.org/healthz
# Expected: < 500ms

# Availability endpoint (usa PRO_ID reale dal database)
curl -s "https://api.mypetcareapp.org/api/pros/PRO_ID_REAL/availability?date=2025-11-20&stepMin=30" | jq
```

### **Test Lock + Booking Flow**

```bash
# 1. Create lock (prenota slot temporaneamente)
LOCK_RESPONSE=$(curl -s -X POST "https://api.mypetcareapp.org/api/pros/PRO_ID_TEST/locks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -d '{
    "date": "2025-11-20",
    "start": "2025-11-20T09:00:00.000Z",
    "end": "2025-11-20T09:30:00.000Z",
    "ttlSec": 300
  }')

echo $LOCK_RESPONSE | jq
# Expected: { "success": true, "lockId": "..." }

LOCK_ID=$(echo $LOCK_RESPONSE | jq -r '.lockId')

# 2. Create booking (conferma prenotazione)
curl -s -X POST "https://api.mypetcareapp.org/api/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -d '{
    "proId": "PRO_ID_TEST",
    "ownerId": "USER_ID_TEST",
    "date": "2025-11-20T09:00:00.000Z",
    "serviceId": "visit",
    "notes": "Test booking from deployment guide",
    "lockId": "'$LOCK_ID'"
  }' | jq

# Expected: { "success": true, "bookingId": "..." }
```

### **Test Email Deliverability**

```bash
# Test 1: Invia email semplice
echo "Test email MyPetCare - $(date)" | mail -s "Deployment Test" support@mypetcareapp.org

# Test 2: Verifica SPF/DKIM/DMARC
# Invia email da support@mypetcareapp.org a: check-auth@verifier.port25.com
# Riceverai report automatico con risultati (tutti devono essere PASS)

# Test 3: Mail-Tester Score
# 1. Vai su: https://www.mail-tester.com/
# 2. Copia l'indirizzo email fornito
# 3. Invia email da support@mypetcareapp.org
# 4. Verifica score (target: ≥ 9/10)
```

**Verifica DNS Email Records**:
```bash
# MX records
dig MX mypetcareapp.org +short
# Expected: 10 mx.zoho.eu, 20 mx2.zoho.eu, 50 mx3.zoho.eu

# SPF
dig TXT mypetcareapp.org +short | grep spf
# Expected: "v=spf1 include:zoho.eu ~all"

# DKIM
dig TXT zmail._domainkey.mypetcareapp.org +short
# Expected: v=DKIM1; k=rsa; p=...

# DMARC
dig TXT _dmarc.mypetcareapp.org +short
# Expected: v=DMARC1; p=quarantine...
```

---

## 8️⃣ Cloudflare: Ottimizzazioni

### **📊 SSL/TLS Advanced Settings**

```
Dashboard → SSL/TLS → Edge Certificates:

✅ Always Use HTTPS: On
✅ Automatic HTTPS Rewrites: On
✅ Opportunistic Encryption: On
✅ TLS 1.3: On
✅ Minimum TLS Version: TLS 1.2
✅ HSTS: Enabled (max-age=31536000, includeSubDomains, preload)
```

### **🔥 Page Rules (Caching)**

```
Dashboard → Rules → Page Rules → Create Page Rule

Rule 1: Cache contenuti statici web
URL: mypetcareapp.org/*
Settings:
  - Cache Level: Cache Everything
  - Browser Cache TTL: 4 hours
  - Edge Cache TTL: 2 hours

Rule 2: NO Cache per API
URL: api.mypetcareapp.org/*
Settings:
  - Cache Level: Bypass
  - Browser Cache TTL: Respect Existing Headers
```

**Limite**: Free plan = 3 page rules

### **⚡ Performance Optimizations**

```
Dashboard → Speed → Optimization:

✅ Auto Minify:
   - JavaScript: On
   - CSS: On
   - HTML: On
✅ Brotli: On
✅ Early Hints: On
✅ HTTP/2 to Origin: On
✅ HTTP/3 (with QUIC): On
❌ Rocket Loader: Off (può causare problemi con Flutter web/SPA)
✅ Mirage: On (lazy-load immagini su mobile)
```

### **🔒 Security Settings**

```
Dashboard → Security → Settings:

✅ Security Level: Medium (o High se ricevi attacchi)
✅ Bot Fight Mode: On
✅ Challenge Passage: 30 minutes
✅ Privacy Pass: On
```

**Firewall Rules** (opzionale):
```
Dashboard → Security → WAF → Create firewall rule

Example 1: Block suspicious countries (se necessario)
Expression: (ip.geoip.country in {"XX" "YY"})
Action: Block

Example 2: Rate limit login endpoint
Expression: (http.request.uri.path contains "/api/auth/login")
Action: Rate Limit (5 requests per minute)
```

### **📈 Analytics & Monitoring**

```
Dashboard → Analytics & Logs:

✅ Web Analytics: On
✅ Traffic Analytics: Monitor bandwidth usage
✅ Security Events: Review firewall blocks
✅ Performance: Monitor cache hit rate

Target Cache Hit Rate: > 80%
```

---

## 9️⃣ Store & App: URL Finali

### **Google Play Store Console**

```
Play Console → [Tua App] → Store presence → Store settings

Store Listing → Contact Details:
✅ Website: https://mypetcareapp.org
✅ Email: support@mypetcareapp.org
✅ Phone: [Opzionale]

App content → Privacy Policy:
✅ Privacy Policy URL: https://mypetcareapp.org/privacy
✅ Terms of Service URL: https://mypetcareapp.org/terms [opzionale ma raccomandato]
```

### **App Store Connect (iOS)**

```
App Store Connect → [Tua App] → App Information

General Information:
✅ Privacy Policy URL: https://mypetcareapp.org/privacy
✅ Terms of Use (EULA): https://mypetcareapp.org/terms
✅ Support URL: https://mypetcareapp.org/support
✅ Marketing URL: https://mypetcareapp.org
```

### **Flutter App - Tabella Riepilogativa URL**

| Configurazione | Valore | File |
|----------------|--------|------|
| **Base API URL** | `https://api.mypetcareapp.org` | `lib/services/providers.dart` |
| **Privacy URL** | `https://mypetcareapp.org/privacy` | `lib/screens/login_screen.dart` |
| **Terms URL** | `https://mypetcareapp.org/terms` | `lib/screens/login_screen.dart` |
| **Support URL** | `https://mypetcareapp.org/support` | N/A (link esterno) |
| **Homepage** | `https://mypetcareapp.org` | `pubspec.yaml` |
| **Support Email** | `support@mypetcareapp.org` | `pubspec.yaml` |
| **PayPal Return** | `https://mypetcareapp.org/subscription/return` | `backend/src/routes/payments.ts` |
| **PayPal Cancel** | `https://mypetcareapp.org/subscription/cancel` | `backend/src/routes/payments.ts` |

---

## 🔟 Troubleshooting

### **❌ DNS Non Si Propaga**

```bash
# Check DNS propagation globale
https://dnschecker.org/ → Inserisci mypetcareapp.org

# Check nameserver
dig NS mypetcareapp.org +short
# Expected: ns1.cloudflare.com, ns2.cloudflare.com

# Check A records
dig A mypetcareapp.org +short
# Expected: IP Firebase (151.101.1.195, 151.101.65.195)

# Flush local DNS cache
# macOS:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches
```

**Tempi Tipici**:
- Cambio nameserver: 24-48h (solitamente 1-2h)
- Cambio record DNS: 5-60 min (TTL Auto Cloudflare)

### **🔒 SSL Certificate Errors**

```
Problema: "NET::ERR_CERT_COMMON_NAME_INVALID" o certificato non valido

Soluzioni:
1. Verifica SSL mode in Cloudflare: Full (strict)
2. Verifica che Firebase/Cloud Run abbia certificato attivo (15-60 min dopo verifica)
3. Verifica domain status in Firebase/Cloud Run console (deve essere "Active")
4. Attendi propagazione completa
5. Test SSL: https://www.ssllabs.com/ssltest/analyze.html?d=mypetcareapp.org

Comando test:
openssl s_client -connect mypetcareapp.org:443 -servername mypetcareapp.org
# Verifica che Common Name (CN) sia mypetcareapp.org
```

### **🚫 API CORS Errors**

```
Problema: Console browser mostra "CORS policy blocked"

Soluzioni:
1. Verifica ALLOWED_ORIGINS in Cloud Run env vars:
   gcloud run services describe mypetcare-api --region=europe-west1 --format="value(spec.template.spec.containers[0].env)"

2. Verifica CORS middleware backend:
   - allowedOrigins include https://mypetcareapp.org
   - credentials: true
   - methods include OPTIONS

3. Test CORS preflight:
   curl -H "Origin: https://mypetcareapp.org" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS https://api.mypetcareapp.org/api/bookings -v

   Expected headers:
   Access-Control-Allow-Origin: https://mypetcareapp.org
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Credentials: true

4. Verifica Cloudflare Proxy:
   - Se problemi persistono, disabilita temporaneamente proxy (DNS Only)
   - Test, poi riabilita proxy
```

### **📧 Email Non Riceve/Invia**

```
Problema: Email non arrivano o finiscono in spam

Diagnostica:
1. Verifica MX records:
   dig MX mypetcareapp.org +short
   # Expected: 10 mx.zoho.eu, 20 mx2.zoho.eu, 50 mx3.zoho.eu

2. Test SPF:
   dig TXT mypetcareapp.org +short | grep spf
   # Expected: "v=spf1 include:zoho.eu ~all"

3. Test DKIM:
   dig TXT zmail._domainkey.mypetcareapp.org +short
   # Expected: v=DKIM1; k=rsa; p=...

4. Zoho Admin Console:
   - Email Configuration → Verify all checks sono verdi ✅
   - DKIM Status: Verified
   - SPF Status: Verified

5. Comprehensive email test:
   https://mxtoolbox.com/SuperTool.aspx?action=mx%3amypetcareapp.org
   - MX Records: PASS
   - SPF Record: PASS
   - DMARC Record: PASS
   - Blacklist Check: PASS

6. Spam Score Test:
   https://www.mail-tester.com/
   Target: ≥ 9/10
```

**Common Issues**:
- MX Priority troppo bassa → Correggi priorità (10, 20, 50)
- SPF record duplicati → Rimuovi vecchi record, mantieni solo uno
- DKIM non verificato → Rigenera chiave in Zoho e aggiorna DNS
- TTL troppo alto → Riduci a Auto in Cloudflare

### **⚡ Performance Issues**

```
Problema: Sito lento o API timeout

Diagnostica:
1. Test response time:
   time curl -I https://mypetcareapp.org
   time curl -I https://api.mypetcareapp.org/healthz
   # Target: < 500ms (web), < 1s (API)

2. Test Cloudflare cache hit:
   curl -I https://mypetcareapp.org | grep cf-cache-status
   # Optimal: HIT (dopo primo caricamento)

3. Cloud Run logs:
   gcloud run services logs read mypetcare-api --region=europe-west1 --limit=50

4. Firebase Hosting metrics:
   Firebase Console → Hosting → Usage tab
   - Check bandwidth e requests
   - Verify cache hit rate

5. Lighthouse audit:
   https://pagespeed.web.dev/
   - Test https://mypetcareapp.org
   - Target: Performance ≥ 90, Best Practices ≥ 90

Soluzioni:
- Abilita Cloudflare Auto Minify
- Verifica Brotli compression attivo
- Ottimizza immagini (WebP format)
- Abilita lazy loading
- Verifica Cloud Run instance scaling
```

### **🔥 Firebase Deployment Errors**

```
Problema: firebase deploy fails

Errore comune 1: "Error: HTTP Error: 404, Could not find site"
Soluzione:
  firebase use --add
  # Seleziona progetto corretto (pet-care-9790d)

Errore comune 2: "Error: Authorization failed"
Soluzione:
  firebase logout
  firebase login
  firebase use pet-care-9790d

Errore comune 3: "Deployment failed, no files found in public directory"
Soluzione:
  # Verifica firebase.json:
  cat firebase.json | jq '.hosting.public'
  # Expected: "web_pages"
  
  # Verifica directory esiste:
  ls -la web_pages/
  # Expected: index.html, privacy.html, terms.html, support.html
```

---

## 📚 Resources & Links

### **Official Documentation**
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **Cloud Run Custom Domains**: https://cloud.google.com/run/docs/mapping-custom-domains
- **Zoho Mail Setup**: https://www.zoho.com/mail/help/adminconsole/domain-setup.html

### **Testing Tools**
- **DNS Checker**: https://dnschecker.org/
- **SSL Test**: https://www.ssllabs.com/ssltest/
- **Mail Tester**: https://www.mail-tester.com/
- **MX Toolbox**: https://mxtoolbox.com/
- **CORS Tester**: https://www.test-cors.org/
- **PageSpeed Insights**: https://pagespeed.web.dev/

### **Email Authentication Verification**
- **Port25 Verifier**: check-auth@verifier.port25.com (invia email per report)
- **DMARC Analyzer**: https://dmarc.postmarkapp.com/
- **SPF Record Check**: https://www.kitterman.com/spf/validate.html

### **Monitoring & Status**
- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **Firebase Status**: https://status.firebase.google.com/
- **Google Cloud Status**: https://status.cloud.google.com/

---

## 📝 Checklist Riepilogo

Prima di considerare deployment completo, verifica:

- [ ] DNS Cloudflare: Tutti i record configurati correttamente
- [ ] SSL/TLS: Full (strict), HSTS attivo, certificati validi
- [ ] Firebase Hosting: Deploy completato, dominio custom attivo
- [ ] Cloud Run API: Custom domain mappato, certificato SSL attivo
- [ ] Zoho Mail: MX, SPF, DKIM, DMARC configurati e verificati
- [ ] CORS: Backend configurato con allowed origins corretti
- [ ] Webhooks: Stripe e PayPal configurati con URL produzione
- [ ] Flutter App: Tutti gli URL aggiornati a mypetcareapp.org
- [ ] Store Listings: Google Play e App Store aggiornati
- [ ] Testing: Tutti i test end-to-end passati con successo
- [ ] Monitoring: Analytics e error tracking attivi
- [ ] Documentation: Credenziali salvate in password manager

---

**Document Created**: 2025-11-12  
**Last Updated**: 2025-11-12  
**Version**: 2.1 - Production Ready (Complete)  
**Maintainer**: DevOps Team MyPetCare

---

## 🆘 Support

Per assistenza durante deployment:
- **Email**: support@mypetcareapp.org
- **Documentation**: Vedi PROD_CHECKLIST_MYPETCAREAPP.ORG.md
- **Emergency**: Contatta DevOps team

**Note**: Questo documento è completo e production-ready. Segui tutti i passaggi nell'ordine indicato per un deployment senza errori.
