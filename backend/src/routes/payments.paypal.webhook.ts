// src/routes/payments.paypal.webhook.ts
import { Router } from 'express';
import fetch from 'node-fetch';
import { db } from '../firebase';
import { config } from '../config';

const router = Router();

// Verifica e gestione webhook PayPal
router.post('/paypal/webhook', async (req, res) => {
  try {
    const body = req.body;
    const transmissionId = req.header('paypal-transmission-id');
    const transmissionTime = req.header('paypal-transmission-time');
    const certUrl = req.header('paypal-cert-url');
    const authAlgo = req.header('paypal-auth-algo');
    const transmissionSig = req.header('paypal-transmission-sig');
    const webhookId = config.paypalWebhookId;

    if (
      !transmissionId ||
      !transmissionTime ||
      !certUrl ||
      !authAlgo ||
      !transmissionSig
    ) {
      console.error('PayPal webhook headers missing');
      return res.status(400).send('Missing headers');
    }

    const token = await getPayPalAccessToken();
    const verifyResp = await fetch(
      `${config.paypalApi}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: webhookId,
          webhook_event: body
        })
      }
    );

    const verifyData = (await verifyResp.json()) as any;
    if (
      !verifyResp.ok ||
      verifyData.verification_status !== 'SUCCESS'
    ) {
      console.error('PayPal webhook verification failed', verifyData);
      return res.status(400).send('Invalid signature');
    }

    const eventType = body.event_type as string;
    console.log('PayPal webhook event:', eventType);

    if (eventType.startsWith('BILLING.SUBSCRIPTION.')) {
      const resource = body.resource;
      const proId = (resource.custom_id || resource.id) as string | undefined;
      const status = resource.status as string | undefined;

      if (!proId || !status) {
        console.warn('PayPal webhook: missing proId or status');
      } else {
        const isActive = status === 'ACTIVE';
        await db.collection('pros').doc(proId).update({
          subscriptionStatus: isActive ? 'active' : 'inactive',
          subscriptionProvider: 'paypal',
          subscriptionPlan: resource.plan_id ?? null,
          updatedAt: new Date()
        });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('PayPal webhook error', err);
    return res.status(500).send('Webhook handler error');
  }
});

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

export default router;
