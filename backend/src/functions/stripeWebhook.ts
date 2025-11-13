/**
 * MyPetCare - Stripe Webhook Handler
 * Handles Stripe events for subscriptions, payments, and refunds
 */

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getDb } from '../utils/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const db = getDb();

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Stripe event received: ${event.type}`);

  try {
    switch (event.type) {
      // ==========================================
      // Subscription Events
      // ==========================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        console.log(`💳 Payment succeeded for customer ${customerId}`);

        // Find user by Stripe customer ID
        const usersSnapshot = await db
          .collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          
          // Update user subscription status
          await userDoc.ref.update({
            subscriptionStatus: 'active',
            subscriptionId: subscriptionId,
            isPro: true,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update pros collection
          await db.doc(`pros/${userDoc.id}`).set(
            {
              active: true,
              subscriptionStatus: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          console.log(`✅ User ${userDoc.id} subscription activated`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`🚫 Subscription cancelled for customer ${customerId}`);

        // Find and update user
        const usersSnapshot = await db
          .collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          
          await userDoc.ref.update({
            subscriptionStatus: 'cancelled',
            isPro: false,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Lock PRO profile
          await db.doc(`pros/${userDoc.id}`).update({
            active: false,
            subscriptionStatus: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ User ${userDoc.id} subscription cancelled - paywall active`);
        }
        break;
      }

      // ==========================================
      // Payment Events
      // ==========================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.bookingId;

        if (bookingId) {
          console.log(`💰 Payment succeeded for booking ${bookingId}`);

          await db.doc(`bookings/${bookingId}`).update({
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentIntentId: paymentIntent.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // TODO: Send FCM notification to owner & pro
          console.log(`✅ Booking ${bookingId} confirmed`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const bookingId = charge.metadata.bookingId;

        if (bookingId) {
          console.log(`💸 Refund issued for booking ${bookingId}`);

          await db.doc(`bookings/${bookingId}`).update({
            status: 'refunded',
            paymentStatus: 'refunded',
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // TODO: Send FCM notification about refund
          console.log(`✅ Booking ${bookingId} marked as refunded`);
        }
        break;
      }

      // ==========================================
      // Failure Events
      // ==========================================
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.bookingId;

        console.error(`❌ Payment failed for booking ${bookingId}`);

        if (bookingId) {
          await db.doc(`bookings/${bookingId}`).update({
            status: 'payment_failed',
            paymentStatus: 'failed',
            failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    // Always respond 200 to acknowledge receipt
    res.json({ received: true });

  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
