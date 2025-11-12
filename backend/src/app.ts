/**
 * MyPetCare Express Application Setup
 * Separates app configuration from server startup for testing
 */

import { readFileSync } from 'fs';

import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import helmet from 'helmet';
import xss from 'xss-clean';

import { handlePaypalWebhook } from './functions/paypalWebhook';
import { handleStripeWebhook } from './functions/stripeWebhook';
import { trimStrings } from './middleware/validateRequest';
import adminRouter from './routes/admin';
import jobsRouter from './routes/jobs';
import messagesRouter from './routes/messages';
import paymentsRouter from './routes/payments';
import suggestionsRouter from './routes/suggestions.routes';


// ==========================================
// Firebase Admin SDK Initialization
// ==========================================
// Smart initialization: works both locally (with JSON key) and on Cloud Run (with service account)

if (!admin.apps.length) {
  const isCloudRun = process.env.K_SERVICE !== undefined;
  
  if (isCloudRun) {
    // Cloud Run: automatic authentication via service account
    console.log('🔥 Firebase Admin: Initializing with Cloud Run service account');
    admin.initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'pet-care-9790d.appspot.com',
    });
  } else {
    // Local development: use service account key file
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './keys/firebase-key.json';
    console.log(`🔥 Firebase Admin: Initializing with key file: ${keyPath}`);
    
    try {
      const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.project_id + '.appspot.com',
      });
    } catch (error: any) {
      console.error('❌ Failed to initialize Firebase Admin SDK:');
      console.error('   Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid service account key file');
      console.error('   Error:', error.message);
      process.exit(1);
    }
  }
}

// Export Firestore and Storage for use in routes
export const db = admin.firestore();
export const bucket = admin.storage().bucket();

console.log('✅ Firebase Admin SDK initialized successfully');
console.log(`   Storage Bucket: ${bucket.name}`);

// ==========================================
// Express App Configuration
// ==========================================

export const app = express();

// ==========================================
// Security & Performance Middleware
// ==========================================

// Helmet - Security headers
app.use(helmet());

// XSS Protection - Sanitize user input to prevent XSS attacks
app.use(xss() as any);

// Compression - Gzip/Brotli response compression
app.use(compression());

// CORS - Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://mypetcare.it',
  credentials: true,
}));

// ==========================================
// Health Check (no body parsing needed)
// ==========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  });
});

// ==========================================
// Webhook Endpoints (RAW body parsing)
// ==========================================

// Stripe webhook - requires raw body for signature verification
app.use(
  '/webhooks/stripe',
  bodyParser.raw({ type: 'application/json' })
);
app.post('/webhooks/stripe', handleStripeWebhook);

// PayPal webhook - requires JSON body with signature headers
app.use('/webhooks/paypal', bodyParser.json());
app.post('/webhooks/paypal', handlePaypalWebhook);

// ==========================================
// Standard API Endpoints (JSON parsing + Sanitization)
// ==========================================

app.use(bodyParser.json());
app.use(trimStrings); // Apply string trimming to all requests

// Maintenance mode check middleware
app.use((req: Request, res: Response, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'MyPetCare is undergoing maintenance. Please try again later.',
    });
  }
  next();
});

// ==========================================
// API Routes
// ==========================================

// Payment routes (Stripe + PayPal + Receipts)
app.use('/payments', paymentsRouter);

// AI Suggestions routes
app.use('/suggestions', suggestionsRouter);

// Admin routes (requires admin authentication)
app.use('/admin', adminRouter);

// Jobs routes (scheduled tasks - protected by CRON_SECRET)
app.use('/jobs', jobsRouter);

// Messages/Chat routes (requires authentication)
app.use('/messages', messagesRouter);

// Get configuration (for app to check feature flags)
app.get('/api/config', async (req: Request, res: Response) => {
  try {
    const configDoc = await admin.firestore()
      .doc('config/maintenance')
      .get();

    const config = configDoc.data() || {};

    res.json({
      maintenanceMode: config.maintenance || false,
      minSupportedBuild: config.min_supported_build || 90,
      paymentsEnabled: config.payments_disabled !== true,
      message: config.message || '',
    });
  } catch (error: any) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Get pros (for testing)
app.get('/api/pros', async (req: Request, res: Response) => {
  try {
    const prosSnapshot = await admin.firestore()
      .collection('pros')
      .where('active', '==', true)
      .limit(20)
      .get();

    const pros = prosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ pros });
  } catch (error: any) {
    console.error('Error fetching pros:', error);
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
});

// ==========================================
// Test Endpoints (Firestore + Storage)
// ==========================================

// Test Firestore write/read
app.get('/test/db', async (req: Request, res: Response) => {
  try {
    const testData = {
      ok: true,
      timestamp: Date.now(),
      message: 'Firestore connection test successful',
      environment: process.env.NODE_ENV,
    };

    // Write test document
    const docRef = await db.collection('diagnostics').add(testData);
    
    // Read it back to confirm
    const doc = await docRef.get();
    
    res.json({
      success: true,
      firestore: {
        write: true,
        read: true,
        documentId: docRef.id,
        data: doc.data(),
      },
      message: '✅ Firestore working correctly',
    });
  } catch (error: any) {
    console.error('Firestore test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Firestore test failed',
    });
  }
});

// Test Storage write/read
app.get('/test/storage', async (req: Request, res: Response) => {
  try {
    const testFileName = `test/diagnostic-${Date.now()}.txt`;
    const testContent = `Storage test successful at ${new Date().toISOString()}`;
    
    // Write test file
    const file = bucket.file(testFileName);
    await file.save(testContent, {
      contentType: 'text/plain',
      metadata: {
        metadata: {
          test: 'true',
          createdBy: 'diagnostic-endpoint',
        },
      },
    });

    // Make it publicly accessible for verification
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${testFileName}`;
    
    res.json({
      success: true,
      storage: {
        write: true,
        bucket: bucket.name,
        fileName: testFileName,
        publicUrl: publicUrl,
      },
      message: '✅ Storage working correctly',
    });
  } catch (error: any) {
    console.error('Storage test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Storage test failed',
    });
  }
});

// Combined diagnostic endpoint
app.get('/test/all', async (req: Request, res: Response) => {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cloudRun: process.env.K_SERVICE !== undefined,
    tests: {},
  };

  // Test Firestore
  try {
    const docRef = await db.collection('diagnostics').add({ test: true, ts: Date.now() });
    results.tests.firestore = { status: 'success', documentId: docRef.id };
  } catch (error: any) {
    results.tests.firestore = { status: 'failed', error: error.message };
  }

  // Test Storage
  try {
    const testFile = bucket.file(`test/diagnostic-${Date.now()}.txt`);
    await testFile.save('test', { contentType: 'text/plain' });
    results.tests.storage = { status: 'success', bucket: bucket.name };
  } catch (error: any) {
    results.tests.storage = { status: 'failed', error: error.message };
  }

  const allSuccess = Object.values(results.tests).every((t: any) => t.status === 'success');
  
  res.status(allSuccess ? 200 : 500).json({
    success: allSuccess,
    ...results,
    message: allSuccess ? '✅ All tests passed' : '❌ Some tests failed',
  });
});

// ==========================================
// Error Handling
// ==========================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
});
