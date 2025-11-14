/**
 * Firebase Admin SDK Setup
 * Inizializza Firebase Admin e esporta istanze db e messaging
 */

import * as admin from 'firebase-admin';

// Inizializza Firebase Admin solo se non è già stato fatto
if (admin.apps.length === 0) {
  admin.initializeApp({
    // Se GOOGLE_APPLICATION_CREDENTIALS è impostato, non serve passare credenziali
    // Altrimenti puoi specificare il service account:
    // credential: admin.credential.cert(require('../path/to/serviceAccountKey.json'))
  });
}

// Esporta Firestore database
export const db = admin.firestore();

// Esporta Firebase Cloud Messaging
export const adminMessaging = admin.messaging();

// Esporta Auth (opzionale, per operazioni admin)
export const adminAuth = admin.auth();

// Export default admin per casi speciali
export default admin;
