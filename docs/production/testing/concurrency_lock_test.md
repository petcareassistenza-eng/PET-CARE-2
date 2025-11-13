# 🔒 Concurrency Lock Test - My Pet Care

## Obiettivo
Verificare che il sistema di lock temporanei (TTL 300 secondi) funzioni correttamente in caso di accesso concorrente da più utenti allo stesso slot.

---

## 📋 Test Scenario

### Setup
- **2 browser/dispositivi:** Browser A e Browser B
- **Stesso PRO:** Accesso alla stessa scheda professionista
- **Stesso slot:** Entrambi tentano di prenotare lo stesso orario

### Expected Behavior
1. **User A** clicca su uno slot disponibile
2. Sistema crea un **lock temporaneo** (TTL 300 secondi = 5 minuti)
3. **User A** visualizza banner: "Slot bloccato... scade in mm:ss"
4. **User B** vede lo stesso slot come **"locked"** (non cliccabile)
5. Se **User A** non conferma entro 5 minuti, lock scade → slot torna **free**
6. Se **User A** conferma, slot diventa **booked** (permanente)

---

## 🧪 Test Cases

### Test Case 1: Basic Lock Creation

**Steps:**
1. Open **Browser A** → Navigate to PRO booking page
2. Click on available slot (e.g., "09:00 - 09:30")
3. Verify lock banner appears: "Slot bloccato... scade in 04:59"
4. Open **Browser B** → Navigate to same PRO booking page
5. Verify same slot shows as **locked** (greyed out, not clickable)

**Expected Result:**
- ✅ Browser A: Lock created, countdown timer visible
- ✅ Browser B: Slot visible as locked, cannot click
- ✅ Firestore: `calendars/{proId}/locks/{lockId}` document created with TTL

**Verification:**
```bash
# Check Firestore locks collection
# Expected: 1 lock document with expiresAt timestamp
```

---

### Test Case 2: Lock Expiration (TTL)

**Steps:**
1. **Browser A** creates lock on slot "09:00 - 09:30"
2. Wait **5 minutes** without confirming booking
3. Observe countdown timer: "04:59" → "00:01" → "00:00"
4. Verify lock expires and slot returns to **free** state
5. **Browser B** refreshes page
6. Verify slot is now **available** again

**Expected Result:**
- ✅ Lock expires after 5 minutes
- ✅ Slot returns to free state
- ✅ Both browsers can now click the slot
- ✅ Firestore: Lock document auto-deleted by TTL

**Verification:**
```bash
# Check Firestore locks collection after 5 minutes
# Expected: Lock document no longer exists (TTL cleanup)
```

---

### Test Case 3: Lock to Booking Conversion

**Steps:**
1. **Browser A** creates lock on slot "09:00 - 09:30"
2. **Browser A** fills booking form (name, service, notes)
3. **Browser A** clicks "Conferma Prenotazione"
4. Verify booking created successfully
5. **Browser B** refreshes page
6. Verify slot is now **booked** (not visible in available slots)

**Expected Result:**
- ✅ Lock converted to permanent booking
- ✅ Slot removed from availability
- ✅ Browser B cannot see slot anymore
- ✅ Firestore: Lock deleted, booking document created

**Verification:**
```bash
# Check Firestore collections
# Expected: 
# - locks/{lockId} → DELETED
# - bookings/{bookingId} → CREATED
# - calendars/{proId}/bookings/{date} → slot marked as booked
```

---

### Test Case 4: Concurrent Lock Attempts (Race Condition)

**Steps:**
1. Open **Browser A** and **Browser B** side-by-side
2. Both browsers navigate to same PRO booking page
3. **Simultaneously** click same slot "09:00 - 09:30"
4. Observe which browser wins the lock

**Expected Result:**
- ✅ **One browser** gets the lock (first to reach backend)
- ✅ **Other browser** shows error: "Slot già bloccato da un altro utente"
- ✅ Only 1 lock document created in Firestore

**Verification:**
```bash
# Check Firestore locks collection
# Expected: Only 1 lock document exists
# Backend logs should show:
# - First request: Lock created
# - Second request: Lock creation failed (conflict)
```

---

### Test Case 5: Lock Refresh (User Navigates Away)

**Steps:**
1. **Browser A** creates lock on slot "09:00 - 09:30"
2. **Browser A** navigates away (closes tab, goes to another page)
3. Wait **5 minutes** for lock to expire
4. **Browser B** refreshes page
5. Verify slot becomes available

**Expected Result:**
- ✅ Lock expires even if user doesn't cancel explicitly
- ✅ No "orphaned" locks remain indefinitely
- ✅ Firestore TTL cleanup works correctly

---

### Test Case 6: Multiple Slots Lock (Same User)

**Steps:**
1. **Browser A** creates lock on slot "09:00 - 09:30"
2. **Browser A** tries to create second lock on "10:00 - 10:30"

**Expected Result:**
- ✅ **Option 1 (Strict):** System rejects second lock, shows error: "Hai già un altro slot bloccato"
- ✅ **Option 2 (Permissive):** System releases first lock, creates second lock

**Verification:**
```bash
# Check Firestore locks collection
# Expected: Maximum 1 lock per user per PRO (based on business rules)
```

---

## 🔧 Manual Testing Steps

### Using Browser DevTools

1. **Open Browser A:**
   ```
   - Navigate to: https://mypetcareapp.org/booking/{PRO_ID}
   - Open DevTools (F12) → Console tab
   - Monitor network requests for `/api/locks`
   ```

2. **Open Browser B:**
   ```
   - Navigate to same URL in Incognito/Private mode
   - Open DevTools → Console tab
   - Monitor lock status updates
   ```

3. **Execute Test:**
   ```
   - Browser A: Click slot → Observe lock creation
   - Browser B: Refresh → Observe slot locked state
   - Wait 5 minutes → Observe lock expiration
   ```

### Using API Directly (cURL)

```bash
# Test 1: Create lock (User A)
curl -X POST https://api.mypetcareapp.org/api/pros/PRO_123/locks \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-20",
    "start": "2025-11-20T09:00:00.000Z",
    "end": "2025-11-20T09:30:00.000Z",
    "ttlSec": 300
  }'

# Expected: {"lockId": "lock_abc123", "expiresAt": "..."}

# Test 2: Attempt concurrent lock (User B)
curl -X POST https://api.mypetcareapp.org/api/pros/PRO_123/locks \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-20",
    "start": "2025-11-20T09:00:00.000Z",
    "end": "2025-11-20T09:30:00.000Z",
    "ttlSec": 300
  }'

# Expected: {"error": "Slot already locked", "status": 409}

# Test 3: Wait 5 minutes, retry lock
# After TTL expires, curl command should succeed again
```

---

## 📊 Monitoring & Verification

### Firestore Console

Navigate to Firebase Console → Firestore:

```
calendars/
└── {proId}/
    └── locks/
        └── {lockId}
            - start: "2025-11-20T09:00:00.000Z"
            - end: "2025-11-20T09:30:00.000Z"
            - expiresAt: Timestamp (now + 300s)
            - userId: "user_abc123"
```

**Check:**
- Lock document appears when created
- `expiresAt` timestamp is ~5 minutes in future
- Lock document auto-deletes after TTL

### Backend Logs

Monitor Cloud Run logs for lock operations:

```bash
# View logs in real-time
gcloud logging tail --filter="resource.type=cloud_run_revision"

# Expected log entries:
# ✅ Lock created: proId={X}, slot={Y}, ttl=300s
# ⏰ Lock expired: lockId={Z} (after 5 minutes)
# ❌ Lock conflict: slot already locked by user {A}
```

---

## ✅ Success Criteria

**Test passes if ALL of the following are true:**

1. ✅ **Only 1 user can lock a slot at a time**
   - Concurrent requests result in conflict error for 2nd user

2. ✅ **Lock countdown timer displays correctly**
   - Shows remaining time in mm:ss format
   - Updates every second
   - Reaches 00:00 and expires

3. ✅ **Lock expires after 5 minutes**
   - Slot returns to "free" state
   - Other users can lock it again
   - Firestore document auto-deleted

4. ✅ **Lock converts to booking correctly**
   - Confirming booking deletes lock
   - Creates permanent booking record
   - Slot removed from availability

5. ✅ **No "orphaned" locks**
   - All locks expire or convert to bookings
   - No stale locks remain in Firestore

6. ✅ **Error messages are user-friendly**
   - "Slot già bloccato da un altro utente"
   - "Il tuo lock è scaduto, riprova"
   - No technical error codes shown to users

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: Lock doesn't expire after 5 minutes

**Possible Cause:** Firestore TTL not configured

**Solution:**
```bash
# Verify Firestore TTL field is set correctly
# Field: expiresAt (type: Timestamp)
# Enable Firestore TTL in Firebase Console
```

### Issue 2: Both users can lock same slot

**Possible Cause:** Race condition in backend

**Solution:**
```typescript
// Use Firestore transaction or atomic operations
await db.runTransaction(async (t) => {
  const lock = await t.get(lockRef);
  if (lock.exists) throw new Error('Slot already locked');
  t.set(lockRef, lockData);
});
```

### Issue 3: Lock countdown doesn't update

**Possible Cause:** Frontend timer not implemented

**Solution:**
```dart
// Implement countdown timer in Flutter
Timer.periodic(Duration(seconds: 1), (timer) {
  final remaining = expiresAt.difference(DateTime.now());
  if (remaining.isNegative) {
    timer.cancel();
    // Show "Lock expired" message
  }
  setState(() {
    timeRemaining = remaining;
  });
});
```

---

## 📝 Test Report Template

After completing tests, document results:

```markdown
## Concurrency Lock Test Report

**Test Date:** 2025-XX-XX
**Tester:** [Name]
**Environment:** Production / Staging

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Basic Lock Creation | ✅ PASS | Lock created successfully, Browser B sees locked state |
| Lock Expiration (TTL) | ✅ PASS | Lock expired after 5:00, slot returned to free |
| Lock to Booking | ✅ PASS | Booking created, lock deleted, slot removed |
| Concurrent Attempts | ✅ PASS | Second user received conflict error |
| Lock Refresh | ✅ PASS | Lock expired when user navigated away |
| Multiple Slots | ⚠️ WARN | System allows 2 locks per user (design decision?) |

### Issues Found
- None / [Describe issues]

### Recommendations
- All tests passed, system ready for production
- Consider limiting to 1 lock per user per PRO
```

---

© 2025 My Pet Care. Tutti i diritti riservati.
