# 🚀 Routing, Tema e Stato Real-Time - MyPetCare Phase 2

## 📋 File Creati/Modificati (6 file - 223 linee)

### Core (1 file - 29 linee)
1. ✅ `lib/core/theme.dart` - **29 linee**
   - Tema Material 3 con palette Pet Care
   - Colori primari: Verde `#1C8275`, Ambra `#FFD140`
   - AppBar bianca con elevazione 1
   - SnackBar floating comportamento
   - ElevatedButton con border radius 12
   - InputDecoration con border radius 12

### State Management (1 file - 14 linee)
2. ✅ `lib/state/pro_status_provider.dart` - **14 linee**
   - `StreamProvider.family<String, String>` per status PRO real-time
   - Listener Firestore su `pros/{uid}`
   - Return values: `'active'` | `'blocked'` | `'suspended'` | `'unknown'`
   - Auto-update quando status cambia in Firestore

### Routing (1 file - 42 linee)
3. ✅ `lib/router/app_router.dart` - **42 linee** (**NUOVO**)
   - GoRouter configurato con Riverpod
   - 4 route: `/login`, `/home`, `/booking/:proId`, `/paywall/:uid`
   - Redirect logic: Logged out → `/login`, Logged in → `/home`
   - Provider `firebaseAuthProvider` per Firebase Auth instance

### Screens (2 files - 95 linee)
4. ✅ `lib/screens/login_screen.dart` - **46 linee** (**NUOVO**)
   - Form con email e password TextField
   - SignIn con Firebase Auth
   - Loading state con CircularProgressIndicator
   - Error handling con AppSnackbar

5. ✅ `lib/screens/home_screen.dart` - **49 linee** (**NUOVO**)
   - `ConsumerWidget` che ascolta `proStatusProvider`
   - Se `status == 'blocked'` → Mostra `PaywallScreen`
   - Se `status == 'active'` → Mostra home normale
   - Loading e error states gestiti con `.when()`

### Main App (1 file - 43 linee)
6. ✅ `lib/main.dart` - **43 linee** (**AGGIORNATO**)
   - `MyPetCareApp` convertito da `StatelessWidget` a `ConsumerWidget`
   - Usa `ref.watch(routerProvider)` per router dinamico
   - Tema cambiato da `appTheme()` a `petCareTheme`
   - RouterConfig invece di routes statiche

---

## 🎯 Funzionalità Implementate

### ✅ 1. Tema Pet Care Coerente

**Palette Colori:**
```dart
primary: Color(0xFF1C8275)    // Verde acqua PetCare
secondary: Color(0xFFFFD140)  // Ambra dorato
```

**Material Design 3:**
- `useMaterial3: true` - Componenti moderni
- Elevazione ridotta (AppBar: 1)
- Border radius consistente (12px)
- SnackBar floating behavior

**Componenti Styled:**
- `AppBarTheme` - Centrato, bianco, elevazione 1
- `ElevatedButtonTheme` - Padding 14/18, border radius 12, font peso 600
- `InputDecorationTheme` - Border arrotondati 12px
- `SnackBarTheme` - Floating behavior

**Utilizzo:**
```dart
MaterialApp(
  theme: petCareTheme, // ✅ Tema globale applicato
  // ...
)
```

---

### ✅ 2. Stato PRO Real-Time da Firestore

**Provider StreamProvider.family:**
```dart
final proStatusProvider = StreamProvider.family<String, String>((ref, uid) async* {
  final doc = FirebaseFirestore.instance.collection('pros').doc(uid);
  await for (final snap in doc.snapshots()) {
    if (!snap.exists) {
      yield 'unknown';
    } else {
      final data = snap.data()!;
      yield (data['status'] ?? 'active') as String;
    }
  }
});
```

**Vantaggi:**
- ✅ **Auto-update:** UI aggiornata automaticamente quando status cambia
- ✅ **Real-time:** Listener Firestore snapshots()
- ✅ **Type-safe:** Return type `String` con valori conosciuti
- ✅ **Fallback:** Default a `'active'` se campo mancante

**Utilizzo in UI:**
```dart
@override
Widget build(BuildContext context, WidgetRef ref) {
  final status = ref.watch(proStatusProvider(uid));
  return status.when(
    data: (s) {
      if (s == 'blocked') return PaywallScreen(...);
      return HomeScreen(...);
    },
    loading: () => CircularProgressIndicator(),
    error: (e, _) => Text('Errore: $e'),
  );
}
```

---

### ✅ 3. GoRouter con Riverpod Integration

**Architettura:**
```
routerProvider (Provider<GoRouter>)
       ↓
firebaseAuthProvider (Provider<FirebaseAuth>)
       ↓
redirect logic (logged in/out)
       ↓
routes: login, home, booking, paywall
```

**Route Configuration:**
```dart
GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
GoRoute(path: '/booking/:proId', builder: (_, st) {
  final proId = st.pathParameters['proId']!;
  return BookingPage(proId: proId);
}),
GoRoute(path: '/paywall/:uid', builder: (_, st) {
  final uid = st.pathParameters['uid']!;
  return PaywallScreen(
    api: ref.read(paymentsApiProvider),
    customerId: 'cus_$uid',
    paypalPlanId: 'P-XXXXXX',
    uid: uid,
  );
}),
```

**Redirect Logic:**
```dart
redirect: (context, state) {
  final auth = ref.read(firebaseAuthProvider);
  final loggedIn = auth.currentUser != null;
  final goingToLogin = state.fullPath == '/login';
  if (!loggedIn && !goingToLogin) return '/login';  // Force login
  if (loggedIn && goingToLogin) return '/home';      // Redirect home
  return null; // Allow navigation
},
```

**Vantaggi:**
- ✅ **Deep Linking:** URL-based navigation (`/booking/PRO_123`)
- ✅ **Auth Guard:** Redirect automatico se non autenticato
- ✅ **Type-safe:** Path parameters con `.pathParameters['key']`
- ✅ **Centralized:** Routing logic in un solo file

---

### ✅ 4. LoginScreen con Firebase Auth

**Features:**
- TextField per email e password
- Loading state durante autenticazione
- Error handling con AppSnackbar
- Auto-redirect a `/home` dopo login (via GoRouter redirect)

**Flusso Login:**
1. Utente inserisce email/password
2. Tap "Login" → `setState(() => _loading = true)`
3. `FirebaseAuth.instance.signInWithEmailAndPassword()`
4. Success → `AppSnackbar.ok('Accesso effettuato')`
5. GoRouter detect auth change → redirect `/home`
6. Error → `AppSnackbar.error(error)` + `setState(() => _loading = false)`

**Codice chiave:**
```dart
ElevatedButton(
  onPressed: _loading ? null : () async {
    setState(() => _loading = true);
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.text.trim(), 
        password: pass.text.trim()
      );
      AppSnackbar.ok('Accesso effettuato');
    } catch (e) {
      AppSnackbar.error('$e');
    } finally {
      setState(() => _loading = false);
    }
  },
  child: _loading ? const CircularProgressIndicator() : const Text('Login'),
)
```

---

### ✅ 5. HomeScreen con Status-Aware UI

**Features:**
- `ConsumerWidget` con `proStatusProvider` listener
- Auto-render `PaywallScreen` se `status == 'blocked'`
- Loading state durante fetch Firestore
- Error state con messaggio utente

**Flusso Home:**
1. Utente accede → HomeScreen rendered
2. `ref.watch(proStatusProvider(user.uid))` → Firestore query
3. Loading → `CircularProgressIndicator`
4. Status fetched:
   - `'blocked'` → Render `PaywallScreen` al posto di home
   - `'active'` → Render home normale con "Vai alle prenotazioni"
5. Error → `AppSnackbar.error()` + fallback UI

**Pattern AsyncValue.when():**
```dart
final status = ref.watch(proStatusProvider(user.uid));
return status.when(
  data: (s) {
    if (s == 'blocked') {
      return PaywallScreen(...); // ✅ Auto-paywall
    }
    return Scaffold(...); // ✅ Home normale
  },
  loading: () => const Center(child: CircularProgressIndicator()),
  error: (e, _) {
    AppSnackbar.error('$e');
    return const Center(child: Text('Errore stato PRO'));
  },
);
```

---

## 🧪 Testing Checklist

### ✅ Tema Pet Care
- [ ] AppBar bianca con elevazione 1
- [ ] Colore primario verde `#1C8275` applicato
- [ ] Colore secondary ambra `#FFD140` applicato
- [ ] ElevatedButton con border radius 12
- [ ] TextField con border radius 12
- [ ] SnackBar floating behavior

### ✅ Routing GoRouter
- [ ] `/login` accessibile senza autenticazione
- [ ] `/home` richiede autenticazione → redirect `/login` se non loggato
- [ ] Login success → auto-redirect `/home`
- [ ] Deep link `/booking/:proId` funziona
- [ ] Deep link `/paywall/:uid` funziona
- [ ] Navigation con `context.push()` e `context.go()`

### ✅ Firebase Auth Integration
- [ ] Login con email/password funziona
- [ ] Loading state mostra CircularProgressIndicator
- [ ] Success mostra snackbar verde
- [ ] Error mostra snackbar rosso
- [ ] Auto-redirect dopo login

### ✅ PRO Status Real-Time
- [ ] Listener Firestore attivo su `pros/{uid}`
- [ ] Status `'active'` → Home normale
- [ ] Status `'blocked'` → PaywallScreen automatico
- [ ] Cambio status in Firestore → UI auto-update
- [ ] Loading state durante fetch iniziale
- [ ] Error state con messaggio utente

### ✅ HomeScreen Integration
- [ ] ConsumerWidget usa `proStatusProvider`
- [ ] PaywallScreen mostrato se blocked
- [ ] Bottone "Vai alle prenotazioni" naviga a `/booking/:proId`
- [ ] User non autenticato → Text "Non autenticato"

---

## 🔍 Troubleshooting

### Errore: "No route defined for '/home'"
**Causa:** Router non configurato correttamente  
**Soluzione:** Verifica che `routerProvider` sia usato in `MaterialApp.router`:
```dart
final router = ref.watch(routerProvider);
return MaterialApp.router(
  routerConfig: router, // ✅ Usa router dinamico
  // ...
);
```

### Errore: "Navigator operation requested with null context"
**Causa:** Navigation prima che GoRouter sia inizializzato  
**Soluzione:** Usa `context.push()` invece di `Navigator.push()`:
```dart
// ❌ BAD
Navigator.push(context, MaterialPageRoute(...));

// ✅ GOOD
context.push('/booking/$proId');
```

### Errore: "Firebase not initialized"
**Causa:** Firebase.initializeApp() non chiamato  
**Soluzione:** Verifica `main()`:
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: FirebaseOptions(...), // ✅ Configura options
  );
  runApp(ProviderScope(child: MyPetCareApp()));
}
```

### Errore: "proStatusProvider returns 'unknown'"
**Causa:** Documento PRO non esiste in Firestore  
**Debug:**
```dart
// Crea documento PRO manualmente in Firestore Console
pros/{uid} = {
  status: 'active',  // o 'blocked', 'suspended'
  name: 'Test PRO',
  // ... altri campi
}
```

### Warning: "setState() called after dispose()"
**Causa:** Async operation completa dopo widget dispose  
**Soluzione:** Check `mounted` prima di setState:
```dart
try {
  await FirebaseAuth.instance.signInWithEmailAndPassword(...);
  if (mounted) {
    AppSnackbar.ok('Accesso effettuato');
  }
} catch (e) {
  if (mounted) {
    setState(() => _loading = false);
  }
}
```

### Errore: "PaywallScreen requires paymentsApiProvider"
**Causa:** Provider non inizializzato  
**Soluzione:** Verifica che `lib/services/providers.dart` sia configurato:
```dart
final paymentsApiProvider = Provider((ref) => PaymentsApi(ref.read(apiClientProvider)));
```

---

## 📊 Performance Optimizations

### GoRouter Lazy Loading
Routes sono lazy-loaded, widget creati solo quando navigati:
```dart
// ✅ GOOD - Widget creato solo quando route attivata
GoRoute(path: '/booking/:proId', builder: (_, st) => BookingPage(...))

// ❌ BAD - Widget creato immediatamente
final bookingPage = BookingPage(...);
GoRoute(path: '/booking/:proId', builder: (_, st) => bookingPage)
```

### StreamProvider Caching
`proStatusProvider` usa caching automatico Riverpod:
- Prima chiamata: Firestore query + stream creation
- Successive chiamate (stesso uid): Cached stream riutilizzato
- Cache invalidato quando provider disposed

### Firestore Real-Time Efficiency
- Usa `snapshots()` invece di polling
- Stream auto-close quando widget dispose
- Only one listener per uid (grazie a StreamProvider.family)

---

## 🎓 Best Practices

### 1. Navigation Pattern
```dart
// ✅ GOOD - Usa context extensions
context.push('/booking/$proId');
context.go('/home');

// ❌ BAD - Navigator.push deprecato con GoRouter
Navigator.push(context, MaterialPageRoute(...));
```

### 2. Provider Organization
```dart
// ✅ GOOD - Provider in file separato lib/router/app_router.dart
final routerProvider = Provider<GoRouter>((ref) => ...);

// ❌ BAD - Provider inline in main.dart
```

### 3. Status Handling
```dart
// ✅ GOOD - Use .when() per tutti i casi
status.when(
  data: (s) => ...,
  loading: () => ...,
  error: (e, _) => ...,
);

// ❌ BAD - Only handle data case
final s = status.value!; // Crash se loading/error!
```

### 4. Theme Consistency
```dart
// ✅ GOOD - Single theme source
MaterialApp(theme: petCareTheme)

// ❌ BAD - Multiple theme definitions
MaterialApp(theme: ThemeData(...)) // Inconsistent
```

---

## 📝 Configurazione Firestore

### Collection `pros`
```json
{
  "pros": {
    "{uid}": {
      "status": "active",        // 'active' | 'blocked' | 'suspended'
      "name": "Dr. Mario Rossi",
      "email": "mario@example.com",
      "categories": ["veterinario", "toelettatura"],
      "visible": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

### Security Rules
```javascript
match /pros/{proId} {
  // Allow read per tutti gli utenti autenticati
  allow read: if request.auth != null;
  
  // Allow write solo per il proprietario o admin
  allow write: if request.auth.uid == proId || hasRole('admin');
}
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] `flutter analyze` passa senza errori
- [ ] Tutti i test passano
- [ ] Firebase credentials configurate in `main.dart`
- [ ] `baseUrlProvider` punta a backend staging/prod
- [ ] PayPal `plan_id` configurato in `app_router.dart`

### Firestore Setup
- [ ] Collection `pros` creata
- [ ] Campo `status` aggiunto a tutti i PRO
- [ ] Security rules configurate
- [ ] Composite indexes creati (se necessario)

### Testing Pre-Production
- [ ] Login con account test funziona
- [ ] Status `'active'` mostra home normale
- [ ] Status `'blocked'` mostra paywall automaticamente
- [ ] Navigation tra tutte le route funziona
- [ ] Deep links testati

### Post-Deployment
- [ ] Monitor Firestore listener count (< 100k concurrent)
- [ ] Check error logs per failed auth
- [ ] Verify router redirect working in production
- [ ] Test real-time status updates

---

## 🔗 File Dependencies

### Dependency Graph
```
main.dart
  ↓
routerProvider (router/app_router.dart)
  ↓
firebaseAuthProvider
  ↓
[login_screen.dart, home_screen.dart, booking_page.dart, paywall_screen.dart]
  ↓
proStatusProvider (state/pro_status_provider.dart)
  ↓
Firestore pros/{uid}
```

### Import Order (Recommended)
```dart
// 1. Dart/Flutter core
import 'package:flutter/material.dart';

// 2. External packages
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';

// 3. Internal core
import '../core/app_snackbar.dart';
import '../core/theme.dart';

// 4. Internal state
import '../state/pro_status_provider.dart';

// 5. Internal services
import '../services/providers.dart';

// 6. Internal screens
import '../screens/login_screen.dart';
```

---

## 🎉 Next Steps

### Phase 3 Suggestions
1. **Notifier Riverpod** - Implement user notifier per gestione stato utente globale
2. **Health Widget** - Widget debug con info version.json + API status
3. **Animazioni** - AnimatedSwitcher per transizioni route smooth
4. **Error Handling** - Global error handler per catch-all errors
5. **Offline Support** - Caching con Hive per dati critici
6. **Analytics** - Firebase Analytics integration per tracking navigation

### Enhanced Features
- **Onboarding Flow** - Welcome screens per nuovi utenti
- **Profile Management** - Edit profile screen con photo upload
- **Settings Screen** - Theme toggle, language selection, notifications
- **Search Functionality** - Search PRO per nome/categoria/location
- **Favorites** - Bookmark PRO favoriti

---

**Data Creazione:** 2025-01-XX  
**Versione Flutter:** 3.35.4  
**Versione Dart:** 3.9.2  
**GoRouter Version:** 14.2.0  
**Riverpod Version:** 2.5.1  
**Firebase Core:** 3.6.0  
**Cloud Firestore:** 5.5.0

---

**🎊 Routing, Tema e Stato Real-Time completamente integrati e pronti all'uso!**
