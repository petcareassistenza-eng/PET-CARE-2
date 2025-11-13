/**
 * Stripe Webhook Handler - My Pet Care Production
 * 
 * Handles Stripe events for subscription lifecycle:
 * - checkout.session.completed → Set PRO status to 'active'
 * - customer.subscription.updated → Update subscription details
 * - customer.subscription.deleted → Set PRO status to 'blocked'
 * 
 * Setup:
 * 1. Stripe CLI (local testing):
 *    stripe listen --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted \
 *      --forward-to https://<PROD_API>/api/payments/webhook
 * 
 * 2. Stripe Dashboard (production):
 *    Add webhook endpoint: https://<PROD_API>/api/payments/webhook
 *    Select events: checkout.session.completed, customer.subscription.*, invoice.*
 * 
 * 3. Environment variables:
 *    STRIPE_WEBHOOK_SECRET=whsec_xxxxx (from Stripe Dashboard)
 */

import Stripe from 'stripe';
import { Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const db = getFirestore();

/**
 * Webhook endpoint handler
 * POST /api/payments/webhook
 */
export async function handleStripeWebhook(req: Request, res: Response) {
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
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log incoming event
  console.log(`✅ Stripe webhook received: ${event.type} [${event.id}]`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt
    res.json({ received: true, eventId: event.id });

  } catch (error: any) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    
    // Log to audit trail
    await db.collection('audit_logs').add({
      type: 'webhook_error',
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      error: error.message,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Return 500 to trigger Stripe retry
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle checkout.session.completed
 * Triggered when user completes payment for subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Checkout completed: ${session.id}`);
  console.log(`   Customer: ${session.customer}`);
  console.log(`   Subscription: ${session.subscription}`);

  // Extract metadata (proId should be included during checkout creation)
  const proId = session.metadata?.proId;
  if (!proId) {
    console.error('⚠️ Missing proId in session metadata');
    return;
  }

  // Update PRO status to active
  const proRef = db.collection('pros').doc(proId);
  await proRef.update({
    status: 'active',
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    subscriptionActivatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ PRO ${proId} status set to 'active'`);

  // Create subscription record
  await db.collection('subscriptions').add({
    proId,
    provider: 'stripe',
    customerId: session.customer,
    subscriptionId: session.subscription,
    status: 'active',
    amount: session.amount_total,
    currency: session.currency,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Send notification to PRO
  await db.collection('notifications').add({
    userId: proId,
    title: 'Abbonamento Attivato',
    body: 'Il tuo abbonamento PRO è ora attivo! Benvenuto.',
    type: 'subscription_activated',
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`📝 Subscription created: ${subscription.id}`);
  console.log(`   Customer: ${subscription.customer}`);
  console.log(`   Status: ${subscription.status}`);

  // Find PRO by Stripe customer ID
  const prosSnapshot = await db.collection('pros')
    .where('stripeCustomerId', '==', subscription.customer)
    .limit(1)
    .get();

  if (prosSnapshot.empty) {
    console.error('⚠️ PRO not found for customer:', subscription.customer);
    return;
  }

  const proDoc = prosSnapshot.docs[0];
  const proId = proDoc.id;

  // Update subscription details
  await proDoc.ref.update({
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Subscription details updated for PRO ${proId}`);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`🔄 Subscription updated: ${subscription.id}`);
  console.log(`   Status: ${subscription.status}`);

  // Find PRO by subscription ID
  const prosSnapshot = await db.collection('pros')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (prosSnapshot.empty) {
    console.error('⚠️ PRO not found for subscription:', subscription.id);
    return;
  }

  const proDoc = prosSnapshot.docs[0];
  const proId = proDoc.id;

  // Determine PRO status based on subscription status
  let proStatus = 'blocked';
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    proStatus = 'active';
  } else if (subscription.status === 'past_due') {
    proStatus = 'blocked'; // Block immediately on payment failure
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    proStatus = 'blocked';
  }

  // Update PRO status
  await proDoc.ref.update({
    status: proStatus,
    subscriptionStatus: subscription.status,
    subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ PRO ${proId} status updated to '${proStatus}' (subscription: ${subscription.status})`);

  // Send notification if blocked
  if (proStatus === 'blocked') {
    await db.collection('notifications').add({
      userId: proId,
      title: 'Abbonamento Sospeso',
      body: 'Il tuo abbonamento PRO è stato sospeso. Aggiorna il metodo di pagamento per riattivarlo.',
      type: 'subscription_suspended',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`❌ Subscription deleted: ${subscription.id}`);

  // Find PRO by subscription ID
  const prosSnapshot = await db.collection('pros')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get();

  if (prosSnapshot.empty) {
    console.error('⚠️ PRO not found for subscription:', subscription.id);
    return;
  }

  const proDoc = prosSnapshot.docs[0];
  const proId = proDoc.id;

  // Update PRO status to blocked
  await proDoc.ref.update({
    status: 'blocked',
    subscriptionStatus: 'canceled',
    subscriptionCanceledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ PRO ${proId} status set to 'blocked' (subscription deleted)`);

  // Send notification
  await db.collection('notifications').add({
    userId: proId,
    title: 'Abbonamento Cancellato',
    body: 'Il tuo abbonamento PRO è stato cancellato. Riattivalo per continuare a usare le funzionalità premium.',
    type: 'subscription_canceled',
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Handle invoice.payment_succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`✅ Invoice payment succeeded: ${invoice.id}`);
  console.log(`   Subscription: ${invoice.subscription}`);
  console.log(`   Amount paid: ${invoice.amount_paid / 100} ${invoice.currency}`);

  // Log payment record
  if (invoice.subscription) {
    const prosSnapshot = await db.collection('pros')
      .where('stripeSubscriptionId', '==', invoice.subscription)
      .limit(1)
      .get();

    if (!prosSnapshot.empty) {
      const proId = prosSnapshot.docs[0].id;

      await db.collection('payments').add({
        proId,
        provider: 'stripe',
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        paidAt: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Payment recorded for PRO ${proId}`);
    }
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);
  console.log(`   Subscription: ${invoice.subscription}`);

  // Find PRO and send notification
  if (invoice.subscription) {
    const prosSnapshot = await db.collection('pros')
      .where('stripeSubscriptionId', '==', invoice.subscription)
      .limit(1)
      .get();

    if (!prosSnapshot.empty) {
      const proId = prosSnapshot.docs[0].id;

      await db.collection('notifications').add({
        userId: proId,
        title: 'Pagamento Fallito',
        body: 'Il pagamento del tuo abbonamento PRO è fallito. Aggiorna il metodo di pagamento per evitare la sospensione.',
        type: 'payment_failed',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Payment failure notification sent to PRO ${proId}`);
    }
  }
}

/**
 * Test webhook locally
 * stripe trigger checkout.session.completed
 */
export function testStripeWebhook() {
  console.log(`
🧪 Test Stripe Webhook

1. Start local webhook listener:
   stripe listen --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted \\
     --forward-to http://localhost:3000/api/payments/webhook

2. Trigger test event:
   stripe trigger checkout.session.completed

3. Expected result:
   - Webhook received and verified
   - PRO status updated to 'active'
   - Subscription record created
   - Notification sent to PRO

4. Check Firestore:
   - pros/{proId}.status === 'active'
   - subscriptions/ collection has new record
   - notifications/ collection has activation message
  `);
}
