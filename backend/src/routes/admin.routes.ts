import express from 'express';
import * as admin from 'firebase-admin';

import { logger } from '../logger.js';
import { cleanupExpiredLocks, cleanupProLocks } from '../services/cleanup.service.js';

const router = express.Router();

// Middleware to require admin authentication
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const hdr = String(req.headers.authorization || '');
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const dec = await admin.auth().verifyIdToken(token);
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(dec.uid).get();
    
    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      req.auth = { uid: dec.uid, email: dec.email };
      return next();
    }
    
    res.status(403).json({ error: 'FORBIDDEN' });
  } catch (e) {
    logger.warn({ error: e }, 'Admin authentication failed');
    res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

/**
 * POST /api/admin/cleanup-locks
 * Manually trigger cleanup of expired locks across all PROs
 * Requires admin authentication
 */
router.post('/cleanup-locks', requireAdmin, async (req, res) => {
  try {
    logger.info({ admin: req.auth.uid }, 'Manual cleanup triggered');
    
    const deletedCount = await cleanupExpiredLocks();
    
    res.json({
      ok: true,
      message: 'Cleanup completed',
      deletedCount,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Manual cleanup failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

/**
 * POST /api/admin/cleanup-locks/:proId
 * Cleanup locks for a specific PRO
 * Requires admin authentication
 */
router.post('/cleanup-locks/:proId', requireAdmin, async (req, res) => {
  try {
    const proId = req.params.proId;
    logger.info({ admin: req.auth.uid, proId }, 'PRO cleanup triggered');
    
    const deletedCount = await cleanupProLocks(proId);
    
    res.json({
      ok: true,
      message: 'PRO cleanup completed',
      proId,
      deletedCount,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'PRO cleanup failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics with revenue and activity metrics
 * Requires admin authentication
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Count documents in various collections
    const [prosSnap, bookingsSnap, usersSnap] = await Promise.all([
      db.collection('pros').count().get(),
      db.collection('bookings').count().get(),
      db.collection('users').count().get(),
    ]);
    
    // Count active locks
    const now = admin.firestore.Timestamp.now();
    const locksSnap = await db
      .collectionGroup('locks')
      .where('ttl', '>', now)
      .count()
      .get();
    
    // Get revenue statistics
    const bookingsDocs = await db.collection('bookings')
      .where('status', '==', 'paid')
      .get();
    
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    bookingsDocs.forEach(doc => {
      const booking = doc.data();
      const amount = booking.price || 0;
      totalRevenue += amount;
      
      const bookingDate = booking.createdAt?.toDate();
      if (bookingDate && 
          bookingDate.getMonth() === currentMonth && 
          bookingDate.getFullYear() === currentYear) {
        monthlyRevenue += amount;
      }
    });
    
    // Get active PRO subscriptions
    const prosActiveDocs = await db.collection('pros')
      .where('subscriptionStatus', '==', 'active')
      .get();
    
    res.json({
      ok: true,
      stats: {
        pros: prosSnap.data().count,
        activePros: prosActiveDocs.size,
        bookings: bookingsSnap.data().count,
        users: usersSnap.data().count,
        activeLocks: locksSnap.data().count,
        totalRevenue,
        monthlyRevenue,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Stats query failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

/**
 * GET /api/admin/analytics
 * Get detailed analytics with time series data
 * Query params: ?period=7d|30d|90d
 * Requires admin authentication
 */
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    const period = req.query.period as string || '30d';
    
    // Calculate date range
    const now = new Date();
    let daysAgo = 30;
    if (period === '7d') daysAgo = 7;
    if (period === '90d') daysAgo = 90;
    
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Fetch bookings in period
    const bookingsSnapshot = await db.collection('bookings')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();
    
    // Group by date
    const dailyStats: Record<string, { bookings: number; revenue: number }> = {};
    
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const date = booking.createdAt?.toDate();
      if (!date) return;
      
      const dateKey = date.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { bookings: 0, revenue: 0 };
      }
      
      dailyStats[dateKey].bookings++;
      if (booking.status === 'paid') {
        dailyStats[dateKey].revenue += booking.price || 0;
      }
    });
    
    // Convert to array and sort by date
    const timeSeries = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      ok: true,
      period,
      timeSeries,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Analytics query failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

/**
 * POST /api/admin/refund/:bookingId
 * Process refund for a booking (Stripe or PayPal)
 * Requires admin authentication
 */
router.post('/refund/:bookingId', requireAdmin, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const { amount, reason } = req.body;
    
    const db = admin.firestore();
    const bookingDoc = await db.doc(`bookings/${bookingId}`).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookingDoc.data()!;
    
    // Check if booking is paid
    if (booking.status !== 'paid' && booking.status !== 'completed') {
      return res.status(400).json({ error: 'Booking not paid' });
    }
    
    let refundId = '';
    
    // Process Stripe refund
    if (booking.stripeSessionId || booking.payment?.intentId) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntentId = booking.payment?.intentId || booking.stripeSessionId;
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
        reason: reason || 'requested_by_customer',
        metadata: {
          bookingId,
          adminId: req.auth.uid,
        },
      });
      
      refundId = refund.id;
    }
    
    // Process PayPal refund
    else if (booking.paypalOrderId || booking.payment?.orderId) {
      const paypal = require('@paypal/checkout-server-sdk');
      
      const environment = process.env.PAYPAL_MODE === 'live'
        ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!)
        : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!);
      
      const client = new paypal.core.PayPalHttpClient(environment);
      
      const captureId = booking.paypalCaptureId || booking.payment?.orderId;
      const request = new paypal.payments.CapturesRefundRequest(captureId);
      
      if (amount) {
        request.requestBody({
          amount: {
            currency_code: 'EUR',
            value: amount.toFixed(2),
          },
        });
      }
      
      const refund = await client.execute(request);
      refundId = refund.result.id;
    }
    
    // Update booking status
    await bookingDoc.ref.update({
      status: 'refunded',
      refundId,
      refundAmount: amount || booking.price,
      refundReason: reason || 'Admin refund',
      refundedBy: req.auth.uid,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Log audit trail
    await db.collection('audit_logs').add({
      action: 'booking_refunded',
      bookingId,
      adminId: req.auth.uid,
      amount: amount || booking.price,
      reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info({ bookingId, refundId, adminId: req.auth.uid }, 'Refund processed');
    
    res.json({
      ok: true,
      message: 'Refund processed successfully',
      refundId,
      bookingId,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Refund processing failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

/**
 * GET /api/admin/users
 * List users with filters
 * Query params: ?role=owner|pro|admin&limit=50
 * Requires admin authentication
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    const role = req.query.role as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    let query = db.collection('users').limit(limit);
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    const usersSnapshot = await query.get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    res.json({
      ok: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Users query failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

/**
 * POST /api/admin/export/csv
 * Export data to CSV
 * Body: { collection: 'bookings' | 'users' | 'pros', filters: {} }
 * Requires admin authentication
 */
router.post('/export/csv', requireAdmin, async (req, res) => {
  try {
    const { collection, filters } = req.body;
    
    if (!['bookings', 'users', 'pros'].includes(collection)) {
      return res.status(400).json({ error: 'Invalid collection' });
    }
    
    const db = admin.firestore();
    let query = db.collection(collection);
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.where(key, '==', value);
      });
    }
    
    const snapshot = await query.get();
    
    // Convert to CSV
    const data = snapshot.docs.map(doc => doc.data());
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }
    
    // Get all unique keys
    const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
    
    // Create CSV header
    const csv = [
      keys.join(','),
      ...data.map(row => 
        keys.map(key => {
          const value = (row as any)[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/,/g, ';');
        }).join(',')
      ),
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${collection}-export.csv"`);
    res.send(csv);
    
    logger.info({ collection, count: data.length, adminId: req.auth.uid }, 'CSV export completed');
  } catch (error: any) {
    logger.error({ error: error.message }, 'CSV export failed');
    res.status(500).json({ error: 'INTERNAL_ERROR', detail: error.message });
  }
});

export default router;
