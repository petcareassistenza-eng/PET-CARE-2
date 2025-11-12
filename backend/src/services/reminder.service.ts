/**
 * Reminder Service - Booking Notifications via FCM
 * 
 * Features:
 * - Send booking reminders 24h before appointment
 * - Request reviews after completed bookings
 * - Notify status changes (confirmed, cancelled, etc.)
 * - Support for push notifications + email
 */

import admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Send booking reminder 24 hours before appointment
 * 
 * Called by Cloud Scheduler cron job
 * Finds all bookings starting in 24-48 hours
 * Sends push notification to owner
 */
export async function sendBookingReminders(): Promise<void> {
  try {
    console.log('🔔 Starting booking reminder job...');

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

    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;

      try {
        // Check if reminder already sent
        if (booking.reminderSent === true) {
          console.log(`⏭️  Skipping ${bookingId} - reminder already sent`);
          continue;
        }

        // Get owner FCM token
        const userDoc = await db.doc(`users/${booking.userId}`).get();
        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
          console.log(`⚠️  No FCM token for user ${booking.userId}`);
          continue;
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
            priority: 'high' as const,
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

        console.log(`✅ Reminder sent for booking ${bookingId}`);
        sentCount++;

      } catch (error) {
        console.error(`❌ Error sending reminder for booking ${bookingId}:`, error);
        errorCount++;
      }
    }

    console.log(`🎯 Reminder job completed: ${sentCount} sent, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in sendBookingReminders:', error);
    throw error;
  }
}

/**
 * Send review request after completed booking
 * 
 * @param bookingId - Booking document ID
 */
export async function sendReviewRequest(bookingId: string): Promise<void> {
  try {
    const bookingDoc = await db.doc(`bookings/${bookingId}`).get();
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data()!;

    // Only send review request for completed bookings
    if (booking.status !== 'completed') {
      console.log(`⏭️  Skipping review request - booking ${bookingId} not completed`);
      return;
    }

    // Check if review request already sent
    if (booking.reviewRequestSent === true) {
      console.log(`⏭️  Review request already sent for booking ${bookingId}`);
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

    // Send push notification
    const message = {
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
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'review_requests',
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

    // Mark review request as sent
    await bookingDoc.ref.update({
      reviewRequestSent: true,
      reviewRequestSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Review request sent for booking ${bookingId}`);

  } catch (error) {
    console.error('❌ Error sending review request:', error);
    throw error;
  }
}

/**
 * Notify user about booking status change
 * 
 * @param bookingId - Booking document ID
 * @param newStatus - New booking status
 */
export async function notifyStatusChange(
  bookingId: string,
  newStatus: string
): Promise<void> {
  try {
    const bookingDoc = await db.doc(`bookings/${bookingId}`).get();
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data()!;

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

    // Determine notification content based on status
    let title = '📋 Aggiornamento Prenotazione';
    let body = '';

    switch (newStatus) {
      case 'confirmed':
        title = '✅ Prenotazione Confermata';
        body = `La tua prenotazione con ${proName} è stata confermata!`;
        break;
      case 'cancelled':
        title = '❌ Prenotazione Annullata';
        body = `La prenotazione con ${proName} è stata annullata.`;
        break;
      case 'completed':
        title = '🎉 Servizio Completato';
        body = `Il servizio con ${proName} è stato completato. Lascia una recensione!`;
        break;
      case 'pending':
        title = '⏳ Prenotazione in Attesa';
        body = `La tua prenotazione con ${proName} è in attesa di conferma.`;
        break;
      default:
        body = `La tua prenotazione con ${proName} è stata aggiornata.`;
    }

    // Send push notification
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        type: 'booking_status_change',
        bookingId,
        proId: booking.proId,
        status: newStatus,
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'booking_updates',
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

    // Log notification
    await db.collection('notifications').add({
      userId: booking.userId,
      type: 'booking_status_change',
      title,
      body,
      bookingId,
      status: newStatus,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    console.log(`✅ Status change notification sent for booking ${bookingId}`);

  } catch (error) {
    console.error('❌ Error sending status change notification:', error);
    throw error;
  }
}

/**
 * Send cancellation notification
 * 
 * @param bookingId - Booking document ID
 * @param cancelledBy - 'owner' or 'pro' or 'admin'
 * @param reason - Cancellation reason
 */
export async function notifyCancellation(
  bookingId: string,
  cancelledBy: string,
  reason?: string
): Promise<void> {
  try {
    const bookingDoc = await db.doc(`bookings/${bookingId}`).get();
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const booking = bookingDoc.data()!;

    // Determine recipient (opposite of who cancelled)
    const recipientId = cancelledBy === 'owner' ? booking.proId : booking.userId;
    const recipientCollection = cancelledBy === 'owner' ? 'pros' : 'users';

    // Get recipient FCM token
    const recipientDoc = await db.doc(`${recipientCollection}/${recipientId}`).get();
    const fcmToken = recipientDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log(`⚠️  No FCM token for ${recipientCollection} ${recipientId}`);
      return;
    }

    // Get other party name
    const otherPartyId = cancelledBy === 'owner' ? booking.userId : booking.proId;
    const otherPartyCollection = cancelledBy === 'owner' ? 'users' : 'pros';
    const otherPartyDoc = await db.doc(`${otherPartyCollection}/${otherPartyId}`).get();
    const otherPartyName = otherPartyDoc.data()?.displayName || 'Utente';

    // Send push notification
    const message = {
      token: fcmToken,
      notification: {
        title: '❌ Prenotazione Annullata',
        body: `${otherPartyName} ha annullato la prenotazione. ${reason || ''}`,
      },
      data: {
        type: 'booking_cancelled',
        bookingId,
        cancelledBy,
        reason: reason || '',
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'booking_updates',
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

    console.log(`✅ Cancellation notification sent for booking ${bookingId}`);

  } catch (error) {
    console.error('❌ Error sending cancellation notification:', error);
    throw error;
  }
}
