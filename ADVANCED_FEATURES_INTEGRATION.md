# 🚀 MyPetCare Advanced Features - Flutter Client Integration

## 📋 File Creati

### Services (API Clients)
- ✅ `lib/services/api_client.dart` - Client HTTP con Bearer auth e ETag caching
- ✅ `lib/services/availability_api.dart` - Gestione slot disponibilità e lock TTL
- ✅ `lib/services/booking_api.dart` - Creazione prenotazioni
- ✅ `lib/services/coupons_api.dart` - Validazione codici promozionali
- ✅ `lib/services/payments_api.dart` - PayPal subscriptions e Stripe Portal

### Widgets
- ✅ `lib/widgets/slot_grid.dart` - Griglia slot con lock e countdown (5 minuti)
- ✅ `lib/widgets/booking_confirm.dart` - Dialog conferma prenotazione
- ✅ `lib/widgets/coupons_sheet.dart` - Bottom sheet validazione coupon

### Screens
- ✅ `lib/screens/paywall_screen.dart` - Gestione abbonamenti PRO
- ✅ `lib/screens/pro_booking_page.dart` - Esempio completo di integrazione

---

## 🔧 Configurazione Richiesta

### 1. Impostare Base URL Backend

Modificare `lib/screens/pro_booking_page.dart` alla linea 30:

```dart
api = ApiClient(
  baseUrl: 'https://YOUR_BACKEND_URL_HERE', // ⚠️ CAMBIARE QUESTO!
  getToken: () async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      return await user.getIdToken();
    }
    return null;
  },
);
```

**Opzioni URL:**
- **Staging:** `https://staging-backend-xxx.run.app`
- **Production:** `https://backend-xxx.run.app`

---

## ✅ Funzionalità Implementate

### 1. 📅 Availability & Lock System
**Endpoint:** `GET /api/pros/:proId/availability`, `POST /api/pros/:proId/locks`

**Caratteristiche:**
- Visualizzazione slot disponibili per giorno
- Lock temporaneo (TTL 300s = 5 minuti)
- Countdown visivo per lock attivo
- Refresh automatico ogni 20 secondi
- Gestione stati: `free`, `locked`, `booked`

**Utilizzo:**
```dart
final availability = AvailabilityApi(api);
final slots = await availability.getDay(proId, day: DateTime.now(), stepMin: 30);
final lock = await availability.createLock(proId, start: slotStart, end: slotEnd, day: day);
```

---

### 2. 🎫 Coupon System
**Endpoint:** `GET /api/coupons/:code`

**Codici Supportati:**
- `FREE-1M` - 1 mese PRO gratuito
- `FREE-3M` - 3 mesi PRO gratuiti
- `FREE-12M` - 12 mesi PRO gratuiti (offerta lancio)

**Utilizzo:**
```dart
final coupons = CouponsApi(api);
final coupon = await coupons.validate('FREE-3M');
// Ritorna: { code: 'FREE-3M', months: 3, active: true, description: '...' }
```

---

### 3. 💳 PayPal Subscriptions
**Endpoint:** `POST /api/payments/paypal/subscribe`

**Caratteristiche:**
- Creazione subscription con approval URL
- Gestione redirect web/mobile
- Integrazione con `url_launcher`

**Utilizzo:**
```dart
final payments = PaymentsApi(api);
final approvalUrl = await payments.paypalSubscribe(
  planId: 'P-XXXXXXXXXXXX',
  returnUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/cancel',
  uid: currentUserId,
);
await launchUrl(approvalUrl, mode: LaunchMode.externalApplication);
```

---

### 4. 💳 Stripe Portal
**Endpoint:** `POST /api/payments/portal`

**Caratteristiche:**
- Gestione abbonamenti esistenti
- Cambio metodo di pagamento
- Cancellazione abbonamento

**Utilizzo:**
```dart
final payments = PaymentsApi(api);
final portalUrl = await payments.stripePortal(
  customerId: 'cus_XXXXXXXXXXXX',
  returnUrl: 'https://yourapp.com/profile',
);
await launchUrl(portalUrl, mode: LaunchMode.externalApplication);
```

---

## 🎯 Flusso Utente Completo

### Prenotazione con Lock
1. Utente apre `ProBookingPage`
2. Seleziona giorno con frecce ←/→
3. `SlotGrid` carica slot disponibili (`GET /api/pros/:proId/availability`)
4. Utente tap su slot verde (free) → Crea lock (`POST /api/pros/:proId/locks`)
5. Banner countdown mostra "Slot bloccato: 09:00-10:00, Scade in 04:53"
6. `BookingConfirmDialog` appare automaticamente
7. Utente inserisce note opzionali e clicca "Conferma"
8. `BookingApi.create()` crea prenotazione → Backend elimina lock
9. SnackBar conferma: "Prenotazione creata: booking_xyz"

### Validazione Coupon
1. Utente apre pagina abbonamento
2. Tap icona 🏷️ nella AppBar
3. `CouponsSheet` (bottom sheet) appare
4. Inserisce codice "FREE-3M"
5. `CouponsApi.validate()` verifica codice
6. Se valido: Mostra "OK: FREE-3M → 3 mesi"
7. Bottom sheet chiude e ritorna dati coupon
8. SnackBar conferma applicazione

### Gestione Abbonamento PRO
1. PRO bloccato apre `PaywallScreen`
2. Due opzioni:
   - **Stripe Portal:** Gestisci abbonamento esistente
   - **PayPal:** Attiva nuovo abbonamento
3. Tap pulsante → API crea sessione/subscription
4. `url_launcher` apre browser/app esterna
5. Utente completa pagamento
6. Redirect a `returnUrl` configurato
7. Backend webhook aggiorna status PRO

---

## 🔌 Integrazione nel Router

Aggiungere route in `lib/router/app_router.dart`:

```dart
GoRoute(
  path: '/pros/:proId/book',
  name: 'pro_booking',
  builder: (context, state) {
    final proId = state.pathParameters['proId']!;
    final serviceId = state.uri.queryParameters['serviceId'] ?? 'default_service';
    return ProBookingPage(proId: proId, serviceId: serviceId);
  },
),

GoRoute(
  path: '/paywall',
  name: 'paywall',
  builder: (context, state) {
    final customerId = state.uri.queryParameters['customerId']!;
    final uid = state.uri.queryParameters['uid']!;
    final api = ApiClient(baseUrl: 'YOUR_BACKEND_URL');
    return PaywallScreen(
      api: PaymentsApi(api),
      customerId: customerId,
      paypalPlanId: 'P-XXXXXXXXXXXX', // Imposta il tuo plan ID
      uid: uid,
    );
  },
),
```

---

## 🧪 Testing Checklist

### Test Slot Grid
- [ ] Slot verdi (free) sono cliccabili
- [ ] Slot arancioni (locked) sono disabilitati
- [ ] Slot rossi (booked) sono disabilitati
- [ ] Countdown aggiorna ogni secondo
- [ ] Dopo 5 minuti, slot locked torna free automaticamente
- [ ] Refresh automatico ogni 20 secondi funziona

### Test Booking
- [ ] Dialog conferma appare dopo lock
- [ ] Campo note è opzionale
- [ ] Conferma crea booking e mostra ID
- [ ] Errori mostrano messaggio rosso

### Test Coupon
- [ ] Codice valido mostra conferma verde
- [ ] Codice invalido mostra errore rosso
- [ ] Bottom sheet chiude dopo successo
- [ ] Codice case-insensitive (free-3m = FREE-3M)

### Test Paywall
- [ ] Pulsante Stripe Portal apre browser
- [ ] Pulsante PayPal apre browser
- [ ] Errori mostrano messaggio rosso
- [ ] Redirect funziona dopo pagamento

---

## 🐛 Troubleshooting

### Errore: "Lock expired or not found"
**Causa:** TTL lock scaduto (>5 minuti)  
**Soluzione:** Utente deve riselezionare slot

### Errore: "Slot already booked"
**Causa:** Altro utente ha prenotato nel frattempo  
**Soluzione:** Refresh automatico mostra slot rosso

### Errore: "Coupon non valido"
**Causa:** Codice errato o coupon inattivo  
**Soluzione:** Verificare codice o contattare supporto

### Errore: "Impossibile aprire URL"
**Causa:** `url_launcher` non configurato  
**Soluzione:** Verificare `pubspec.yaml` e permessi iOS/Android

---

## 📊 Performance Tips

### ETag Caching
`ApiClient` implementa caching ETag automatico:
- Prima richiesta: `GET /api/pros/123/availability` → 200 OK (full response)
- Seconda richiesta: Header `If-None-Match: "xyz"` → 304 Not Modified (no body)
- Risparmio: ~70% bandwidth per richieste ripetute

### Refresh Ottimizzato
`SlotGrid` usa Timer 20s invece di polling continuo:
- Bilancia aggiornamenti real-time con carico server
- Utente può forzare refresh con pull-to-refresh (da implementare)

### Lock TTL
300 secondi (5 minuti) è ottimale per:
- ✅ Dare tempo all'utente di completare form
- ✅ Minimizzare slot "fantasma" bloccati
- ✅ Evitare race condition

---

## 🎓 Note Architetturali

### Perché ApiClient separato?
- **Bearer Token:** Gestione centralizzata Firebase Auth
- **ETag Caching:** Implementato una volta, usato ovunque
- **Error Handling:** Pattern consistente per tutte le API

### Perché Lock TTL invece di Transazioni?
- **Semplicità:** No coordinatore distribuito (Redis)
- **Auto-cleanup:** Firestore TTL elimina lock automaticamente
- **Low Latency:** Single read/write operation
- **Cost-Effective:** No infrastruttura aggiuntiva

### Perché Coupon Statici?
- **MVP Speed:** No admin UI necessaria
- **Predictable:** Marketing usa codici fissi
- **Zero Query Cost:** Validazione in-memory
- **Migrabile:** Facile switch a DB-driven dopo

---

## 📝 TODO: Integrazioni Future

- [ ] Aggiungere pull-to-refresh in SlotGrid
- [ ] Implementare notifiche push per booking confermati
- [ ] Cache locale slot con Hive per offline-first
- [ ] Analytics tracking (lock creati, coupon applicati, etc.)
- [ ] A/B testing per countdown UI (progress bar vs timer)
- [ ] Deep linking per approval URLs PayPal
- [ ] Widget test per tutti i componenti

---

## 🔗 Link Utili

- **Backend API Docs:** https://YOUR_BACKEND_URL/api-docs
- **Firestore Console:** https://console.firebase.google.com/project/YOUR_PROJECT/firestore
- **PayPal Dashboard:** https://developer.paypal.com/dashboard
- **Stripe Dashboard:** https://dashboard.stripe.com

---

**Data Creazione:** 2025-01-XX  
**Versione Flutter:** 3.35.4  
**Versione Dart:** 3.9.2  
**Backend Compatibility:** v4.2.0+
