// ESM-ready Admin Router: stats (Firestore) + refunds (Stripe/PayPal)
import { Router } from "express";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// ⚠️ Presuppone che un middleware "requireAuth" popoli req.user
// e che "requireRole('admin')" sia applicato a monte oppure usi il check inline qui sotto.

const router = Router();

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const {
  STRIPE_SECRET = "",
  PAYPAL_CLIENT_ID = "",
  PAYPAL_CLIENT_SECRET = "",
  PAYPAL_BASE = "https://api-m.sandbox.paypal.com", // usa https://api-m.paypal.com in produzione
} = process.env;

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });

// --- Helper: check ruolo admin se non c'è il middleware globale ---
function assertAdmin(req: any) {
  const role = req?.user?.role || req?.user?.roles?.[0];
  if (role !== "admin") {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

// --- Helper: PayPal access token ---
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

// ===================== STATS =====================

router.get("/stats", async (req: any, res) => {
  try {
    assertAdmin(req);

    const now = new Date();
    const ts30d = admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

    // Counts (aggregate queries)
    const [usersAggSnap, prosAggSnap] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("pros").where("status", "==", "active").count().get(),
    ]);
    const usersTotal = usersAggSnap.data().count || 0;
    const activePros = prosAggSnap.data().count || 0;

    // Payments ultimi 30 giorni con serie giornaliera
    const paySnap = await db.collection("payments")
      .where("createdAt", ">=", ts30d)
      .get();

    let revenue30dCents = 0;
    const dailyMap: Record<string, number> = {};

    paySnap.forEach(doc => {
      const p = doc.data();
      const ts = p.createdAt?.toDate?.() as Date | undefined;
      if (!ts) return;
      const day = ts.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const amount = Number(p.amountCents || 0);
      revenue30dCents += amount;
      dailyMap[day] = (dailyMap[day] || 0) + amount;
    });

    // Serie giornaliera ordinata (ultimi 30 giorni)
    const days: string[] = [];
    const series: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      days.push(d);
      series.push((dailyMap[d] || 0) / 100); // converti in €
    }

    // Prenotazioni ultimi 30 giorni
    const bookingsSnap = await db
      .collection("bookings")
      .where("createdAt", ">=", ts30d)
      .get();

    res.json({
      usersTotal,
      activePros,
      revenue30d: (revenue30dCents / 100).toFixed(2),
      bookings30d: bookingsSnap.size,
      revenueSeries: { days, values: series },
      generatedAt: now.toISOString(),
    });
  } catch (e: any) {
    console.error("GET /admin/stats", e);
    res.status(e.status || 500).json({ error: e.message || "Stats error" });
  }
});

// ===================== REFUNDS =====================

// Richiesta rimborso
// Body: { amountCents?: number }  (opzionale; se assente -> full refund)
// Logica: individua provider partendo dal record in /payments/{id} (consigliato).
router.post("/refund/:paymentId", async (req: any, res) => {
  try {
    assertAdmin(req);
    const { paymentId } = req.params;
    const amountCentsBody = req.body?.amountCents as number | undefined;

    // 1) trova il record pagamento
    const payDoc = await db.collection("payments").doc(paymentId).get();
    if (!payDoc.exists) {
      return res.status(404).json({ error: "Payment not found" });
    }
    const pay = payDoc.data()!;
    const provider = pay.provider as "stripe" | "paypal" | undefined;

    if (!provider) {
      return res.status(400).json({ error: "Unknown provider" });
    }

    let refundRecord: any = null;

    if (provider === "stripe") {
      // Stripe: ricava charge o payment_intent dai dati raw (invoice o charge)
      // Possibili sorgenti:
      // - payment from invoice: pay.raw.charge  oppure pay.raw.payment_intent  (dipende da come è stato salvato)
      // - payment charge diretto: pay.raw.id è un 'ch_...'
      const raw = pay.raw || {};
      const chargeId: string | undefined =
        raw.charge || raw?.charges?.data?.[0]?.id || (typeof raw.id === "string" && raw.id.startsWith("ch_") ? raw.id : undefined);
      const paymentIntentId: string | undefined =
        raw.payment_intent || (typeof raw.id === "string" && raw.id.startsWith("pi_") ? raw.id : undefined);

      const params: Stripe.RefundCreateParams = {};
      if (amountCentsBody && amountCentsBody > 0) params.amount = amountCentsBody;

      if (chargeId) {
        params.charge = chargeId;
      } else if (paymentIntentId) {
        params.payment_intent = paymentIntentId;
      } else {
        // fallback: prova a leggere invoice se presente
        if (raw.object === "invoice" && raw.charge) {
          params.charge = raw.charge;
        } else {
          return res.status(400).json({ error: "Stripe: unable to infer charge/payment_intent" });
        }
      }

      const refund = await stripe.refunds.create(params);
      refundRecord = {
        provider: "stripe",
        refundId: refund.id,
        amountCents: refund.amount || null,
        status: refund.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    if (provider === "paypal") {
      // PayPal: serve capture_id (in /v2/payments/captures/{capture_id}/refund)
      // Dal nostro salvataggio: pay.raw.purchase_units[0].payments.captures[0].id
      const raw = pay.raw || {};
      const captureId =
        raw?.purchase_units?.[0]?.payments?.captures?.[0]?.id || raw?.id;
      if (!captureId) return res.status(400).json({ error: "PayPal: capture id not found" });

      const { access_token } = await paypalAccessToken();
      const body: any = {};
      if (amountCentsBody && amountCentsBody > 0) {
        // amount deve essere in decimali
        body.amount = {
          currency_code: pay.currency || "EUR",
          value: (amountCentsBody / 100).toFixed(2),
        };
      }
      const r = await fetch(`${PAYPAL_BASE}/v2/payments/captures/${captureId}/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        console.error("PayPal refund error", data);
        return res.status(400).json({ error: data?.message || "PayPal refund failed" });
      }
      refundRecord = {
        provider: "paypal",
        refundId: data?.id,
        amountCents: amountCentsBody || null,
        status: data?.status || "COMPLETED",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    // 3) Persisti refund in subcollection + flag sul pagamento
    const ref = db.collection("payments").doc(paymentId).collection("refunds").doc();
    await ref.set(refundRecord);
    await payDoc.ref.set(
      {
        refunded: true,
        refundLast: refundRecord,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ ok: true, refund: refundRecord });
  } catch (e: any) {
    console.error("POST /admin/refund/:paymentId", e);
    res.status(e.status || 500).json({ error: e.message || "Refund error" });
  }
});

// ===================== CSV EXPORT =====================

// Esporta pagamenti in formato CSV (ultimi 2000 per evitare problemi memoria)
router.get("/export/payments.csv", async (req: any, res) => {
  try {
    assertAdmin(req);

    const snap = await db
      .collection("payments")
      .orderBy("createdAt", "desc")
      .limit(2000)
      .get();

    const rows = snap.docs.map((d) => ({
      id: d.id,
      userId: d.data().userId || "",
      provider: d.data().provider || "",
      amount: (d.data().amountCents || 0) / 100,
      currency: (d.data().currency || "EUR").toUpperCase(),
      createdAt: d.data().createdAt?.toDate?.().toISOString?.() || "",
      receiptUrl: d.data().receiptUrl || "",
    }));

    // Genera CSV manualmente (alternativa a csv-stringify se non disponibile)
    const header = "id,userId,provider,amount,currency,createdAt,receiptUrl\n";
    const csvContent = rows
      .map((r) =>
        [
          r.id,
          r.userId,
          r.provider,
          r.amount,
          r.currency,
          r.createdAt,
          r.receiptUrl,
        ]
          .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v))
          .join(",")
      )
      .join("\n");

    const csv = header + csvContent;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="payments.csv"');
    res.send(csv);
  } catch (e: any) {
    console.error("GET /admin/export/payments.csv", e);
    res.status(e.status || 500).json({ error: e.message || "Export error" });
  }
});

export default router;
