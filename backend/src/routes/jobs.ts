/**
 * MyPetCare - Cron Jobs Router
 * Handles scheduled tasks: booking reminders, cleanup jobs, etc.
 */

import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const fcm = admin.messaging();

// ============================================================================
// CRON SECURITY MIDDLEWARE
// ============================================================================
// Protects cron endpoints from unauthorized access
// Use with Cloud Scheduler OIDC auth + secret header

function requireCron(req: Request, res: Response, next: any) {
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('⚠️  CRON_SECRET not set - cron endpoints are unprotected!');
    return next();
  }
  
  const providedKey = req.headers['x-cron-key'];
  
  if (providedKey !== cronSecret) {
    console.warn('❌ Unauthorized cron access attempt', {
      ip: req.ip,
      url: req.url,
      headers: req.headers,
    });
    return res.status(403).json({ error: 'Forbidden: Invalid cron key' });
  }
  
  next();
}

// ============================================================================
// BOOKING REMINDERS (24H BEFORE)
// ============================================================================
// Sends FCM notifications to users and PROs 24 hours before booking
// Scheduled to run every hour via Cloud Scheduler

router.post('/send-reminders', requireCron, async (req: Request, res: Response) => {
  console.log('🔔 Starting booking reminders job...');
  
  try {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000; // +24 hours in milliseconds
    
    console.log('   Checking bookings between:', {
      now: new Date(now).toISOString(),
      in24h: new Date(in24h).toISOString(),
    });
    
    // Query bookings that:
    // - Are confirmed
    // - Start in next 24 hours
    // - Haven't received reminder yet
    const bookingsSnapshot = await db.collection('bookings')
      .where('status', '==', 'confirmed')
      .where('startAtMs', '>=', now)
      .where('startAtMs', '<=', in24h)
      .where('reminderSent', '==', false)
      .get();
    
    console.log(`   Found ${bookingsSnapshot.size} bookings requiring reminders`);
    
    let notificationsSent = 0;
    let bookingsUpdated = 0;
    const errors: string[] = [];
    
    // Process each booking
    for (const bookingDoc of bookingsSnapshot.docs) {
      try {
        const booking = bookingDoc.data();
        const bookingId = bookingDoc.id;
        
        // Get user and PRO documents
        const [userDoc, proDoc] = await Promise.all([
          db.collection('users').doc(booking.userId).get(),
          db.collection('users').doc(booking.proId).get(),
        ]);
        
        // Collect FCM tokens from both user and PRO
        const tokens: string[] = [];
        
        if (userDoc.exists && userDoc.data()?.fcmTokens) {
          tokens.push(...(userDoc.data()?.fcmTokens || []));
        }
        
        if (proDoc.exists && proDoc.data()?.fcmTokens) {
          tokens.push(...(proDoc.data()?.fcmTokens || []));
        }
        
        // Filter out invalid tokens
        const validTokens = tokens.filter(t => typeof t === 'string' && t.length > 0);
        
        if (validTokens.length === 0) {
          console.warn(`   No FCM tokens for booking ${bookingId}`);
          // Still mark as sent to avoid retrying
          await bookingDoc.ref.update({
            reminderSent: true,
            reminderAt: admin.firestore.FieldValue.serverTimestamp(),
            reminderError: 'No FCM tokens available',
          });
          bookingsUpdated++;
          continue;
        }
        
        // Prepare notification message
        const startDate = new Date(booking.startAtMs);
        const formattedDate = startDate.toLocaleString('it-IT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        const title = '🔔 Promemoria Prenotazione';
        const body = `Hai una prenotazione per "${booking.serviceName || 'servizio'}" domani alle ${startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
        
        // Send FCM notification
        const response = await fcm.sendEachForMulticast({
          tokens: validTokens,
          notification: {
            title,
            body,
          },
          data: {
            type: 'booking_reminder',
            bookingId,
            startAtMs: booking.startAtMs.toString(),
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'booking_reminders',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
        
        // Count successful sends
        const successCount = response.responses.filter(r => r.success).length;
        notificationsSent += successCount;
        
        // Log failed tokens for cleanup
        const failedTokens = response.responses
          .map((r, i) => (r.success ? null : validTokens[i]))
          .filter(t => t !== null);
        
        if (failedTokens.length > 0) {
          console.warn(`   Failed to send to ${failedTokens.length} tokens for booking ${bookingId}`);
        }
        
        // Update booking document
        await bookingDoc.ref.update({
          reminderSent: true,
          reminderAt: admin.firestore.FieldValue.serverTimestamp(),
          reminderSuccessCount: successCount,
          reminderFailedTokens: failedTokens,
        });
        
        bookingsUpdated++;
        
      } catch (error: any) {
        console.error(`   Error processing booking ${bookingDoc.id}:`, error);
        errors.push(`${bookingDoc.id}: ${error.message}`);
      }
    }
    
    console.log('✅ Booking reminders job completed:', {
      bookingsProcessed: bookingsSnapshot.size,
      bookingsUpdated,
      notificationsSent,
      errors: errors.length,
    });
    
    res.json({
      ok: true,
      bookings: bookingsSnapshot.size,
      bookingsUpdated,
      notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error: any) {
    console.error('❌ Booking reminders job failed:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CLEANUP EXPIRED LOCKS
// ============================================================================
// Removes expired booking locks from Firestore
// Scheduled to run every hour via Cloud Scheduler

router.post('/cleanup-locks', requireCron, async (req: Request, res: Response) => {
  console.log('🧹 Starting cleanup locks job...');
  
  try {
    const now = Date.now();
    
    // Query expired locks
    const locksSnapshot = await db.collection('slots_locks')
      .where('expiresAt', '<', now)
      .get();
    
    console.log(`   Found ${locksSnapshot.size} expired locks to clean`);
    
    if (locksSnapshot.empty) {
      return res.json({
        ok: true,
        cleaned: 0,
        message: 'No expired locks found',
      });
    }
    
    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let totalDeleted = 0;
    
    for (let i = 0; i < locksSnapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = locksSnapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      totalDeleted += batchDocs.length;
      
      console.log(`   Deleted batch: ${batchDocs.length} locks (total: ${totalDeleted})`);
    }
    
    console.log(`✅ Cleanup locks job completed: ${totalDeleted} locks deleted`);
    
    res.json({
      ok: true,
      cleaned: totalDeleted,
    });
    
  } catch (error: any) {
    console.error('❌ Cleanup locks job failed:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'jobs',
    timestamp: new Date().toISOString(),
  });
});

export default router;
