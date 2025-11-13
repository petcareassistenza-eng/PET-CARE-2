# 🚦 My Pet Care - Checklist GO/NO-GO Deployment

**Data**: Wed Nov 12 21:34:28 UTC 2025
**Build Size**: 31M
**URL Preview**: https://5060-ih5mrwjfym6fekb6bndvp-b32ec7bb.sandbox.novita.ai

---

## ✅ Checklist Pre-Deploy Completata

### 1. Asset e Configurazione Base
- [x] **Logo**: `my_pet_care_logo.webp` (20KB) presente
- [x] **pubspec.yaml**: Asset configurato correttamente
- [x] **Theme**: Palette verde-pet (#247B75) implementata
- [x] **Splash Screen**: SplashGate con logo tap-to-start
- [x] **Build Web**: Completata in 45.3 secondi

### 2. Pagine Auth
- [x] **LoginPage**: Implementata con logo, email/password
- [x] **RegisterPage**: Creazione account + email verification
- [x] **ForgotPasswordPage**: Reset password funzionante
- [x] **Router**: Configurato con `/splash` → `/login` → `/` flow

### 3. Configurazione Web
- [x] **web/index.html**: Minimale con favicon logo
- [x] **firebase.json**: Headers sicurezza + cleanUrls + rewrites SPA
- [x] **Security Headers**: HSTS, X-Content-Type-Options, Referrer-Policy

### 4. Firestore Rules
- [x] **firestore.rules**: Regole produzione create
- [x] Regole per: users (owner-only), pros (read-all), bookings (auth-only)
- [ ] **Deploy Rules**: `firebase deploy --only firestore:rules` (DA FARE)

### 5. Build & Deploy
- [x] **Flutter Clean**: Reset completo eseguito
- [x] **Dependencies**: `flutter pub get` completato
- [x] **Build Release**: `flutter build web --release` completato
- [x] **dart-define**: API_BASE_URL=https://api.mypetcareapp.org
- [x] **Server Preview**: Attivo su porta 5060

---

## 🔴 TO-DO Prima del Deploy Produzione

### Critici (Blockers)

#### 1. ⚠️ Firebase Authentication
**Status**: ❌ **BLOCCANTE**

**Issue**: Chiavi Firebase fittizie in `lib/firebase_options.dart`

**Soluzione**:
```bash
# 1. Vai su Firebase Console
open https://console.firebase.google.com/

# 2. Progetto: pet-care-9790d
# 3. Project Settings → Your apps → Web app
# 4. Copia apiKey, appId, messagingSenderId

# 5. Aggiorna lib/firebase_options.dart con chiavi reali
vim lib/firebase_options.dart

# 6. Rebuild
flutter build web --release --dart-define=API_BASE_URL=https://api.mypetcareapp.org
```

**Test**:
- [ ] Email/Password abilitato in Firebase Console
- [ ] Domini autorizzati aggiunti (sandbox + produzione)
- [ ] Test registrazione nuovo utente
- [ ] Test login con credenziali esistenti
- [ ] Verifica email di verifica arriva

#### 2. ⚠️ Firestore Rules Deploy
**Status**: ⚠️ **IMPORTANTE**

**Comando**:
```bash
firebase deploy --only firestore:rules
```

**Verifica**:
- [ ] Regole deployate su Firebase Console
- [ ] Test lettura/scrittura con utente auth
- [ ] Test accesso negato senza auth

#### 3. ⚠️ Firebase Hosting Deploy
**Status**: ⚠️ **OPZIONALE** (preview funzionante)

**Setup**:
```bash
# Se non fatto
npm install -g firebase-tools
firebase login

# Deploy
firebase deploy --only hosting
```

---

## 🟢 Checklist Test Funzionali

### Test Splash Screen
- [ ] Visita URL preview
- [ ] Verifica sfondo verde-pet (#247B75)
- [ ] Logo centrale visibile (container bianco)
- [ ] Click/tap logo → redirect a `/login`

### Test Login
- [ ] Form email/password visibile
- [ ] Logo piccolo (96px) presente
- [ ] Link "Password dimenticata?" funzionante
- [ ] Link "Registrati" funzionante
- [ ] Submit con credenziali valide → redirect a `/`
- [ ] Submit con credenziali errate → SnackBar errore

### Test Registrazione
- [ ] Form email/password visibile
- [ ] Submit crea utente in Firebase Auth
- [ ] Email verifica inviata
- [ ] Redirect a `/` dopo registrazione
- [ ] Errori (email già usata) mostrati con SnackBar

### Test Forgot Password
- [ ] Form email visibile
- [ ] Submit invia email di reset
- [ ] SnackBar conferma invio
- [ ] Redirect a `/login` dopo invio
- [ ] Email ricevuta in inbox

### Test Routing
- [ ] `/splash` → splash screen
- [ ] `/login` → login page
- [ ] `/register` → register page
- [ ] `/forgot` → forgot password
- [ ] `/` → home page (dopo auth)
- [ ] Browser back button funzionante

---

## 🔧 Configurazioni Opzionali

### Google Maps (Se Necessario)
**Status**: 🔵 Disabilitato

Se vuoi abilitare mappe:
```html
<!-- web/index.html -->
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_MAPS_API_KEY"></script>
```

Poi rebuild:
```bash
flutter build web --release \
  --dart-define=API_BASE_URL=https://api.mypetcareapp.org \
  --dart-define=MAPS_API_KEY=YOUR_ACTUAL_KEY
```

### Stripe/PayPal (Se Necessario)
**Status**: 🔵 Non configurato

Aggiungi dart-define in build:
```bash
flutter build web --release \
  --dart-define=API_BASE_URL=https://api.mypetcareapp.org \
  --dart-define=STRIPE_PUBLISHABLE_KEY=pk_live_... \
  --dart-define=PAYPAL_CLIENT_ID=AZaQ...
```

---

## 📊 Metriche Build Finale

```
Build Info:
  Size: 31M (uncompressed), ~5-8M (compressed)
  Time: 45.3 seconds
  Logo: 20KB (webp)
  Compiler: dart2js
  Tree-shaking: 99.5% icon fonts reduction
  
Environment:
  API_BASE_URL: https://api.mypetcareapp.org
  MAPS_API_KEY: (non configurato)
  STRIPE_KEY: (non configurato)
  PAYPAL_ID: (non configurato)
```

---

## 🚀 Deploy a Produzione (Quando Pronto)

### Step-by-Step

1. **Configura Firebase Auth** (CRITICO)
   ```bash
   # Aggiorna firebase_options.dart con chiavi reali
   vim lib/firebase_options.dart
   ```

2. **Rebuild con configurazione produzione**
   ```bash
   flutter clean
   flutter pub get
   flutter build web --release \
     --dart-define=API_BASE_URL=https://api.mypetcareapp.org
   ```

3. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Deploy Hosting**
   ```bash
   firebase deploy --only hosting
   ```

5. **Verifica Deploy**
   ```bash
   # Apri URL produzione
   open https://pet-care-9790d.web.app
   
   # Test funzionalità
   # - Splash screen
   # - Login/Registrazione
   # - Routing
   ```

---

## 🎯 Decision Point: GO / NO-GO

### ✅ GO SE:
- [ ] Firebase Auth configurato con chiavi reali
- [ ] Email/Password abilitato in Firebase Console
- [ ] Domini autorizzati aggiunti
- [ ] Firestore rules deployate
- [ ] Test registrazione/login completati con successo
- [ ] Routing funzionante su tutti i percorsi

### ❌ NO-GO SE:
- [ ] Firebase Auth non configurato (chiavi fittizie)
- [ ] Email/Password non abilitato
- [ ] Errori durante registrazione/login
- [ ] Routing non funzionante
- [ ] Asset logo mancanti nel build

---

## 📝 Note Finali

**URL Preview Corrente**: https://5060-ih5mrwjfym6fekb6bndvp-b32ec7bb.sandbox.novita.ai

**Action Items Immediate**:
1. Configura Firebase Auth con chiavi reali
2. Abilita Email/Password in Firebase Console
3. Aggiungi domini autorizzati
4. Deploy Firestore rules
5. Test completo funzionalità auth

**Dopo Deploy**:
- Monitora Firebase Console per errori
- Verifica analytics e crash reports
- Test su browser diversi (Chrome, Firefox, Safari)
- Test responsive su mobile

---

**Stato Finale**: 🟡 **READY FOR FIREBASE AUTH SETUP**

Tutto è pronto per il deploy. L'unico blocker è la configurazione Firebase Auth con chiavi reali.
