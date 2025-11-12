# Availability System - Quick Reference

## 🚀 Deploy Comandi Rapidi

```bash
# 1. Deploy Cloud Function cleanup locks (ogni 15 minuti)
cd backend/functions
firebase deploy --only functions:cleanupExpiredLocks

# 2. Deploy Firestore Rules
firebase deploy --only firestore:rules

# 3. Deploy Firestore Indexes
firebase deploy --only firestore:indexes

# 4. Avvia backend Express
cd backend
npm run dev

# 5. Test endpoint
./test-availability.sh http://localhost:8080
```

---

## 📡 API Endpoint

**GET** `/api/pros/:proId/availability?date=YYYY-MM-DD`

**Response:**
```json
{
  "date": "2025-11-20",
  "stepMin": 60,
  "timezone": "Europe/Rome",
  "slots": [
    { "from": "2025-11-20T08:00:00.000Z", "to": "2025-11-20T09:00:00.000Z" }
  ]
}
```

**Query params:**
- `date` (required): YYYY-MM-DD format

---

## 🗂️ Firestore Schema Reference

### Calendar Meta Config
**Path**: `calendars/{proId}/meta/config`

```json
{
  "stepMin": 60,
  "timezone": "Europe/Rome",
  "weeklySchedule": {
    "0": [],
    "1": [{ "start": "09:00", "end": "18:00" }],
    "2": [{ "start": "09:00", "end": "18:00" }]
  },
  "exceptions": {
    "2025-12-25": []
  }
}
```

### Lock
**Path**: `calendars/{proId}/locks/{lockId}`

```json
{
  "userId": "user_abc",
  "proId": "pro_123",
  "slotStart": 1700470800000,
  "slotEnd": 1700474400000,
  "ttl": 1700471100000,
  "createdAt": "Timestamp"
}
```

**TTL**: 5 minuti (300000 ms)

### Booking
**Path**: `bookings/{bookingId}`

```json
{
  "proId": "pro_123",
  "userId": "user_abc",
  "start": "Timestamp",
  "end": "Timestamp",
  "status": "pending|confirmed|cancelled"
}
```

---

## 📋 Indici Firestore Necessari

```json
{
  "indexes": [
    {
      "collectionGroup": "locks",
      "fields": [
        { "fieldPath": "ttl", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "locks",
      "fields": [
        { "fieldPath": "ttl", "order": "ASCENDING" },
        { "fieldPath": "slotStart", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "fields": [
        { "fieldPath": "proId", "order": "ASCENDING" },
        { "fieldPath": "start", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 🧪 Test Quick Commands

```bash
# Test 1: Basic availability
curl "http://localhost:8080/api/pros/test-pro-001/availability?date=2025-11-20" | jq

# Test 2: Health check
curl "http://localhost:8080/health" | jq

# Test 3: Create test calendar
cd backend
node scripts/create-test-calendar.js

# Test 4: Check expired locks
firebase firestore:query calendars/*/locks --where ttl '<' $(date +%s)000
```

---

## 🐛 Debug Common Issues

### Endpoint ritorna 404
```javascript
// Verifica calendar config exists
const metaRef = db.collection('calendars').doc(proId).collection('meta').doc('config');
const snap = await metaRef.get();
console.log('Calendar exists:', snap.exists);
```

### Slot non filtrati correttamente
```javascript
// Check bookings e locks
const bookings = await db.collection('bookings')
  .where('proId', '==', proId)
  .where('start', '>=', dayStart)
  .get();
console.log('Active bookings:', bookings.size);

const locks = await db.collection('calendars').doc(proId).collection('locks')
  .where('ttl', '>', Date.now())
  .get();
console.log('Active locks:', locks.size);
```

### Cloud Function non elimina locks
```bash
# Check logs
firebase functions:log --only cleanupExpiredLocks

# Test manuale query
firebase firestore:query 'calendars/*/locks' --where 'ttl' '<' $(date +%s)000 --limit 10
```

---

## 📱 Flutter Integration

**Service:**
```dart
final api = AvailabilityService('http://localhost:8080');
final slots = await api.fetchSlots(
  proId: 'pro_123',
  date: DateTime(2025, 11, 20),
);
```

**Widget:**
```dart
SlotGrid(
  proId: pro.id,
  date: selectedDate,
  api: api,
  onSelect: (from, to) {
    print('Selected: $from - $to');
  },
)
```

---

## 🔐 Firestore Rules Summary

**Locks:**
- Read: Auth users (conflict checking)
- Create/Update: Auth users con validazione TTL
- Delete: Auth users o Admin
- Backend bypassa rules (Admin SDK)

**Bookings:**
- Read: Owner, PRO, Admin
- Create: **SOLO backend** (client must use API)
- Update: Limitato a campi specifici
- Delete: Admin only

---

## 📊 Monitoring Quick Check

```bash
# Cloud Function status
gcloud functions describe cleanupExpiredLocks --region=europe-west1

# Backend health
curl https://api.mypetcare.it/health

# Firestore lock count
firebase firestore:query 'calendars/*/locks' --limit 100 | wc -l

# Today's bookings
firebase firestore:query 'bookings' --where 'start' '>=' $(date -I) --limit 50
```

---

## 🔄 Workflow Booking User

1. **User seleziona slot** → `onSelect(from, to)` callback
2. **Crea lock** → `POST /api/locks` (5 min TTL)
3. **Naviga checkout** → Mostra countdown timer
4. **Conferma booking** → `POST /api/bookings` (consuma lock)
5. **Payment** → Stripe/PayPal integration
6. **Status → confirmed** → Lock eliminato automaticamente

---

## 📅 Cron Schedule

**cleanupExpiredLocks:**
- Frequenza: Ogni 15 minuti
- Timezone: Europe/Rome
- Query: `ttl < now`, limit 500
- Action: Batch delete expired locks

---

## 🚧 Future Features Roadmap

- [ ] `minAdvanceMs` - Prevent last-minute bookings
- [ ] `maxAdvanceDays` - Limit booking horizon
- [ ] `dailyCap` - Daily booking limit per PRO
- [ ] `paddingMin` - Buffer time between slots
- [ ] Multi-service support (different durations)
- [ ] Recurring availability patterns
- [ ] Break time management

---

**Version**: 1.0  
**Last Updated**: 2025-11-10

Per documentazione completa: `AVAILABILITY_DEPLOYMENT_GUIDE.md`
