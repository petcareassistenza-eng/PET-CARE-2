# maxAdvanceDays Feature - Limiting Booking Horizon

## 🎯 Obiettivo

Limitare quanto lontano nel futuro gli utenti possono prenotare servizi. Questo previene:
- Prenotazioni troppo lontane nel futuro
- Sovraccarico calendario con slot non realistici
- Problemi di pianificazione a lungo termine

---

## 📊 Schema Calendar Meta Config

### Campo maxAdvanceDays

**Path**: `calendars/{proId}/meta/config`

```typescript
{
  stepMin: 60,
  timezone: "Europe/Rome",
  maxAdvanceDays: 60,  // ✅ NUOVO CAMPO
  weeklySchedule: { ... },
  exceptions: { ... }
}
```

**Tipo**: `number`  
**Default**: `60` (se non specificato)  
**Unità**: giorni  
**Esempio valori**:
- `30` - Permetti prenotazioni fino a 1 mese avanti
- `60` - Permetti prenotazioni fino a 2 mesi avanti (default)
- `90` - Permetti prenotazioni fino a 3 mesi avanti
- `365` - Permetti prenotazioni fino a 1 anno avanti

---

## 🔧 Implementazione Backend

### Availability Endpoint Logic

**File**: `backend/src/routes/availability_iso.routes.ts`

```typescript
// 1. Read maxAdvanceDays from calendar meta
const maxAdvanceDays = meta.maxAdvanceDays ?? 60; // Default 60 days

// 2. Calculate max booking date
const nowMs = Date.now();
const maxBookingDateMs = nowMs + (maxAdvanceDays * 86400000); // Convert days to ms

// 3. Filter candidate slots
const filteredSlots = candidateSlots.filter(slot => {
  const slotFromMs = new Date(slot.from).getTime();
  return slotFromMs <= maxBookingDateMs;
});

// 4. Log filtering results
logger.info({ 
  candidateSlots: candidateSlots.length,
  filteredSlots: filteredSlots.length,
  maxAdvanceDays,
}, 'Slots filtered by maxAdvanceDays');

// 5. Use filtered slots for overlap detection
const freeSlots = filteredSlots.filter(slot => {
  // ... overlap logic with bookings and locks
});
```

---

## 📅 Esempi Pratici

### Esempio 1: Prenotazioni fino a 30 giorni

```javascript
// Calendar config
{
  maxAdvanceDays: 30
}

// Today: 2025-11-10
// Request: GET /api/pros/pro_123/availability?date=2025-12-15
// 2025-12-15 is 35 days away → Ritorna slots: []

// Request: GET /api/pros/pro_123/availability?date=2025-12-05
// 2025-12-05 is 25 days away → Ritorna slots normalmente
```

### Esempio 2: Prenotazioni fino a 90 giorni

```javascript
// Calendar config
{
  maxAdvanceDays: 90
}

// Today: 2025-11-10
// Request: GET /api/pros/pro_123/availability?date=2026-01-20
// 2026-01-20 is 71 days away → Ritorna slots normalmente

// Request: GET /api/pros/pro_123/availability?date=2026-02-20
// 2026-02-20 is 102 days away → Ritorna slots: []
```

### Esempio 3: Nessun limite (valore alto)

```javascript
// Calendar config
{
  maxAdvanceDays: 365
}

// Today: 2025-11-10
// Request: GET /api/pros/pro_123/availability?date=2026-11-01
// 2026-11-01 is 356 days away → Ritorna slots normalmente
```

---

## 🧪 Testing

### Test Case 1: Data entro limite

```bash
# Setup
curl -X PUT "https://firestore.googleapis.com/calendars/pro_123/meta/config" \
  -d '{"maxAdvanceDays": 30}'

# Test (oggi + 20 giorni)
DATE=$(date -d "+20 days" +%Y-%m-%d)
curl "http://localhost:8080/api/pros/pro_123/availability?date=$DATE" | jq

# Expected: slots array non vuoto
```

### Test Case 2: Data oltre limite

```bash
# Setup (stesso di sopra)

# Test (oggi + 40 giorni)
DATE=$(date -d "+40 days" +%Y-%m-%d)
curl "http://localhost:8080/api/pros/pro_123/availability?date=$DATE" | jq

# Expected: slots array vuoto []
```

### Test Case 3: Data esattamente al limite

```bash
# Setup
curl -X PUT "https://firestore.googleapis.com/calendars/pro_123/meta/config" \
  -d '{"maxAdvanceDays": 30}'

# Test (oggi + 30 giorni esatti)
DATE=$(date -d "+30 days" +%Y-%m-%d)
curl "http://localhost:8080/api/pros/pro_123/availability?date=$DATE" | jq

# Expected: slots ritornati (≤ è incluso)
```

### Test Case 4: Default value (60 giorni)

```bash
# Setup - NON specificare maxAdvanceDays
curl -X PUT "https://firestore.googleapis.com/calendars/pro_123/meta/config" \
  -d '{"stepMin": 60, "timezone": "Europe/Rome"}'

# Test (oggi + 70 giorni)
DATE=$(date -d "+70 days" +%Y-%m-%d)
curl "http://localhost:8080/api/pros/pro_123/availability?date=$DATE" | jq

# Expected: slots array vuoto [] (oltre default 60 giorni)
```

---

## 📱 Flutter UI Integration

### Display Booking Horizon

```dart
class ProDetailPage extends StatelessWidget {
  final Pro pro;

  Widget _buildBookingHorizon() {
    final maxDays = pro.calendar?.maxAdvanceDays ?? 60;
    final maxDate = DateTime.now().add(Duration(days: maxDays));
    final formatter = DateFormat('dd/MM/yyyy');

    return Card(
      child: ListTile(
        leading: Icon(Icons.calendar_month),
        title: Text('Prenotabile fino a'),
        subtitle: Text(formatter.format(maxDate)),
        trailing: Text('$maxDays giorni'),
      ),
    );
  }
}
```

### Date Picker Constraint

```dart
Future<DateTime?> _selectDate(BuildContext context, Pro pro) async {
  final maxDays = pro.calendar?.maxAdvanceDays ?? 60;
  final now = DateTime.now();
  final maxDate = now.add(Duration(days: maxDays));

  return showDatePicker(
    context: context,
    initialDate: now,
    firstDate: now,
    lastDate: maxDate,  // ✅ Constraint basato su maxAdvanceDays
    helpText: 'Seleziona data (fino a $maxDays giorni)',
  );
}
```

---

## 🔍 Monitoring & Logs

### Log Output Example

```json
{
  "level": "info",
  "message": "Slots filtered by maxAdvanceDays",
  "candidateSlots": 18,
  "filteredSlots": 12,
  "maxAdvanceDays": 60,
  "proId": "pro_123",
  "date": "2025-12-25"
}
```

### Metrics to Track

```typescript
// Prometheus metrics (se implementato)
availability_max_advance_days_filter_count{proId="pro_123"} 6
availability_requests_beyond_horizon{proId="pro_123"} 3
```

---

## 📋 Best Practices

### Valori Raccomandati

| Tipo Servizio | maxAdvanceDays Raccomandato |
|---------------|------------------------------|
| Veterinario | 30-60 giorni |
| Pet Sitting | 60-90 giorni |
| Grooming | 30-45 giorni |
| Pet Hotel | 90-180 giorni |
| Training | 60-90 giorni |

### Considerazioni

1. **Troppo basso** (< 30 giorni)
   - ❌ Limita flessibilità utenti
   - ❌ Può perdere prenotazioni pianificate

2. **Bilanciato** (30-90 giorni)
   - ✅ Buon compromesso flessibilità/pianificazione
   - ✅ Gestibile per PRO

3. **Troppo alto** (> 180 giorni)
   - ❌ Difficile pianificazione PRO
   - ❌ Alta probabilità cancellazioni
   - ❌ Calendario sovraccarico

---

## 🔗 Relazione con Altri Features

### Compatibilità

✅ **Compatibile con**:
- `minAdvanceMs` (minimum lead time)
- `exceptions` (date speciali)
- `weeklySchedule` (orari settimanali)
- Lock system (slot holds)

❌ **Non compatibile con**:
- Niente (feature indipendente)

### Order of Operations

```
1. Generate candidate slots (weeklySchedule + exceptions)
2. Apply maxAdvanceDays filter  ← QUESTO STEP
3. Load bookings and locks
4. Filter overlaps
5. Return free slots
```

---

## 🚀 Deployment

### Firestore Update

```javascript
// Via Firebase Console o script
const calendarRef = db.collection('calendars').doc(proId).collection('meta').doc('config');
await calendarRef.update({
  maxAdvanceDays: 60
});
```

### Rollout Strategy

1. **Phase 1**: Deploy backend code (default 60 giorni)
2. **Phase 2**: Test con alcuni PRO beta
3. **Phase 3**: Configure maxAdvanceDays per tutti i PRO
4. **Phase 4**: UI Flutter per mostrare horizon

---

## ✅ Checklist Implementazione

- [x] **Backend logic** implementata
- [x] **Default value** (60 giorni) configurato
- [x] **Logging** con dettagli filtro
- [ ] **Firestore Rules** validation (optional)
- [ ] **Flutter UI** per display horizon
- [ ] **Admin panel** per configurare maxAdvanceDays
- [ ] **Documentation** completa
- [ ] **Testing** con date edge cases

---

## 📞 Support

**Questions**: Consulta `AVAILABILITY_DEPLOYMENT_GUIDE.md`  
**Issues**: GitHub Issues  
**Config Help**: Firebase Console → Firestore → `calendars/{proId}/meta/config`

---

**Version**: 1.0  
**Date**: 2025-11-10  
**Feature Status**: ✅ IMPLEMENTED  
**Default Value**: 60 days
