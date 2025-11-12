/**
 * MyPetCare - PayPal Webhook Handler
 * Handles PayPal events for subscriptions and payments
 */

import { Request, Response } from 'express';
import admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Get PayPal OAuth Access Token
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const baseUrl = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json() as any;
  return data.access_token;
}

/**
 * Verify PayPal Webhook Signature
 */
async function verifyWebhookSignature(req: Request): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!;

    const baseUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const verifyPayload = {
      auth_algo: req.headers['paypal-auth-algo'],
      cert_url: req.headers['paypal-cert-url'],
      transmission_id: req.headers['paypal-transmission-id'],
      transmission_sig: req.headers['paypal-transmission-sig'],
      transmission_time: req.headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: req.body,
    };

    const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verifyPayload),
    });

    const result = await response.json() as any;
    return result.verification_status === 'SUCCESS';

  } catch (error: any) {
    console.error('❌ PayPal signature verification error:', error);
    return false;
  }
}

export const handlePaypalWebhook = async (req: Request, res: Response) => {
  console.log('📬 PayPal webhook received:', req.body.event_type);

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(req);
  if (!isValid) {
    console.error('❌ Invalid PayPal webhook signature');
    return res.status(400).send('Invalid signature');
  }

  const eventType = req.body.event_type;
  const resource = req.body.resource;

  try {
    switch (eventType) {
      // ==========================================
      // Subscription Events
      // ==========================================
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscriptionId = resource.id;
        const customId = resource.custom_id; // User ID passed during subscription creation

        console.log(`✅ PayPal subscription activated: ${subscriptionId}`);

        if (customId) {
          // Update user subscription status
          await db.doc(`users/${customId}`).update({
            subscriptionStatus: 'active',
            paypalSubscriptionId: subscriptionId,
            isPro: true,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update pros collection
          await db.doc(`pros/${customId}`).set(
            {
              active: true,
              subscriptionStatus: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          console.log(`✅ User ${customId} subscription activated via PayPal`);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const subscriptionId = resource.id;
        const customId = resource.custom_id;

        console.log(`🚫 PayPal subscription ${eventType}: ${subscriptionId}`);

        if (customId) {
          await db.doc(`users/${customId}`).update({
            subscriptionStatus: 'cancelled',
            isPro: false,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Lock PRO profile
          await db.doc(`pros/${customId}`).update({
            active: false,
            subscriptionStatus: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ User ${customId} subscription cancelled - paywall active`);
        }
        break;
      }

      // ==========================================
      // Payment Events
      // ==========================================
      case 'PAYMENT.SALE.COMPLETED': {
        const saleId = resource.id;
        const customId = resource.custom; // Booking ID passed during payment
        const amount = resource.amount.total;

        console.log(`💰 PayPal payment completed: ${saleId}, Amount: ${amount}`);

        if (customId && customId.startsWith('booking_')) {
          const bookingId = customId.replace('booking_', '');

          await db.doc(`bookings/${bookingId}`).update({
            status: 'confirmed',
            paymentStatus: 'paid',
            paypalSaleId: saleId,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // TODO: Send FCM notification to owner & pro
          console.log(`✅ Booking ${bookingId} confirmed via PayPal`);
        }
        break;
      }

      case 'PAYMENT.SALE.REFUNDED': {
        const saleId = resource.sale_id;
        const refundAmount = resource.amount.total;

        console.log(`💸 PayPal refund issued for sale ${saleId}: ${refundAmount}`);

        // Find booking by PayPal sale ID
        const bookingsSnapshot = await db
          .collection('bookings')
          .where('paypalSaleId', '==', saleId)
          .limit(1)
          .get();

        if (!bookingsSnapshot.empty) {
          const bookingDoc = bookingsSnapshot.docs[0];
          
          await bookingDoc.ref.update({
            status: 'refunded',
            paymentStatus: 'refunded',
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // TODO: Send FCM notification about refund
          console.log(`✅ Booking ${bookingDoc.id} marked as refunded`);
        }
        break;
      }

      // ==========================================
      // Failure Events
      // ==========================================
      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.PENDING': {
        console.warn(`⚠️ PayPal payment issue: ${eventType}`);
        // Handle payment failures/pending states
        break;
      }

      default:
        console.log(`⚠️ Unhandled PayPal event type: ${eventType}`);
    }

    // Always respond 200 to acknowledge receipt
    res.json({ received: true });

  } catch (error: any) {
    console.error('❌ Error processing PayPal webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
