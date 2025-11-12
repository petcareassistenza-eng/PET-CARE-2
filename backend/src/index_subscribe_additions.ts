// === ADD TO src/index.ts (replace or merge) ===
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();
const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json());

const stripe = new Stripe(process.env.STRIPE_KEY!, { apiVersion: '2024-06-20' });
const APP_FEE_PCT = Number(process.env.APP_FEE_PCT || 5);

// EXPECT these env vars set for subscription prices & optional promotion codes
// STRIPE_PRICE_PRO_MONTHLY=price_xxx
// STRIPE_PRICE_PRO_QUARTERLY=price_xxx
// STRIPE_PRICE_PRO_ANNUAL=price_xxx
// (optional) STRIPE_PROMO_FREE_1M=promo_xxx  STRIPE_PROMO_FREE_3M=promo_xxx  STRIPE_PROMO_FREE_12M=promo_xxx

// ---- Auth helpers ----
async function requireAuth(req:any,res:any,next:any){
  try{
    const hdr = String(req.headers.authorization||'');
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const dec = await admin.auth().verifyIdToken(token);
    (req as any).auth = { uid: dec.uid, email: dec.email };
    next();
  }catch(e){ res.status(401).send('UNAUTH'); }
}
async function requireAdmin(req:any,res:any,next:any){
  try{
    const hdr = String(req.headers.authorization||'');
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const dec = await admin.auth().verifyIdToken(token);
    const u = await db.collection('users').doc(dec.uid).get();
    if (u.exists && u.data()?.role == 'admin'){ (req as any).auth = { uid: dec.uid }; return next(); }
    res.status(403).send('FORBIDDEN');
  }catch(e){ res.status(401).send('UNAUTH'); }
}

// ---- PRO: create Stripe Checkout session for subscription ----
app.post('/pro/subscribe', requireAuth, async (req, res) => {
  const { plan = 'monthly', free = 0 } = req.body as { plan?: 'monthly'|'quarterly'|'annual', free?: number };

  const priceMap:any = {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    quarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  };
  const price = priceMap[plan];
  if (!price) return res.status(400).send('PRICE_NOT_CONFIGURED');

  // Optional promotion code based on months free (1/3/12)
  let promotion_code: string | undefined;
  if (free === 1) promotion_code = process.env.STRIPE_PROMO_FREE_1M;
  if (free === 3) promotion_code = process.env.STRIPE_PROMO_FREE_3M;
  if (free === 12) promotion_code = process.env.STRIPE_PROMO_FREE_12M;

  // Ensure customer exists or create
  const pro = await db.collection('pros').doc((req as any).auth.uid).get();
  let customerId = pro.data()?.payout?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: (req as any).auth.email || undefined,
      metadata: { proId: (req as any).auth.uid }
    });
    customerId = customer.id;
    await pro.ref.set({ payout: { ...(pro.data()?.payout||{}), stripeCustomerId: customer.id } }, { merge: true });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: !!promotion_code ? false : true,
    discounts: promotion_code ? [{ promotion_code }] : undefined,
    success_url: (process.env.APP_URL || 'https://app.mypetcare.it') + '/pro/sub-success',
    cancel_url: (process.env.APP_URL || 'https://app.mypetcare.it') + '/pro/sub-cancel',
  });

  res.json({ ok: true, url: session.url });
});

// ---- Stripe webhook: update subscriptions state ----
app.post('/stripe/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send('Bad signature');
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      // Find proId by customerId
      const pros = await db.collection('pros').where('payout.stripeCustomerId', '==', customerId).limit(1).get();
      if (!pros.empty) {
        const proId = pros.docs[0].id;
        const status = sub.status; // active, past_due, canceled, etc.
        const end = sub.current_period_end ? admin.firestore.Timestamp.fromMillis(sub.current_period_end * 1000) : null;
        await db.collection('subscriptions').doc(proId).set({
          provider: 'stripe',
          status: status === 'active' ? 'active' : (status === 'trialing' ? 'in_trial' : status),
          currentPeriodEnd: end,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Toggle visibility
        const nowActive = status === 'active' || status === 'trialing';
        await db.collection('pros').doc(proId).set({ visible: nowActive }, { merge: true });
      }
      break;
    }
    case 'payment_intent.succeeded': {
      // mark booking paid if needed
      break;
    }
    case 'payment_intent.payment_failed': {
      // mark booking payment_failed
      break;
    }
  }
  res.json({ received: true });
});

export default app;