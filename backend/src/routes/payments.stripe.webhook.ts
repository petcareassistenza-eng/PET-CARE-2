// src/routes/payments.stripe.webhook.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../firebase';
import { config } from '../config';

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-06-20'
});

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).body, // raw body fornito da express.raw
      sig,
      config.stripeWebhookSecret
    );
  } catch (err) {
    console.error('Stripe webhook signature error', err);
    return res.status(400).send('Webhook Error');
  }

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const metadata = sub.metadata as any;
      const price = sub.items.data[0]?.price;
      const proIdFromMeta = metadata?.proId;
      const proIdFromPrice = (price?.metadata as any)?.proId;
      const proId = proIdFromMeta || proIdFromPrice;

      if (!proId) {
        console.warn('Stripe sub webhook: no proId, skipping');
      } else {
        const status = sub.status; // active, trialing, canceled, etc.

        await db.collection('pros').doc(proId).update({
          subscriptionStatus:
            status === 'active' || status === 'trialing'
              ? 'active'
              : 'inactive',
          subscriptionProvider: 'stripe',
          subscriptionPlan: price?.nickname || price?.id || null,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          lastPaymentAt:
            sub.latest_invoice != null
              ? new Date(sub.current_period_start * 1000)
              : null,
          updatedAt: new Date()
        });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return res.status(500).send('Webhook handler error');
  }
}
