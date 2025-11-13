# 🚀 Deploy My Pet Care - Guida Rapida

## Comando Unico (Tutto in uno)

### 🎯 Deploy Development
```bash
./build_and_deploy.sh dev
```

### 🚀 Deploy Production
```bash
./build_and_deploy.sh production
```

---

## ⚡ Comandi Rapidi con Make

```bash
make dev      # Sviluppo
make prod     # Produzione
make preview  # Solo server locale
make help     # Mostra tutti i comandi
```

---

## 📋 Checklist Pre-Deploy

### Prima del Deploy a Produzione:

- [ ] **Aggiorna `.env.production`** con chiavi reali:
  ```bash
  API_BASE_URL=https://api.mypetcareapp.org
  MAPS_API_KEY=AIzaSy...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  PAYPAL_CLIENT_ID=AZaQ...
  ```

- [ ] **Firebase Authentication** configurato:
  - Email/Password abilitato
  - Domini autorizzati aggiunti
  - Chiavi Web configurate in `lib/firebase_options.dart`

- [ ] **Test locale**:
  ```bash
  make preview
  # Visita http://localhost:5060
  ```

- [ ] **Analisi codice**:
  ```bash
  make analyze
  make format
  ```

- [ ] **Test**:
  ```bash
  make test
  ```

---

## 🔥 Setup Firebase (Prima Volta)

### 1. Installa Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login
```bash
firebase login
```

### 3. Verifica Progetto
```bash
firebase projects:list
# Dovresti vedere: pet-care-9790d
```

### 4. Deploy
```bash
make prod
# oppure
./build_and_deploy.sh production
```

---

## 🌐 URL Deploy

### Development
- **Locale**: http://localhost:5060
- **Firebase**: https://pet-care-9790d.web.app

### Production
- **Firebase**: https://pet-care-9790d.firebaseapp.com
- **Dominio Custom**: https://mypetcareapp.org (da configurare)

---

## 📊 Cosa Include il Deploy

### Build Process:
1. ✅ `flutter clean` - Pulisce build precedenti
2. ✅ `flutter pub get` - Installa dipendenze
3. ✅ `flutter build web --release` - Build ottimizzato
4. ✅ Inject variabili d'ambiente (dart-define)
5. ✅ Deploy a Firebase Hosting (se configurato)
6. ✅ Fallback a server locale (se Firebase non disponibile)

### Output:
- **Dimensione**: ~5-8 MB (release ottimizzato)
- **Tempo build**: ~40-50 secondi
- **Formato**: Flutter Web (Dart → JavaScript compilato)

---

## 🎨 Configurazione Inclusa

### Tema Verde-Pet
- ✅ Colore primario: `#247B75`
- ✅ Background: `#EAF3F2`
- ✅ Material Design 3

### Splash Screen
- ✅ Logo centrale cliccabile
- ✅ Sfondo verde-pet
- ✅ Accessibilità tastiera (Invio/Spazio)

### Routing
- ✅ `/splash` → Logo splash
- ✅ `/login` → Login page
- ✅ `/register` → Registrazione
- ✅ `/` → Home (dopo login)

---

## 🐛 Problemi Comuni

### "Firebase not authenticated"
```bash
firebase login
firebase projects:list
```

### "Port 5060 in use"
```bash
lsof -ti:5060 | xargs -r kill -9
make preview
```

### "Build failed"
```bash
make clean
flutter pub get
make build
```

### "dart-define not loaded"
```bash
# Verifica .env file
cat .env.dev
cat .env.production

# Usa script invece di make
./build_and_deploy.sh production
```

---

## 📁 Struttura File Deploy

```
flutter_app/
├── build_and_deploy.sh     # Script principale
├── Makefile                 # Comandi rapidi
├── firebase.json            # Config Firebase Hosting
├── .firebaserc              # Progetto Firebase
├── .env.example             # Template variabili
├── .env.dev                 # Dev environment
├── .env.production          # Prod environment (non committare!)
├── BUILD_DEPLOY.md          # Guida completa
└── DEPLOY_README.md         # Questa guida
```

---

## ✅ Verifica Deploy Riuscito

Dopo il deploy, verifica:

1. **URL accessibile**:
   ```bash
   curl -I https://pet-care-9790d.web.app
   # Risposta: HTTP/2 200
   ```

2. **Splash screen visibile**:
   - Apri browser
   - Sfondo verde-pet
   - Logo centrale cliccabile

3. **Routing funzionante**:
   - Click logo → vai a /login
   - Login form visibile
   - Link registrazione funzionante

4. **Firebase Auth pronto**:
   - Prova registrazione utente
   - Se errore → aggiorna `firebase_options.dart` con chiavi reali

---

## 📚 Documentazione Completa

Per dettagli avanzati, vedi: **BUILD_DEPLOY.md**

---

**Happy Deploying! 🚀✨**
