# MY PET CARE - Availability System Deployment Guide

## 📋 Panoramica Sistema

Questo documento descrive il sistema di disponibilità completo implementato per MY PET CARE, che include:

1. **Cloud Function Cron** - Pulizia automatica locks scaduti ogni 15 minuti
2. **Availability API Endpoint** - REST API per ottenere slot disponibili in formato ISO
3. **Firestore Rules** - Regole di sicurezza per locks e bookings
4. **Firestore Indexes** - Indici compositi per query performance
5. **Flutter Integration** - Service e Widget per l'interfaccia utente

---

## 🚀 Quick Start

### 1. Deploy Cloud Functions

```bash
cd backend/functions
npm install
firebase deploy --only functions:cleanupExpiredLocks
```

**Cosa fa:**
- Elimina locks con `ttl < now` ogni 15 minuti
- Timezone: Europe/Rome
- Limite: 500 locks per batch per sicurezza
- Logs: Cloud Functions logs in Firebase Console

### 2. Deploy Firestore Rules

```bash
cd /path/to/project/root
firebase deploy --only firestore:rules
```

**Regole chiave implementate:**
- **Bookings**: Solo il backend può crearli (via Admin SDK)
- **Locks**: Client può leggere (conflict checking), creare con validazione TTL
- **Admin SDK bypassa tutte le rules** (operazioni backend)

### 3. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

**Indici necessari:**
```json
{
  "locks": [
    { "fields": ["ttl"] },
    { "fields": ["ttl", "slotStart"] }
  ],
  "bookings": [
    { "fields": ["proId", "start"] }
  ]
}
```

### 4. Avvia Backend Express

```bash
cd backend
npm run dev
```

**Endpoint disponibile:**
```
GET http://localhost:8080/api/pros/:proId/availability?date=YYYY-MM-DD
```

### 5. Test Availability Endpoint

```bash
cd backend
chmod +x test-availability.sh
./test-availability.sh http://localhost:8080
```

---

## 📚 Architettura Sistema

### Availability Endpoint Flow

```
Client Request
   ↓
GET /api/pros/:proId/availability?date=2025-11-20
   ↓
Backend legge:
   1. calendars/{proId}/meta/config → stepMin, timezone, weeklySchedule, exceptions
   2. bookings (status ≠ cancelled, proId, start >= dayStart, start <= dayEnd)
   3. calendars/{proId}/locks (ttl > now)
   ↓
Backend calcola:
   1. Determina day-of-week (0=Domenica, 1=Lunedì, ...)
   2. Carica finestre orarie da exceptions[date] o weeklySchedule[dow]
   3. Genera slot candidati con stepMin
   4. Filtra overlap con bookings attivi
   5. Filtra overlap con locks attivi
   ↓
Response JSON:
{
  "date": "2025-11-20",
  "stepMin": 60,
  "timezone": "Europe/Rome",
  "slots": [
    { "from": "2025-11-20T08:00:00.000Z", "to": "2025-11-20T09:00:00.000Z" },
    { "from": "2025-11-20T09:00:00.000Z", "to": "2025-11-20T10:00:00.000Z" }
  ]
}
```

### Calendar Schema

**Path**: `calendars/{proId}/meta/config`

```json
{
  "stepMin": 60,
  "timezone": "Europe/Rome",
  "weeklySchedule": {
    "0": [],  // Domenica - chiuso
    "1": [    // Lunedì
      { "start": "09:00", "end": "13:00" },
      { "start": "14:00", "end": "18:00" }
    ],
    "2": [...],  // Martedì
    "3": [...],  // Mercoledì
    "4": [...],  // Giovedì
    "5": [...],  // Venerdì
    "6": []      // Sabato - chiuso
  },
  "exceptions": {
    "2025-12-25": [],  // Natale - chiuso
    "2025-12-26": [    // Santo Stefano - orario ridotto
      { "start": "10:00", "end": "14:00" }
    ]
  }
}
```

### Lock Schema

**Path**: `calendars/{proId}/locks/{lockId}`

```json
{
  "userId": "user_abc",
  "proId": "pro_123",
  "slotStart": 1700470800000,  // Timestamp milliseconds
  "slotEnd": 1700474400000,    // Timestamp milliseconds
  "ttl": 1700471100000,        // now + 5 minuti
  "createdAt": "Firestore Timestamp"
}
```

**TTL Policy**: 5 minuti (300000 ms)

### Booking Schema (Relevant Fields)

**Path**: `bookings/{bookingId}`

```json
{
  "proId": "pro_123",
  "userId": "user_abc",
  "start": "Firestore Timestamp",
  "end": "Firestore Timestamp",
  "status": "pending|confirmed|cancelled|completed",
  "createdAt": "Firestore Timestamp"
}
```

---

## 🧪 Testing Guide

### Test 1: Creare Calendar di Test

```bash
cd backend
node scripts/create-test-calendar.js
```

Questo crea un calendario di esempio con:
- PRO ID: `test-pro-001`
- Orari: Lun-Ven 09:00-18:00
- StepMin: 60

### Test 2: Chiamata API Base

```bash
curl "http://localhost:8080/api/pros/test-pro-001/availability?date=2025-11-20" | jq
```

**Response attesa:**
```json
{
  "date": "2025-11-20",
  "stepMin": 60,
  "timezone": "Europe/Rome",
  "slots": [
    { "from": "2025-11-20T08:00:00.000Z", "to": "2025-11-20T09:00:00.000Z" },
    { "from": "2025-11-20T09:00:00.000Z", "to": "2025-11-20T10:00:00.000Z" }
    // ... altri slot
  ]
}
```

### Test 3: Flutter Integration Test

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_pet_care/services/availability_service_iso.dart';

void main() {
  test('fetchSlots returns ISO format', () async {
    final api = AvailabilityService('http://localhost:8080');
    
    final slots = await api.fetchSlots(
      proId: 'test-pro-001',
      date: DateTime(2025, 11, 20),
    );
    
    expect(slots, isNotEmpty);
    expect(slots.first['from'], contains('T'));  // ISO format
    expect(slots.first['to'], contains('Z'));    // UTC timezone
  });
}
```

---

## 🔐 Firestore Rules Breakdown

### Locks Rules

```javascript
match /calendars/{proId}/locks/{lockId} {
  // Client può leggere per conflict checking
  allow read: if isAuth();
  
  // Client può creare/update con validazione
  allow create, update: if isAuth() && 
    request.resource.data.ttl is int &&
    request.resource.data.ttl > request.time.toMillis() &&
    request.resource.data.slotStart is int &&
    request.resource.data.slotEnd is int &&
    request.resource.data.slotEnd > request.resource.data.slotStart;
  
  // Client può cancellare propri lock
  allow delete: if isAuth() || isAdmin();
}
```

**Rationale:**
- Client legge locks per evitare conflitti UI
- Backend usa Admin SDK (bypassa rules) per operazioni batch
- TTL validation previene locks infiniti

### Bookings Rules

```javascript
match /bookings/{bookingId} {
  // Read: owner, pro, admin
  allow read: if isOwner(resource.data.userId) || 
                 isOwner(resource.data.proId) || 
                 isAdmin();
  
  // Create: SOLO backend (Admin SDK)
  allow create: if false;
  
  // Update: limitato a campi specifici
  allow update: if (isOwner(resource.data.userId) && 
                    !request.resource.data.diff(resource.data).affectedKeys()
                      .hasAny(['proId', 'price', 'appFee'])) ||
                   isOwner(resource.data.proId) || 
                   isAdmin();
}
```

**Rationale:**
- Booking creation richiede validazione complessa (pricing, availability)
- Solo backend può creare bookings via API `/bookings` POST
- Client può fare update limitati (es. cancellation request)

---

## 📊 Firestore Indexes Explained

### Index 1: Locks Cleanup (Cron)

```json
{
  "collectionGroup": "locks",
  "fields": [
    { "fieldPath": "ttl", "order": "ASCENDING" }
  ]
}
```

**Query supportata:**
```javascript
locksRef.where('ttl', '<', Date.now()).limit(500)
```

### Index 2: Locks with Slot Range

```json
{
  "collectionGroup": "locks",
  "fields": [
    { "fieldPath": "ttl", "order": "ASCENDING" },
    { "fieldPath": "slotStart", "order": "ASCENDING" }
  ]
}
```

**Query supportata:**
```javascript
locksRef
  .where('ttl', '>', Date.now())
  .where('slotStart', '>=', dayStart)
  .where('slotStart', '<=', dayEnd)
```

### Index 3: Bookings by PRO and Start Time

```json
{
  "collectionGroup": "bookings",
  "fields": [
    { "fieldPath": "proId", "order": "ASCENDING" },
    { "fieldPath": "start", "order": "ASCENDING" }
  ]
}
```

**Query supportata:**
```javascript
db.collection('bookings')
  .where('proId', '==', proId)
  .where('start', '>=', dayStart)
  .where('start', '<=', dayEnd)
```

---

## 🛠️ Troubleshooting

### Problema: Endpoint ritorna 404 "Calendar not found"

**Causa**: Calendar meta config non esiste in Firestore

**Soluzione:**
```javascript
// Crea manualmente in Firebase Console o via script
const metaRef = db.collection('calendars').doc(proId).collection('meta').doc('config');
await metaRef.set({
  stepMin: 60,
  timezone: 'Europe/Rome',
  weeklySchedule: { /* ... */ },
  exceptions: {}
});
```

### Problema: Slot non vengono filtrati correttamente

**Debug:**
1. Verifica bookings status in Firestore
2. Check locks con ttl validi
3. Abilita logger backend:
   ```javascript
   logger.info({ activeBookings, activeLocks }, 'Occupied intervals');
   ```

### Problema: Cloud Function non elimina locks

**Debug:**
1. Check Cloud Functions logs: `firebase functions:log`
2. Verifica timezone: `Europe/Rome`
3. Test manuale query:
   ```javascript
   const expired = await locksRef.where('ttl', '<', Date.now()).get();
   console.log('Expired locks:', expired.size);
   ```

### Problema: Flutter widget mostra error state

**Debug:**
1. Check network connectivity
2. Verifica BASE_URL configurato in `config.dart`
3. Test endpoint con curl:
   ```bash
   curl "http://localhost:8080/api/pros/PRO_ID/availability?date=2025-11-20"
   ```
4. Check CORS headers se errore 0:
   ```typescript
   // backend/src/index.ts
   app.use(cors({
     origin: [/localhost/, /mypetcare\./],
     credentials: true
   }));
   ```

---

## 🔄 Workflow Booking Completo

### Step 1: User seleziona slot

```dart
SlotGrid(
  proId: pro.id,
  date: selectedDate,
  api: AvailabilityService(Env.apiBaseUrl),
  onSelect: (from, to) async {
    // Crea lock per 5 minuti
    await _createLock(from, to);
    // Naviga a checkout
    Navigator.push(...);
  },
)
```

### Step 2: Crea Lock (POST API)

```typescript
POST /api/locks
Body: {
  "proId": "pro_123",
  "slotStart": "2025-11-20T09:00:00.000Z",
  "slotEnd": "2025-11-20T10:00:00.000Z"
}

Response: { "lockId": "lock_abc", "ttl": 1700471100000 }
```

### Step 3: Checkout con Timer

```dart
CountdownTimer(
  duration: Duration(minutes: 5),
  onExpired: () => Navigator.pop(), // Torna indietro se scade
)
```

### Step 4: Conferma Booking (POST API)

```typescript
POST /api/bookings
Body: {
  "proId": "pro_123",
  "serviceId": "service_xyz",
  "start": "2025-11-20T09:00:00.000Z",
  "end": "2025-11-20T10:00:00.000Z",
  "lockId": "lock_abc"  // Lock da consumare
}

Backend:
1. Verifica lock esiste e non scaduto
2. Crea booking con status "pending"
3. Elimina lock
4. Ritorna bookingId per payment
```

---

## 📅 Manutenzione e Monitoraggio

### Cloud Functions Monitoring

**Firebase Console → Functions → cleanupExpiredLocks**

Metriche da monitorare:
- **Invocations/min**: ~0.067 (ogni 15 minuti)
- **Execution time**: < 5s
- **Error rate**: < 1%
- **Deleted locks count**: Check logs

**Query utili:**
```sql
-- Cloud Logging
resource.type="cloud_function"
resource.labels.function_name="cleanupExpiredLocks"
severity="INFO"
```

### Backend API Monitoring

**Endpoint health check:**
```bash
curl http://localhost:8080/health
```

**Prometheus metrics (se implementate):**
- `availability_requests_total`
- `availability_request_duration_seconds`
- `slots_returned_count`

### Database Health

**Query di controllo:**

```javascript
// Lock scaduti rimasti (dovrebbe essere ~0)
const stale = await db.collectionGroup('locks')
  .where('ttl', '<', Date.now())
  .get();
console.log('Stale locks:', stale.size);

// Bookings per status
const statusCounts = {};
const bookings = await db.collection('bookings').get();
bookings.forEach(doc => {
  const status = doc.data().status;
  statusCounts[status] = (statusCounts[status] || 0) + 1;
});
console.log('Bookings by status:', statusCounts);
```

---

## 🚧 Future Enhancements

### 1. Minimum Lead Time

Previeni prenotazioni last-minute:

```typescript
// backend/src/routes/availability_iso.routes.ts
const minLeadTimeMs = meta.minAdvanceMs || 3600000; // Default 1h
const earliestSlotMs = Date.now() + minLeadTimeMs;

const freeSlots = candidateSlots.filter(slot => {
  const slotFromMs = new Date(slot.from).getTime();
  return slotFromMs >= earliestSlotMs && !isOccupied(slot);
});
```

### 2. Max Advance Days

Limita quanto avanti si può prenotare:

```typescript
const maxAdvanceDays = meta.maxAdvanceDays || 60;
const maxSlotMs = Date.now() + (maxAdvanceDays * 86400000);

const freeSlots = candidateSlots.filter(slot => {
  const slotFromMs = new Date(slot.from).getTime();
  return slotFromMs <= maxSlotMs && !isOccupied(slot);
});
```

### 3. Daily Booking Cap

Limite prenotazioni per giorno:

```typescript
// Check bookings count for the day
const dayBookings = await db.collection('bookings')
  .where('proId', '==', proId)
  .where('start', '>=', dayStart)
  .where('start', '<=', dayEnd)
  .where('status', 'in', ['confirmed', 'pending'])
  .get();

const dailyCap = meta.dailyCap || 10;
if (dayBookings.size >= dailyCap) {
  return res.json({ date, stepMin, timezone, slots: [] });
}
```

### 4. Slot Padding

Buffer time tra appuntamenti:

```typescript
const paddingMin = meta.paddingMin || 15;

// When checking overlap, add padding
const slotWithPaddingStart = slotFromMs - (paddingMin * 60000);
const slotWithPaddingEnd = slotToMs + (paddingMin * 60000);

const hasOverlap = occupied.some(occ => {
  return !(slotWithPaddingEnd <= occFromMs || slotWithPaddingStart >= occToMs);
});
```

---

## 📞 Support

Per problemi o domande:

1. **Backend Issues**: Check logs con `npm run dev`
2. **Cloud Functions Issues**: `firebase functions:log`
3. **Firestore Rules**: Firebase Console → Firestore → Rules
4. **Flutter Issues**: `flutter run` e check console

**Log Levels:**
- `logger.info()` - Info normale
- `logger.warn()` - Warning (CORS blocks, rate limits)
- `logger.error()` - Errori critici

---

## ✅ Deployment Checklist

Prima di andare in produzione:

- [ ] Cloud Function `cleanupExpiredLocks` deployata
- [ ] Firestore Rules deployate e testate
- [ ] Firestore Indexes creati (verifica in Console)
- [ ] Backend Express deployato su Cloud Run/App Engine
- [ ] Environment variables configurate (.env production)
- [ ] Test endpoint availability con curl
- [ ] Test Flutter widget in staging
- [ ] Monitoring setup (Cloud Logging)
- [ ] Alert setup per errori Cloud Functions
- [ ] Performance budget check (< 500ms p95)
- [ ] Load testing (100 concurrent users)

**Production URLs:**
- Backend API: `https://api.mypetcare.it`
- Flutter Web: `https://app.mypetcare.it`

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-10  
**Author**: MY PET CARE Development Team
