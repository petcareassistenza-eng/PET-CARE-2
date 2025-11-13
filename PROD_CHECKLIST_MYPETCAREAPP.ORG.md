# ✅ Production Checklist - mypetcareapp.org

**Dominio**: mypetcareapp.org  
**Data Inizio**: 2025-11-12  
**Target Go-Live**: [Inserisci data]  
**Version**: 2.1 - Complete Deployment Checklist

---

## 🌐 1. CLOUDFLARE DNS SETUP

### **Account & Domain Registration**
- [ ] Account Cloudflare creato (https://dash.cloudflare.com/)
- [ ] Dominio mypetcareapp.org aggiunto a Cloudflare
- [ ] Piano Free ($0/mese) selezionato e attivo
- [ ] Nameserver del registrar cambiati con quelli Cloudflare
- [ ] DNS propagazione completata (verifica: `dig NS mypetcareapp.org`)
- [ ] Status: "Active" in Cloudflare Dashboard

### **SSL/TLS Configuration**
- [ ] SSL Mode: **Full (strict)** attivato
- [ ] **Always Use HTTPS**: On
- [ ] **Automatic HTTPS Rewrites**: On
- [ ] **Minimum TLS Version**: TLS 1.2
- [ ] **TLS 1.3**: On (abilitato)
- [ ] **HSTS**: On
  - [ ] Max-Age: 31536000 (1 anno)
  - [ ] Include Subdomains: On
  - [ ] Preload: On
  - [ ] No-Sniff Header: On
- [ ] Certificato SSL attivo e valido
- [ ] Test SSL: https://www.ssllabs.com/ssltest/ → Grade A o A+

### **DNS Records - Web (Firebase Hosting)**
- [ ] **Firebase Custom Domain aggiunto**: Firebase Console → Hosting
- [ ] Record A: `@` → IP Firebase #1 (es. 151.101.1.195) - Proxy: ☁️ On
- [ ] Record A: `@` → IP Firebase #2 (es. 151.101.65.195) - Proxy: ☁️ On
- [ ] Record CNAME: `www` → mypetcareapp.org - Proxy: ☁️ On
- [ ] Firebase domain status: **Connected** (con certificato SSL attivo)
- [ ] Verifica: `curl -I https://mypetcareapp.org` → HTTP/2 200 OK
- [ ] Verifica: `curl -I https://www.mypetcareapp.org` → HTTP/2 200 OK

### **DNS Records - API (Cloud Run)**
- [ ] **Cloud Run Custom Domain mappato**: api.mypetcareapp.org
- [ ] Record TXT: `@` → google-site-verification=xxxxxx - Proxy: ☁️ Off
- [ ] Record CNAME: `api` → ghs.googlehosted.com - Proxy: ☁️ Off (inizialmente)
- [ ] Verifica dominio Google completata (5-30 min)
- [ ] Certificato SSL Google attivo (15-60 min)
- [ ] Cloud Run status: **Active** con certificato
- [ ] Proxy Cloudflare: ☁️ On (attivato DOPO certificato Google)
- [ ] Verifica: `curl -I https://api.mypetcareapp.org/healthz` → HTTP/2 200 OK

### **DNS Records - Email (Zoho Mail EU)**

**MX Records** (Priority importante!):
- [ ] MX: `@` → mx.zoho.eu priority **10** - Proxy: ☁️ Off
- [ ] MX: `@` → mx2.zoho.eu priority **20** - Proxy: ☁️ Off
- [ ] MX: `@` → mx3.zoho.eu priority **50** - Proxy: ☁️ Off
- [ ] Verifica: `dig MX mypetcareapp.org +short` → Tutti e 3 MX records

**SPF Record**:
- [ ] TXT: `@` → `v=spf1 include:zoho.eu ~all` - Proxy: ☁️ Off
- [ ] Verifica: `dig TXT mypetcareapp.org +short | grep spf`

**DKIM Record**:
- [ ] DKIM key generato in Zoho Admin Console
- [ ] TXT: `zmail._domainkey` → [Valore fornito da Zoho] - Proxy: ☁️ Off
- [ ] DKIM verificato in Zoho (status: ✅ Verified)
- [ ] Verifica: `dig TXT zmail._domainkey.mypetcareapp.org +short`

**DMARC Record**:
- [ ] TXT: `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:postmaster@mypetcareapp.org; fo=1; sp=quarantine; adkim=s; aspf=s` - Proxy: ☁️ Off
- [ ] Verifica: `dig TXT _dmarc.mypetcareapp.org +short`

**Zoho Verification**:
- [ ] TXT: `@` → `zoho-verification=zmverify.[codice]` - Proxy: ☁️ Off
- [ ] Dominio verificato in Zoho Admin Console (✅ Verified)

---

## 🔥 2. FIREBASE HOSTING

### **Setup & Configuration**
- [ ] Firebase CLI installato: `npm install -g firebase-tools`
- [ ] Firebase login completato: `firebase login`
- [ ] Progetto Firebase selezionato: `firebase use pet-care-9790d`
- [ ] `firebase.json` creato con configurazione corretta
- [ ] Public directory: `web_pages` configurato
- [ ] Clean URLs: `true` abilitato
- [ ] Redirects 301 configurati (privacy, terms, support)
- [ ] Headers di sicurezza configurati (X-Content-Type-Options, X-Frame-Options)

### **Web Pages - Content Ready**
- [ ] `web_pages/index.html` presente (3.8KB) - Homepage
- [ ] `web_pages/privacy.html` presente (14.1KB) - Privacy Policy GDPR
- [ ] `web_pages/terms.html` presente (18.0KB) - Terms of Service
- [ ] `web_pages/support.html` presente (14.8KB) - Support Page with FAQ
- [ ] Tutti i file HTML validati (no errori syntax)
- [ ] Legal compliance: Privacy Policy conforme GDPR italiano
- [ ] Legal compliance: Terms of Service conformi normativa italiana

### **Firebase Hosting Deploy**
- [ ] `firebase init hosting` completato (prima volta)
- [ ] `firebase deploy --only hosting` eseguito con successo
- [ ] Deploy output: "✔ Deploy complete!"
- [ ] Firebase Hosting URL: https://pet-care-9790d.web.app funzionante
- [ ] Custom domain aggiunto in Firebase Console
- [ ] Record DNS Firebase copiati in Cloudflare (A records)
- [ ] Verifica dominio Firebase completata
- [ ] Certificato SSL Firebase attivo (15-60 min)
- [ ] Status Firebase Console: **Connected** (green check)

### **Website Testing - Functionality**
- [ ] `curl -I https://mypetcareapp.org/` → 200 OK (homepage)
- [ ] `curl -I https://mypetcareapp.org/privacy` → 200 OK (redirect 301)
- [ ] `curl -I https://mypetcareapp.org/terms` → 200 OK (redirect 301)
- [ ] `curl -I https://mypetcareapp.org/support` → 200 OK (redirect 301)
- [ ] Homepage carica correttamente in browser
- [ ] Privacy Policy leggibile e completa
- [ ] Terms of Service leggibili e completi
- [ ] Support page con FAQ funzionante

### **Website Testing - Responsive & Cross-Browser**
- [ ] Test mobile responsive: iPhone Safari
- [ ] Test mobile responsive: Android Chrome
- [ ] Test desktop: Chrome (Windows/Mac/Linux)
- [ ] Test desktop: Firefox
- [ ] Test desktop: Safari (macOS)
- [ ] Test desktop: Edge
- [ ] Test tablet: iPad Safari
- [ ] Tutti i link funzionanti (no 404)

---

## 🚀 3. CLOUD RUN API

### **Custom Domain Mapping**
- [ ] Cloud Run service selezionato in GCP Console
- [ ] Custom domain mapping iniziato: `api.mypetcareapp.org`
- [ ] Record TXT verifica copiato in Cloudflare
- [ ] Record CNAME api copiato in Cloudflare
- [ ] Verifica dominio Google completata (status: Verified)
- [ ] Certificato SSL Google provisioning completato
- [ ] Cloud Run Console status: **Active** (green)
- [ ] Cloudflare Proxy: ☁️ On (DOPO certificato attivo)

### **Environment Variables - Production**
- [ ] `NODE_ENV=production` settato
- [ ] `FIREBASE_PROJECT_ID=pet-care-9790d` settato
- [ ] `FRONT_URL=https://mypetcareapp.org` settato
- [ ] `ALLOWED_ORIGINS=https://mypetcareapp.org,https://www.mypetcareapp.org` settato
- [ ] `API_URL=https://api.mypetcareapp.org` settato
- [ ] `STRIPE_SECRET_KEY=[secure-value]` settato (usa Secret Manager!)
- [ ] `STRIPE_WEBHOOK_SECRET=[secure-value]` settato
- [ ] `PAYPAL_CLIENT_ID=[secure-value]` settato
- [ ] `PAYPAL_CLIENT_SECRET=[secure-value]` settato
- [ ] `JWT_SECRET=[secure-value]` settato (minimo 32 char random)
- [ ] Service riavviato dopo update env vars

### **CORS Configuration - Backend**
- [ ] CORS middleware configurato in `backend/src/index.ts`
- [ ] Allowed origins: `https://mypetcareapp.org` incluso
- [ ] Allowed origins: `https://www.mypetcareapp.org` incluso
- [ ] `credentials: true` abilitato
- [ ] Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
- [ ] AllowedHeaders: Content-Type, Authorization, If-None-Match, X-Requested-With
- [ ] Preflight OPTIONS handler configurato
- [ ] No origin (mobile apps) permesso

### **API Testing - Health & Endpoints**
- [ ] `curl -I https://api.mypetcareapp.org/healthz` → 200 OK
- [ ] Response time < 1 secondo
- [ ] Availability endpoint testato (GET /api/pros/:id/availability)
- [ ] Lock creation testato (POST /api/pros/:id/locks)
- [ ] Booking creation testato (POST /api/bookings)
- [ ] CORS test da browser console OK (no errors)
- [ ] Error handling test (404, 500 responses)

### **API Testing - CORS Verification**
```bash
curl -H "Origin: https://mypetcareapp.org" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.mypetcareapp.org/api/bookings -v
```
- [ ] Response includes: `Access-Control-Allow-Origin: https://mypetcareapp.org`
- [ ] Response includes: `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- [ ] Response includes: `Access-Control-Allow-Credentials: true`
- [ ] No CORS errors in browser console

---

## 📧 4. ZOHO MAIL EMAIL

### **Account Setup**
- [ ] Account Zoho Mail creato (https://www.zoho.com/mail/)
- [ ] Dominio mypetcareapp.org aggiunto in Zoho
- [ ] Piano selezionato: Free (fino a 5 utenti)
- [ ] Zoho data center: **EU** (europa, per GDPR compliance)
- [ ] MX records configurati in Cloudflare
- [ ] Dominio verificato in Zoho (✅ Verified)

### **Mailbox Configuration**
- [ ] Mailbox `support@mypetcareapp.org` creata
- [ ] Password sicura impostata (minimo 12 char, mixed case, numbers, symbols)
- [ ] Firma email professionale configurata
- [ ] Auto-reply configurato (opzionale per fuori orario)
- [ ] Mailbox accessibile via webmail: https://mail.zoho.eu/
- [ ] Mobile app configurata (iOS/Android)

### **Email Authentication - SPF/DKIM/DMARC**
- [ ] SPF record configurato in Cloudflare
- [ ] SPF verificato in Zoho (status: ✅ PASS)
- [ ] DKIM key generata in Zoho
- [ ] DKIM record configurato in Cloudflare
- [ ] DKIM verificato in Zoho (status: ✅ Verified)
- [ ] DMARC record configurato in Cloudflare
- [ ] DMARC policy: `p=quarantine` (o `p=reject` dopo 30 giorni)
- [ ] DMARC report email: `postmaster@mypetcareapp.org` configurata

### **Email Testing - Deliverability**
- [ ] Invia email di test DA: support@mypetcareapp.org
- [ ] Ricevi email di test SU: support@mypetcareapp.org
- [ ] Test risposta email (reply)
- [ ] Test email con allegato
- [ ] Email non finisce in spam folder (test su Gmail, Outlook)
- [ ] Test da dispositivo mobile (invio/ricezione)

### **Email Testing - Authentication**
- [ ] Mail-Tester score: https://www.mail-tester.com/ → **≥ 9/10**
- [ ] SPF/DKIM/DMARC test: invia email a `check-auth@verifier.port25.com`
- [ ] Report Port25: SPF = **PASS**
- [ ] Report Port25: DKIM = **PASS**
- [ ] Report Port25: DMARC = **PASS**
- [ ] MX Toolbox test: https://mxtoolbox.com/SuperTool.aspx?action=mx%3amypetcareapp.org
- [ ] MX Toolbox: Blacklist check = **Not Listed**

---

## 📱 5. FLUTTER APP UPDATE

### **API Base URL - Production**
- [ ] File: `lib/services/providers.dart` aggiornato
- [ ] Base URL: `https://api.mypetcareapp.org` (NO localhost!)
- [ ] ApiClient configurato correttamente
- [ ] Nessun riferimento a localhost o sandbox URLs nel codice
- [ ] Test connessione API da app funzionante

### **Legal Links - Privacy & Terms**
- [ ] File: `lib/screens/login_screen.dart` aggiornato
- [ ] Privacy Policy link: `https://mypetcareapp.org/privacy` ✅
- [ ] Terms of Service link: `https://mypetcareapp.org/terms` ✅
- [ ] Links funzionanti da app (aprono browser esterno)
- [ ] Links raggiungibili anche da altre schermate (se presenti)

### **Payment URLs - PayPal Return/Cancel**
- [ ] File: `backend/src/routes/payments.ts` aggiornato
- [ ] `FRONT_URL = "https://mypetcareapp.org"` ✅
- [ ] PayPal return URL: `https://mypetcareapp.org/subscription/return` ✅
- [ ] PayPal cancel URL: `https://mypetcareapp.org/subscription/cancel` ✅
- [ ] Stripe success URL aggiornato (se custom, altrimenti automatico)

### **pubspec.yaml - Metadata**
- [ ] Homepage: `https://mypetcareapp.org` ✅
- [ ] Support email: `support@mypetcareapp.org` ✅
- [ ] Privacy Policy comment: `https://mypetcareapp.org/privacy` ✅
- [ ] Terms comment: `https://mypetcareapp.org/terms` ✅

### **Build & Deploy - Android**
- [ ] `flutter clean` eseguito
- [ ] `flutter pub get` completato (no errors)
- [ ] `flutter analyze` passato (no critical issues)
- [ ] **Android AAB** (Play Store):
  - [ ] `flutter build appbundle --release` completato
  - [ ] AAB firmato digitalmente con keystore release
  - [ ] File size: ~57MB
  - [ ] Path: `build/app/outputs/bundle/release/app-release.aab`
- [ ] **Android APK** (Direct distribution):
  - [ ] `flutter build apk --release` completato
  - [ ] APK firmato digitalmente con keystore release
  - [ ] File size: ~58MB
  - [ ] Path: `build/app/outputs/apk/release/app-release.apk`

### **Build Testing**
- [ ] Install AAB su dispositivo Android reale (via adb)
- [ ] Install APK su dispositivo Android reale
- [ ] Test login/registrazione funzionante
- [ ] Test API calls funzionanti (no CORS errors)
- [ ] Test privacy/terms links aprono browser
- [ ] Test notifiche push (se implementate)

---

## 💳 6. PAYMENT WEBHOOKS

### **Stripe Webhooks Configuration**
- [ ] Stripe Dashboard: https://dashboard.stripe.com/webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://api.mypetcareapp.org/api/payments/webhook`
- [ ] Description: "MyPetCare Production Webhook"
- [ ] Listen to: **Events on your account**
- [ ] Events selezionati:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.paid`
  - [ ] `invoice.payment_failed`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
- [ ] Endpoint salvato e attivo
- [ ] **Signing secret copiato** (whsec_...)
- [ ] `STRIPE_WEBHOOK_SECRET` aggiornato in Cloud Run env vars
- [ ] Service Cloud Run riavviato dopo update

### **Stripe Webhook Testing**
- [ ] Test con Stripe CLI: `stripe listen --forward-to https://api.mypetcareapp.org/api/payments/webhook`
- [ ] Trigger test event: `stripe trigger checkout.session.completed`
- [ ] Backend riceve webhook correttamente (200 OK response)
- [ ] Backend logs mostrano evento processato
- [ ] Test con Stripe Dashboard "Send test webhook"
- [ ] Verifica signature validation funzionante

### **PayPal Webhooks Configuration**
- [ ] PayPal Developer Dashboard: https://developer.paypal.com/dashboard/webhooks
- [ ] Click "Add webhook"
- [ ] Webhook URL: `https://api.mypetcareapp.org/api/payments/paypal/webhook`
- [ ] Event types selezionati:
  - [ ] `BILLING.SUBSCRIPTION.ACTIVATED`
  - [ ] `BILLING.SUBSCRIPTION.SUSPENDED`
  - [ ] `BILLING.SUBSCRIPTION.CANCELLED`
  - [ ] `BILLING.SUBSCRIPTION.UPDATED`
  - [ ] `PAYMENT.SALE.COMPLETED`
  - [ ] `PAYMENT.SALE.REFUNDED`
- [ ] Webhook salvato e attivo
- [ ] Webhook ID verificato
- [ ] Backend configurato per validare PayPal signature

### **PayPal Webhook Testing**
- [ ] Test con PayPal Webhook Simulator (in Developer Dashboard)
- [ ] Backend riceve webhook correttamente (200 OK response)
- [ ] Backend logs mostrano evento processato
- [ ] Test subscription flow completo (create → activated → webhook)
- [ ] Test cancellation flow (cancel → webhook)

---

## 🏪 7. STORE LISTINGS UPDATE

### **Google Play Store Console**
- [ ] Login: https://play.google.com/console/
- [ ] Seleziona app MyPetCare
- [ ] **Store Listing → Contact Details**:
  - [ ] Website: `https://mypetcareapp.org` ✅
  - [ ] Email: `support@mypetcareapp.org` ✅
  - [ ] Phone: [Opzionale]
- [ ] **App content → Privacy Policy**:
  - [ ] Privacy Policy URL: `https://mypetcareapp.org/privacy` ✅
  - [ ] Test link funzionante (click "Test URL")
- [ ] **App content → Terms of Service** (opzionale ma raccomandato):
  - [ ] Terms URL: `https://mypetcareapp.org/terms` ✅
- [ ] Salva modifiche
- [ ] Verifica tutti i link aperti in browser esterno

### **App Store Connect (iOS)**
- [ ] Login: https://appstoreconnect.apple.com/
- [ ] Seleziona app MyPetCare
- [ ] **App Information → General Information**:
  - [ ] Privacy Policy URL: `https://mypetcareapp.org/privacy` ✅
  - [ ] Terms of Use (EULA): `https://mypetcareapp.org/terms` ✅
  - [ ] Support URL: `https://mypetcareapp.org/support` ✅
  - [ ] Marketing URL: `https://mypetcareapp.org` ✅
- [ ] Test link diretti da App Store Connect (tutti funzionanti)
- [ ] Salva modifiche

### **New Release Upload**
- [ ] **Google Play**: Nuova release AAB caricata con dominio aggiornato
- [ ] **Google Play**: Release notes aggiornate (menzione nuovo dominio)
- [ ] **App Store**: Nuova build IPA caricata con dominio aggiornato
- [ ] **App Store**: Release notes aggiornate (menzione nuovo dominio)
- [ ] Versione app incrementata (es. 1.0.0 → 1.1.0)
- [ ] Build number incrementato

---

## ⚡ 8. CLOUDFLARE OPTIMIZATIONS

### **Page Rules - Caching**
- [ ] Page Rule #1 creata: `mypetcareapp.org/*`
  - [ ] Cache Level: **Cache Everything**
  - [ ] Browser Cache TTL: **4 hours**
  - [ ] Edge Cache TTL: **2 hours**
- [ ] Page Rule #2 creata: `api.mypetcareapp.org/*`
  - [ ] Cache Level: **Bypass** (NO cache per API!)
  - [ ] Browser Cache TTL: **Respect Existing Headers**
- [ ] Page rules salvate e attive (max 3 per piano Free)

### **Performance - Speed Optimizations**
- [ ] Dashboard → Speed → Optimization
- [ ] **Auto Minify**:
  - [ ] JavaScript: ✅ On
  - [ ] CSS: ✅ On
  - [ ] HTML: ✅ On
- [ ] **Brotli**: ✅ On (compression algorithm)
- [ ] **Early Hints**: ✅ On (preload resources)
- [ ] **HTTP/2 to Origin**: ✅ On
- [ ] **HTTP/3 (with QUIC)**: ✅ On
- [ ] **Rocket Loader**: ❌ Off (può causare problemi con Flutter web/SPA)
- [ ] **Mirage**: ✅ On (lazy-load immagini su mobile)

### **Security - Firewall & Protection**
- [ ] Dashboard → Security → Settings
- [ ] **Security Level**: Medium (o High se necessario)
- [ ] **Bot Fight Mode**: ✅ On
- [ ] **Challenge Passage**: 30 minutes
- [ ] **Privacy Pass**: ✅ On
- [ ] **Browser Integrity Check**: ✅ On

### **Security - Optional Firewall Rules**
- [ ] **Rate Limiting**: Configurato per endpoint sensibili
  - [ ] Login endpoint: 5 requests/minute per IP
  - [ ] Webhook endpoints: 10 requests/minute per IP
  - [ ] API generic: 100 requests/minute per IP
- [ ] **Geo-blocking**: (opzionale) Configurato se necessario
- [ ] **IP Whitelist**: (opzionale) Per admin endpoints

### **Analytics & Monitoring**
- [ ] Cloudflare Web Analytics attivo
- [ ] Traffic Analytics monitoraggio bandwidth
- [ ] Security Events review (firewall blocks)
- [ ] Performance monitoring cache hit rate
- [ ] Target cache hit rate: **> 80%** per contenuti statici

---

## ✅ 9. FINAL TESTING

### **Website Testing - HTTP/HTTPS/Redirects**
```bash
# Homepage
curl -I https://mypetcareapp.org
```
- [ ] Status: HTTP/2 200 OK
- [ ] Headers: `content-type: text/html`
- [ ] Headers: `x-content-type-options: nosniff`

```bash
# WWW redirect
curl -I https://www.mypetcareapp.org
```
- [ ] Status: HTTP/2 200 OK (o redirect a apex)

```bash
# Privacy Policy
curl -I https://mypetcareapp.org/privacy
```
- [ ] Status: HTTP/2 200 OK (o 301 redirect)

```bash
# Terms
curl -I https://mypetcareapp.org/terms
```
- [ ] Status: HTTP/2 200 OK (o 301 redirect)

```bash
# Support
curl -I https://mypetcareapp.org/support
```
- [ ] Status: HTTP/2 200 OK (o 301 redirect)

### **SSL/TLS Testing**
- [ ] SSL Labs test: https://www.ssllabs.com/ssltest/analyze.html?d=mypetcareapp.org
- [ ] Grade: **A** o **A+**
- [ ] Protocol Support: TLS 1.2, TLS 1.3
- [ ] Cipher Suites: Strong encryption only
- [ ] Certificate: Valid, not expired, correct CN
- [ ] HSTS: Enabled with long max-age

### **API Testing - Health & Endpoints**
```bash
# Health check
curl -I https://api.mypetcareapp.org/healthz
```
- [ ] Status: HTTP/2 200 OK
- [ ] Response time: < 1 secondo

```bash
# Response time test
time curl -s https://api.mypetcareapp.org/healthz
```
- [ ] Execution time: < 500ms

- [ ] Availability endpoint testato (GET /api/pros/:id/availability)
- [ ] Lock creation testato (POST /api/pros/:id/locks)
- [ ] Booking creation testato (POST /api/bookings)
- [ ] Payment endpoints testati (Stripe test mode)
- [ ] Webhook delivery testato (Stripe + PayPal)
- [ ] Error responses testati (404, 500, 401, 403)

### **Email Testing - Deliverability & Authentication**
```bash
# Test MX records
dig MX mypetcareapp.org +short
```
- [ ] Output: 10 mx.zoho.eu, 20 mx2.zoho.eu, 50 mx3.zoho.eu

```bash
# Test SPF
dig TXT mypetcareapp.org +short | grep spf
```
- [ ] Output: "v=spf1 include:zoho.eu ~all"

```bash
# Test DKIM
dig TXT zmail._domainkey.mypetcareapp.org +short
```
- [ ] Output: v=DKIM1; k=rsa; p=...

```bash
# Test DMARC
dig TXT _dmarc.mypetcareapp.org +short
```
- [ ] Output: v=DMARC1; p=quarantine...

- [ ] Invio email DA support@mypetcareapp.org funzionante
- [ ] Ricezione email SU support@mypetcareapp.org funzionante
- [ ] SPF pass verificato (check-auth@verifier.port25.com)
- [ ] DKIM pass verificato (check-auth@verifier.port25.com)
- [ ] DMARC pass verificato (check-auth@verifier.port25.com)
- [ ] Email non in spam folder (test Gmail, Outlook, Yahoo)
- [ ] Mail-Tester score: **≥ 9/10**

### **App Testing - E2E Flow**
- [ ] Install AAB/APK su dispositivo Android reale
- [ ] App si apre senza crash
- [ ] **Test login/registrazione**:
  - [ ] Registrazione nuovo utente funziona
  - [ ] Login utente esistente funziona
  - [ ] Password reset funziona
  - [ ] Logout funziona
- [ ] **Test booking flow completo**:
  - [ ] Ricerca professionisti funziona
  - [ ] Visualizza profilo PRO funziona
  - [ ] Visualizza calendario disponibilità funziona
  - [ ] Lock slot funziona (prenotazione temporanea)
  - [ ] Conferma booking funziona
  - [ ] Notifica booking ricevuta
- [ ] **Test payment flow**:
  - [ ] Stripe test mode funziona
  - [ ] PayPal test mode funziona
  - [ ] Subscription flow completo
  - [ ] Payment success redirect corretto
  - [ ] Payment cancel redirect corretto
- [ ] **Test Privacy/Terms links**:
  - [ ] Privacy Policy apre browser esterno
  - [ ] Terms apre browser esterno
  - [ ] Links raggiungibili e leggibili
- [ ] **Test notifiche push** (se implementate):
  - [ ] Notifica booking creato ricevuta
  - [ ] Notifica booking confermato ricevuta
  - [ ] Notifica messaggio chat ricevuta
- [ ] **Test deep links** (se implementati):
  - [ ] Deep link bookings funziona
  - [ ] Deep link chat funziona

### **Performance Testing**
- [ ] Google PageSpeed Insights: https://pagespeed.web.dev/
  - [ ] Test: https://mypetcareapp.org
  - [ ] Mobile Performance: **≥ 80**
  - [ ] Desktop Performance: **≥ 90**
  - [ ] Best Practices: **≥ 90**
  - [ ] SEO: **≥ 90**
- [ ] Lighthouse audit (Chrome DevTools):
  - [ ] Performance: **≥ 80**
  - [ ] Accessibility: **≥ 90**
  - [ ] Best Practices: **≥ 90**
  - [ ] SEO: **≥ 90**

---

## 📊 10. MONITORING & ANALYTICS

### **Google Cloud Monitoring - API Backend**
- [ ] Google Cloud Console → Monitoring
- [ ] **Alerts configurati**:
  - [ ] Alert: API error rate > 5% per 5 minuti
  - [ ] Alert: API latency > 2s per 5 minuti
  - [ ] Alert: Memory usage > 80% per 10 minuti
  - [ ] Alert: CPU usage > 80% per 10 minuti
  - [ ] Alert: Cloud Run instance count > 10
- [ ] **Dashboard creato** con metriche chiave:
  - [ ] Request count (QPS)
  - [ ] Error rate (%)
  - [ ] Response latency (p50, p95, p99)
  - [ ] Memory usage
  - [ ] CPU usage
- [ ] Notification channels configurati (email support@)

### **Firebase - Analytics & Crashlytics**
- [ ] Firebase Console → Analytics
- [ ] Analytics attivo su app mobile
- [ ] **Eventi custom tracciati**:
  - [ ] `booking_created`
  - [ ] `booking_confirmed`
  - [ ] `payment_completed`
  - [ ] `subscription_started`
  - [ ] `user_registered`
- [ ] Firebase Console → Crashlytics
- [ ] Crashlytics configurato e attivo
- [ ] Test crash report (force crash in test build)
- [ ] Crash report ricevuto in Firebase Console
- [ ] Alert email configurato per crash critici

### **Uptime Monitoring - External Service**
- [ ] Servizio uptime monitoring scelto:
  - [ ] UptimeRobot (https://uptimerobot.com/) - Free tier
  - [ ] Pingdom (https://www.pingdom.com/)
  - [ ] StatusCake (https://www.statuscake.com/)
  - [ ] [Altro]: _______________
- [ ] **Endpoints monitorati**:
  - [ ] https://mypetcareapp.org (check ogni 5 min)
  - [ ] https://www.mypetcareapp.org (check ogni 5 min)
  - [ ] https://api.mypetcareapp.org/healthz (check ogni 5 min)
- [ ] Alert configurato: Email support@ se down > 2 minuti
- [ ] Status page pubblico creato (opzionale)
- [ ] Test alert manuale (stop service temporaneamente)

### **Log Aggregation & Search**
- [ ] Google Cloud Logging configurato
- [ ] Log retention policy: 30 giorni (minimum)
- [ ] Log filters creati per:
  - [ ] Error logs (severity >= ERROR)
  - [ ] Webhook events
  - [ ] Payment transactions
  - [ ] API slow queries (> 1s)
- [ ] Log export a BigQuery (opzionale, per analytics)

---

## 🎉 11. GO-LIVE

### **Pre-Launch Verification - CRITICAL**
- [ ] **Tutti i task precedenti completati e verificati** ✅
- [ ] Nessun errore critico in logs (ultimi 24h)
- [ ] Backup Firestore database completato
- [ ] Backup Cloud Storage completato (se usato)
- [ ] **Disaster recovery plan documentato**:
  - [ ] Database backup restore procedure
  - [ ] Rollback plan (versione precedente app)
  - [ ] Emergency contacts list
  - [ ] Critical issue escalation procedure
- [ ] Team notificato del go-live (data/ora esatta)
- [ ] Support team pronto (email support@ monitorata)
- [ ] On-call rotation schedule definito (prime 48h)

### **Final Security Check**
- [ ] Firestore rules: produzione mode (NO test mode!)
- [ ] Storage rules: produzione mode
- [ ] API keys: produzione (NO test keys)
- [ ] Stripe account: Live mode (NO test mode)
- [ ] PayPal account: Live mode (NO sandbox)
- [ ] Environment variables verificate (NO debug flags)
- [ ] Secret keys rotazione pianificata (ogni 90 giorni)

### **Launch - Deployment**
- [ ] DNS propagazione confermata globalmente (https://dnschecker.org/)
- [ ] SSL certificati attivi su TUTTI i domini (web, api)
- [ ] Monitoring attivo e funzionante (uptime, logs, alerts)
- [ ] **AAB/IPA pubblicati sugli store**:
  - [ ] Google Play: Status "Published" (o "Pending publication")
  - [ ] App Store: Status "Ready for Sale" (o "In Review")
- [ ] Store listing URLs verificati (no broken links)
- [ ] Comunicazione utenti preparata:
  - [ ] Email announcement draft
  - [ ] In-app notification draft (se supportata)
  - [ ] Social media post draft
  - [ ] Press release (opzionale)

### **Post-Launch - Prime 24 Ore (Critical Monitoring)**
- [ ] **Ore 0-2**: Monitor ogni 30 minuti
  - [ ] Check error logs (Google Cloud Logging)
  - [ ] Check API response time (< 1s)
  - [ ] Check uptime (100%)
  - [ ] Check user registrations funzionanti
  - [ ] Check booking flow completo funzionante
- [ ] **Ore 2-8**: Monitor ogni 2 ore
  - [ ] Verifica metriche performance stabili
  - [ ] Verifica email supporto ricevute e risposte inviate
  - [ ] Verifica pagamenti processing correttamente (Stripe/PayPal)
  - [ ] Verifica webhook delivery OK (0 failed deliveries)
- [ ] **Ore 8-24**: Monitor ogni 4 ore
  - [ ] Review analytics: User acquisition, retention
  - [ ] Review crash reports: 0 critical crashes
  - [ ] Review user feedback: Support tickets, reviews
  - [ ] Fix bug prioritari (severity: critical/high)

### **Post-Launch - Prima Settimana**
- [ ] **Daily review** (ogni giorno):
  - [ ] Analytics dashboard review (users, bookings, payments)
  - [ ] Error rate < 1%
  - [ ] Crash-free users > 99.5%
  - [ ] Average session duration trending up
- [ ] **Bug fixing prioritizzato**:
  - [ ] Critical bugs: Fix entro 4 ore
  - [ ] High priority bugs: Fix entro 24 ore
  - [ ] Medium priority bugs: Fix entro 1 settimana
- [ ] **User feedback**:
  - [ ] Raccolta feedback utenti (in-app, email, reviews)
  - [ ] Analisi sentiment reviews (App Store, Play Store)
  - [ ] Risposta review negativa entro 24 ore
  - [ ] Feature requests prioritization
- [ ] **Performance optimization**:
  - [ ] Identify slow API endpoints (> 1s)
  - [ ] Optimize database queries
  - [ ] Add caching where beneficial
  - [ ] Monitor Cloud Run scaling (optimize instance min/max)
- [ ] **Documentation update**:
  - [ ] Update README.md con production URLs
  - [ ] Update API documentation
  - [ ] Update deployment guide (questo file!)
  - [ ] Document known issues and workarounds

### **Post-Launch - Primo Mese**
- [ ] Weekly sprint planning con priorità bugfix/features
- [ ] Monthly metrics review meeting
- [ ] Security audit (penetration testing consigliato)
- [ ] Performance baseline stabilito
- [ ] User onboarding optimization (reduce friction)
- [ ] Marketing campaign analysis (conversion rates)
- [ ] Cost optimization review (Cloud Run, Firebase, Cloudflare)
- [ ] Backup restore test (disaster recovery drill)

---

## 📝 NOTES & ISSUES TRACKING

### **Issues Riscontrati Durante Setup**
```
[Annota qui eventuali problemi riscontrati durante deployment]

Esempio:
- 2025-11-12: DNS propagation lenta (4h invece di 1h) - Risolto attendendo
- 2025-11-12: CORS error iniziale - Risolto aggiungendo www in allowlist
- 2025-11-12: Firebase SSL provisioning timeout - Risolto dopo 45 minuti
```

### **Credenziali e Accessi** (⚠️ CONSERVARE IN PASSWORD MANAGER SICURO!)
```
CRITICAL: Non salvare password in questo file! Usa 1Password, Bitwarden, etc.

Account da documentare:
- [ ] Cloudflare account (email: _______________)
- [ ] Firebase project admin (email: _______________)
- [ ] Google Cloud project owner (email: _______________)
- [ ] Zoho Mail admin (email: _______________)
- [ ] Stripe account (email: _______________)
- [ ] PayPal business account (email: _______________)
- [ ] Google Play Console (email: _______________)
- [ ] App Store Connect (email: _______________)
- [ ] Android keystore password (CRITICO - backup in 3 luoghi!)
- [ ] GitHub repository access (email: _______________)
```

### **Contacts Chiave - Support**
```
DNS/Cloudflare: support@cloudflare.com
Firebase: firebase-support@google.com
Google Cloud: cloud-support@google.com
Zoho Mail: support@zoho.com (o support@zoho.eu)
Stripe: support@stripe.com
PayPal: merchantsupport@paypal.com
Google Play: https://support.google.com/googleplay/android-developer
App Store: https://developer.apple.com/contact/
```

### **Emergency Rollback Procedure**
```
Se necessario rollback a versione precedente:

1. FRONTEND (Flutter App):
   - Revert git commit: git revert HEAD
   - Rebuild: flutter build appbundle --release
   - Upload rollback AAB/IPA agli store (emergency release)

2. BACKEND (Cloud Run):
   - Deploy revision precedente:
     gcloud run services update-traffic mypetcare-api \
       --to-revisions=[PREVIOUS_REVISION]=100 \
       --region=europe-west1

3. WEB (Firebase Hosting):
   - Rollback: firebase hosting:rollback
   - Oppure: Redeploy versione precedente da git

4. DATABASE (Firestore):
   - Restore from backup (Firebase Console → Database → Import/Export)
   - Time estimate: 5-30 minuti dipendente da size

5. DNS (Cloudflare):
   - Se necessario: Rimuovi/Modifica record DNS
   - Attendi propagazione: 5-60 minuti
```

---

## ✅ SIGN-OFF

**Checklist Status**: 
- [ ] ✅ Tutti i task completati
- [ ] ⚠️ In progress (task rimanenti: _______)
- [ ] ❌ Bloccato (issue: _______)

**Go-Live Date**: _______________  
**Time**: _______________ (CET/CEST)

**Signed Off By**:
- Product Manager: _______________
- Lead Developer: _______________
- DevOps Engineer: _______________
- QA Engineer: _______________

**Post-Launch On-Call Rotation** (Prime 48h):
- Shift 1 (00:00-08:00): _______________
- Shift 2 (08:00-16:00): _______________
- Shift 3 (16:00-00:00): _______________

---

**Document Version**: 2.1 - Complete Production Checklist  
**Last Updated**: 2025-11-12  
**Next Review**: [Go-Live Date + 30 giorni]  
**Maintainer**: DevOps Team MyPetCare

---

## 🆘 EMERGENCY CONTACTS

**Critical Issues (Severity 1 - App Down)**:
- On-call phone: _______________
- Backup contact: _______________
- Escalation (after 30 min): _______________

**Support Email**: support@mypetcareapp.org  
**Documentation**: Vedi DNS_AND_DEPLOYMENT_GUIDE_MYPETCAREAPP.ORG.md

**Status Page** (opzionale): https://status.mypetcareapp.org

---

**🎯 Obiettivo: Zero downtime, 100% user satisfaction, successful production launch!**
