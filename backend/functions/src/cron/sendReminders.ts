/**
 * Cloud Function - Send Booking Reminders (Cron Job)
 * 
 * Scheduled to run every 24 hours at 10:00 AM
 * Sends reminder notifications for bookings starting in 24-48 hours
 * 
 * Deploy with:
 * firebase deploy --only functions:sendBookingReminders
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Scheduled function - Send booking reminders
 * 
 * Schedule: every day at 10:00 AM (Europe/Rome timezone)
 * Command: 0 10 * * *
 */
export const sendBookingReminders = functions
  .region('europe-west1')
  .pubsub.schedule('0 10 * * *')
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    console.log('🔔 Starting booking reminder cron job...');

    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find bookings starting in 24-48 hours
      const bookingsSnapshot = await db
        .collection('bookings')
        .where('start', '>=', admin.firestore.Timestamp.fromDate(in24h))
        .where('start', '<', admin.firestore.Timestamp.fromDate(in48h))
        .where('status', 'in', ['confirmed', 'paid'])
        .get();

      console.log(`📊 Found ${bookingsSnapshot.size} bookings needing reminders`);

      let sentCount = 0;
      let errorCount = 0;

      // Process each booking
      const promises = bookingsSnapshot.docs.map(async (bookingDoc) => {
        const booking = bookingDoc.data();
        const bookingId = bookingDoc.id;

        try {
          // Check if reminder already sent
          if (booking.reminderSent === true) {
            console.log(`⏭️  Skipping ${bookingId} - reminder already sent`);
            return;
          }

          // Get owner FCM token
          const userDoc = await db.doc(`users/${booking.userId}`).get();
          const fcmToken = userDoc.data()?.fcmToken;

          if (!fcmToken) {
            console.log(`⚠️  No FCM token for user ${booking.userId}`);
            return;
          }

          // Get PRO details
          const proDoc = await db.doc(`pros/${booking.proId}`).get();
          const proName = proDoc.data()?.displayName || 'Professionista';

          // Format booking date
          const bookingDate = booking.start.toDate();
          const dateStr = bookingDate.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          });

          // Send push notification
          const message = {
            token: fcmToken,
            notification: {
              title: '🔔 Promemoria Prenotazione',
              body: `Domani hai un appuntamento con ${proName} alle ${dateStr}`,
            },
            data: {
              type: 'booking_reminder',
              bookingId,
              proId: booking.proId,
              date: bookingDate.toISOString(),
            },
            android: {
              priority: 'high' as 'high',
              notification: {
                sound: 'default',
                channelId: 'booking_reminders',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          };

          await messaging.send(message);

          // Mark reminder as sent
          await bookingDoc.ref.update({
            reminderSent: true,
            reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Log notification
          await db.collection('notifications').add({
            userId: booking.userId,
            type: 'booking_reminder',
            title: '🔔 Promemoria Prenotazione',
            body: `Domani hai un appuntamento con ${proName}`,
            bookingId,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });

          console.log(`✅ Reminder sent for booking ${bookingId}`);
          sentCount++;

        } catch (error) {
          console.error(`❌ Error sending reminder for booking ${bookingId}:`, error);
          errorCount++;
        }
      });

      // Wait for all reminders to be sent
      await Promise.all(promises);

      console.log(`🎯 Reminder cron job completed: ${sentCount} sent, ${errorCount} errors`);

      return {
        success: true,
        sent: sentCount,
        errors: errorCount,
      };

    } catch (error) {
      console.error('❌ Fatal error in sendBookingReminders cron:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send booking reminders');
    }
  });

/**
 * Scheduled function - Send review requests
 * 
 * Runs every day at 8:00 PM to request reviews for completed bookings
 * Schedule: every day at 20:00 (Europe/Rome timezone)
 * Command: 0 20 * * *
 */
export const sendReviewRequests = functions
  .region('europe-west1')
  .pubsub.schedule('0 20 * * *')
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    console.log('⭐ Starting review request cron job...');

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find bookings completed in last 24 hours
      const bookingsSnapshot = await db
        .collection('bookings')
        .where('status', '==', 'completed')
        .where('completedAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
        .where('reviewRequestSent', '==', false)
        .get();

      console.log(`📊 Found ${bookingsSnapshot.size} bookings for review requests`);

      let sentCount = 0;

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();
        const bookingId = bookingDoc.id;

        try {
          // Get owner FCM token
          const userDoc = await db.doc(`users/${booking.userId}`).get();
          const fcmToken = userDoc.data()?.fcmToken;

          if (!fcmToken) continue;

          // Get PRO details
          const proDoc = await db.doc(`pros/${booking.proId}`).get();
          const proName = proDoc.data()?.displayName || 'Professionista';

          // Send push notification
          await messaging.send({
            token: fcmToken,
            notification: {
              title: '⭐ Lascia una Recensione',
              body: `Come è andata con ${proName}? Condividi la tua esperienza!`,
            },
            data: {
              type: 'review_request',
              bookingId,
              proId: booking.proId,
            },
          });

          // Mark as sent
          await bookingDoc.ref.update({
            reviewRequestSent: true,
            reviewRequestSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          sentCount++;

        } catch (error) {
          console.error(`Error sending review request for ${bookingId}:`, error);
        }
      }

      console.log(`✅ Review requests sent: ${sentCount}`);

      return { success: true, sent: sentCount };

    } catch (error) {
      console.error('❌ Error in sendReviewRequests:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send review requests');
    }
  });
