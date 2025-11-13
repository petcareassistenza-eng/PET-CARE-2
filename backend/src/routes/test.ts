/**
 * Test routes for Firebase connectivity and health checks
 */
import express from 'express';
import admin from 'firebase-admin';
import { getDb } from '../utils/firebaseAdmin';

const router = express.Router();

/**
 * Firebase Connectivity Test
 * Tests Firestore read/write and returns connection status
 */
router.get('/firebase', async (req, res) => {
  try {
    const db = getDb();
    const docRef = db.collection('healthcheck').doc('test');
    
    // Write test
    await docRef.set(
      {
        ok: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: 'Firebase Admin SDK is working correctly',
      },
      { merge: true }
    );
    
    // Read test
    const snap = await docRef.get();
    
    if (!snap.exists) {
      throw new Error('Healthcheck document was not created');
    }
    
    res.json({
      success: true,
      message: 'Firebase connection successful',
      data: snap.data(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'not-set',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'not-set',
    });
  } catch (err: any) {
    console.error('❌ Firebase test error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || String(err),
      code: err?.code || 'unknown',
    });
  }
});

/**
 * Health Check Endpoint
 * Simple endpoint to verify backend is running
 */
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
