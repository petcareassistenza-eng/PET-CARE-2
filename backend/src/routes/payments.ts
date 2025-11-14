// src/routes/payments.ts
import { Router } from 'express';
import Stripe from 'stripe';
import fetch from 'node-fetch';
import { db } from '../firebase';
import { config } from '../config';

const router = Router();

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-06-20'
});

// ---------- STRIPE CHECKOUT ----------
// body: { proId, priceId, successUrl?, cancelUrl? }
router.post('/stripe/checkout', async (req, res) => {
  try {
    const { proId, priceId, successUrl, cancelUrl } = req.body;

    if (!proId || !priceId) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const proSnap = await db.collection('pros').doc(proId).get();
    if (!proSnap.exists) {
      return res.status(404).json({ error: 'PRO not found' });
    }

    const pro = proSnap.data() || {};
    const stripeCustomerId = pro.stripeCustomerId as string | undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        successUrl ||
        `${config.webBaseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl || `${config.webBaseUrl}/subscribe/cancel`,
      metadata: { proId }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------- PAYPAL UTILS ----------
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${config.paypalClientId}:${config.paypalSecret}`
  ).toString('base64');

  const resp = await fetch(`${config.paypalApi}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = (await resp.json()) as any;
  if (!resp.ok) {
    console.error('PayPal token error', data);
    throw new Error('PayPal token error');
  }
  return data.access_token as string;
}

// ---------- PAYPAL CREATE ORDER ----------
// body: { proId, amount, returnUrl?, cancelUrl? }
router.post('/paypal/create-order', async (req, res) => {
  try {
    const { proId, amount, returnUrl, cancelUrl } = req.body;
    if (!proId || !amount) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const token = await getPayPalAccessToken();

    const resp = await fetch(`${config.paypalApi}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: proId,
            custom_id: proId,
            amount: {
              currency_code: 'EUR',
              value: amount
            }
          }
        ],
        application_context: {
          return_url: returnUrl || `${config.webBaseUrl}/subscribe/success`,
          cancel_url: cancelUrl || `${config.webBaseUrl}/subscribe/cancel`
        }
      })
    });

    const data = (await resp.json()) as any;
    if (!resp.ok) {
      console.error('PayPal create order error', data);
      return res.status(500).json({ error: 'PayPal create-order error' });
    }

    const approvalLink = data.links?.find((l: any) => l.rel === 'approve')
      ?.href;

    return res.json({ approvalLink });
  } catch (err) {
    console.error('PayPal create-order error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
