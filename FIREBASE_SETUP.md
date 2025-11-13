# 🔥 Configurazione Firebase per My Pet Care

## Problema Attuale
L'applicazione usa **chiavi Firebase fittizie** (`AIzaSyC8X_mocked_key_for_local_development_only`) che impediscono l'autenticazione reale.

## Soluzione: Ottieni Chiavi Firebase Reali

### Passo 1: Accedi alla Firebase Console
1. Vai su **https://console.firebase.google.com/**
2. Seleziona il progetto **pet-care-9790d**
3. Se non esiste, creane uno nuovo

### Passo 2: Abilita Authentication
1. Nel menu laterale, vai su **Build** → **Authentication**
2. Clicca **Get Started**
3. Nella scheda **Sign-in method**, abilita **Email/Password**

### Passo 3: Ottieni le Chiavi per Web
1. Vai su **Project Overview** → **Project Settings** (icona ingranaggio)
2. Scorri fino a **Your apps**
3. Se non c'è un'app Web, clicca **Add app** → **Web** (</> icona)
4. Registra l'app con nome "My Pet Care Web"
5. Copia la configurazione Firebase che appare:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "pet-care-9790d.firebaseapp.com",
  projectId: "pet-care-9790d",
  storageBucket: "pet-care-9790d.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

### Passo 4: Aggiorna firebase_options.dart
Sostituisci il file `lib/firebase_options.dart` con le chiavi reali:

```dart
static const FirebaseOptions web = FirebaseOptions(
  apiKey: 'AIza...', // LA TUA CHIAVE REALE
  appId: '1:123456789:web:abc...', // IL TUO APP ID
  messagingSenderId: '123456789',
  projectId: 'pet-care-9790d',
  authDomain: 'pet-care-9790d.firebaseapp.com',
  storageBucket: 'pet-care-9790d.appspot.com',
);
```

### Passo 5: Rebuild e Deploy
```bash
cd /home/user/flutter_app
flutter build web --release
python3 -m http.server 5060 --directory build/web --bind 0.0.0.0 &
```

## Configurazione Domini Autorizzati
Per evitare errori CORS:

1. Vai su **Authentication** → **Settings** → **Authorized domains**
2. Aggiungi il dominio del sandbox: `5060-ih5mrwjfym6fekb6bndvp-b32ec7bb.sandbox.novita.ai`

## Test
Dopo la configurazione, prova:
1. Registra un nuovo utente
2. Controlla l'email di verifica
3. Accedi con le credenziali

## Alternativa: Firebase Emulator (Solo Sviluppo)
Se vuoi testare senza configurare Firebase:

```bash
# Installa Firebase CLI
npm install -g firebase-tools

# Avvia emulator
firebase emulators:start --only auth
```

Poi aggiorna `lib/main.dart`:
```dart
if (kDebugMode) {
  await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
}
```

---

**NOTA**: Le chiavi fittizie attuali non permettono la registrazione/login reale. Segui questa guida per risolvere il problema.
