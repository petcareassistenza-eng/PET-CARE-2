# ✅ MyPetCare Production Fixes Checklist

Checklist completa di tutti i fix e configurazioni da applicare prima del deployment production.

---

## 📋 Indice

1. [Webhook Stripe - Middleware Order](#1-webhook-stripe---middleware-order)
2. [Firebase Admin Initialization](#2-firebase-admin-initialization)
3. [CORS Configuration](#3-cors-configuration)
4. [RBAC & Admin Protection](#4-rbac--admin-protection)
5. [PDF Receipts](#5-pdf-receipts)
6. [Cleanup Jobs](#6-cleanup-jobs)
7. [Firestore Indexes](#7-firestore-indexes)
8. [PayPal Sandbox → Live](#8-paypal-sandbox--live)
9. [Stripe Billing Portal](#9-stripe-billing-portal)
10. [Frontend Flutter Payments](#10-frontend-flutter-payments)
11. [Notifications & Email](#11-notifications--email)
12. [Google Maps Integration](#12-google-maps-integration)
13. [Firestore Security Rules](#13-firestore-security-rules)
14. [Error Handling](#14-error-handling)
15. [Final Verification](#15-final-verification)

---

## 1. Webhook Stripe - Middleware Order

### ❌ Problema
Il body della richiesta webhook deve essere raw per la verifica firma Stripe, ma `express.json()` lo converte in oggetto.

### ✅ Fix

**File**: `/backend/src/index.ts`

```typescript
// ❌ SBAGLIATO: JSON parsing prima del webhook
app.use(express.json());
app.post('/webhooks/stripe', handleStripeWebhook);

// ✅ CORRETTO: Raw body parsing SOLO per webhook
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.post('/webhooks/stripe', handleStripeWebhook);

// JSON parsing per tutte le altre route DOPO i webhook
app.use(express.json());
```

**Ordine Corretto Completo**:
```typescript
// 1. CORS
app.use(cors({ origin: [...], credentials: true }));

// 2. Health check (no body parsing)
app.get('/health', ...);

// 3. Webhook Stripe (RAW body)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.post('/webhooks/stripe', handleStripeWebhook);

// 4. Webhook PayPal (JSON body)
app.use('/webhooks/paypal', express.json());
app.post('/webhooks/paypal', handlePaypalWebhook);

// 5. Standard API routes (JSON parsing)
app.use(express.json());
app.use('/payments', paymentsRouter);
app.use('/admin', adminRouter);
```

### ✅ Verifica
```bash
# Test locale con Stripe CLI
stripe listen --forward-to http://localhost:8080/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

## 2. Firebase Admin Initialization

### ❌ Problema
Inizializzazione non ottimizzata per Cloud Run (richiede service account key anche in production).

### ✅ Fix (GIÀ IMPLEMENTATO)

**File**: `/backend/src/index.ts`

```typescript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import 'dotenv/config';

// Smart initialization: Cloud Run (no key) vs Local (with key)
if (!admin.apps.length) {
  const isCloudRun = process.env.K_SERVICE !== undefined;
  
  if (isCloudRun) {
    // Cloud Run: automatic authentication via service account
    console.log('🔥 Firebase Admin: Cloud Run service account');
    admin.initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Local: use service account key file
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './keys/firebase-key.json';
    console.log(`🔥 Firebase Admin: Key file ${keyPath}`);
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.project_id + '.appspot.com',
    });
  }
}

// Export for routes
export const db = admin.firestore();
export const bucket = admin.storage().bucket();
```

### ✅ Verifica
- [x] Implementato in `/backend/src/index.ts`
- [ ] Test locale funzionante
- [ ] Deploy Cloud Run funzionante

---

## 3. CORS Configuration

### ❌ Problema
CORS troppo permissivo o mancante per production frontend.

### ✅ Fix

**File**: `/backend/src/index.ts`

```typescript
import cors from 'cors';

// Production domains (aggiorna con i tuoi)
const allowedOrigins = [
  'https://mypetcare.web.app',
  'https://mypetcare.firebaseapp.com',
  'https://app.mypetcareapp.org',
  'https://mypetcare.it',
  'https://www.mypetcare.it'
];

// Add localhost for local development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:5060');
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### ✅ Verifica
```bash
# Test CORS da browser
curl -H "Origin: https://mypetcare.web.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://YOUR-CLOUD-RUN-URL/payments/stripe/create-session
```

---

## 4. RBAC & Admin Protection

### ❌ Problema
Endpoint admin non protetti o verifica RBAC mancante.

### ✅ Fix

**File**: `/backend/src/middleware/auth.ts` (crea se non esiste)

```typescript
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

// Verify Firebase ID token
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user document to check role
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userDoc.data()?.role || 'user',
    };
    
    next();
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Require specific role
export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ error: `${role} role required` });
    }
    
    next();
  };
}
```

**Applica ai route admin**:

```typescript
// /backend/src/index.ts
import { requireAuth, requireRole } from './middleware/auth';

// Admin routes - REQUIRE AUTHENTICATION + ADMIN ROLE
app.use('/admin', requireAuth, requireRole('admin'), adminRouter);
```

### ✅ Verifica
```bash
# Test senza token (deve fallire 401)
curl -X GET https://YOUR-CLOUD-RUN-URL/admin/stats

# Test con token non-admin (deve fallire 403)
curl -X GET https://YOUR-CLOUD-RUN-URL/admin/stats \
     -H "Authorization: Bearer USER_TOKEN"

# Test con token admin (deve passare 200)
curl -X GET https://YOUR-CLOUD-RUN-URL/admin/stats \
     -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 5. PDF Receipts

### ❌ Problema
Dipendenze mancanti o configurazione Storage errata.

### ✅ Fix

**Installa dipendenze**:
```bash
cd backend
npm install -E pdfkit @types/pdfkit
```

**Verifica configurazione** (GIÀ IMPLEMENTATO):

File: `/backend/src/routes/payments.ts`
- [x] Import dinamico PDFKit: `const { default: PDFDocument } = await import("pdfkit");`
- [x] Funzione `generateAndStoreReceiptPDF` implementata
- [x] Storage bucket configurato: `admin.storage().bucket()`
- [x] File reso pubblico: `await file.makePublic()`

**Environment variable richiesta**:
```bash
# .env locale
FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com

# Cloud Run
gcloud run services update mypetcare-backend \
  --region europe-west1 \
  --set-env-vars FIREBASE_STORAGE_BUCKET=pet-care-9790d.appspot.com
```

### ✅ Verifica
```bash
# Test receipt generation
curl -X POST https://YOUR-CLOUD-RUN-URL/payments/stripe/create-session \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"planId":"price_ABC123"}'

# Check Storage bucket for PDF
# Firebase Console → Storage → receipts/{userId}/
```

---

## 6. Cleanup Jobs

### ❌ Problema
Lock scaduti e reminder non gestiti automaticamente.

### ✅ Fix

**Opzione A: Cloud Scheduler + Cloud Functions** (Raccomandato)

Crea `/backend/functions/src/scheduled.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Run every hour: clean expired locks
export const cleanupExpiredLocks = functions.pubsub
  .schedule('0 * * * *')  // Every hour
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    const now = Date.now();
    const locksRef = admin.firestore().collection('slots_locks');
    
    const expiredLocks = await locksRef
      .where('expiresAt', '<', now)
      .get();
    
    const batch = admin.firestore().batch();
    expiredLocks.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`Cleaned ${expiredLocks.size} expired locks`);
    return null;
  });

// Run daily at 9 AM: send booking reminders (24h before)
export const sendBookingReminders = functions.pubsub
  .schedule('0 9 * * *')  // Daily at 9 AM
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    const bookingsRef = admin.firestore().collection('bookings');
    const upcomingBookings = await bookingsRef
      .where('scheduledFor', '>=', admin.firestore.Timestamp.fromDate(tomorrow))
      .where('scheduledFor', '<', admin.firestore.Timestamp.fromDate(dayAfter))
      .where('status', '==', 'confirmed')
      .get();
    
    const messaging = admin.messaging();
    const promises = upcomingBookings.docs.map(async (doc) => {
      const booking = doc.data();
      const userDoc = await admin.firestore().collection('users').doc(booking.userId).get();
      const fcmToken = userDoc.data()?.fcmToken;
      
      if (fcmToken) {
        return messaging.send({
          token: fcmToken,
          notification: {
            title: 'Promemoria Prenotazione',
            body: `Hai una prenotazione domani alle ${booking.time}`,
          },
          data: {
            bookingId: doc.id,
            type: 'booking_reminder',
          },
        });
      }
    });
    
    await Promise.all(promises);
    console.log(`Sent ${promises.length} booking reminders`);
    return null;
  });
```

**Deploy functions**:
```bash
cd backend/functions
npm install firebase-functions firebase-admin
firebase deploy --only functions
```

**Opzione B: Cloud Scheduler + HTTP Endpoint**

```bash
# Create cleanup endpoint
gcloud scheduler jobs create http cleanup-locks \
  --location=europe-west1 \
  --schedule="0 * * * *" \
  --uri="https://YOUR-CLOUD-RUN-URL/cron/cleanup-locks" \
  --http-method=POST \
  --oidc-service-account-email=backend-sa@pet-care-9790d.iam.gserviceaccount.com

# Create reminders endpoint
gcloud scheduler jobs create http send-reminders \
  --location=europe-west1 \
  --schedule="0 9 * * *" \
  --time-zone="Europe/Rome" \
  --uri="https://YOUR-CLOUD-RUN-URL/cron/send-reminders" \
  --http-method=POST \
  --oidc-service-account-email=backend-sa@pet-care-9790d.iam.gserviceaccount.com
```

### ✅ Verifica
```bash
# Test manual cleanup
curl -X POST https://YOUR-CLOUD-RUN-URL/cron/cleanup-locks

# Check Cloud Scheduler logs
gcloud scheduler jobs describe cleanup-locks --location=europe-west1
```

---

## 7. Firestore Indexes

### ❌ Problema
Query composite senza indici causano errori.

### ✅ Fix (GIÀ IMPLEMENTATO)

File: `firestore.indexes.json` creato da `deploy_full_mypetcare.sh`

**Indici necessari**:
```json
{
  "indexes": [
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "proId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "proId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "pros",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Deploy**:
```bash
firebase deploy --only firestore:indexes --project pet-care-9790d
```

### ✅ Verifica
- Firebase Console → Firestore → Indexes
- Tutti gli indici devono essere in stato "Enabled"

---

## 8. PayPal Sandbox → Live

### ❌ Problema
Applicazione usa PayPal Sandbox in production.

### ✅ Fix

**Update environment variable**:
```bash
# Sandbox (development)
PAYPAL_BASE=https://api-m.sandbox.paypal.com

# Production
PAYPAL_BASE=https://api-m.paypal.com
```

**Update Cloud Run**:
```bash
gcloud run services update mypetcare-backend \
  --region europe-west1 \
  --set-env-vars PAYPAL_BASE=https://api-m.paypal.com
```

**Update credentials**:
```bash
# Get production credentials from PayPal Developer Dashboard
# Apps → Your App → Live → Show

# Update Secret Manager
echo -n "YOUR_LIVE_CLIENT_ID" | gcloud secrets versions add PAYPAL_CLIENT_ID --data-file=-
echo -n "YOUR_LIVE_CLIENT_SECRET" | gcloud secrets versions add PAYPAL_CLIENT_SECRET --data-file=-

# Or update environment variables directly
gcloud run services update mypetcare-backend \
  --region europe-west1 \
  --set-env-vars PAYPAL_CLIENT_ID=LIVE_ID,PAYPAL_CLIENT_SECRET=LIVE_SECRET
```

### ✅ Verifica
```bash
# Test PayPal create-order endpoint
curl -X POST https://YOUR-CLOUD-RUN-URL/payments/paypal/create-order \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"amount":"29.99","planType":"mensile"}'

# Verify response contains approval_url with live PayPal domain
```

---

## 9. Stripe Billing Portal

### ❌ Problema
Utenti non possono gestire subscription autonomamente.

### ✅ Fix (GIÀ IMPLEMENTATO)

File: `/backend/src/routes/payments.ts`
- [x] Endpoint `/payments/stripe/portal` implementato
- [x] Crea Billing Portal session con `stripe.billingPortal.sessions.create()`
- [x] Ritorna URL per redirect

**Frontend integration**:

```dart
// lib/features/payments/subscription_management_screen.dart

Future<void> _openBillingPortal() async {
  try {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    
    final token = await user.getIdToken();
    final customerId = 'cus_...';  // Get from user document
    
    final response = await http.post(
      Uri.parse('$kApiBase/payments/stripe/portal'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'customerId': customerId}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await launchUrl(
        Uri.parse(data['url']),
        mode: LaunchMode.externalApplication,
      );
    }
  } catch (e) {
    if (kDebugMode) debugPrint('Billing portal error: $e');
  }
}
```

### ✅ Verifica
- [ ] Button "Gestisci Abbonamento" aggiunto in app
- [ ] Click apre Stripe Billing Portal
- [ ] Utente può cancellare/aggiornare subscription
- [ ] Webhook `customer.subscription.updated` gestito

---

## 10. Frontend Flutter Payments

### ❌ Problema
Price ID placeholder e API_BASE hardcoded.

### ✅ Fix

**Update price IDs**:

Ottieni Price ID reali da Stripe Dashboard → Products → Copy Price ID

```dart
// lib/features/payments/payment_screen.dart

// ❌ SBAGLIATO
final priceId = 'price_ABC123';

// ✅ CORRETTO
final monthlyPriceId = 'price_1PQzEL2eZvKYlo2C8KKfQjXt';  // Reale
final annualPriceId = 'price_1PQzEL2eZvKYlo2C8KKfQjXu';   // Reale

// Selezione basata su piano
final priceId = _selectedPlan == 'monthly' ? monthlyPriceId : annualPriceId;
```

**Update API_BASE**:

```bash
# Build con API URL production
flutter build web --release \
  --dart-define=API_BASE=https://mypetcare-backend-xxxxx-ew.a.run.app

# Build APK con API URL production
flutter build apk --release \
  --dart-define=API_BASE=https://mypetcare-backend-xxxxx-ew.a.run.app
```

### ✅ Verifica
- [ ] Price ID reali da Stripe Dashboard
- [ ] API_BASE punta a Cloud Run URL
- [ ] Test checkout flow completo
- [ ] Webhook ricevuto e processato

---

## 11. Notifications & Email

### ❌ Problema
Notifiche push e email non configurate.

### ✅ Fix

**FCM Setup** (già configurato se Firebase configurato):

```typescript
// Send FCM notification
import * as admin from 'firebase-admin';

async function sendBookingConfirmation(userId: string, bookingId: string) {
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken;
  
  if (!fcmToken) {
    console.warn(`No FCM token for user ${userId}`);
    return;
  }
  
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: 'Prenotazione Confermata',
      body: 'La tua prenotazione è stata confermata',
    },
    data: {
      bookingId,
      type: 'booking_confirmed',
    },
    android: {
      priority: 'high',
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  });
}
```

**Email Setup** (SendGrid example):

```bash
npm install @sendgrid/mail
```

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

async function sendReceiptEmail(
  to: string,
  receiptUrl: string,
  amount: number,
  currency: string
) {
  const msg = {
    to,
    from: 'noreply@mypetcareapp.org',
    subject: 'Ricevuta Pagamento MyPetCare',
    html: `
      <h1>Grazie per il tuo pagamento!</h1>
      <p>Importo: €${(amount / 100).toFixed(2)}</p>
      <p><a href="${receiptUrl}">Scarica Ricevuta PDF</a></p>
    `,
  };
  
  await sgMail.send(msg);
}
```

### ✅ Verifica
- [ ] FCM token salvato in user document
- [ ] Notifiche ricevute su device
- [ ] Email inviate correttamente
- [ ] Link PDF funzionante in email

---

## 12. Google Maps Integration

### ❌ Problema
Google Maps API key non configurata per tutte le piattaforme.

### ✅ Fix

**Android**:

File: `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
  <application>
    <!-- Google Maps API Key -->
    <meta-data
      android:name="com.google.android.geo.API_KEY"
      android:value="AIzaSy..." />
  </application>
</manifest>
```

**iOS**:

File: `ios/Runner/AppDelegate.swift`

```swift
import UIKit
import Flutter
import GoogleMaps

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("AIzaSy...")
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

**Web**:

File: `web/index.html`

```html
<head>
  <!-- Google Maps JavaScript API -->
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSy...&libraries=places"></script>
</head>
```

### ✅ Verifica
- [ ] API key attiva in Google Cloud Console
- [ ] Restrizioni impostate (HTTP referrer per Web, Android/iOS app per mobile)
- [ ] Mappe visualizzate correttamente su tutte le piattaforme

---

## 13. Firestore Security Rules

### ❌ Problema
Rules troppo permissive o insufficienti per production.

### ✅ Fix

File: `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isPro() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'pro';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // PROs collection
    match /pros/{proId} {
      allow read: if true;  // Public read
      allow create, update, delete: if isPro() || isAdmin();
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if isOwner(resource.data.userId) || 
                     isOwner(resource.data.proId) || 
                     isAdmin();
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId) || 
                       isOwner(resource.data.proId) || 
                       isAdmin();
      allow delete: if isAdmin();
    }
    
    // Payments collection
    match /payments/{paymentId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if false;  // Only backend can create
      allow update, delete: if isAdmin();
      
      // Refunds subcollection
      match /refunds/{refundId} {
        allow read: if isOwner(get(/databases/$(database)/documents/payments/$(paymentId)).data.userId) || isAdmin();
        allow write: if false;  // Only backend can write
      }
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;  // Public read
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId) || isAdmin();
    }
    
    // Slots locks (temporary booking locks)
    match /slots_locks/{lockId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId) || 
                               resource.data.expiresAt < request.time.toMillis();
    }
    
    // Diagnostics collection (backend only)
    match /diagnostics/{docId} {
      allow read: if isAdmin();
      allow write: if false;  // Only backend can write
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Deploy**:
```bash
firebase deploy --only firestore:rules --project pet-care-9790d
```

### ✅ Verifica
- [ ] Rules deployate
- [ ] Test lettura/scrittura da app
- [ ] Verifica accesso negato senza auth
- [ ] Admin può accedere a tutto

---

## 14. Error Handling

### ❌ Problema
Error handling non centralizzato, errori non loggati correttamente.

### ✅ Fix

**File**: `/backend/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  if (err instanceof AppError && err.isOperational) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  // Log error details (but don't expose to client)
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString(),
  });
  
  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Apply to index.ts**:

```typescript
import { errorHandler, AppError } from './middleware/errorHandler';

// ... routes ...

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (MUST be last middleware)
app.use(errorHandler);
```

**Usage in routes**:

```typescript
import { asyncHandler, AppError } from '../middleware/errorHandler';

router.post('/refund/:paymentId', asyncHandler(async (req, res) => {
  const payDoc = await db.collection('payments').doc(paymentId).get();
  
  if (!payDoc.exists) {
    throw new AppError('Payment not found', 404);
  }
  
  // ... refund logic ...
  
  res.json({ success: true, refund });
}));
```

### ✅ Verifica
- [ ] Errori loggati in Cloud Logging
- [ ] Client riceve errori user-friendly
- [ ] Stack trace non esposto in production
- [ ] 404/500 gestiti correttamente

---

## 15. Final Verification

### ✅ Checklist Completa

#### Backend
- [ ] Webhook Stripe con raw body parsing
- [ ] Firebase Admin inizializzazione smart (locale/Cloud Run)
- [ ] CORS configurato con domini production
- [ ] RBAC implementato per endpoint admin
- [ ] PDF receipts funzionanti con Storage
- [ ] Cleanup jobs schedulati (locks + reminders)
- [ ] Firestore indexes deployati
- [ ] PayPal production (non sandbox)
- [ ] Error handling centralizzato

#### Frontend
- [ ] Stripe Price ID reali (non placeholder)
- [ ] API_BASE punta a Cloud Run URL
- [ ] Stripe Billing Portal integrato
- [ ] Google Maps API key configurata (Android/iOS/Web)
- [ ] FCM notifiche funzionanti
- [ ] Email ricevute inviate

#### Security
- [ ] Firestore Security Rules production-ready
- [ ] Service Account con ruoli minimi
- [ ] API keys in Secret Manager (non env vars)
- [ ] HTTPS enforced
- [ ] CORS whitelist aggiornata

#### Monitoring
- [ ] Cloud Logging attivo
- [ ] Cloud Monitoring alerts configurati
- [ ] Error rate < 5%
- [ ] P99 latency < 1s
- [ ] Budget GCP impostato

### Test Endpoint

```bash
# Set variables
URL="https://mypetcare-backend-xxxxx-ew.a.run.app"
TOKEN="your-firebase-admin-id-token"

# Health check
curl -s "$URL/health" | jq

# Firestore test
curl -s "$URL/test/db" | jq

# Storage test
curl -s "$URL/test/storage" | jq

# Admin stats (requires auth)
curl -s -H "Authorization: Bearer $TOKEN" "$URL/admin/stats" | jq

# Create Stripe session
curl -X POST "$URL/payments/stripe/create-session" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"planId":"price_REAL_ID"}'

# Validate coupon
curl -X POST "$URL/payments/coupon/validate" \
     -H "Content-Type: application/json" \
     -d '{"code":"FREE-1M"}'
```

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2025-01-15  
**Status**: ✅ Production Checklist Complete  
**Next**: Applica tutti i fix e verifica con checklist finale
