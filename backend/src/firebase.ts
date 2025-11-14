// src/firebase.ts
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp({
    // Se usi GOOGLE_APPLICATION_CREDENTIALS basta questo
  });
}

export const db = admin.firestore();
export const adminAuth = admin.auth();
export const adminMessaging = admin.messaging();
