# 🚀 My Pet Care - Build & Deploy Guide

## Quick Start

### Metodo 1: Script Bash (Raccomandato)
```bash
# Development
./build_and_deploy.sh dev

# Production
./build_and_deploy.sh production
```

### Metodo 2: Makefile (Più Semplice)
```bash
# Development
make dev

# Production  
make prod

# Solo build (no deploy)
make build

# Preview locale
make preview
```

### Metodo 3: Comando Manuale Completo
```bash
flutter clean && flutter pub get \
&& flutter build web --release \
  --dart-define=API_BASE_URL=https://api.mypetcareapp.org \
  --dart-define=MAPS_API_KEY=__YOUR_MAPS_KEY__ \
  --dart-define=STRIPE_PUBLISHABLE_KEY=__YOUR_STRIPE_KEY__ \
  --dart-define=PAYPAL_CLIENT_ID=__YOUR_PAYPAL_ID__ \
&& firebase deploy --only hosting
```

---

## 📁 File di Configurazione

### `.env.dev` - Sviluppo Locale
```bash
API_BASE_URL=http://localhost:8080
MAPS_API_KEY=
STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
```

### `.env.production` - Produzione
```bash
API_BASE_URL=https://api.mypetcareapp.org
MAPS_API_KEY=AIzaSyC...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=AZaQ...
```

**IMPORTANTE**: Non committare `.env.production` con chiavi reali! Usa `.env.example` come template.

---

## 🔧 Comandi Disponibili

### Script Bash (`./build_and_deploy.sh`)

| Comando | Descrizione |
|---------|-------------|
| `./build_and_deploy.sh dev` | Build e deploy per sviluppo |
| `./build_and_deploy.sh staging` | Build e deploy per staging |
| `./build_and_deploy.sh production` | Build e deploy per produzione |

**Funzionalità**:
- ✅ Carica automaticamente variabili da `.env.{environment}`
- ✅ Fallback a server locale se Firebase non configurato
- ✅ Output colorato e progressivo
- ✅ Verifica dimensioni build
- ✅ Gestione errori automatica

### Makefile (`make <command>`)

| Comando | Descrizione |
|---------|-------------|
| `make help` | Mostra tutti i comandi disponibili |
| `make dev` | Build e deploy per sviluppo |
| `make prod` | Build e deploy per produzione |
| `make build` | Solo build (senza deploy) |
| `make preview` | Avvia server locale su porta 5060 |
| `make clean` | Pulisce build artifacts |
| `make test` | Esegue i test |
| `make analyze` | Esegue flutter analyze |
| `make format` | Formatta il codice |
| `make deploy` | Solo deploy (richiede build esistente) |
| `make restart` | Rebuild veloce + restart server |

---

## 🔥 Configurazione Firebase

### Setup Iniziale

1. **Installa Firebase CLI**
```bash
npm install -g firebase-tools
```

2. **Login a Firebase**
```bash
firebase login
```

3. **Verifica Configurazione**
```bash
# I file firebase.json e .firebaserc sono già configurati
# Progetto: pet-care-9790d
```

4. **Deploy Manuale**
```bash
# Dopo aver buildato con make build o ./build_and_deploy.sh
firebase deploy --only hosting
```

### File di Configurazione Firebase

**firebase.json**
```json
{
  "hosting": {
    "public": "build/web",
    "rewrites": [{"source": "**", "destination": "/index.html"}],
    "headers": [/* Cache e Security headers */]
  }
}
```

**.firebaserc**
```json
{
  "projects": {
    "default": "pet-care-9790d"
  }
}
```

---

## 🌐 Preview Locale

### Avvio Server Locale

**Opzione 1: Makefile**
```bash
make preview
```

**Opzione 2: Script**
```bash
./build_and_deploy.sh dev  # Include build + server
```

**Opzione 3: Manuale**
```bash
# Da root del progetto
python3 -m http.server 5060 --directory build/web --bind 0.0.0.0
```

**URL**: http://localhost:5060

---

## 🎯 Workflow Raccomandato

### Sviluppo Quotidiano

```bash
# 1. Modifica codice
vim lib/features/...

# 2. Test veloce
make analyze
make format

# 3. Preview locale
make restart

# 4. Test completo
make test

# 5. Commit
git add .
git commit -m "feat: nuova funzionalità"
```

### Deploy a Produzione

```bash
# 1. Aggiorna .env.production con chiavi reali
vim .env.production

# 2. Build e deploy
make prod

# 3. Verifica deploy
# Visita: https://pet-care-9790d.web.app
```

---

## 🐛 Troubleshooting

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
firebase login
```

### "Port 5060 already in use"
```bash
lsof -ti:5060 | xargs -r kill -9
make preview
```

### "Build failed"
```bash
# Pulisci cache
make clean
flutter pub get
make build
```

### "Deploy failed - Authentication required"
```bash
firebase login
firebase projects:list  # Verifica autenticazione
```

### "dart-define not working"
```bash
# Verifica che le variabili siano caricate
cat .env.dev
./build_and_deploy.sh dev
```

---

## 📊 Dimensioni Build Tipiche

- **Development**: ~15-20 MB (non minificato)
- **Release**: ~5-8 MB (minificato + tree-shaken)
- **Con mappe**: +2-3 MB (Google Maps)
- **Con payment**: +1-2 MB (Stripe/PayPal SDKs)

---

## 🔒 Sicurezza

### Variabili d'Ambiente

**✅ DA FARE**:
- Usa `.env.example` come template
- Aggiungi `.env.production` al `.gitignore`
- Usa Firebase Environment Config per segreti sensibili
- Ruota chiavi API regolarmente

**❌ MAI**:
- Committare chiavi API reali
- Hardcodare segreti nel codice
- Condividere `.env.production` pubblicamente
- Usare chiavi di produzione in sviluppo

### Headers di Sicurezza

Il file `firebase.json` include già:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Cache headers ottimizzati

---

## 📚 Riferimenti

- **Flutter Web**: https://docs.flutter.dev/platform-integration/web
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **dart-define**: https://docs.flutter.dev/deployment/flavors#dart-define

---

## 🎉 Esempio Completo

```bash
# Setup iniziale (una volta)
cp .env.example .env.production
vim .env.production  # Aggiungi chiavi reali
npm install -g firebase-tools
firebase login

# Sviluppo quotidiano
make dev        # Build + preview locale

# Deploy a produzione
make prod       # Build + deploy Firebase

# Test e qualità
make test       # Run tests
make analyze    # Lint
make format     # Format code

# Utility
make clean      # Pulisci tutto
make help       # Mostra comandi
```

---

**Ultima revisione**: $(date)
**Progetto**: My Pet Care Web App
**Versione**: 1.0.0
