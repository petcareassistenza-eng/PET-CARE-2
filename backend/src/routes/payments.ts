// ESM-ready Express Router per pagamenti Stripe + PayPal con ricevuta PDF su Firebase Storage
import { Router } from "express";
import express from "express";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Node 18+ ha fetch globale (no import 'node-fetch')
const router = Router();

// --- CONFIG ---
const {
  STRIPE_SECRET = "",
  STRIPE_WEBHOOK_SECRET = "",
  FRONT_URL = "https://mypetcare.app",
  PAYPAL_CLIENT_ID = "",
  PAYPAL_CLIENT_SECRET = "",
  PAYPAL_BASE = "https://api-m.sandbox.paypal.com", // ⇦ metti "https://api-m.paypal.com" in produzione
  FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "",
} = process.env;

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: FIREBASE_STORAGE_BUCKET || undefined,
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });

// Utility: genera PDF ricevuta e ritorna public URL
async function generateAndStoreReceiptPDF(opts: {
  userId: string;
  amountCents: number;
  currency: string;
  provider: "stripe" | "paypal";
  paymentId: string;
  metadata?: Record<string, any>;
}) {
  const { default: PDFDocument } = await import("pdfkit"); // dynamic import compatibile ESM
  // @ts-ignore - i tipi possono non essere presenti
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  // @ts-ignore
  doc.on("data", (b: Buffer) => chunks.push(b));
  // @ts-ignore
  doc.on("end", async () => { /* no-op */ });

  const amount = (opts.amountCents / 100).toFixed(2);
  doc.fontSize(18).text("MyPetCare - Ricevuta di pagamento", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`User ID: ${opts.userId}`);
  doc.text(`Provider: ${opts.provider.toUpperCase()}`);
  doc.text(`Payment ID: ${opts.paymentId}`);
  doc.text(`Importo: ${amount} ${opts.currency.toUpperCase()}`);
  doc.text(`Data: ${new Date().toLocaleString("it-IT")}`);
  if (opts.metadata) {
    doc.moveDown().text("Dettagli:", { underline: true });
    Object.entries(opts.metadata).forEach(([k, v]) => doc.text(`${k}: ${String(v)}`));
  }
  doc.end();

  const buffer = await new Promise<Buffer>((resolve) => {
    // @ts-ignore
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const path = `receipts/${opts.userId}/${opts.provider}_${opts.paymentId}.pdf`;
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType: "application/pdf",
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

// Utility: basic auth PayPal
async function paypalAccessToken() {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal token error");
  return (await res.json()) as { access_token: string };
}

// =============== STRIPE ===============

// Crea Checkout Session (subscription)
router.post("/stripe/create-session", async (req: any, res) => {
  try {
    const { planId, coupon } = req.body;
    const user = req.user; // valorizzato da middleware requireAuth a monte
    if (!user?.email || !planId) return res.status(400).json({ error: "Missing data" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      discounts: coupon ? [{ coupon }] : undefined,
      line_items: [{ price: planId, quantity: 1 }],
      success_url: `${FRONT_URL}/payments/success`,
      cancel_url: `${FRONT_URL}/payments/cancel`,
      metadata: { userId: user.uid || user.id || "" },
    });
    res.json({ url: session.url });
  } catch (e: any) {
    console.error("stripe/create-session", e);
    res.status(500).json({ error: e.message });
  }
});

// Billing Portal (gestione abbonamento)
router.post("/stripe/portal", async (req: any, res) => {
  try {
    const { customerId } = req.body;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONT_URL}/account`,
    });
    res.json({ url: session.url });
  } catch (e: any) {
    console.error("stripe/portal", e);
    res.status(500).json({ error: e.message });
  }
});

// Webhook Stripe
router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event: Stripe.Event;
  try {
    const sig = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("stripe/webhook signature error", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || "";
        const subscriptionId = session.subscription as string;
        if (userId) {
          await db.collection("users").doc(userId).set(
            {
              subscription: {
                provider: "stripe",
                status: "active",
                subscriptionId,
                customerId: session.customer,
                currentPeriodEnd: null, // valorizzabile da invoice/line
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            },
            { merge: true }
          );
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = (invoice.metadata?.userId as string) || "";
        // Genera ricevuta
        const amountCents = invoice.amount_paid || 0;
        const receiptUrl = await generateAndStoreReceiptPDF({
          userId: userId || (invoice.customer_email || "unknown"),
          amountCents,
          currency: invoice.currency || "eur",
          provider: "stripe",
          paymentId: invoice.id,
          metadata: { invoiceNumber: invoice.number || "", periodEnd: invoice.period_end },
        });
        // Salva record su Firestore
        await db.collection("payments").doc(invoice.id).set({
          userId,
          provider: "stripe",
          amountCents,
          currency: invoice.currency,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          receiptUrl,
          raw: invoice,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata?.userId as string) || "";
        if (userId) {
          await db.collection("users").doc(userId).set(
            {
              subscription: {
                provider: "stripe",
                status: "canceled",
                subscriptionId: sub.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            },
            { merge: true }
          );
        }
        break;
      }
      default:
        // altri eventi non gestiti in dettaglio
        break;
    }
    res.json({ received: true });
  } catch (e: any) {
    console.error("stripe/webhook handler error", e);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

// =============== PAYPAL ===============

// Crea ordine (abbonamento o una tantum: qui esemplificato come singolo acquisto)
router.post("/paypal/create-order", async (req: any, res) => {
  try {
    const { access_token } = await paypalAccessToken();
    const { amount = "9.99", currency = "EUR", description = "MyPetCare PRO" } = req.body || {};
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: currency, value: amount }, description }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("paypal/create-order error", data);
      return res.status(400).json(data);
    }
    res.json(data); // contiene approve link in data.links
  } catch (e: any) {
    console.error("paypal/create-order", e);
    res.status(500).json({ error: e.message });
  }
});

// Capture ordine
router.post("/paypal/capture/:orderId", async (req: any, res) => {
  try {
    const { access_token } = await paypalAccessToken();
    const { orderId } = req.params;
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("paypal/capture error", data);
      return res.status(400).json(data);
    }

    // Estrarre importo / currency / id pagamento
    const purchase = data?.purchase_units?.[0];
    const capture = purchase?.payments?.captures?.[0];
    const amountValue = Number(capture?.amount?.value || "0");
    const currency = capture?.amount?.currency_code || "EUR";
    const paymentId = capture?.id || orderId;
    const userId = req.user?.uid || req.user?.id || "unknown";

    const receiptUrl = await generateAndStoreReceiptPDF({
      userId,
      amountCents: Math.round(amountValue * 100),
      currency,
      provider: "paypal",
      paymentId,
      metadata: { orderId },
    });

    await db.collection("payments").doc(paymentId).set({
      userId,
      provider: "paypal",
      amountCents: Math.round(amountValue * 100),
      currency,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      receiptUrl,
      raw: data,
    });

    // Aggiorna stato abbonamento base (se usi PayPal per subscription, qui adegua)
    await db.collection("users").doc(userId).set(
      {
        subscription: {
          provider: "paypal",
          status: "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    res.json({ ok: true, receiptUrl, data });
  } catch (e: any) {
    console.error("paypal/capture", e);
    res.status(500).json({ error: e.message });
  }
});

// =============== COUPON ===============

router.post("/coupon/validate", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ valid: false, reason: "Missing code" });
    const snap = await db.collection("coupons").doc(code).get();
    if (!snap.exists) return res.json({ valid: false, reason: "Not found" });
    const c = snap.data()!;
    if (c.disabled) return res.json({ valid: false, reason: "Disabled" });
    res.json({ valid: true, type: c.type, months: c.months || 0 });
  } catch (e: any) {
    console.error("coupon/validate", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
